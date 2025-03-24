<template>
  <q-page class="q-pa-md">
    <!-- 顶部标题区域 -->
    <!-- 
    <div class="text-center q-mb-md">
      <img src="~assets/comfyui-logo.png" style="width: 120px; height: auto" alt="ComfyUI Logo">
      <h4 class="q-mt-sm q-mb-none">ComfyUI 管理器</h4>
      <p class="text-grey-7">轻松管理您的 AI 图像生成工作流</p>
    </div>
    -->

    <!-- 状态控制区域 -->
    <div class="q-mb-lg">
      <ComfyUIStatus />
    </div>
    
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

<script lang="ts">
import { defineComponent, ref } from 'vue';
import ComfyUIStatus from '../components/ComfyUIStatus.vue';
import LatestModels from '../components/models/LatestModels.vue';
import HotModels from '../components/models/HotModels.vue';
import LatestWorkflows from '../components/workflows/LatestWorkflows.vue';
import HotWorkflows from '../components/workflows/HotWorkflows.vue';

export default defineComponent({
  name: 'IndexPage',
  components: {
    ComfyUIStatus,
    LatestModels,
    HotModels,
    LatestWorkflows,
    HotWorkflows
  },
  setup() {
    const tab = ref('latestModels');
    
    return {
      tab
    };
  }
});
</script>

<style scoped>
.dashboard-card {
  transition: all 0.3s ease;
  height: 100%;
  border-radius: 10px;
}

.dashboard-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.dashboard-container {
  margin-top: 30px;
}

h5 {
  font-weight: 500;
  color: #555;
}
</style>
