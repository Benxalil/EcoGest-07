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