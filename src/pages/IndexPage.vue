<template>
  <q-page class="index-page-container ">
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
    
    <div style="height: 1px; width: 100%; background-color: gainsboro; margin-bottom: 50px;"></div>
    
    <!-- 网络环境组件 -->
    <NetworkEnvironment />
    
    <!-- 文件夹访问组件 -->
    <div class="q-my-md">
      <FolderAccess />
    </div>
    
    <!-- 资源包安装组件 -->
    <div class="q-my-md">
      <PackageInstall />
    </div>
    
    <!-- 底部支持链接 -->
    <div class="footer-wrapper">
      <SupportLinks />
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ComfyUIStatus from '../components/ComfyUIStatus.vue';
import NetworkEnvironment from '../components/NetworkEnvironment.vue';
import FolderAccess from '../components/FolderAccess.vue';
import PackageInstall from '../components/PackageInstall.vue';
import SupportLinks from '../components/SupportLinks.vue';

export default defineComponent({
  name: 'IndexPage',
  components: {
    ComfyUIStatus,
    NetworkEnvironment,
    FolderAccess,
    PackageInstall,
    SupportLinks
  }
});
</script>

<style scoped>
.index-page-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 16px;
}

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

.footer-wrapper {
  margin-top: auto;
  width: 100%;
  border-top: 1px solid #eee;
}
</style>
