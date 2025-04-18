<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">{{ $t('modelsPage.title') }}</div>
    <q-separator class="q-mb-md" style="margin-bottom: 40px; margin-top: 30px;"/>

    <div class="row items-center justify-between q-mb-md">
      <div>
        <TabToggle
          v-model="activeTab"
          :options="[
            {label: $t('modelsPage.modelLibrary'), value: 'models'},
            {label: $t('modelsPage.operationHistory'), value: 'history'}
          ]"
        />
      </div>
      
      <div class="col-auto">
        <q-btn
          color="primary"
          icon="folder_open"
          label=""
          @click="openModelFolder"
          flat
          style="color: var(--button-text-color);"
        >{{ $t('modelsPage.openModelDir') }}</q-btn>
        
      </div>
    </div>

    <div>
      <div v-show="activeTab === 'models'">
        <InstalledModelsCard class="q-mb-md" />
        <OptionalModelsCard />
      </div>

      <div v-show="activeTab === 'history'">
        <DownloadHistoryCard :preferred-language="selectedLanguage" />
      </div>
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref, provide, onMounted } from 'vue';
import OptionalModelsCard from '../components/models/OptionalModelsCard.vue';
import InstalledModelsCard from '../components/models/InstalledModelsCard.vue';
import DownloadHistoryCard from '../components/models/DownloadHistoryCard.vue';
import TabToggle from 'src/components/common/TabToggle.vue';
import api from '../api';

export default defineComponent({
  name: 'ModelsPage',
  components: {
    OptionalModelsCard,
    InstalledModelsCard,
    DownloadHistoryCard,
    TabToggle
  },
  setup() {
    const activeTab = ref('models');
    
    // 添加语言选择相关变量
    const selectedLanguage = ref('zh');
    const languageOptions = [
      { label: '中文', value: 'zh' },
      { label: 'English', value: 'en' },
      { label: '日本語', value: 'ja' },
      { label: '한국어', value: 'ko' }
    ];
    
    // 添加iframe检测变量
    const isInIframe = ref(false);
    
    // 语言变更处理函数
    const onLanguageChange = (lang: string) => {
      // 存储用户语言选择到本地存储
      localStorage.setItem('preferredLanguage', lang);
    };
    
    // 组件挂载时从本地存储加载语言设置
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang) {
      selectedLanguage.value = storedLang;
    }
    
    // 使用provide向子组件提供语言设置
    provide('language', selectedLanguage);
    
    // 检查是否在iframe中运行
    onMounted(() => {
      try {
        isInIframe.value = window.self !== window.top;
      } catch (e) {
        // 如果出现跨域问题，假设我们在iframe中
        isInIframe.value = true;
      }
    });
    
    // 修改打开模型文件夹的方法
    const openModelFolder = async () => {
      const modelPath = '/Files/External/ai/model/';
      console.log('Opening model folder:', modelPath);
      
      try {
        if (isInIframe.value) {
          // 如果在iframe中，使用原始方法
          await api.openPath(modelPath);
          console.log('Model folder opened successfully in iframe mode');
        } else {
          // 如果不在iframe中，在新页面中打开
          const hostname = window.location.hostname;
          const parts = hostname.split('.');
          parts[0] = 'files';
          const filesDomain = parts.join('.');
          const url = `https://${filesDomain}${modelPath}`;
          window.open(url, '_blank');
          console.log('Model folder opened in new tab:', url);
        }
      } catch (error) {
        console.error('打开模型文件夹失败:', error);
      }
    };
    
    return {
      activeTab,
      selectedLanguage,
      languageOptions,
      onLanguageChange,
      openModelFolder
    };
  }
});
</script>

<style scoped>
.text-h5 {
  color: var(--text-important);
  font-size: 40px; /* 假设默认字号为 16px */
  font-weight: bold;
}
/* 删除所有重复的样式，因为我们现在使用共享的 tab-styles.css */
</style>