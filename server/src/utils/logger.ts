/**
 * 简单的日志记录工具
 */
export const logger = {
  info: (message: string): void => {
    console.log(message);
  },
  
  warn: (message: string): void => {
    console.warn(message);
  },
  
  error: (message: string): void => {
    console.error(message);
  },
  
  debug: (message: string): void => {
    if (process.env.DEBUG) {
      console.debug(message);
    }
  }
}; 