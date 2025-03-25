<template>
  <q-page padding>
    <div class="text-h5 q-mb-md text-primary">模型管理中心</div>

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
        <!-- 下载历史记录 -->
        <DownloadHistoryCard />
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
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
    
    return {
      activeTab
    };
  }
});
</script>