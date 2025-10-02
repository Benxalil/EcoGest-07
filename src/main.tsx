import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { performanceMonitor } from './utils/performanceMonitor'
import { initializePerformanceOptimizations } from './utils/performanceOptimizer'
import './utils/criticalCSS'

// Initialize performance monitoring and optimizations
if (typeof window !== 'undefined') {
  performanceMonitor.initialize();
  initializePerformanceOptimizations();
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);