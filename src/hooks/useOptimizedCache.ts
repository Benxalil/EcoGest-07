import { useRef, useCallback, useMemo } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

type CacheEventListener = (key: string) => void;

class OptimizedCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 15 * 60 * 1000; // 15 minutes pour données peu changeantes
  private maxSize = 100; // Augmenter la taille pour plus de données
  private listeners = new Map<string, Set<CacheEventListener>>();

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

  // Invalidate cache by prefix
  invalidateByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
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

  // Event system for cache invalidation notifications
  on(event: string, listener: CacheEventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: string, listener: CacheEventListener): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  private emit(event: string, key: string): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(key));
    }
  }

  // Enhanced delete with event emission
  deleteWithEvent(key: string): void {
    this.cache.delete(key);
    this.emit('invalidate', key);
  }

  // Enhanced invalidateByPrefix with event emission
  invalidateByPrefixWithEvent(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        this.emit('invalidate', key);
      }
    }
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

  const invalidateByPrefix = useCallback((prefix: string): void => 
    cacheRef.current.invalidateByPrefix(prefix), []);

  const on = useCallback((event: string, listener: CacheEventListener): void => 
    cacheRef.current.on(event, listener), []);

  const off = useCallback((event: string, listener: CacheEventListener): void => 
    cacheRef.current.off(event, listener), []);

  const deleteWithEvent = useCallback((key: string): void => 
    cacheRef.current.deleteWithEvent(key), []);

  const invalidateByPrefixWithEvent = useCallback((prefix: string): void => 
    cacheRef.current.invalidateByPrefixWithEvent(prefix), []);

  return useMemo(() => ({
    get,
    set,
    has,
    clear,
    delete: deleteKey,
    getStats,
    invalidateByPrefix,
    on,
    off,
    deleteWithEvent,
    invalidateByPrefixWithEvent
  }), [get, set, has, clear, deleteKey, getStats, invalidateByPrefix, on, off, deleteWithEvent, invalidateByPrefixWithEvent]);
};