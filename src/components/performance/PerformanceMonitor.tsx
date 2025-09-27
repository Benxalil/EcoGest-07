import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOptimizedCache } from '@/hooks/useOptimizedCache';

interface PerformanceMetrics {
  renderTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  activeHooks: number;
}

const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
    activeHooks: 0
  });
  const [isVisible, setIsVisible] = useState(false);
  const cache = useOptimizedCache();

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV === 'development') {
      setIsVisible(true);
      
      const measurePerformance = () => {
        const startTime = performance.now();
        
        // Simulate render measurement
        requestAnimationFrame(() => {
          const endTime = performance.now();
          const renderTime = endTime - startTime;
          
          const cacheStats = cache.getStats();
          
          setMetrics({
            renderTime: Math.round(renderTime * 100) / 100,
            cacheHitRate: Math.round((cacheStats.size / Math.max(cacheStats.size + 1, 1)) * 100),
            memoryUsage: Math.round((performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0),
            activeHooks: cacheStats.size
          });
        });
      };

      const interval = setInterval(measurePerformance, 2000);
      return () => clearInterval(interval);
    }
  }, [cache]);

  const clearCache = () => {
    cache.clear();
    setMetrics(prev => ({ ...prev, activeHooks: 0, cacheHitRate: 0 }));
  };

  const getPerformanceColor = (value: number, type: 'time' | 'rate' | 'memory') => {
    if (type === 'time') {
      if (value < 10) return 'success';
      if (value < 50) return 'warning';
      return 'destructive';
    }
    if (type === 'rate') {
      if (value > 80) return 'success';
      if (value > 60) return 'warning';
      return 'destructive';
    }
    if (type === 'memory') {
      if (value < 50) return 'success';
      if (value < 100) return 'warning';
      return 'destructive';
    }
    return 'secondary';
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="p-3 bg-background/95 backdrop-blur border shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold">Performance</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-6 w-6 p-0"
          >
            ×
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs">Render:</span>
            <Badge variant={getPerformanceColor(metrics.renderTime, 'time') as any}>
              {metrics.renderTime}ms
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs">Cache:</span>
            <Badge variant={getPerformanceColor(metrics.cacheHitRate, 'rate') as any}>
              {metrics.cacheHitRate}%
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs">Memory:</span>
            <Badge variant={getPerformanceColor(metrics.memoryUsage, 'memory') as any}>
              {metrics.memoryUsage}MB
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs">Hooks:</span>
            <Badge variant="secondary">{metrics.activeHooks}</Badge>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={clearCache}
            className="w-full h-6 text-xs"
          >
            Clear Cache
          </Button>
        </div>
      </Card>
    </div>
  );
};

export { PerformanceMonitor };