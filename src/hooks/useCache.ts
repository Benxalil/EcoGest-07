import { useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
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
}

// Instance globale du cache
const cacheManager = new CacheManager();

export const useCache = () => {
  const cacheRef = useRef(cacheManager);

  return {
    get: <T>(key: string): T | null => cacheRef.current.get<T>(key),
    set: <T>(key: string, data: T, ttl?: number): void => cacheRef.current.set(key, data, ttl),
    has: (key: string): boolean => cacheRef.current.has(key),
    clear: (): void => cacheRef.current.clear(),
    delete: (key: string): void => cacheRef.current.delete(key)
  };
};
