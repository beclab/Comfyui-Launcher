<template>
  <div>
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
          @click="checkAndStartComfyUI"
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

    <!-- 添加日志显示区域 -->
    <q-card v-if="showLogs" class="q-mt-md log-container">
      <q-expansion-item
        v-model="logsExpanded"
        icon="report_problem"
        label="ComfyUI 启动日志"
        header-class="bg-red-1 text-red-9"
        expand-icon-class="text-red-9"
        default-opened
      >
        <q-card>
          <q-card-section>
            <div class="text-subtitle2 q-mb-sm">启动过程中发生错误，请查看以下日志信息：</div>
            <q-scroll-area style="height: 300px;" class="bg-grey-1">
              <div class="q-pa-sm log-content">
                <div v-for="(log, index) in logs" :key="index" :class="{'log-error': log.includes('ERROR')}">
                  {{ log }}
                </div>
                <div v-if="logs.length === 0" class="text-grey-6 text-center q-pa-md">
                  正在加载日志...
                </div>
              </div>
            </q-scroll-area>
            <div class="row justify-end q-mt-md">
              <q-btn flat dense color="primary" icon="refresh" @click="fetchLogs" label="刷新日志" />
              <q-btn flat dense color="negative" icon="close" @click="showLogs = false" label="关闭" />
            </div>
          </q-card-section>
        </q-card>
      </q-expansion-item>
    </q-card>
    
    <!-- 自定义确认对话框 -->
    <q-dialog v-model="showConfirmDialog" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="warning" text-color="white" />
          <span class="q-ml-sm">缺少基础模型</span>
        </q-card-section>

        <q-card-section>
          您尚未安装所有必要的基础模型，这可能导致ComfyUI无法正常生成图像。是否继续启动？
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="去安装模型" color="primary" @click="goToModels" />
          <q-btn flat label="仍然启动" color="negative" @click="confirmStartComfyUI" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
import { modelsApi, Model } from '../api';
import api from '../api';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';

// 定义模型接口
interface EssentialModel {
  name: string;
  type: string;
  size?: number;
  url?: string;
}

interface InstalledModel {
  name: string;
  type: string;
  installed: boolean;
  path?: string;
  size?: number | string;
}

export default defineComponent({
  name: 'ComfyUIStatus',
  
  setup() {
    const $q = useQuasar();
    const router = useRouter();
    const isConnected = ref(false);
    const models = ref<Model[]>([]);
    const isStarting = ref(false);
    const isStopping = ref(false);
    const essentialModels = ref<EssentialModel[]>([]);
    const installedModels = ref<InstalledModel[]>([]);
    
    // 添加对话框控制变量
    const showConfirmDialog = ref(false);
    
    // 添加日志相关变量
    const showLogs = ref(false);
    const logsExpanded = ref(true);
    const logs = ref<string[]>([]);
    
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
    
    // 获取ComfyUI日志
    const fetchLogs = async () => {
      try {
        const response = await api.getLogs();
        if (response && response.body && response.body.logs) {
          logs.value = response.body.logs;
        } else {
          logs.value = ['无法获取日志数据'];
        }
      } catch (error) {
        console.error('获取日志失败:', error);
        logs.value = ['获取日志失败，请稍后重试'];
      }
    };
    
    // 检查基础模型是否已安装
    const checkEssentialModels = async () => {
      try {
        // 获取必要基础模型列表
        const essentialResponse = await api.getEssentialModels();
        if (essentialResponse && essentialResponse.body) {
          essentialModels.value = Array.isArray(essentialResponse.body) ? essentialResponse.body : [];
        }
        
        // 获取已安装模型列表
        const installedResponse = await api.getModels();
        if (installedResponse && installedResponse.body) {
          installedModels.value = Array.isArray(installedResponse.body) 
            ? installedResponse.body.filter((model: InstalledModel) => model.installed) 
            : [];
        }
        
        // 检查是否所有基础模型都已安装
        return essentialModels.value.every(essModel => 
          installedModels.value.some(insModel => insModel.name === essModel.name)
        );
      } catch (error) {
        console.error('检查基础模型失败:', error);
        return false;
      }
    };
    
    // 修改检查基础模型并启动ComfyUI的方法
    const checkAndStartComfyUI = async () => {
      const allEssentialModelsInstalled = await checkEssentialModels();
      
      if (!allEssentialModelsInstalled) {
        // 显示自定义对话框
        showConfirmDialog.value = true;
      } else {
        // 所有基础模型已安装，直接启动
        startComfyUI();
      }
    };
    
    // 确认启动ComfyUI
    const confirmStartComfyUI = () => {
      showConfirmDialog.value = false;
      startComfyUI();
    };
    
    // 前往模型页面
    const goToModels = () => {
      showConfirmDialog.value = false;
      router.push('/models');
    };
    
    // 启动 ComfyUI
    const startComfyUI = async () => {
      try {
        isStarting.value = true;
        showLogs.value = false; // 重置日志显示状态
        
        const response = await api.startComfyUI();
        
        // 检查服务器返回的响应状态和结构
        console.log('ComfyUI启动响应:', response);
        
        if (response && response.body && response.body.success) {
          $q.notify({
            type: 'positive',
            message: 'ComfyUI 正在启动，请稍候...'
          });
          
          // 等待启动完成
          setTimeout(async () => {
            await checkConnection();
            isStarting.value = false;
          }, 5000);
        } else {
          isStarting.value = false;
          
          // 启动失败时显示错误通知
          $q.notify({
            type: 'negative',
            message: response?.body?.message || '启动 ComfyUI 失败'
          });
          
          // 确保无论如何都能显示日志区域
          if (response?.body?.logs && response.body.logs.length > 0) {
            console.log('收到日志数据，长度:', response.body.logs.length);
            logs.value = response.body.logs;
            showLogs.value = true;
            logsExpanded.value = true; // 确保日志区域展开
          } else {
            // 否则尝试获取日志
            await fetchLogs();
            showLogs.value = true;
            logsExpanded.value = true; // 确保日志区域展开
          }
        }
      } catch (error) {
        isStarting.value = false;
        $q.notify({
          type: 'negative',
          message: '启动 ComfyUI 失败'
        });
        console.error('启动 ComfyUI 失败:', error);
        
        // 启动异常时尝试获取日志
        await fetchLogs();
        showLogs.value = true;
        logsExpanded.value = true; // 确保日志区域展开
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
      checkAndStartComfyUI,
      isStarting,
      isStopping,
      showConfirmDialog,
      confirmStartComfyUI,
      goToModels,
      // 添加日志相关的返回值
      showLogs,
      logsExpanded,
      logs,
      fetchLogs
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

/* 添加日志相关样式 */
.log-container {
  border-left: 4px solid #f44336;
  margin-top: 15px;
}

.log-content {
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
}

.log-error {
  color: #f44336;
  font-weight: bold;
}
</style> 