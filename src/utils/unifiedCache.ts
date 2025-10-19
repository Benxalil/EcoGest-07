/**
 * Cache unifié simplifié - Memory-only
 * Réduit de 434 lignes → 80 lignes (-82%)
 * 
 * ⚠️ NOTE: Pour les données fetched via hooks, utilisez React Query (@tanstack/react-query)
 * Ce cache est uniquement pour des cas spéciaux hors React Query.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 100;

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  deleteByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Instance globale unique
export const unifiedCache = new SimpleCache();

// TTL unifiés (consolidés)
export const CacheTTL = {
  STATIC: 10 * 60 * 1000,      // 10 min - classes, subjects, config
  SEMI_DYNAMIC: 5 * 60 * 1000,  // 5 min - students, teachers, schedules
  DYNAMIC: 2 * 60 * 1000,       // 2 min - grades, payments
  REALTIME: 30 * 1000,          // 30 sec - notifications
} as const;

// Clés standardisées (simplifiées)
export const CacheKeys = {
  userProfile: (userId: string) => `user:${userId}`,
  teacherId: (userId: string) => `teacher:${userId}`,
  dashboard: (userId: string, role: string) => `dash:${userId}:${role}`,
} as const;
