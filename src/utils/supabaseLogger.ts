/**
 * Wrapper pour les opérations Supabase avec logging automatique
 * 
 * Utilisation :
 * const { data, error } = await supabaseLogger.query(
 *   'students',
 *   () => supabase.from('students').select('*').eq('school_id', schoolId)
 * );
 */

import { logger } from './logger';
import type { PostgrestError } from '@supabase/supabase-js';

interface QueryOptions {
  context?: string;
  schoolId?: string;
  userId?: string;
  logSuccess?: boolean; // Par défaut false pour éviter trop de logs
  category?: 'auth' | 'database' | 'api' | 'ui' | 'business' | 'security';
}

interface QueryResult<T> {
  data: T | null;
  error: PostgrestError | null;
  duration?: number;
}

class SupabaseLogger {
  /**
   * Wrapper pour les requêtes Supabase avec logging automatique
   */
  async query<T>(
    tableName: string,
    queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const { context = 'query', logSuccess = false, schoolId, userId, category = 'database' } = options;

    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;

      // Logger les erreurs
      if (result.error) {
        logger.error(
          `Supabase query failed: ${tableName}`,
          result.error as any,
          {
            context,
            tableName,
            schoolId,
            userId,
            duration,
            errorCode: result.error.code,
            errorMessage: result.error.message,
            errorDetails: result.error.details,
            errorHint: result.error.hint
          },
          category
        );

        // Logger les erreurs RLS spécifiquement
        if (result.error.code === '42501' || result.error.message?.includes('row-level security')) {
          logger.error(
            'RLS Policy Violation',
            result.error as any,
            {
              context,
              tableName,
              schoolId,
              userId,
              hint: 'Vérifier les politiques RLS et les données du profil utilisateur'
            },
            'security'
          );
        }
      } 
      // Logger les succès si demandé (utile pour le debugging)
      else if (logSuccess) {
        const dataLength = Array.isArray(result.data) ? result.data.length : result.data ? 1 : 0;
        logger.debug(
          `Supabase query success: ${tableName}`,
          {
            context,
            tableName,
            schoolId,
            userId,
            duration,
            resultCount: dataLength
          },
          category
        );
      }

      // Logger les requêtes lentes (> 1 seconde)
      if (duration > 1000) {
        logger.warn(
          `Slow Supabase query: ${tableName}`,
          {
            context,
            tableName,
            schoolId,
            userId,
            duration,
            threshold: 1000
          },
          category
        );
      }

      return { ...result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.critical(
        `Supabase query exception: ${tableName}`,
        error as Error,
        {
          context,
            tableName,
          schoolId,
          userId,
          duration
        },
        category
      );

      return {
        data: null,
        error: {
          message: (error as Error).message || 'Unknown error',
          details: '',
          hint: '',
          code: 'EXCEPTION'
        } as PostgrestError,
        duration
      };
    }
  }

  /**
   * Wrapper pour les mutations (insert/update/delete)
   */
  async mutate<T>(
    operation: 'insert' | 'update' | 'delete',
    tableName: string,
    mutateFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    return this.query(
      tableName,
      mutateFn,
      {
        ...options,
        context: options.context || operation,
        logSuccess: true // Toujours logger les mutations réussies
      }
    );
  }

  /**
   * Wrapper pour les RPC calls
   */
  async rpc<T>(
    functionName: string,
    rpcFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    return this.query(
      `rpc:${functionName}`,
      rpcFn,
      {
        ...options,
        context: options.context || 'rpc',
        category: 'api'
      }
    );
  }

  /**
   * Logger pour les erreurs de storage
   */
  logStorageError(
    operation: string,
    bucket: string,
    error: Error,
    context?: Record<string, any>
  ): void {
    logger.error(
      `Storage operation failed: ${operation}`,
      error,
      {
        bucket,
        operation,
        ...context
      },
      'database'
    );
  }

  /**
   * Logger pour les erreurs d'authentification
   */
  logAuthError(
    operation: string,
    error: Error,
    context?: Record<string, any>
  ): void {
    logger.error(
      `Auth operation failed: ${operation}`,
      error,
      {
        operation,
        ...context
      },
      'auth'
    );
  }
}

// Instance singleton
export const supabaseLogger = new SupabaseLogger();
