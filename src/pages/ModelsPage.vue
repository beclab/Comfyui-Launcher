<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5 text-primary">模型管理中心</div>
      
      <!-- 添加全局语言选择器 -->
      <q-select
        v-model="selectedLanguage"
        :options="languageOptions"
        dense
        outlined
        emit-value
        map-options
        options-dense
        style="min-width: 120px"
        label="语言/Language"
        @update:model-value="onLanguageChange"
      />
    </div>

    <q-tabs
      v-model="activeTab"
      dense
      class="text-primary q-mb-md"
      align="justify"
      narrow-indicator
    >
      <q-tab name="models" icon="model_training" label="模型管理" />
      <q-tab name="history" icon="history" label="下载历史" />
    </q-tabs>

    <q-tab-panels v-model="activeTab" animated>
      <q-tab-panel name="models">
        <!-- 2. 基础模型安装区域 -->
        <EssentialModelsCard />
        
        <!-- 3. 可选模型库 -->
        <OptionalModelsCard />
        
        <!-- 4. 已安装模型管理 -->
        <InstalledModelsCard />
      </q-tab-panel>

      <q-tab-panel name="history">
        <!-- 下载历史记录 - 传递语言参数 -->
        <DownloadHistoryCard :preferred-language="selectedLanguage" />
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref, provide } from 'vue';
import EssentialModelsCard from '../components/models/EssentialModelsCard.vue';
import OptionalModelsCard from '../components/models/OptionalModelsCard.vue';
import InstalledModelsCard from '../components/models/InstalledModelsCard.vue';
import DownloadHistoryCard from '../components/models/DownloadHistoryCard.vue';

export default defineComponent({
  name: 'ModelsPage',
  components: {
    EssentialModelsCard,
    OptionalModelsCard,
    InstalledModelsCard,
    DownloadHistoryCard
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
    
    return {
      activeTab,
      selectedLanguage,
      languageOptions,
      onLanguageChange
    };
  }
});
</script>