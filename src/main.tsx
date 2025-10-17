// 🔄 Build forcé - Version 2025.10.16-22:15 - Corrections de sécurité appliquées
// Ce timestamp force la reconstruction complète après modifications
// Dernière mise à jour : Sécurisation JWT, CSS et setTimeout

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App.tsx'
import './index.css'
import { performanceMonitor } from './utils/performanceMonitor'
import { initializePerformanceOptimizations } from './utils/performanceOptimizer'
import { queryClient } from './lib/queryClient'
import { PerformanceMonitorWidget } from './components/debug/PerformanceMonitorWidget'

// Initialize performance monitoring and optimizations
if (typeof window !== 'undefined') {
  performanceMonitor.initialize();
  initializePerformanceOptimizations();
  
  // 🚀 OPTIMISATION: Enregistrer le Service Worker pour cache agressif
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[SW] Enregistré avec succès:', registration.scope);
        })
        .catch((error) => {
          console.error('[SW] Échec enregistrement:', error);
        });
    });
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* ✅ React Query DevTools - Seulement en dev */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      {/* ✅ Moniteur de performances - Seulement en dev */}
      {import.meta.env.DEV && <PerformanceMonitorWidget />}
    </QueryClientProvider>
  </StrictMode>
);