<template>
  <q-page class="flex flex-center column q-pa-md">
    <div class="text-center q-mb-lg">
      <img src="~assets/comfyui-logo.png" style="width: 150px; height: auto" alt="ComfyUI Logo">
      <h4 class="q-mt-md q-mb-xs">ComfyUI 管理器</h4>
    </div>
    
    <div class="status-indicator q-mb-lg">
      <q-circular-progress
        :value="100"
        size="150px"
        :thickness="0.2"
        :color="comfyStatus ? 'positive' : 'negative'"
        track-color="grey-3"
        class="q-mb-md"
      >
        <div class="text-center">
          <q-icon :name="comfyStatus ? 'check_circle' : 'cancel'" size="50px" :color="comfyStatus ? 'positive' : 'negative'" />
        </div>
      </q-circular-progress>
      <div class="text-h6 text-center">
        {{ comfyStatus ? 'ComfyUI 已启动' : 'ComfyUI 未启动' }}
      </div>
    </div>
    
    <div class="q-gutter-md">
      <q-btn v-if="!comfyStatus" color="primary" label="启动 ComfyUI" icon="play_arrow" size="lg" @click="startComfyUI" :loading="loading" />
      <q-btn v-else color="negative" label="停止 ComfyUI" icon="stop" size="lg" @click="stopComfyUI" :loading="loading" />
    </div>
    
    <div class="q-mt-xl feature-buttons">
      <div class="text-h6 q-mb-md text-center">快速导航</div>
      <div class="row q-col-gutter-md justify-center">
        <div class="col-xs-12 col-sm-6 col-md-3">
          <q-card class="feature-card" clickable @click="$router.push('/models')">
            <q-card-section class="text-center">
              <q-icon name="storage" size="3rem" color="primary" />
              <div class="text-h6 q-mt-sm">模型管理</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-xs-12 col-sm-6 col-md-3">
          <q-card class="feature-card" clickable @click="$router.push('/plugins')">
            <q-card-section class="text-center">
              <q-icon name="extension" size="3rem" color="primary" />
              <div class="text-h6 q-mt-sm">插件管理</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-xs-12 col-sm-6 col-md-3">
          <q-card class="feature-card" clickable @click="$router.push('/reset')">
            <q-card-section class="text-center">
              <q-icon name="restore" size="3rem" color="primary" />
              <div class="text-h6 q-mt-sm">还原初始状态</div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script>
import { ref } from 'vue'
import api from '../api' // 引入 API 客户端

export default {
  name: 'IndexPage',
  setup() {
    const comfyStatus = ref(false)
    const loading = ref(false)
    
    // 检查ComfyUI状态
    const checkStatus = async () => {
      try {
        const response = await api.getStatus()
        comfyStatus.value = response.body.running
        console.log('获取状态成功:', response.body)
      } catch (error) {
        console.error('获取状态失败:', error)
      }
    }
    
    // 启动ComfyUI
    const startComfyUI = async () => {
      loading.value = true
      try {
        const response = await api.startComfyUI()
        if (response.body.success) {
          comfyStatus.value = true
          console.log('启动成功:', response.body)
        }
        loading.value = false
      } catch (error) {
        console.error('启动失败:', error)
        loading.value = false
      }
    }
    
    // 停止ComfyUI
    const stopComfyUI = async () => {
      loading.value = true
      try {
        const response = await api.stopComfyUI()
        if (response.body.success) {
          comfyStatus.value = false
          console.log('停止成功:', response.body)
        }
        loading.value = false
      } catch (error) {
        console.error('停止失败:', error)
        loading.value = false
      }
    }
    
    // 页面加载时检查状态
    checkStatus()
    
    return {
      comfyStatus,
      loading,
      startComfyUI,
      stopComfyUI
    }
  }
}
</script>

<style scoped>
.feature-card {
  transition: transform 0.3s;
  cursor: pointer;
}
.feature-card:hover {
  transform: translateY(-5px);
}
.status-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
