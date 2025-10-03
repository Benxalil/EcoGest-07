/**
 * Système de cache multi-niveaux avec synchronisation inter-onglets
 * Niveau 1: Mémoire (instantané) - données actives
 * Niveau 2: sessionStorage - données de session
 * Niveau 3: localStorage - données persistantes
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

type CacheLevel = 'memory' | 'session' | 'local';
type CacheStrategy = 'memory-first' | 'session-first' | 'local-first';

class MultiLevelCache {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners = new Map<string, Set<(data: any) => void>>();

  constructor() {
    // Initialiser BroadcastChannel pour la synchronisation inter-onglets
    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel('multilevel-cache-sync');
      this.broadcastChannel.onmessage = (event) => {
        const { key, data, action } = event.data;
        
        if (action === 'set') {
          // Synchroniser le cache mémoire avec les autres onglets
          const entry = data as CacheEntry<any>;
          this.memoryCache.set(key, entry);
          this.notifyListeners(key, entry.data);
        } else if (action === 'delete') {
          this.memoryCache.delete(key);
          this.notifyListeners(key, null);
        }
      };
    }

    // Nettoyer les entrées expirées au démarrage
    this.cleanup();
  }

  /**
   * Récupérer une valeur du cache avec stratégie multi-niveaux
   */
  get<T>(key: string, strategy: CacheStrategy = 'memory-first'): T | null {
    const levels: CacheLevel[] = this.getSearchOrder(strategy);

    for (const level of levels) {
      const entry = this.getFromLevel<T>(key, level);
      if (entry && !this.isExpired(entry)) {
        // Propager vers les niveaux supérieurs pour accès plus rapide
        if (level !== 'memory') {
          this.memoryCache.set(key, entry);
        }
        return entry.data;
      }
    }

    return null;
  }

  /**
   * Stocker une valeur dans le cache avec TTL et niveau
   */
  set<T>(
    key: string, 
    data: T, 
    ttl: number = 5 * 60 * 1000, // 5 minutes par défaut
    level: CacheLevel = 'memory'
  ): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };

    // Stocker dans le niveau mémoire
    this.memoryCache.set(key, entry);

    // Stocker dans le niveau demandé
    if (level === 'session' || level === 'local') {
      try {
        const storage = level === 'session' ? sessionStorage : localStorage;
        storage.setItem(key, JSON.stringify(entry));
      } catch (error) {
        console.warn(`Erreur lors de l'écriture dans ${level}Storage:`, error);
      }
    }

    // Notifier les autres onglets
    this.broadcast(key, entry, 'set');
    
    // Notifier les listeners locaux
    this.notifyListeners(key, data);
  }

  /**
   * Supprimer une valeur du cache
   */
  delete(key: string): void {
    this.memoryCache.delete(key);
    
    try {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Erreur lors de la suppression du cache:', error);
    }

    this.broadcast(key, null, 'delete');
    this.notifyListeners(key, null);
  }

  /**
   * Supprimer toutes les entrées avec un préfixe donné
   */
  deleteByPrefix(prefix: string): void {
    // Supprimer du cache mémoire
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.delete(key);
      }
    }

    // Supprimer de sessionStorage
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(prefix)) {
          sessionStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('Erreur lors du nettoyage de sessionStorage:', error);
    }

    // Supprimer de localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('Erreur lors du nettoyage de localStorage:', error);
    }
  }

  /**
   * Vider tout le cache
   */
  clear(): void {
    this.memoryCache.clear();
    
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch (error) {
      console.warn('Erreur lors du nettoyage du cache:', error);
    }
  }

  /**
   * S'abonner aux changements d'une clé
   */
  subscribe(key: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    // Retourner une fonction de désabonnement
    return () => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  /**
   * Obtenir les statistiques du cache
   */
  getStats() {
    let sessionSize = 0;
    let localSize = 0;

    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          const value = sessionStorage.getItem(key);
          if (value) sessionSize++;
        }
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) localSize++;
        }
      }
    } catch (error) {
      console.warn('Erreur lors de la récupération des stats:', error);
    }

    return {
      memory: this.memoryCache.size,
      session: sessionSize,
      local: localSize,
      total: this.memoryCache.size + sessionSize + localSize
    };
  }

  // Méthodes privées

  private getSearchOrder(strategy: CacheStrategy): CacheLevel[] {
    switch (strategy) {
      case 'memory-first':
        return ['memory', 'session', 'local'];
      case 'session-first':
        return ['session', 'memory', 'local'];
      case 'local-first':
        return ['local', 'session', 'memory'];
      default:
        return ['memory', 'session', 'local'];
    }
  }

  private getFromLevel<T>(key: string, level: CacheLevel): CacheEntry<T> | null {
    if (level === 'memory') {
      return this.memoryCache.get(key) || null;
    }

    try {
      const storage = level === 'session' ? sessionStorage : localStorage;
      const item = storage.getItem(key);
      if (item) {
        return JSON.parse(item) as CacheEntry<T>;
      }
    } catch (error) {
      console.warn(`Erreur lors de la lecture depuis ${level}Storage:`, error);
    }

    return null;
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private broadcast(key: string, data: any, action: 'set' | 'delete'): void {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ key, data, action });
      } catch (error) {
        console.warn('Erreur lors de la diffusion:', error);
      }
    }
  }

  private notifyListeners(key: string, data: any): void {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Erreur dans le callback du listener:', error);
        }
      });
    }
  }

  private cleanup(): void {
    // Nettoyer les entrées expirées du cache mémoire
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
      }
    }

    // Nettoyer sessionStorage et localStorage
    this.cleanupStorage(sessionStorage);
    this.cleanupStorage(localStorage);
  }

  private cleanupStorage(storage: Storage): void {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
          try {
            const item = storage.getItem(key);
            if (item) {
              const entry = JSON.parse(item) as CacheEntry<any>;
              if (this.isExpired(entry)) {
                keysToRemove.push(key);
              }
            }
          } catch {
            // Ignorer les entrées qui ne sont pas des CacheEntry
          }
        }
      }

      keysToRemove.forEach(key => storage.removeItem(key));
    } catch (error) {
      console.warn('Erreur lors du nettoyage du storage:', error);
    }
  }
}

