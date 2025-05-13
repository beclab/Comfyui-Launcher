// 模型描述翻译工具

// 基础词典 - 常见模型描述的中英文对照
const baseDictionary: Record<string, string> = {
  // 模型类型
  'checkpoint': '基础模型',
  'Checkpoint': '基础模型',
  'LoRA': 'LoRA微调模型',
  'lora': 'LoRA微调模型',
  'ControlNet': 'ControlNet控制模型',
  'controlnet': 'ControlNet控制模型',
  'VAE': '变分自编码器',
  'vae': '变分自编码器',
  'upscaler': '超分辨率模型',
  'Upscaler': '超分辨率模型',
  'motion': '动画模型',
  'Motion': '动画模型',
  'adapter': '适配器',
  'Adapter': '适配器',
  'model': '模型',
  'Model': '模型',
  'inpainting': '修复',
  'Inpainting': '修复',
  'face': '人脸',
  'Face': '人脸',
  'restoration': '修复',
  'Restoration': '修复',
  'segmentation': '分割',
  'Segmentation': '分割',
  'detection': '检测',
  'Detection': '检测',
  
  // 常见完整描述
  'AnimateDiff Adapter LORA(SD1.5)': 'AnimateDiff适配器LORA模型(SD1.5)',
  'Stable Diffusion checkpoint': 'Stable Diffusion基础模型',
  'ControlNet model': 'ControlNet控制模型',
  'LoRA model': 'LoRA微调模型',
  'VAE model': 'VAE变分自编码器',
  'IP-Adapter model': 'IP-Adapter图像提示适配器',
  'Upscaler model': '图像超分辨率模型',
  'Embedding': '文本嵌入模型',
  'Motion module': '动画模块',
  'Face restoration model': '人脸修复模型'
};

// localStorage缓存key
const TRANSLATION_CACHE_KEY = 'model_desc_translations';

// 从localStorage加载缓存
function loadCache(): Record<string, string> {
  try {
    const cached = localStorage.getItem(TRANSLATION_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (e) {
    console.error('Failed to load translation cache:', e);
    return {};
  }
}

// 保存到localStorage缓存
function saveCache(cache: Record<string, string>): void {
  try {
    localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Failed to save translation cache:', e);
  }
}

// 使用在线翻译API
async function translateOnline(text: string, from = 'en', to = 'zh'): Promise<string | null> {
  try {
    // 使用免费的LibreTranslate API (也可以替换为其他服务)
    const response = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      body: JSON.stringify({
        q: text,
        source: from,
        target: to,
        format: 'text'
      }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    if (result && result.translatedText) {
      return result.translatedText;
    }
    return null;
  } catch (error) {
    console.error('Online translation failed:', error);
    return null;
  }
}

// 可以添加备选的翻译服务
async function backupTranslate(text: string): Promise<string | null> {
  try {
    // 这里可以实现调用自己的后端翻译代理
    const response = await fetch('/api/translate', {
      method: 'POST',
      body: JSON.stringify({ text, from: 'en', to: 'zh' }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    if (result && result.translation) {
      return result.translation;
    }
    return null;
  } catch (error) {
    console.error('Backup translation failed:', error);
    return null;
  }
}

// 翻译类
export class ModelTranslator {
  private dictionary: Record<string, string>;
  private cache: Record<string, string>;
  private pendingTranslations: Map<string, Promise<string>>;
  
  constructor() {
    this.dictionary = { ...baseDictionary };
    this.cache = loadCache();
    this.pendingTranslations = new Map();
    
    // 合并缓存到词典
    Object.assign(this.dictionary, this.cache);
  }
  
  // 同步翻译 - 只使用词典和缓存
  translate(text: string): string {
    if (!text) return '';
    
    // 检查是否有完整文本的翻译
    if (this.dictionary[text]) {
      return this.dictionary[text];
    }
    
    // 尝试进行部分匹配翻译
    let translated = text;
    
    // 遍历词典尝试替换关键词
    Object.entries(this.dictionary).forEach(([source, target]) => {
      // 避免替换太短的词，防止错误替换
      if (source.length < 3) return;
      
      const regex = new RegExp(source, 'g');
      translated = translated.replace(regex, target);
    });
    
    // 如果确实进行了翻译（结果与原文不同），则返回翻译后的文本
    if (translated !== text) {
      // 缓存这个新的翻译
      if (!this.cache[text]) {
        this.cache[text] = translated;
        saveCache(this.cache);
      }
      return translated;
    }
    
    // 如果本地翻译失败，尝试在线翻译（异步处理）
    this.translateAsync(text).catch(console.error);
    
    // 返回原文，异步翻译完成后会更新缓存
    return text;
  }
  
  // 异步翻译 - 使用在线API
  async translateAsync(text: string): Promise<string> {
    if (!text) return '';
    
    // 如果已经在词典中，直接返回
    if (this.dictionary[text]) {
      return this.dictionary[text];
    }
    
    // 检查是否已经有正在进行的翻译请求
    if (this.pendingTranslations.has(text)) {
      return this.pendingTranslations.get(text) || text;
    }
    
    // 创建新的翻译请求
    const translationPromise = (async () => {
      try {
        // 先尝试主要的在线翻译服务
        let translated = await translateOnline(text);
        
        // 如果主服务失败，尝试备用服务
        if (!translated) {
          translated = await backupTranslate(text);
        }
        
        // 如果成功获取翻译，更新缓存
        if (translated && translated !== text) {
          this.dictionary[text] = translated;
          this.cache[text] = translated;
          saveCache(this.cache);
          return translated;
        }
        
        return text; // 如果所有翻译尝试都失败，返回原文
      } finally {
        // 请求完成后，从待处理列表中移除
        this.pendingTranslations.delete(text);
      }
    })();
    
    // 存储正在进行的翻译请求
    this.pendingTranslations.set(text, translationPromise);
    
    return translationPromise;
  }
  
  // 添加新的翻译条目
  addTranslation(source: string, target: string): void {
    this.dictionary[source] = target;
    this.cache[source] = target;
    saveCache(this.cache);
  }
  
  // 获取缓存大小
  getCacheSize(): number {
    return Object.keys(this.cache).length;
  }
  
  // 清除缓存
  clearCache(): void {
    this.cache = {};
    saveCache({});
  }
}

// 导出单例实例
export const translator = new ModelTranslator(); 