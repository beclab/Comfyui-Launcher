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
    
    <!-- 首页内容区 -->
    <div class="row q-col-gutter-md q-mt-md">
      <div class="col-12">
        <q-card class="dashboard-card">
          <q-card-section>
            <h5 class="q-mt-sm q-mb-xs">欢迎使用 ComfyUI 管理器</h5>
            <p>通过侧边栏导航来管理您的 ComfyUI 环境，或点击"探索发现"查看最新的模型和工作流。</p>
          </q-card-section>
          <q-card-actions>
            <q-btn flat color="primary" to="/discovery">
              前往探索发现页面
            </q-btn>
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ComfyUIStatus from '../components/ComfyUIStatus.vue';

export default defineComponent({
  name: 'IndexPage',
  components: {
    ComfyUIStatus
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
