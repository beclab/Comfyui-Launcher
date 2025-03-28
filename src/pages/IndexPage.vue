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
    <comfy-u-i-status/>

    <!-- 网络环境组件 -->
    <network-environment-panel/>

    <!-- 文件夹访问组件 -->
    <folder-access-panel />

    <!-- 资源包安装组件 -->
    <package-install-panel />

    <!-- 底部支持链接 -->
    <SupportLinks />
  </q-page>
</template>

<script lang="ts" setup>
import ComfyUIStatus from '../components/ComfyUIStatus.vue';
import SupportLinks from '../components/SupportLinks.vue';
import FolderAccessPanel from 'components/folder/FolderAccessPanel.vue';
import PackageInstallPanel from 'components/package/PackageInstallPanel.vue';
import NetworkEnvironmentPanel from '../components/network/NetworkEnvironmentPanel.vue';

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
</style>