// Instance globale unique
export const multiLevelCache = new MultiLevelCache();

// TTL prédéfinis pour différents types de données
export const CacheTTL = {
  USER_PROFILE: 30 * 60 * 1000,      // 30 minutes - très stable
  CLASSES: 15 * 60 * 1000,           // 15 minutes
  STUDENTS: 10 * 60 * 1000,          // 10 minutes
  TEACHERS: 10 * 60 * 1000,          // 10 minutes
  SUBJECTS: 15 * 60 * 1000,          // 15 minutes
  SCHEDULES: 5 * 60 * 1000,          // 5 minutes
  GRADES: 2 * 60 * 1000,             // 2 minutes
  ANNOUNCEMENTS: 3 * 60 * 1000,      // 3 minutes
  PAYMENTS: 5 * 60 * 1000,           // 5 minutes
} as const;

// Clés de cache standardisées
export const CacheKeys = {
  userProfile: (userId: string) => `user_profile:${userId}`,
  teacherId: (userId: string) => `teacher_id:${userId}`,
  classes: (schoolId: string) => `classes:${schoolId}`,
  students: (schoolId: string) => `students:${schoolId}`,
  teachers: (schoolId: string) => `teachers:${schoolId}`,
  subjects: (schoolId: string) => `subjects:${schoolId}`,
  schedules: (schoolId: string, classId?: string) => 
    classId ? `schedules:${schoolId}:${classId}` : `schedules:${schoolId}`,
  announcements: (schoolId: string) => `announcements:${schoolId}`,
  dashboard: (userId: string, role: string) => `dashboard:${userId}:${role}`,
} as const;
