import { multiLevelCache } from './multiLevelCache';
import { supabase } from '@/integrations/supabase/client';

/**
 * Nettoie TOUTES les données en cache et déconnecte l'utilisateur
 * À appeler lors de la déconnexion manuelle ou automatique
 */
export async function clearAllCacheOnLogout(): Promise<void> {
  console.log('[SecurityCleanup] Starting complete cache cleanup...');
  
  try {
    // 1. Nettoyer le cache multi-niveaux
    multiLevelCache.clear();
    
    // 2. Nettoyer localStorage (tout sauf les préférences UI non sensibles)
    const uiPreferences = localStorage.getItem('ui-preferences');
    const theme = localStorage.getItem('theme');
    const language = localStorage.getItem('language');
    
    localStorage.clear();
    
    // Restaurer uniquement les préférences UI
    if (uiPreferences) localStorage.setItem('ui-preferences', uiPreferences);
    if (theme) localStorage.setItem('theme', theme);
    if (language) localStorage.setItem('language', language);
    
    // 3. Nettoyer sessionStorage complètement
    sessionStorage.clear();
    
    // 4. Révoquer toutes les subscriptions Supabase Realtime
    const channels = supabase.getChannels();
    for (const channel of channels) {
      await supabase.removeChannel(channel);
    }
    
    // 5. Déconnecter de Supabase
    await supabase.auth.signOut();
    
    console.log('[SecurityCleanup] ✅ Complete cleanup successful');
  } catch (error) {
    console.error('[SecurityCleanup] ❌ Error during cleanup:', error);
    // Forcer le nettoyage même en cas d'erreur
    localStorage.clear();
    sessionStorage.clear();
    multiLevelCache.clear();
  }
}

/**
 * Nettoie uniquement les données sensibles du cache mémoire
 * Garde les données structurelles (classes, matières, etc.)
 */
export function clearSensitiveDataOnly(): void {
  console.log('[SecurityCleanup] Clearing sensitive data from memory cache...');
  
  const sensitivePrefixes = [
    'students-',
    'teachers-',
    'grades-',
    'payments-',
    'parent-children-',
    'student-details-',
    'teacher-details-'
  ];
  
  sensitivePrefixes.forEach(prefix => {
    multiLevelCache.deleteByPrefix(prefix);
  });
  
  console.log('[SecurityCleanup] ✅ Sensitive data cleared');
}

/**
 * Configuration du timer d'inactivité
 * Déconnecte automatiquement après 30 minutes d'inactivité
 */
let inactivityTimer: NodeJS.Timeout | null = null;
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

/**
 * Initialise le système de détection d'inactivité
 */
export function setupInactivityTimer(): void {
  // Nettoyer l'ancien timer si existant
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }
  
  const resetTimer = () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    
    // Note de sécurité : setTimeout ici n'est PAS une vulnérabilité XSS
    // C'est un timer d'inactivité légitime avec une fonction de callback sécurisée
    // Aucune entrée utilisateur n'est évaluée ou exécutée dynamiquement
    inactivityTimer = setTimeout(async () => {
      console.warn('[SecurityCleanup] ⏰ Inactivity timeout - Auto logout');
      await clearAllCacheOnLogout();
      // Redirection sécurisée : URL statique, pas d'injection possible
      window.location.href = '/auth';
    }, INACTIVITY_TIMEOUT);
  };
  
  // Événements qui réinitialisent le timer
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  
  events.forEach(event => {
    document.addEventListener(event, resetTimer, { passive: true });
  });
  
  // Démarrer le timer initial
  resetTimer();
  
  console.log('[SecurityCleanup] ✅ Inactivity timer initialized (30 min)');
}

/**
 * Désactive le timer d'inactivité
 */
export function clearInactivityTimer(): void {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}

/**
 * Vérifie si des données sensibles sont stockées dans localStorage/sessionStorage
 * Mode développement uniquement - pour audit de sécurité
 */
export function auditStorageSecurity(): void {
  if (import.meta.env.DEV) {
    console.group('[SecurityAudit] Storage Security Check');
    
    const sensitivePatterns = [
      'student', 'grade', 'payment', 'phone', 'email', 'address',
      'matricule', 'password', 'token', 'secret'
    ];
    
    // Audit localStorage
    console.log('📦 localStorage:');
    let localStorageWarnings = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        const hasSensitiveData = sensitivePatterns.some(pattern => 
          key.toLowerCase().includes(pattern) || value.toLowerCase().includes(pattern)
        );
        
        if (hasSensitiveData) {
          console.warn(`⚠️ SENSITIVE DATA in localStorage: ${key}`);
          localStorageWarnings++;
        } else {
          console.log(`✅ ${key} (safe)`);
        }
      }
    }
    
    // Audit sessionStorage
    console.log('\n📦 sessionStorage:');
    let sessionStorageWarnings = 0;
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const value = sessionStorage.getItem(key) || '';
        const hasSensitiveData = sensitivePatterns.some(pattern => 
          key.toLowerCase().includes(pattern) || value.toLowerCase().includes(pattern)
        );
        
        if (hasSensitiveData && !key.includes('user-profile-own')) {
          console.warn(`⚠️ SENSITIVE DATA in sessionStorage: ${key}`);
          sessionStorageWarnings++;
        } else {
          console.log(`✅ ${key} (safe)`);
        }
      }
    }
    
    console.log(`\n🔒 Security Score: ${localStorageWarnings === 0 && sessionStorageWarnings === 0 ? '✅ SECURE' : '⚠️ NEEDS REVIEW'}`);
    console.groupEnd();
  }
}
