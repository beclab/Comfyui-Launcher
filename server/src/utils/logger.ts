import winston from 'winston';
import i18n from './i18n';

// Logger interface to match existing functionality
interface LoggerInterface {
  info: (message: string | object, ...meta: any[]) => void;
  warn: (message: string | object, ...meta: any[]) => void;
  error: (message: string | object, ...meta: any[]) => void;
  debug: (message: string | object, ...meta: any[]) => void;
}

// Format for logs
const logFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  // Add timestamp to log entry
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${
    Object.keys(metadata).length ? JSON.stringify(metadata) : ''
  }`;
});

// Create Winston logger
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
    logFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

/**
 * i18n logger wrapper
 * Translates log messages according to the current language
 */
class I18nLogger implements LoggerInterface {
  private locale: string;
  
  constructor(locale = 'en') {
    this.locale = locale;
  }

  setLocale(locale: string): I18nLogger {
    this.locale = locale;
    return this;
  }

  getLocale(): string {
    return this.locale;
  }

  isInitialized(): boolean {
    return i18n.isInitialized;
  }

  translate(key: string, options: object = {}): string {
    return i18n.t(key, { lng: this.locale, ...options });
  }

  // Log methods with translation
  t(key: string, options: object = {}, meta: object = {}): string {
    const message = this.translate(key, options);
    winstonLogger.info(message, meta);
    return message;
  }

  // Log methods with translation
  error(key: string | object, options: object = {}, meta: object = {}): string {
    // Support legacy usage
    if (typeof key !== 'string') {
      winstonLogger.error(String(key), options);
      return String(key);
    }
    
    const message = this.translate(key, options);
    winstonLogger.error(message, meta);
    return message;
  }

  warn(key: string | object, options: object = {}, meta: object = {}): string {
    // Support legacy usage
    if (typeof key !== 'string') {
      winstonLogger.warn(String(key), options);
      return String(key);
    }
    
    const message = this.translate(key, options);
    winstonLogger.warn(message, meta);
    return message;
  }

  info(key: string | object, options: object = {}, meta: object = {}): string {
    // Support legacy usage
    if (typeof key !== 'string') {
      winstonLogger.info(String(key), options);
      return String(key);
    }
    
    const message = this.translate(key, options);
    winstonLogger.info(message, meta);
    return message;
  }

  debug(key: string | object, options: object = {}, meta: object = {}): string {
    // Support legacy usage
    if (typeof key !== 'string') {
      if (process.env.DEBUG) {
        winstonLogger.debug(String(key), options);
      }
      return String(key);
    }
    
    const message = this.translate(key, options);
    if (process.env.DEBUG) {
      winstonLogger.debug(message, meta);
    }
    return message;
  }

  // Direct logging without translation
  log(level: string, message: string, meta: object = {}): string {
    winstonLogger.log(level, message, meta);
    return message;
  }
}

// Legacy logger API (backward compatible with your existing code)
export const logger = {
  info: (...args: any[]): void => {
    console.log(...args);
  },
  
  warn: (...args: any[]): void => {
    console.warn(...args);
  },
  
  error: (...args: any[]): void => {
    console.error(...args);
  },
  
  debug: (...args: any[]): void => {
    if (process.env.DEBUG) {
      console.debug(...args);
    }
  }
};

// Export i18n logger
export const i18nLogger = new I18nLogger(process.env.DEFAULT_LANGUAGE || 'en');

// Export for usage with .t method
export default i18nLogger; 