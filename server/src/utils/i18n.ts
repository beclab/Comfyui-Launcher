import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import path from 'path';
import fs from 'fs';

// 确保使用绝对路径
const localesPath = path.resolve(__dirname, '../locales');

/**
 * Initialize i18next for logging
 */
const i18n = i18next.createInstance();

i18n
  .use(Backend)
  .init({
    // Debug mode
    debug: process.env.NODE_ENV !== 'production',
    
    // Supported languages
    supportedLngs: ['en', 'zh', 'ja'],
    
    // Default language
    fallbackLng: 'en',
    
    // Namespace for logs
    ns: ['translation', 'logs'],
    defaultNS: 'translation',
    
    // Path to language files
    backend: {
      loadPath: path.join(localesPath, '{{lng}}', '{{ns}}.json'),
      addPath: path.join(localesPath, '{{lng}}', '{{ns}}.missing.json'),
    },
    
    // Don't use keys as fallback
    saveMissing: false,
    
    // Cache translations in memory
    cache: {
      enabled: true,
    },
    
    // Allow objects as keys
    keySeparator: '.',
    nsSeparator: ':',
    
    interpolation: {
      escapeValue: false
    }
  });

// 创建一个带有 i18n 功能的日志工具
export const i18nLogger = {
  translate: (key: string, options?: any) => {
    // 尝试从 logs 命名空间获取翻译
    let translated = i18n.t(key, { ...options, ns: 'logs' });
    
    // 如果返回的是key本身，说明没有找到翻译，尝试log一下
    if (translated === key) {
      console.warn(`No translation found for key: ${key}, language: ${options?.lng || i18n.language}`);
    }
    
    return translated;
  },
  
  getLocale: () => i18n.language,
  
  // 添加其他需要的方法...
};

export function ensureTranslationFiles() {
  const languages = ['en', 'zh'];
  const namespaces = ['translation', 'logs'];
  
  for (const lang of languages) {
    for (const ns of namespaces) {
      const filePath = path.join(localesPath, lang, `${ns}.json`);
      try {
        if (!fs.existsSync(path.dirname(filePath))) {
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
        }
        
        if (!fs.existsSync(filePath)) {
          // 创建空对象作为基本翻译文件
          fs.writeFileSync(filePath, '{}', 'utf8');
          console.log(`Created empty translation file: ${filePath}`);
        }
      } catch (err) {
        console.error(`Failed to ensure translation file ${filePath}:`, err);
      }
    }
  }
}

// 然后在应用启动时调用
ensureTranslationFiles();

export default i18n; 