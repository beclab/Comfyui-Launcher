<template>
  <div class="comfyui-status">
    <q-banner v-if="status.running" class="bg-positive text-white q-mb-md">
      <div class="row items-center">
        <q-icon name="check_circle" size="md" class="q-mr-sm" />
        <div>
          <div class="text-subtitle1">ComfyUI 正在运行</div>
          <div class="text-caption" v-if="status.uptime">已运行时间: {{ status.uptime }}</div>
        </div>
        <q-space />
        <q-btn 
          flat 
          dense 
          color="white" 
          label="停止" 
          @click="stopComfyUI" 
          :loading="stopping"
          :disable="stopping"
        >
          <template v-slot:loading>
            <q-spinner-dots />
          </template>
        </q-btn>
      </div>
    </q-banner>
    
    <q-banner v-else class="bg-negative text-white q-mb-md">
      <div class="row items-center">
        <q-icon name="error" size="md" class="q-mr-sm" />
        <div>
          <div class="text-subtitle1">ComfyUI 未运行</div>
        </div>
        <q-space />
        <q-btn 
          flat 
          dense 
          color="white" 
          label="启动" 
          @click="startComfyUI" 
          :loading="starting"
          :disable="starting"
        >
          <template v-slot:loading>
            <q-spinner-dots />
          </template>
        </q-btn>
      </div>
    </q-banner>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import api from '../api';

export default defineComponent({
  name: 'ComfyUIStatus',
  setup() {
    const status = ref({ running: false, uptime: '', pid: null });
    const starting = ref(false);
    const stopping = ref(false);
    let pollingInterval: number | null = null;
    
    const fetchStatus = async () => {
      try {
        const response = await api.get('/comfyui/status');
        status.value = response.data;
      } catch (error) {
        console.error('获取ComfyUI状态失败:', error);
      }
    };
    
    const startComfyUI = async () => {
      starting.value = true;
      try {
        await api.post('/comfyui/start');
        await fetchStatus();
      } catch (error) {
        console.error('启动ComfyUI失败:', error);
      } finally {
        starting.value = false;
      }
    };
    
    const stopComfyUI = async () => {
      stopping.value = true;
      try {
        await api.post('/comfyui/stop');
        await fetchStatus();
      } catch (error) {
        console.error('停止ComfyUI失败:', error);
      } finally {
        stopping.value = false;
      }
    };
    
    onMounted(() => {
      // 立即获取初始状态
      fetchStatus();
      
      // 设置定期轮询 (每5秒刷新一次)
      pollingInterval = window.setInterval(fetchStatus, 5000);
    });
    
    onUnmounted(() => {
      // 清除轮询定时器
      if (pollingInterval !== null) {
        clearInterval(pollingInterval);
      }
    });
    
    return {
      status,
      starting,
      stopping,
      startComfyUI,
      stopComfyUI
    };
  }
});
</script> 