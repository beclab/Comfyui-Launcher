<template>
  <div class="comfyui-status">
    <div class="status-indicator" :class="{ 'online': isConnected, 'offline': !isConnected }">
      ComfyUI {{ isConnected ? '在线' : '离线' }}
    </div>
    
    <div class="model-stats" v-if="isConnected">
      <div class="stat-item">
        <strong>已安装模型:</strong> {{ installedModelsCount }}
      </div>
      <div class="stat-item">
        <strong>可用模型:</strong> {{ availableModelsCount }}
      </div>
    </div>
    
    <!-- 添加启动/停止按钮 -->
    <div class="control-buttons">
      <q-btn 
        v-if="!isConnected" 
        color="positive" 
        icon="play_arrow" 
        label="启动" 
        @click="startComfyUI"
        :loading="isStarting"
      />
      <q-btn 
        v-else 
        color="negative" 
        icon="stop" 
        label="停止" 
        @click="stopComfyUI"
        :loading="isStopping"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
import { modelsApi, Model } from '../api';
import api from '../api';
import { useQuasar } from 'quasar';

export default defineComponent({
  name: 'ComfyUIStatus',
  
  setup() {
    const $q = useQuasar();
    const isConnected = ref(false);
    const models = ref<Model[]>([]);
    const isStarting = ref(false);
    const isStopping = ref(false);
    
    const checkConnection = async () => {
      try {
        // 检查 ComfyUI 连接状态
        const response = await api.getStatus();
        isConnected.value = response.status === 200 && response.body.running;
        
        if (isConnected.value) {
          // 如果连接正常，获取模型列表
          models.value = await modelsApi.getModels('local');
        }
      } catch (error) {
        isConnected.value = false;
        console.error('连接 ComfyUI 失败:', error);
      }
    };
    
    // 启动 ComfyUI
    const startComfyUI = async () => {
      try {
        isStarting.value = true;
        await api.startComfyUI();
        $q.notify({
          type: 'positive',
          message: 'ComfyUI 正在启动，请稍候...'
        });
        // 等待启动完成
        setTimeout(async () => {
          await checkConnection();
          isStarting.value = false;
        }, 5000);
      } catch (error) {
        isStarting.value = false;
        $q.notify({
          type: 'negative',
          message: '启动 ComfyUI 失败'
        });
        console.error('启动 ComfyUI 失败:', error);
      }
    };
    
    // 停止 ComfyUI
    const stopComfyUI = async () => {
      try {
        isStopping.value = true;
        await api.stopComfyUI();
        $q.notify({
          type: 'info',
          message: 'ComfyUI 已停止'
        });
        isConnected.value = false;
        isStopping.value = false;
      } catch (error) {
        isStopping.value = false;
        $q.notify({
          type: 'negative',
          message: '停止 ComfyUI 失败'
        });
        console.error('停止 ComfyUI 失败:', error);
      }
    };
    
    // 计算已安装模型数量
    const installedModelsCount = computed(() => {
      return models.value.filter(model => model.installed).length;
    });
    
    // 计算可用模型总数
    const availableModelsCount = computed(() => {
      return models.value.length;
    });
    
    // 定期检查连接状态
    let intervalId: number | null = null;
    onMounted(() => {
      checkConnection();
      intervalId = window.setInterval(checkConnection, 30000); // 每30秒检查一次
    });
    
    onUnmounted(() => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    });
    
    return {
      isConnected,
      installedModelsCount,
      availableModelsCount,
      startComfyUI,
      stopComfyUI,
      isStarting,
      isStopping
    };
  }
});
</script>

<style scoped>
.comfyui-status {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 15px;
}

.status-indicator {
  padding: 5px 10px;
  border-radius: 4px;
  font-weight: bold;
}

.status-indicator.online {
  background-color: #4CAF50;
  color: white;
}

.status-indicator.offline {
  background-color: #f44336;
  color: white;
}

.model-stats {
  display: flex;
  gap: 15px;
}

.stat-item {
  font-size: 0.9em;
}

.control-buttons {
  margin-left: auto;
}
</style> 