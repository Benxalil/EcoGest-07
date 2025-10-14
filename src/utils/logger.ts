/**
 * Système de Logging Centralisé pour EcoGest
 * 
 * Utilisation :
 * - logger.debug() : logs de développement (désactivés en production)
 * - logger.info() : informations générales
 * - logger.warn() : avertissements
 * - logger.error() : erreurs (envoyées à Supabase en production)
 * - logger.critical() : erreurs critiques nécessitant attention immédiate
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
type LogCategory = 'auth' | 'database' | 'api' | 'ui' | 'business' | 'security';

interface LogContext {
  schoolId?: string;
  userId?: string;
  component?: string;
  action?: string;
  [key: string]: any;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  category?: LogCategory;
  error?: Error;
}

class Logger {
  private isDevelopment: boolean;
  private logLevel: LogLevel;
  private recentLogs: Map<string, number> = new Map(); // Pour rate limiting
  private rateLimitWindow = 5000; // 5 secondes
  private auditLogCallback?: (entry: LogEntry) => void;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.logLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || (this.isDevelopment ? 'debug' : 'warn');
  }

  /**
   * Enregistre un callback pour envoyer les logs à Supabase
   */
  setAuditLogCallback(callback: (entry: LogEntry) => void) {
    this.auditLogCallback = callback;
  }

  /**
   * Vérifie si le log doit être affiché selon le niveau configuré
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'critical'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const requestedLevelIndex = levels.indexOf(level);
    return requestedLevelIndex >= currentLevelIndex;
  }

  /**
   * Rate limiting pour éviter de spammer la console
   */
  private isRateLimited(key: string): boolean {
    const now = Date.now();
    const lastLog = this.recentLogs.get(key);
    
    if (lastLog && now - lastLog < this.rateLimitWindow) {
      return true;
    }
    
    this.recentLogs.set(key, now);
    
    // Nettoyer les anciennes entrées
    if (this.recentLogs.size > 100) {
      const oldKeys = Array.from(this.recentLogs.entries())
        .filter(([_, time]) => now - time > this.rateLimitWindow)
        .map(([key]) => key);
      oldKeys.forEach(k => this.recentLogs.delete(k));
    }
    
    return false;
  }

  /**
   * Formate le log pour l'affichage console
   */
  private formatConsoleLog(entry: LogEntry): void {
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      critical: '🚨'
    };

    const style = {
      debug: 'color: #888',
      info: 'color: #0ea5e9',
      warn: 'color: #f59e0b',
      error: 'color: #ef4444',
      critical: 'color: #dc2626; font-weight: bold'
    };

    const prefix = `${emoji[entry.level]} [${entry.level.toUpperCase()}]`;
    const contextStr = entry.context ? JSON.stringify(entry.context, null, 2) : '';
    
    if (entry.error) {
      console.groupCollapsed(`%c${prefix} ${entry.message}`, style[entry.level]);
      if (contextStr) console.log('Context:', entry.context);
      console.error('Error:', entry.error);
      if (entry.error.stack) console.log('Stack:', entry.error.stack);
      console.groupEnd();
    } else {
      console.log(`%c${prefix} ${entry.message}`, style[entry.level], contextStr ? entry.context : '');
    }
  }

  /**
   * Méthode interne de logging
   */
  private log(level: LogLevel, message: string, contextOrError?: LogContext | Error, category?: LogCategory): void {
    if (!this.shouldLog(level)) return;

    // Rate limiting
    const rateLimitKey = `${level}:${message}`;
    if (level === 'debug' && this.isRateLimited(rateLimitKey)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      category
    };

    // Distinguer context et error
    if (contextOrError instanceof Error) {
      entry.error = contextOrError;
    } else if (contextOrError) {
      entry.context = contextOrError;
    }

    // Afficher dans la console
    this.formatConsoleLog(entry);

    // Envoyer à Supabase pour les erreurs en production
    if (!this.isDevelopment && (level === 'error' || level === 'critical') && this.auditLogCallback) {
      try {
        this.auditLogCallback(entry);
      } catch (err) {
        console.error('Failed to send audit log:', err);
      }
    }
  }

  /**
   * Logs de développement (désactivés en production)
   */
  debug(message: string, context?: LogContext, category?: LogCategory): void {
    this.log('debug', message, context, category);
  }

  /**
   * Informations générales
   */
  info(message: string, context?: LogContext, category?: LogCategory): void {
    this.log('info', message, context, category);
  }

  /**
   * Avertissements
   */
  warn(message: string, context?: LogContext, category?: LogCategory): void {
    this.log('warn', message, context, category);
  }

  /**
   * Erreurs (envoyées à Supabase en production)
   */
  error(message: string, error: Error | LogContext, context?: LogContext, category?: LogCategory): void {
    if (error instanceof Error) {
      this.log('error', message, error, category);
      // Si un contexte supplémentaire est fourni
      if (context) {
        this.log('error', `${message} - Context`, context, category);
      }
    } else {
      this.log('error', message, error, category);
    }
  }

  /**
   * Erreurs critiques nécessitant attention immédiate
   */
  critical(message: string, error: Error | LogContext, context?: LogContext, category?: LogCategory): void {
    if (error instanceof Error) {
      this.log('critical', message, error, category);
      if (context) {
        this.log('critical', `${message} - Context`, context, category);
      }
    } else {
      this.log('critical', message, error, category);
    }
  }

  /**
   * Helper pour logger les performances
   */
  perf(label: string, startTime: number, context?: LogContext): void {
    const duration = Date.now() - startTime;
    this.debug(`⏱️ ${label}: ${duration}ms`, { ...context, duration }, 'business');
  }
}

// Instance singleton
export const logger = new Logger();
