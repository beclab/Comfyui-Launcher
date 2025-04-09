<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">模型管理</div>
    <q-separator class="q-mb-md" />

    <div class="row items-center justify-between q-mb-md">
      <div class="col">
        <div class="custom-tabs-container">
          <q-btn-toggle
            v-model="activeTab"
            toggle-color="primary"
            :options="[
              {label: '模型库', value: 'models'},
              {label: '操作历史', value: 'history'}
            ]"
            class="custom-tab-toggle"
            no-caps
            unelevated
            rounded
            spread
            
            active-class="custom-btn-active"
            inactive-class="custom-btn-inactive"
          />
        </div>
      </div>
      
      <div class="col-auto">
        <q-btn
          color="primary"
          icon="folder_open"
          label="打开模型目录"
          @click="openModelFolder"
          flat
        />
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
import { defineComponent, ref, provide } from 'vue';
import OptionalModelsCard from '../components/models/OptionalModelsCard.vue';
import InstalledModelsCard from '../components/models/InstalledModelsCard.vue';
import DownloadHistoryCard from '../components/models/DownloadHistoryCard.vue';
import api from '../api';

export default defineComponent({
  name: 'ModelsPage',
  components: {
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
    
    // 添加打开模型文件夹的方法
    const openModelFolder = async () => {
      try {
        // 调用API打开模型文件夹
        await api.post('system/open-folder', { folderType: 'models' });
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
.custom-tabs-container {
  max-width: 300px; /* 稍微减小整体宽度 */
}

.custom-tab-toggle {
  width: 100%;
  border-radius: 16px; /* 减小边框圆角 */
  border: 1px solid #e0e0e0;
  background-color: #f5f5f5;
  overflow: hidden;
}

/* 调整按钮样式 */
:deep(.q-btn-toggle .q-btn) {
  border-radius: 16px !important; /* 减小圆角 */
  padding: 8px 16px; /* 减小内边距，使按钮更紧凑 */
  min-height: 36px; /* 减小高度 */
}

/* 移除下划线 */
:deep(.q-btn-toggle .q-btn .q-btn__content) {
  position: relative;
}

/* 使用组件提供的类名来定义样式 */
:deep(.custom-btn-active) {
  background-color: #e8f0fe !important;
  color: #1976d2 !important;
  font-weight: 500 !important;
}

:deep(.custom-btn-inactive) {
  background-color: transparent !important;
  color: #5f6368 !important;
}

/* 可以保留原有的选择器作为后备 */
:deep(.q-btn-toggle .q-btn--active) {
  background-color: #e8f0fe !important;
  color: #1976d2 !important;
}

/* 增加选择器特异性，提高权重 */
:deep(.q-btn-toggle.custom-tab-toggle .q-btn--active),
:deep(.custom-tabs-container .q-btn-toggle .q-btn--active) {
  background-color: #e8f0fe !important;
  color: #1976d2 !important;
  font-weight: 500 !important;
}

/* 减小按钮之间的间距 */
:deep(.q-btn-toggle) {
  gap: 0; /* 移除间距 */
}

/* 可能需要调整按钮内边距来减少间距感 */
:deep(.q-btn-toggle .q-btn__content) {
  padding: 0 4px;
}
</style>