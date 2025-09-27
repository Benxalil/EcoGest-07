import { useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class OptimizedCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private maxSize = 50; // Prevent memory leaks

  set<T>(key: string, data: T, ttl?: number): void {
    // Clean up expired entries if cache is getting full
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache stats for debugging
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Single global instance to avoid memory leaks
const globalCache = new OptimizedCacheManager();

export const useOptimizedCache = () => {
  const cacheRef = useRef(globalCache);

  const get = useCallback(<T>(key: string): T | null => 
    cacheRef.current.get<T>(key), []);

  const set = useCallback(<T>(key: string, data: T, ttl?: number): void => 
    cacheRef.current.set(key, data, ttl), []);

  const has = useCallback((key: string): boolean => 
    cacheRef.current.has(key), []);

  const clear = useCallback((): void => 
    cacheRef.current.clear(), []);

  const deleteKey = useCallback((key: string): void => 
    cacheRef.current.delete(key), []);

  const getStats = useCallback(() => 
    cacheRef.current.getStats(), []);

  return {
    get,
    set,
    has,
    clear,
    delete: deleteKey,
    getStats
  };
};