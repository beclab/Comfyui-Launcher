<template>
  <q-dialog
    v-model="isOpen"
    persistent
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card class="essential-models-dialog">
      <q-card-section class="bg-primary text-white">
        <div class="row items-center">
          <div class="col">
            <div class="text-h6">
              <q-icon name="verified" class="q-mr-sm" />
              必要基础模型安装
            </div>
            <div class="text-caption">这些模型对于ComfyUI的正常运行是必需的</div>
          </div>
          <div class="col-auto">
            <q-btn flat round icon="close" @click="closeDialog" />
          </div>
        </div>
      </q-card-section>
      
      <q-card-section>
        <!-- 下载源选择 -->
        <div class="row items-center q-mb-md">
          <div class="col-grow">
            <div class="text-subtitle1">基础模型包</div>
            <div class="text-caption">包含基本的SD模型、VAE和ControlNet模型</div>
          </div>
          <div class="col-auto">
            <q-select
              v-model="downloadSource"
              :options="downloadSourceOptions"
              label="下载源"
              dense
              outlined
              style="min-width: 180px"
              class="q-mr-md"
            />
            <q-btn 
              color="primary" 
              icon="download" 
              label="安装基础模型" 
              @click="downloadEssentialModels"
              :loading="isDownloading && !!downloadTaskId && !installing"
              :disable="isDownloading || allEssentialModelsInstalled"
            />
          </div>
        </div>
        
        <!-- 安装状态显示 -->
        <q-banner v-if="allEssentialModelsInstalled" class="bg-positive text-white q-mb-md">
          <template v-slot:avatar>
            <q-icon name="check_circle" />
          </template>
          基础模型已全部安装完成，您可以开始使用ComfyUI了。
        </q-banner>
        
        <q-banner v-else-if="!isDownloading" class="bg-warning text-white q-mb-md">
          <template v-slot:avatar>
            <q-icon name="warning" />
          </template>
          您尚未安装必要的基础模型，请点击"安装基础模型"按钮开始下载。
        </q-banner>
        
        <!-- 基础模型下载进度显示 -->
        <div v-if="isDownloading && downloadTaskId" class="download-progress-panel">
          <div class="progress-header">
            <div>
              <div class="text-subtitle1">正在下载基础模型</div>
              <span class="model-count-indicator">
                模型 {{ currentDownloadState.currentModelIndex + 1 }}/{{ essentialModels.length || 0 }}
              </span>
            </div>
            <q-btn flat color="negative" label="取消下载" icon="cancel" @click="cancelDownload" />
          </div>
          
          <div class="progress-details">
            <div class="text-subtitle2 q-mb-sm">
              {{ currentModel ? currentModel.name : '准备下载...' }}
              <q-chip size="sm" outline>{{ currentModel ? getModelTypeName(currentModel.type) : '' }}</q-chip>
            </div>
            
            <q-linear-progress
              :value="currentDownloadState.currentModelProgress / 100"
              size="20px"
              color="primary"
            >
              <div class="absolute-full flex flex-center">
                <q-badge color="white" text-color="primary" :label="`${formatPercentage(currentDownloadState.currentModelProgress)}%`" />
              </div>
            </q-linear-progress>
            
            <div class="download-stats q-mt-md">
              <div class="stat-item">
                <q-icon name="save" size="sm" />
                <span>文件大小: {{ formatFileSize(currentDownloadState.totalBytes) }}</span>
              </div>
              <div class="stat-item">
                <q-icon name="cloud_download" size="sm" />
                <span>已下载: {{ formatFileSize(currentDownloadState.downloadedBytes) }}</span>
              </div>
              <div class="stat-item">
                <q-icon name="speed" size="sm" />
                <span>下载速度: {{ formatSpeed(currentDownloadState.speed) }}</span>
              </div>
              <div class="stat-item">
                <q-icon name="percent" size="sm" />
                <span>总体进度: {{ currentDownloadState.overallProgress.toFixed(1) }}%</span>
              </div>
            </div>
          </div>
          
          <!-- 下载历史 -->
          <div class="download-history">
            <div class="text-subtitle2 q-mb-sm">下载历史</div>
            <div v-for="(log, index) in downloadLogs" :key="index" class="log-item">
              <q-badge
                :color="getLogBadgeColor(log.status)"
                :label="log.status"
              />
              <span>{{ log.message }}</span>
              <span class="log-time">{{ log.time }}</span>
            </div>
          </div>
        </div>
      </q-card-section>
      
      <q-card-actions align="right" class="bg-grey-1">
        <q-btn flat label="关闭" color="primary" @click="closeDialog" :disable="isDownloading" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import api from '../../api';
