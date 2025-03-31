<template>
  <q-page class="my-page-container">

    <title-view :title="t('menu.inspiration_discovery')" />

    <!-- 标签页区域 -->
    <div class="q-mt-md">
      <q-tabs
        v-model="tab"
        class="text-primary"
        active-color="primary"
        indicator-color="primary"
        align="justify"
      >
        <q-tab name="latestModels" label="最新模型" />
        <q-tab name="hotModels" label="最火模型" />
        <q-tab name="latestWorkflows" label="最新工作流" />
        <q-tab name="hotWorkflows" label="最火工作流" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="tab" animated>
        <q-tab-panel name="latestModels">
          <LatestModels />
        </q-tab-panel>

        <q-tab-panel name="hotModels">
          <HotModels />
        </q-tab-panel>

        <q-tab-panel name="latestWorkflows">
          <LatestWorkflows />
        </q-tab-panel>

        <q-tab-panel name="hotWorkflows">
          <HotWorkflows />
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import LatestModels from '../components/models/LatestModels.vue';
import HotModels from '../components/models/HotModels.vue';
import LatestWorkflows from '../components/workflows/LatestWorkflows.vue';
import HotWorkflows from '../components/workflows/HotWorkflows.vue';
import TitleView from 'components/base/TitleView.vue';
import { useI18n } from 'vue-i18n';

// 设置当前激活的标签页
const tab = ref('latestModels');
const { t } = useI18n();
</script>

<style scoped>
h1 {
  margin-bottom: 20px;
}

.discovery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.discovery-card {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.discovery-card:hover {
  transform: translateY(-5px);
}

.card-image {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.card-content {
  padding: 15px;
}

.card-content h3 {
  margin-top: 0;
  margin-bottom: 10px;
}

.card-content p {
  margin: 0;
  color: #666;
}
</style>
