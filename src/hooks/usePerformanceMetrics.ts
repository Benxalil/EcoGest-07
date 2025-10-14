import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  fps: number;
  memory: number;
  loadTime: number;
  renderCount: number;
}

/**
 * Hook pour mesurer les performances de l'application
 * ✅ Mesure FPS (frames per second)
 * ✅ Utilisation mémoire
 * ✅ Temps de chargement
 * ✅ Nombre de renders
 * 
 * @example
 * ```tsx
 * const { fps, memory, loadTime } = usePerformanceMetrics();
 * console.log(`FPS: ${fps}, Memory: ${memory}MB`);
 * ```
 */
export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memory: 0,
    loadTime: 0,
    renderCount: 0
  });

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    // Mesurer FPS
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        setMetrics(prev => ({
          ...prev,
          fps,
          renderCount: prev.renderCount + 1
        }));
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationFrameId = requestAnimationFrame(measureFPS);
    };

    animationFrameId = requestAnimationFrame(measureFPS);

    // Mesurer mémoire (si disponible)
    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = Math.round(
          (performance as any).memory.usedJSHeapSize / 1048576
        );
        setMetrics(prev => ({ ...prev, memory }));
      }
    };

    const memoryInterval = setInterval(measureMemory, 2000);

    // Mesurer temps de chargement
    const measureLoadTime = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const loadTime = Math.round(navigation.loadEventEnd - navigation.fetchStart);
        setMetrics(prev => ({ ...prev, loadTime }));
      }
    };

    // Attendre que la page soit complètement chargée
    if (document.readyState === 'complete') {
      measureLoadTime();
    } else {
      window.addEventListener('load', measureLoadTime);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(memoryInterval);
      window.removeEventListener('load', measureLoadTime);
    };
  }, []);

  return metrics;
}

/**
 * Hook pour mesurer le temps de rendu d'un composant
 */
export function useRenderTime(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (import.meta.env.DEV) {
        console.log(`[Render Time] ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    };
  });
}

/**
 * Hook pour détecter les slow renders (> 16ms = < 60 FPS)
 */
export function useSlowRenderDetection(componentName: string, threshold = 16) {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime;
      
      if (renderTime > threshold && import.meta.env.DEV) {
        console.warn(
          `⚠️ [Slow Render] ${componentName} took ${renderTime.toFixed(2)}ms (threshold: ${threshold}ms)`
        );
      }
    };
  });
}
