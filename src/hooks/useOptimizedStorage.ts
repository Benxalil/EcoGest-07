import { useState, useEffect, useCallback } from 'react';
import { unifiedCache, CacheTTL } from '@/utils/unifiedCache';

/**
 * Optimized storage hook that combines localStorage with in-memory caching
 * Reduces synchronous localStorage access by using intelligent caching
 */
export function useOptimizedStorage<T>(
  key: string,
  initialValue: T,
  ttl: number = CacheTTL.SEMI_DYNAMIC // 5 minutes default
) {
  // Initialize state with cached or localStorage value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Check cache first (fast)
      const cachedValue = unifiedCache.get<T>(key);
      if (cachedValue !== null) {
        return cachedValue;
      }

      // Fallback to localStorage (slower)
      const item = window.localStorage.getItem(key);
      const value = item ? JSON.parse(item) : initialValue;

      // Store in cache for future access
      unifiedCache.set(key, value, ttl);

      return value;
    } catch (error) {
      console.error(`Error reading storage key "${key}":`, error);
      return initialValue;
    }
  });

  // Optimized setValue with batching
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;

      // Update state immediately
      setStoredValue(valueToStore);

      // Update cache (synchronous, fast)
      unifiedCache.set(key, valueToStore, ttl);

      // Batch localStorage writes to avoid blocking
      requestIdleCallback(() => {
        try {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
          console.error(`Error writing to localStorage key "${key}":`, error);
        }
      }, { timeout: 2000 });
    } catch (error) {
      console.error(`Error setting value for key "${key}":`, error);
    }
  }, [key, storedValue, ttl]);

  // Remove value
  const removeValue = useCallback(() => {
    try {
      unifiedCache.delete(key);
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = JSON.parse(e.newValue);
          setStoredValue(newValue);
          unifiedCache.set(key, newValue, ttl);
        } catch (error) {
          console.error('Error syncing storage change:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, ttl]);

  return [storedValue, setValue, removeValue] as const;
}

// Polyfill for requestIdleCallback
if (typeof window !== 'undefined' && !('requestIdleCallback' in window)) {
  (window as any).requestIdleCallback = function(callback: any, options?: any) {
    const timeout = options?.timeout || 1000;
    const start = Date.now();
    return setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, timeout - (Date.now() - start))
      });
    }, 1);
  };
}
