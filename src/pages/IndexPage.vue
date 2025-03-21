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
    
    <!-- 快速启动区域 -->
    <div class="dashboard-container q-mt-lg">
      <h5 class="text-center q-mb-md">管理中心</h5>
      
      <div class="row q-col-gutter-md">
        <!-- 模型管理 -->
        <div class="col-xs-12 col-sm-6 col-md-4">
          <q-card class="dashboard-card" clickable @click="$router.push('/models')">
            <q-card-section class="column items-center">
              <q-icon name="storage" size="3rem" color="primary" />
              <div class="text-h6 q-mt-sm">模型管理</div>
              <p class="text-center q-mb-none text-grey-7">下载和管理SD模型、LoRA和VAE</p>
            </q-card-section>
          </q-card>
        </div>
        
        <!-- 插件管理 -->
        <div class="col-xs-12 col-sm-6 col-md-4">
          <q-card class="dashboard-card" clickable @click="$router.push('/plugins')">
            <q-card-section class="column items-center">
              <q-icon name="extension" size="3rem" color="deep-purple-5" />
              <div class="text-h6 q-mt-sm">插件管理</div>
              <p class="text-center q-mb-none text-grey-7">安装和管理ComfyUI扩展节点</p>
            </q-card-section>
          </q-card>
        </div>
        
        <!-- 系统管理 -->
        <div class="col-xs-12 col-sm-6 col-md-4">
          <q-card class="dashboard-card" clickable @click="$router.push('/reset')">
            <q-card-section class="column items-center">
              <q-icon name="restore" size="3rem" color="amber-8" />
              <div class="text-h6 q-mt-sm">系统重置</div>
              <p class="text-center q-mb-none text-grey-7">还原初始状态和清理磁盘空间</p>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
    
    <!-- 使用指南 -->
    <div class="q-mt-xl">
      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6"><q-icon name="help_outline" class="q-mr-sm" />快速指南</div>
        </q-card-section>
        
        <q-separator />
        
        <q-card-section>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <p class="text-body1 q-mb-sm"><strong>1. 启动 ComfyUI</strong></p>
              <p class="q-mb-md">使用顶部的控制面板启动ComfyUI服务，等待启动完成。</p>
              
              <p class="text-body1 q-mb-sm"><strong>2. 管理模型</strong></p>
              <p>从模型库中下载SD模型、LoRA和控制网络等资源。</p>
            </div>
            
            <div class="col-12 col-md-6">
              <p class="text-body1 q-mb-sm"><strong>3. 扩展功能</strong></p>
              <p class="q-mb-md">安装插件以获取更多节点和功能，提升工作流能力。</p>
              
              <p class="text-body1 q-mb-sm"><strong>4. 创建图像</strong></p>
              <p>一切准备就绪后，使用ComfyUI界面开始创建令人惊叹的AI图像。</p>
            </div>
          </div>
        </q-card-section>
      </q-card>
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
