import { i18nLogger } from './utils/i18n';
import logger from './utils/logger';

// 测试不同的语言
const testLanguages = ['en', 'zh'];

// 测试一些翻译键
const testKeys = [
  'download.status.success',
  'download.status.failed',
  'download.error_types.canceled'
];

// 执行测试
async function testTranslations() {
  logger.info('开始测试翻译功能...');
  
  for (const lang of testLanguages) {
    logger.info(`测试语言: ${lang}`);
    
    for (const key of testKeys) {
      const translated = i18nLogger.translate(key, { lng: lang });
      logger.info(`键: ${key}, 翻译: ${translated}`);
    }
  }
  
  logger.info('翻译测试完成');
}

// 运行测试
testTranslations().catch(err => {
  logger.error(`测试失败: ${err}`);
}); 