import type { EssentialModel, DownloadProgress } from '../../types/models';

// Download log item interface
interface DownloadLogItem {
  time: string;
  message: string;
  status: string;
}

// Current download state interface
interface CurrentDownloadState {
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  status: 'downloading' | 'completed' | 'error';
  error: string | null;
  overallProgress: number;
  currentModelIndex: number;
  currentModelProgress: number;
  currentModel: EssentialModel | null;
  completed: boolean;
  modelType?: string;
}

// Download progress mapping type
export interface ModelDownloadProgress {
  [key: string]: DownloadProgress;
}

// API response type
interface ApiResponse {
  data?: unknown;
  body?: unknown;
}

// Extract API response data function
const extractResponseData = async <T>(response: ApiResponse | Response | undefined): Promise<T | null> => {
  if (!response) return null;
  
  if (typeof response === 'object') {
    if ('data' in response && response.data !== undefined) return response.data as T;
    if ('body' in response && response.body !== undefined) {
      return response.body as T;
    }
    
    if (response instanceof Response) {
      try {
        return await response.json() as T;
      } catch (error) {
        console.error('Failed to parse response JSON:', error);
      }
    }
  }
  
  return null;
};

// Installed model interface
interface InstalledModel {
  name: string;
  type: string;
  installed: boolean;
  path?: string;
  size?: string | number;
  [key: string]: unknown;
}

