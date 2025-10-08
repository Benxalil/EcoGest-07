/**
 * Utilitaire pour gérer les retries avec backoff exponentiel
 * Particulièrement utile pour gérer les erreurs ERR_INSUFFICIENT_RESOURCES
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 100,
  maxDelay: 2000,
  backoffMultiplier: 2,
};

/**
 * Exécute une fonction avec retry et backoff exponentiel
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error | null = null;
  let delay = opts.initialDelay;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Ne pas retry si ce n'est pas une erreur réseau
      const isNetworkError = 
        error?.message?.includes('fetch') ||
        error?.message?.includes('INSUFFICIENT_RESOURCES') ||
        error?.code === 'PGRST301' ||
        error?.code === 'PGRST302';

      if (!isNetworkError || attempt === opts.maxRetries) {
        throw error;
      }

      // Attendre avant le prochain essai
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Augmenter le délai pour le prochain essai
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
      
      console.log(`Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delay}ms`);
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Wrapper pour les requêtes Supabase avec retry automatique
 */
export async function supabaseWithRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: RetryOptions = {}
): Promise<{ data: T | null; error: any }> {
  return retryWithBackoff(async () => {
    const result = await queryFn();
    
    // Si erreur, throw pour déclencher le retry
    if (result.error) {
      throw result.error;
    }
    
    return result;
  }, options);
}
