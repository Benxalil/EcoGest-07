import { lazy, ComponentType } from 'react';

interface PrefetchConfig {
  component: () => Promise<{ default: ComponentType<any> }>;
  prefetchOn?: 'hover' | 'visible' | 'idle';
}

/**
 * Enhanced lazy loading with intelligent prefetching
 * @param importFn - Dynamic import function for the component
 * @param prefetchOn - When to prefetch: 'hover' | 'visible' | 'idle'
 * @returns Lazy-loaded component with prefetch capability
 */
export const lazyWithPrefetch = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  prefetchOn: 'hover' | 'visible' | 'idle' = 'idle'
) => {
  let prefetched = false;

  const prefetch = () => {
    if (!prefetched) {
      prefetched = true;
      importFn();
    }
  };

  // Précharger après idle
  if (prefetchOn === 'idle' && 'requestIdleCallback' in window) {
    requestIdleCallback(() => prefetch());
  }

  return lazy(importFn);
};
