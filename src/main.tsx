// 🔄 Build forcé - Version 2025.10.18-08:00 - Optimisations performance complètes
// Ce timestamp force la reconstruction complète après modifications
// Dernière mise à jour : CSS critique, prefetch intelligent, chunking vendor, async scripts

import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import { performanceMonitor } from './utils/performanceMonitor'
import { initializePerformanceOptimizations } from './utils/performanceOptimizer'
import { queryClient } from './lib/queryClient'

// Conditional imports for dev tools (tree-shaking in production)
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() => import('@tanstack/react-query-devtools').then(m => ({
      default: () => <m.ReactQueryDevtools initialIsOpen={false} />
    })))
  : null;

const PerformanceMonitorWidget = import.meta.env.DEV
  ? lazy(() => import('./components/debug/PerformanceMonitorWidget').then(m => ({
      default: m.PerformanceMonitorWidget
    })))
  : null;

// Defer non-critical initializations after first render
const initializeNonCritical = () => {
  if (typeof window === 'undefined') return;

  // Use requestIdleCallback for non-blocking initialization
  const callback = () => {
    performanceMonitor.initialize();
    initializePerformanceOptimizations();
    
    // 🚀 OPTIMISATION: Enregistrer le Service Worker pour cache agressif
    // Compatible avec bfcache
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[SW] Enregistré avec succès:', registration.scope);
          
          // 🔄 Mettre à jour le SW immédiatement s'il y a une nouvelle version
          registration.update();
        })
        .catch((error) => {
          console.error('[SW] Échec enregistrement:', error);
        });
    }
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback);
  } else {
    setTimeout(callback, 1);
  }

  // 🔄 Détecter la restauration depuis bfcache
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      console.log('🔄 Page restaurée depuis bfcache');
      // Réinitialiser si nécessaire
    }
  });
};

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Failed to find the root element');

// Render immediately for fastest FCP
createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* ✅ Lazy-load dev tools to reduce production bundle */}
      {import.meta.env.DEV && ReactQueryDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtools />
        </Suspense>
      )}
      {import.meta.env.DEV && PerformanceMonitorWidget && (
        <Suspense fallback={null}>
          <PerformanceMonitorWidget />
        </Suspense>
      )}
    </QueryClientProvider>
  </StrictMode>
);

// Initialize non-critical features after first render
initializeNonCritical();