export default defineComponent({
  name: 'EssentialModelsDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'installation-complete'],
  setup(props, { emit }) {
    const $q = useQuasar();
    const isOpen = ref(props.modelValue);
    
    // Local state
    const essentialModels = ref<EssentialModel[]>([]);
    const isLoading = ref(false);
    const installedModels = ref<InstalledModel[]>([]);
    const isDownloading = ref(false);
    const downloadTaskId = ref<string | null>(null);
    const downloadProgress = ref<ModelDownloadProgress>({});
    const downloadPollingInterval = ref<ReturnType<typeof setInterval> | null>(null);
    const downloadSource = ref('HuggingFace中国镜像站');
    const downloadSourceOptions = ['HuggingFace中国镜像站', 'HuggingFace官方'];
    const downloadLogs = ref<DownloadLogItem[]>([]);
    const installing = ref(false);
    
    // Download state
    const currentDownloadState = ref<CurrentDownloadState>({
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 0,
      status: 'downloading',
      error: null,
      overallProgress: 0,
      currentModelIndex: 0,
      currentModelProgress: 0,
      currentModel: null,
      completed: false
    });
    
    // Watch for prop changes
    watch(() => props.modelValue, (newVal) => {
      isOpen.value = newVal;
      if (newVal) {
        // Fetch data when dialog opens
        fetchEssentialModels();
      }
    });
    
    // Watch for local state changes
    watch(isOpen, (newVal) => {
      emit('update:modelValue', newVal);
    });
    
    // Computed: all essential models installed
    const allEssentialModelsInstalled = computed(() => {
      if (!essentialModels.value.length) return false;
      return essentialModels.value.every(essModel => 
        installedModels.value.some(insModel => insModel.name === essModel.name)
      );
    });
    
    // API call: get essential models list
    const fetchEssentialModels = async () => {
      try {
        isLoading.value = true;
        const response = await api.get('models/essential');
        const data = await extractResponseData<EssentialModel[]>(response);
        
        if (data && Array.isArray(data)) {
          essentialModels.value = data;
          console.log('Retrieved essential models list:', essentialModels.value.length);
          fetchInstalledModels();
        } else {
          console.error('Failed to get models list: Invalid response format', response);
        }
      } catch (error) {
        console.error('Failed to get essential models list:', error);
        $q.notify({
          type: 'negative',
          message: '无法获取必要模型列表'
        });
      } finally {
        isLoading.value = false;
      }
    };
    
    // API call: get installed models list
    const fetchInstalledModels = async () => {
      try {
        const response = await api.get('models');
        const data = await extractResponseData<InstalledModel[]>(response);
        
        if (data && Array.isArray(data)) {
          installedModels.value = data.filter(model => model.installed);
          console.log('Retrieved installed models:', installedModels.value.length);
        }
      } catch (error) {
        console.error('Failed to get installed models list:', error);
      }
    };
    
    // Poll download progress
    const pollDownloadProgress = async () => {
      if (!downloadTaskId.value) return;
      
      // Clear existing polling
      if (downloadPollingInterval.value) {
        clearInterval(downloadPollingInterval.value);
      }
      
      // Set polling interval
      downloadPollingInterval.value = setInterval(async () => {
        if (!downloadTaskId.value) {
          if (downloadPollingInterval.value) {
            clearInterval(downloadPollingInterval.value);
            downloadPollingInterval.value = null;
          }
          return;
        }
        
        try {
          // Use new API endpoint
          const response = await api.get(`models/essential-progress/${downloadTaskId.value}`);
          const progress = await extractResponseData<CurrentDownloadState>(response);
          
          if (progress) {
            // Update global download state
            currentDownloadState.value = { ...progress };
            
            // Update essential models download progress
            downloadProgress.value['essentialModels'] = {
              downloadedBytes: progress.downloadedBytes || 0,
              totalBytes: progress.totalBytes || 0,
              speed: progress.speed || 0,
              status: progress.status || 'downloading',
              currentModelProgress: progress.currentModelProgress || 0,
              currentModel: progress.currentModel,
              currentModelIndex: progress.currentModelIndex || 0,
              error: progress.error,
              overallProgress: progress.overallProgress || 0,
              completed: progress.completed || false
            };
            
            // Add download log
            if (progress.status === 'completed' && !progress.error) {
              addLog('基础模型已全部下载完成', '完成');
              
              // Refresh models list to reflect latest status
              await fetchEssentialModels();
              
              // Emit installation complete event
              emit('installation-complete');
            } else if (progress.error) {
              addLog(`下载出错: ${progress.error}`, '错误');
            }
            
            // If download completed or error, clear polling
            if (progress.status === 'completed' || progress.status === 'error') {
              isDownloading.value = false;
              downloadTaskId.value = null;
              
              if (downloadPollingInterval.value) {
                clearInterval(downloadPollingInterval.value);
                downloadPollingInterval.value = null;
              }
            }
          }
        } catch (error) {
          console.error('Failed to get download progress:', error);
          
          // Add error log
          addLog(`获取进度失败: ${error instanceof Error ? error.message : '未知错误'}`, '错误');
          
          // Consider stopping polling after multiple failures
          if (downloadPollingInterval.value) {
            clearInterval(downloadPollingInterval.value);
            downloadPollingInterval.value = null;
          }
        }
      }, 1000);
    };
    
    // Download essential models
    const downloadEssentialModels = async () => {
      if (isDownloading.value) return;
      
      // Add download start log
      addLog('开始下载基础模型集合', '开始');
      
      try {
        isLoading.value = true;
        
        // Determine API parameter based on selected download source
        const source = downloadSource.value === 'HuggingFace官方' ? 'hf' : 'mirror';
        console.log('Using download source:', source);
        
        const response = await api.post('models/download-essential', { source });
        const data = await extractResponseData<{taskId?: string}>(response);
        
        if (data?.taskId) {
          downloadTaskId.value = data.taskId;
          isDownloading.value = true;
          
          // Initialize download state
          currentDownloadState.value = {
            downloadedBytes: 0,
            totalBytes: 0,
            speed: 0,
            status: 'downloading',
            error: null,
            overallProgress: 0,
            currentModelIndex: 0,
            currentModelProgress: 0,
            currentModel: null,
            completed: false,
            modelType: 'essential'
          };
          
          // Start polling
          pollDownloadProgress();
          
          $q.notify({
            type: 'info',
            message: '开始下载基础模型'
          });
        } else {
          throw new Error('服务器未返回有效的任务ID');
        }
      } catch (error) {
        console.error('Failed to start download:', error);
        $q.notify({
          type: 'negative',
          message: `启动下载失败: ${error instanceof Error ? error.message : String(error)}`
        });
        
        // Add error log
        addLog(`启动下载失败: ${error instanceof Error ? error.message : String(error)}`, '错误');
      } finally {
        isLoading.value = false;
      }
    };
    
    // Cancel download
    const cancelDownload = async () => {
      if (!downloadTaskId.value) return;
      
      try {
        // Send correct cancel download request
        await api.post('models/cancel-essential', { taskId: downloadTaskId.value });
        
        // Clear polling and reset state
        if (downloadPollingInterval.value) {
          clearInterval(downloadPollingInterval.value);
          downloadPollingInterval.value = null;
        }
        
        isDownloading.value = false;
        downloadTaskId.value = null;
        downloadProgress.value = {};
        
        // Add cancel log
        addLog('用户取消了下载', '取消');
        
        console.log('Download cancelled');
      } catch (error) {
        console.error('Failed to cancel download:', error);
        
        // Add error log
        addLog(`取消下载失败: ${error instanceof Error ? error.message : '未知错误'}`, '错误');
      }
    };
    
    // Add download log
    const addLog = (message: string, status: string) => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      
      downloadLogs.value.unshift({
        time: timeStr,
        message,
        status
      });
      
      // Limit log entries
      if (downloadLogs.value.length > 50) {
        downloadLogs.value = downloadLogs.value.slice(0, 50);
      }
    };
    
    // Close dialog
    const closeDialog = () => {
      if (isDownloading.value) {
        $q.dialog({
          title: '确认关闭',
          message: '下载正在进行中，关闭对话框将在后台继续下载。确定要关闭吗？',
          cancel: true,
          persistent: true
        }).onOk(() => {
          isOpen.value = false;
        });
      } else {
        isOpen.value = false;
      }
    };
    
    // Format functions
    const formatFileSize = (bytes: number): string => {
      if (!bytes || isNaN(bytes)) return '0 B';
      
      bytes = Math.max(0, bytes); // Ensure non-negative
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let value = bytes;
      let unitIndex = 0;
      
      while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
      }
      
      return `${value.toFixed(2)} ${units[unitIndex]}`;
    };
    
    // Format download speed
    const formatSpeed = (bytesPerSecond: number): string => {
      if (!bytesPerSecond || isNaN(bytesPerSecond)) return '0 B/s';
      return `${formatFileSize(bytesPerSecond)}/s`;
    };
    
    const formatPercentage = (percentage: number) => {
      return percentage.toFixed(0);
    };
    
    // Get log badge color
    const getLogBadgeColor = (status: string): string => {
      switch (status) {
        case '完成': return 'positive';
        case '错误': return 'negative';
        case '取消': return 'warning';
        case '开始': return 'primary';
        default: return 'info';
      }
    };
    
    // Get model type name
    const getModelTypeName = (type: string): string => {
      const typeMap: Record<string, string> = {
        'checkpoint': '模型底座',
        'vae': 'VAE模型',
        'vae_approx': '预览解码器',
        'upscaler': '放大模型',
        'embedding': '提示词嵌入',
        'detector': '检测器',
        'segmentation': '分割模型',
        'facerestore': '人脸修复',
        'faceswap': '人脸替换',
        'config': '配置文件',
        'controlnet': 'ControlNet'
      };
      
      return typeMap[type] || type;
    };
    
    // Computed - current downloading model
    const currentModel = computed(() => currentDownloadState.value.currentModel);
    
    // Component mounted
    onMounted(() => {
      if (isOpen.value) {
        fetchEssentialModels();
      }
    });
    
    // Component unmounted
    onUnmounted(() => {
      if (downloadPollingInterval.value) {
        clearInterval(downloadPollingInterval.value);
        downloadPollingInterval.value = null;
      }
    });
    
    return {
      // State
      isOpen,
      essentialModels,
      isLoading,
      isDownloading,
      downloadTaskId,
      downloadProgress,
      currentDownloadState,
      allEssentialModelsInstalled,
      downloadSource,
      downloadSourceOptions,
      downloadLogs,
      installing,
      
      // Methods
      downloadEssentialModels,
      cancelDownload,
      closeDialog,
      addLog,
      formatFileSize,
      formatSpeed,
      formatPercentage,
      
      // Computed
      currentModel,
      
      // Utility methods
      getModelTypeName,
      getLogBadgeColor
    };
  }
});
</script>

<style scoped>
.essential-models-dialog {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.download-progress-panel {
  margin-top: 20px;
  padding: 20px;
  border-radius: 8px;
  background-color: #f9f9f9;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.progress-details {
  margin-bottom: 20px;
}

.model-count-indicator {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  margin-left: 10px;
}

.download-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 15px;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.stat-item .q-icon {
  color: var(--q-primary);
}

.download-history {
  margin-top: 20px;
  max-height: 300px;
  overflow-y: auto;
  border-top: 1px solid #eee;
  padding-top: 10px;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  padding: 5px;
  border-bottom: 1px dashed #eee;
}

.log-time {
  color: #999;
  margin-left: auto;
  font-size: 12px;
}

.q-linear-progress {
  border-radius: 4px;
}
</style> 