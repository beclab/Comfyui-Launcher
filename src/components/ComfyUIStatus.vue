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
    const isPolling = ref(true); // 标志控制轮询
    
    const fetchStatus = async () => {
      console.log('尝试获取ComfyUI状态...');
      try {
        // 使用相对路径（配合Vite代理）
        const response = await fetch('/api/status');
        if (!response.ok) {
          throw new Error(`HTTP错误! 状态码: ${response.status}`);
        }
        const data = await response.json();
        console.log('ComfyUI状态更新:', data);
        status.value = data;
      } catch (error) {
        console.error('获取状态失败:', error);
      }
      
      // 递归调用，实现轮询
      if (isPolling.value) {
        setTimeout(fetchStatus, 5000);
      }
    };
    
    const startComfyUI = async () => {
      starting.value = true;
      try {
        await api.post('/start');
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
        await api.post('/stop');
        await fetchStatus();
      } catch (error) {
        console.error('停止ComfyUI失败:', error);
      } finally {
        stopping.value = false;
      }
    };
    
    onMounted(() => {
      console.log('ComfyUIStatus组件已挂载，启动首次状态获取');
      // 启动轮询
      fetchStatus();
    });
    
    onUnmounted(() => {
      console.log('ComfyUIStatus组件卸载，停止轮询');
      // 设置标志以停止轮询
      isPolling.value = false;
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