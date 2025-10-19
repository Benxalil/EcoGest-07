// Performance optimization utilities

// Debounce function to limit expensive operations
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Throttle function to limit function calls
export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Local storage optimization with error handling
export const optimizedStorage = {
  get: (key: string) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return null;
    }
  },
  
  set: (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
    }
  },
  
  remove: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  },
  
  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
};

// Performance measurement utilities
export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`${name} took ${end - start} milliseconds`);
};

export const measureAsyncPerformance = async (name: string, fn: () => Promise<void>) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  console.log(`${name} took ${end - start} milliseconds`);
};

// Clean up function for old/abandoned localStorage data (conservative)
export const cleanupAbandonedData = () => {
  try {
    const keysToCheck = [];
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        keysToCheck.push(key);
      }
    }
    
    // Only remove truly abandoned data (with timestamps older than 7 days)
    const keysToRemove = keysToCheck.filter(key => {
      try {
        const item = localStorage.getItem(key);
        if (!item) return false;
        
        // Try to parse as JSON to check for timestamp
        const data = JSON.parse(item);
        if (data.timestamp && typeof data.timestamp === 'number') {
          return (now - data.timestamp) > maxAge;
        }
        return false;
      } catch {
        return false; // Keep items that can't be parsed
      }
    });
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Failed to remove key ${key}:`, error);
      }
    });
    
    if (keysToRemove.length > 0) {
      console.log(`Cleaned up ${keysToRemove.length} abandoned localStorage keys`);
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

// Store cleanup functions globally for proper cleanup
let unhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;
let performanceObserver: PerformanceObserver | null = null;

// Initialize performance optimizations (bfcache compatible)
export const initializePerformanceOptimizations = () => {
  // Clean up old localStorage data
  cleanupAbandonedData();
  
  // Set up error handling for unhandled promise rejections
  if (!unhandledRejectionHandler) {
    unhandledRejectionHandler = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    };
    window.addEventListener('unhandledrejection', unhandledRejectionHandler);
  }
  
  // Performance observer for measuring page performance
  if ('PerformanceObserver' in window && !performanceObserver) {
    performanceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          console.log(`Performance measure: ${entry.name} - ${entry.duration}ms`);
        }
      }
    });
    
    performanceObserver.observe({ entryTypes: ['measure'] });
  }

  // 🔄 Cleanup pour bfcache - nettoyer avant mise en cache
  window.addEventListener('pagehide', cleanupPerformanceOptimizations);
};

// Cleanup function pour bfcache
export const cleanupPerformanceOptimizations = () => {
  if (unhandledRejectionHandler) {
    window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
    unhandledRejectionHandler = null;
  }
  
  if (performanceObserver) {
    performanceObserver.disconnect();
    performanceObserver = null;
  }
};