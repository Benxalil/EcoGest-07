/**
 * Intelligent HTTP cache for API responses
 * Reduces redundant network requests and speeds up data loading
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
}

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
}

class HTTPCache {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();
  
  private defaultConfig: CacheConfig = {
    ttl: 5 * 60 * 1000, // 5 minutes
    strategy: 'stale-while-revalidate'
  };

  /**
   * Get cached data or fetch from network
   */
  async get<T>(
    key: string,
    fetchFn: () => Promise<T>,
    config: Partial<CacheConfig> = {}
  ): Promise<T> {
    const { ttl, strategy } = { ...this.defaultConfig, ...config };

    // Deduplicate concurrent requests
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    const cached = this.cache.get(key);
    const now = Date.now();

    switch (strategy) {
      case 'cache-first':
        if (cached && now - cached.timestamp < ttl) {
          return cached.data;
        }
        return this.fetchAndCache(key, fetchFn);

      case 'network-first':
        try {
          return await this.fetchAndCache(key, fetchFn);
        } catch (error) {
          if (cached) {
            console.warn(`Network failed, using stale cache for ${key}`);
            return cached.data;
          }
          throw error;
        }

      case 'stale-while-revalidate':
      default:
        if (cached) {
          // Return stale data immediately
          const result = cached.data;
          
          // Revalidate in background if stale
          if (now - cached.timestamp >= ttl) {
            this.fetchAndCache(key, fetchFn).catch(error => {
              console.warn(`Background revalidation failed for ${key}:`, error);
            });
          }
          
          return result;
        }
        return this.fetchAndCache(key, fetchFn);
    }
  }

  /**
   * Fetch data and store in cache
   */
  private async fetchAndCache<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const promise = fetchFn();
    this.pendingRequests.set(key, promise);

    try {
      const data = await promise;
      this.cache.set(key, {
        data,
        timestamp: Date.now()
      });
      return data;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Invalidate cache by key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate cache by prefix
   */
  invalidateByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Prefetch data and store in cache
   */
  async prefetch<T>(key: string, fetchFn: () => Promise<T>): Promise<void> {
    if (!this.cache.has(key) && !this.pendingRequests.has(key)) {
      await this.fetchAndCache(key, fetchFn);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const httpCache = new HTTPCache();

/**
 * Parallel fetch utility for independent requests
 */
export async function fetchParallel<T extends Record<string, () => Promise<any>>>(
  requests: T
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const keys = Object.keys(requests);
  const promises = keys.map(key => requests[key]());
  
  const results = await Promise.all(promises);
  
  return keys.reduce((acc, key, index) => {
    acc[key as keyof T] = results[index];
    return acc;
  }, {} as any);
}
