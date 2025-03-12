/**
 * 简单的日志记录工具
 */
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