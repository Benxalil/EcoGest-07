/**
 * Advanced performance monitoring system
 * Tracks and reports performance metrics in real-time
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'navigation' | 'resource' | 'measure' | 'custom';
}

interface PerformanceThreshold {
  warning: number;
  critical: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  
  private thresholds: Record<string, PerformanceThreshold> = {
    FCP: { warning: 1800, critical: 3000 },
    LCP: { warning: 2500, critical: 4000 },
    FID: { warning: 100, critical: 300 },
    CLS: { warning: 0.1, critical: 0.25 },
    TTFB: { warning: 600, critical: 1000 }
  };

  initialize() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    this.observeNavigationTiming();
    this.observePaint();
    this.observeLargestContentfulPaint();
    this.observeLayoutShift();
    this.observeFirstInputDelay();
    this.observeResourceTiming();
    
    // Report metrics after page load
    if (document.readyState === 'complete') {
      this.reportInitialMetrics();
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => this.reportInitialMetrics(), 0);
      });
    }
  }

  private observeNavigationTiming() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      this.recordMetric('TTFB', navigation.responseStart - navigation.requestStart, 'navigation');
      this.recordMetric('DOM-Interactive', navigation.domInteractive - navigation.fetchStart, 'navigation');
      this.recordMetric('DOM-Complete', navigation.domComplete - navigation.fetchStart, 'navigation');
      this.recordMetric('Load-Complete', navigation.loadEventEnd - navigation.fetchStart, 'navigation');
    }
  }

  private observePaint() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric('FCP', entry.startTime, 'custom');
            this.checkThreshold('FCP', entry.startTime);
          }
        }
      });
      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Paint timing not supported');
    }
  }

  private observeLargestContentfulPaint() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('LCP', lastEntry.startTime, 'custom');
        this.checkThreshold('LCP', lastEntry.startTime);
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('LCP not supported');
    }
  }

  private observeLayoutShift() {
    try {
      let clsScore = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsScore += (entry as any).value;
            this.recordMetric('CLS', clsScore, 'custom');
            this.checkThreshold('CLS', clsScore);
          }
        }
      });
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Layout shift not supported');
    }
  }

  private observeFirstInputDelay() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fid = (entry as any).processingStart - entry.startTime;
          this.recordMetric('FID', fid, 'custom');
          this.checkThreshold('FID', fid);
        }
      });
      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('FID not supported');
    }
  }

  private observeResourceTiming() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resource = entry as PerformanceResourceTiming;
          const duration = resource.responseEnd - resource.startTime;
          
          // Alert on slow resources (>2s for network requests)
          if (duration > 2000) {
            console.warn(`Slow resource detected: ${resource.name} (${Math.round(duration)}ms)`);
          }
        }
      });
      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Resource timing not supported');
    }
  }

  private recordMetric(name: string, value: number, type: PerformanceMetric['type']) {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      type
    });

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
  }

  private checkThreshold(metricName: string, value: number) {
    const threshold = this.thresholds[metricName];
    if (!threshold) return;

    if (value > threshold.critical) {
      console.error(`🔴 CRITICAL: ${metricName} is ${Math.round(value)}ms (threshold: ${threshold.critical}ms)`);
    } else if (value > threshold.warning) {
      console.warn(`🟡 WARNING: ${metricName} is ${Math.round(value)}ms (threshold: ${threshold.warning}ms)`);
    } else {
      console.log(`🟢 GOOD: ${metricName} is ${Math.round(value)}ms`);
    }
  }

  private reportInitialMetrics() {
    console.group('📊 Performance Metrics');
    
    const fcpMetric = this.metrics.find(m => m.name === 'FCP');
    const lcpMetric = this.metrics.find(m => m.name === 'LCP');
    const ttfbMetric = this.metrics.find(m => m.name === 'TTFB');
    
    if (fcpMetric) {
      console.log(`First Contentful Paint: ${Math.round(fcpMetric.value)}ms`);
    }
    if (lcpMetric) {
      console.log(`Largest Contentful Paint: ${Math.round(lcpMetric.value)}ms`);
    }
    if (ttfbMetric) {
      console.log(`Time to First Byte: ${Math.round(ttfbMetric.value)}ms`);
    }
    
    console.groupEnd();
  }

  /**
   * Measure custom operations
   */
  measureOperation<T>(name: string, operation: () => T): T {
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;
    
    performance.mark(startMark);
    const result = operation();
    performance.mark(endMark);
    
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];
      this.recordMetric(name, measure.duration, 'measure');
      
      if (measure.duration > 50) {
        console.warn(`Slow operation: ${name} took ${Math.round(measure.duration)}ms`);
      }
    } catch (error) {
      console.warn(`Could not measure ${name}`);
    }
    
    return result;
  }

  /**
   * Measure async operations
   */
  async measureAsyncOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;
    
    this.recordMetric(name, duration, 'measure');
    
    if (duration > 100) {
      console.warn(`Slow async operation: ${name} took ${Math.round(duration)}ms`);
    }
    
    return result;
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    return [...this.metrics];
  }

  /**
   * Get metrics summary
   */
  getSummary() {
    const summary: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    for (const metric of this.metrics) {
      if (!summary[metric.name]) {
        summary[metric.name] = { avg: 0, min: Infinity, max: -Infinity, count: 0 };
      }
      
      const s = summary[metric.name];
      s.count++;
      s.min = Math.min(s.min, metric.value);
      s.max = Math.max(s.max, metric.value);
      s.avg = ((s.avg * (s.count - 1)) + metric.value) / s.count;
    }
    
    return summary;
  }

  /**
   * Clear all metrics and observers
   */
  destroy() {
    this.metrics = [];
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();
