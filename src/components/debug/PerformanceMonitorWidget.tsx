import React, { useState } from 'react';
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Cpu, Clock, RefreshCw } from 'lucide-react';

/**
 * Widget de monitoring des performances en temps réel
 * ✅ Affiche FPS, mémoire, temps de chargement
 * ✅ Indicateurs visuels pour performances dégradées
 * ✅ Minimisable pour ne pas gêner le développement
 * 
 * À utiliser uniquement en développement
 */
export function PerformanceMonitorWidget() {
  const [isMinimized, setIsMinimized] = useState(false);
  const { fps, memory, loadTime, renderCount } = usePerformanceMetrics();

  // Déterminer la couleur selon les performances
  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'bg-green-500';
    if (fps >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getMemoryColor = (memory: number) => {
    if (memory < 100) return 'bg-green-500';
    if (memory < 200) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (!import.meta.env.DEV) return null;

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-background border rounded-full shadow-lg hover:shadow-xl transition-shadow"
        title="Ouvrir le moniteur de performances"
      >
        <Activity className="w-5 h-5" />
      </button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 p-4 w-64 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Performances
        </h3>
        <button
          onClick={() => setIsMinimized(true)}
          className="text-muted-foreground hover:text-foreground"
          title="Minimiser"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        {/* FPS */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">FPS</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getFPSColor(fps)}`} />
            <Badge variant="secondary">{fps}</Badge>
          </div>
        </div>

        {/* Mémoire */}
        {memory > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Mémoire</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getMemoryColor(memory)}`} />
              <Badge variant="secondary">{memory}MB</Badge>
            </div>
          </div>
        )}

        {/* Temps de chargement */}
        {loadTime > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Chargement</span>
            </div>
            <Badge variant="secondary">{loadTime}ms</Badge>
          </div>
        )}

        {/* Nombre de renders */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Renders</span>
          </div>
          <Badge variant="secondary">{renderCount}</Badge>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
        💡 Cible: 60 FPS, &lt;100MB
      </div>
    </Card>
  );
}
