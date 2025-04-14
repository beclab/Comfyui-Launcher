import { boot } from 'quasar/wrappers';
import { createI18n } from 'vue-i18n';
import messages from 'src/i18n';

// Type-define 'en-US' as the master schema for the resource
type MessageSchema = typeof messages['en-US'];

// 获取浏览器语言并匹配支持的语言
function getLocale(): 'zh-CN' | 'en-US' {
  // 先检查本地存储中是否有保存的语言偏好
  const savedLocale = localStorage.getItem('language');
  if (savedLocale === 'en-US' || savedLocale === 'zh-CN') {
    return savedLocale;
  }
  
  // 获取浏览器语言
  const browserLang = navigator.language;
  
  // 检查浏览器语言是否为中文
  if (browserLang.startsWith('zh')) {
    return 'zh-CN';
  }
  
  // 默认使用英文
  return 'en-US';
}

// 创建i18n实例
const i18n = createI18n<[MessageSchema], 'en-US' | 'zh-CN'>({
  locale: getLocale(),
  legacy: false,
  messages,
});

export default boot(({ app }) => {
  // 将i18n实例设置到应用上
  app.use(i18n);
});

// 导出i18n实例以便在组件中使用
export { i18n }; 