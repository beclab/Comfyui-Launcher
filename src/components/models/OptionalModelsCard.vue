<template>
  <q-card class="q-mb-lg">
    <q-card-section class="bg-secondary text-white">
      <div class="text-h6">
        <q-icon name="collections" class="q-mr-sm" />
        可选模型库
      </div>
      <div class="text-caption">按需下载各类模型增强您的AI创作能力</div>
      
      <!-- 添加数据源选择和刷新按钮 -->
      <div class="row items-center q-mt-sm">
        <q-select
          v-model="databaseMode"
          :options="databaseModeOptions"
          option-value="value"
          option-label="label"
          dense
          outlined
          class="bg-white text-black q-mr-md"
          style="width: 200px"
          label="数据源"
          @update:model-value="onDatabaseModeChange"
        />
        <q-btn 
          color="white" 
          text-color="secondary" 
          icon="refresh" 
          label="刷新" 
          @click="onRefresh"
          :loading="isLoading"
        />
        
        <!-- 添加搜索框 -->
        <q-input
          v-model="searchQuery"
          placeholder="搜索模型..."
          dense
          outlined
          clearable
          @clear="clearSearch"
          class="bg-white q-ml-md"
          style="width: 200px"
          @update:model-value="handleSearchInput"
        >
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
    </q-card-section>
    
    <q-tabs
      v-model="activeTab"
      dense
      class="text-grey-7"
      active-color="secondary"
      indicator-color="secondary"
      align="justify"
    >
      <q-tab name="all" label="全部" icon="apps" />
      <q-tab name="checkpoint" label="SD模型" icon="image" />
      <q-tab name="lora" label="LoRA" icon="tune" />
      <q-tab name="controlnet" label="ControlNet" icon="explore" />
      <q-tab name="vae" label="VAE" icon="auto_fix_high" />
      <q-tab name="upscaler" label="超分辨率" icon="hd" />
    </q-tabs>
    
    <q-separator />
    
    <q-tab-panels v-model="activeTab" animated>
      <!-- 所有模型面板 -->
      <q-tab-panel name="all">
        <div v-if="isLoading" class="text-center q-pa-lg">
          <q-spinner color="secondary" size="3em" />
          <div class="q-mt-md">加载模型中...</div>
        </div>
        
        <div v-else-if="filteredModels.length === 0" class="text-center q-pa-lg text-grey">
          没有找到匹配的模型
        </div>
        
        <div v-else class="row q-col-gutter-md">
          <div v-for="model in filteredModels" :key="model.name" class="col-xs-12 col-sm-6 col-md-4 col-lg-3">
            <q-card class="model-card" :class="{ 'installed': model.installed }">
              <q-card-section>
                <div class="text-h6 ellipsis">{{ model.name }}</div>
                <q-badge :color="getTypeColor(model.type)">{{ model.type }}</q-badge>
              </q-card-section>
              
              <q-card-section>
                <p v-if="model.description" class="description">{{ model.description }}</p>
                <p v-else class="text-grey">无描述</p>
              </q-card-section>
              
              <q-card-actions align="right">
                <template v-if="downloadProgress[model.name]">
                  <q-card-section class="download-progress q-pa-none">
                    <div class="progress-info">
                      <div class="text-subtitle2">
                        {{ model.name }} 下载中...
                      </div>
                      <div class="text-caption q-gutter-x-md">
                        <span>
                          已下载: {{ formatFileSize(downloadProgress[model.name].downloadedBytes) }} / 
                          {{ formatFileSize(downloadProgress[model.name].totalBytes) }}
                        </span>
                        <span>
                          速度: {{ formatSpeed(downloadProgress[model.name].speed) }}
                        </span>
                      </div>
                    </div>
                    <q-linear-progress
                      :value="downloadProgress[model.name].downloadedBytes / downloadProgress[model.name].totalBytes"
                      color="primary"
                      class="q-mt-sm"
                      size="10px"
                    >
                      <div class="absolute-full flex flex-center">
                        <q-badge color="white" text-color="primary" :label="`${Math.round((downloadProgress[model.name].downloadedBytes / downloadProgress[model.name].totalBytes) * 100)}%`" />
                      </div>
                    </q-linear-progress>
                  </q-card-section>
                </template>
                <template v-else>
                  <q-btn
                    :color="model.installed ? 'positive' : 'primary'"
                    :icon="model.installed ? 'check' : 'download'"
                    :label="model.installed ? '已安装' : '安装'"
                    :loading="isDownloading && !!downloadTaskId && !installing"
                    @click="handleInstallModel(model.name)"
                    :disable="model.installed"
                  />
                </template>
              </q-card-actions>
            </q-card>
          </div>
        </div>
      </q-tab-panel>
      
      <!-- 其他标签页 - 使用相同的模板但过滤不同类型 -->
      <q-tab-panel v-for="tabType in ['checkpoint', 'lora', 'controlnet', 'vae', 'upscaler']" :key="tabType" :name="tabType">
        <div v-if="isLoading" class="text-center q-pa-lg">
          <q-spinner color="secondary" size="3em" />
          <div class="q-mt-md">加载模型中...</div>
        </div>
        
        <div v-else-if="getFilteredModelsByType(tabType).length === 0" class="text-center q-pa-lg text-grey">
          没有找到匹配的{{ getTypeLabel(tabType) }}模型
        </div>
        
        <div v-else class="row q-col-gutter-md">
          <div v-for="model in getFilteredModelsByType(tabType)" :key="model.name" class="col-xs-12 col-sm-6 col-md-4 col-lg-3">
            <q-card class="model-card" :class="{ 'installed': model.installed }">
              <q-card-section>
                <div class="text-h6 ellipsis">{{ model.name }}</div>
                <q-badge :color="getTypeColor(model.type)">{{ model.type }}</q-badge>
              </q-card-section>
              
              <q-card-section>
                <p v-if="model.description" class="description">{{ model.description }}</p>
                <p v-else class="text-grey">无描述</p>
              </q-card-section>
              
              <q-card-actions align="right">
                <template v-if="downloadProgress[model.name]">
                  <q-card-section class="download-progress q-pa-none">
                    <div class="progress-info">
                      <div class="text-subtitle2">
                        {{ model.name }} 下载中...
                      </div>
                      <div class="text-caption q-gutter-x-md">
                        <span>
                          已下载: {{ formatFileSize(downloadProgress[model.name].downloadedBytes) }} / 
                          {{ formatFileSize(downloadProgress[model.name].totalBytes) }}
                        </span>
                        <span>
                          速度: {{ formatSpeed(downloadProgress[model.name].speed) }}
                        </span>
                      </div>
                    </div>
                    <q-linear-progress
                      :value="downloadProgress[model.name].downloadedBytes / downloadProgress[model.name].totalBytes"
                      color="primary"
                      class="q-mt-sm"
                      size="10px"
                    >
                      <div class="absolute-full flex flex-center">
                        <q-badge color="white" text-color="primary" :label="`${Math.round((downloadProgress[model.name].downloadedBytes / downloadProgress[model.name].totalBytes) * 100)}%`" />
                      </div>
                    </q-linear-progress>
                  </q-card-section>
                </template>
                <template v-else>
                  <q-btn
                    :color="model.installed ? 'positive' : 'primary'"
                    :icon="model.installed ? 'check' : 'download'"
                    :label="model.installed ? '已安装' : '安装'"
                    :loading="isDownloading && !!downloadTaskId && !installing"
                    @click="handleInstallModel(model.name)"
                    :disable="model.installed"
                  />
                </template>
              </q-card-actions>
            </q-card>
          </div>
        </div>
      </q-tab-panel>
    </q-tab-panels>
  </q-card>
  
  <!-- 添加自定义确认对话框 -->
  <q-dialog v-model="confirmDialogVisible" persistent>
    <q-card>
      <q-card-section class="row items-center">
        <q-avatar icon="help" color="primary" text-color="white" />
        <span class="q-ml-sm">确认安装</span>
      </q-card-section>

      <q-card-section>
        您确定要安装模型"{{ modelToInstall }}"吗？
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="取消" color="primary" v-close-popup @click="cancelInstall" />
        <q-btn flat label="确定" color="primary" v-close-popup @click="confirmInstall" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import api from '../../api';

// 本地模型接口定义
interface Model {
  id: string;
  name: string;
  description: string;
  type: string;
  size: string;
  path?: string;
  installed: boolean;
  downloading?: boolean;
  installedDate?: string;
  essential?: boolean;
}

// 下载进度映射类型
interface ModelDownloadProgress {
  [key: string]: {
    downloadedBytes: number;
    totalBytes: number;
    speed: number;
    status: string;
    currentModelProgress: number;
    currentModel: any;
    currentModelIndex: number;
    error: string | null;
  };
}

// 定义 ModelFetchMode 类型
type ModelFetchMode = 'cache' | 'local' | 'remote';

// 工具函数：提取API响应数据
const extractResponseData = async <T>(response: any): Promise<T | null> => {
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
        console.error('解析响应JSON失败:', error);
      }
    }
  }
  
  return null;
};

export default defineComponent({
  name: 'OptionalModelsCard',
  setup() {
    const $q = useQuasar();
    
    // 本地状态
    const models = ref<Model[]>([]);
    const filteredModels = ref<Model[]>([]);
    const isLoading = ref(false);
    const activeTab = ref('all');
    const searchQuery = ref('');
    const databaseMode = ref<ModelFetchMode>('cache');
    const previousSearchQuery = ref('');
    const isDownloading = ref(false);
    const downloadTaskId = ref<string | null>(null);
    const downloadProgress = ref<ModelDownloadProgress>({});
    const downloadPollingInterval = ref<ReturnType<typeof setInterval> | null>(null);
    const installing = ref('');
    
    const databaseModeOptions = [
      {label: '通道 (1天缓存)', value: 'cache' as ModelFetchMode},
      {label: '本地', value: 'local' as ModelFetchMode},
      {label: '远程', value: 'remote' as ModelFetchMode}
    ];
    
    // 添加对话框状态
    const confirmDialogVisible = ref(false);
    const modelToInstall = ref('');
    
    // 获取模型列表
    const fetchModels = async () => {
      try {
        isLoading.value = true;
        
        // 修复类型问题：确保传递正确的模式值
        const modeValue = ((mode) => {
          if (typeof mode === 'object' && mode !== null) {
            // 如果是对象，尝试提取它的值
            return (mode as any).value as ModelFetchMode || 'cache';
          }
          // 确保值是ModelFetchMode类型之一
          return ['cache', 'local', 'remote'].includes(String(mode)) 
            ? mode as ModelFetchMode 
            : 'cache';
        })(databaseMode.value);
        
        // 获取模型列表
        const response = await api.get(`models?mode=${modeValue}`);
        const data = await extractResponseData<Model[]>(response);
        
        if (data && Array.isArray(data)) {
          models.value = data;
          console.log('获取到可选模型列表:', models.value.length);
          
          // 初始过滤
          filterModels(searchQuery.value);
        } else {
          console.error('获取模型列表失败: 响应格式不正确', response);
          $q.notify({
            type: 'negative',
            message: '获取模型列表失败'
          });
        }
      } catch (error) {
        console.error('获取模型列表失败:', error);
        $q.notify({
          type: 'negative',
          message: '获取模型列表失败'
        });
      } finally {
        isLoading.value = false;
      }
    };
    
    // 模型搜索过滤
    const filterModels = (query: string) => {
      if (!query.trim()) {
        filteredModels.value = [...models.value];
        return;
      }
      
      const searchTerms = query.toLowerCase().trim().split(/\s+/);
      
      filteredModels.value = models.value.filter(model => {
        const modelText = `${model.name} ${model.description || ''} ${model.type}`.toLowerCase();
        return searchTerms.every(term => modelText.includes(term));
      });
    };
    
    // 监听搜索修改，添加防抖
    const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null);
    watch(searchQuery, (newVal) => {
      if (searchTimeout.value) {
        clearTimeout(searchTimeout.value);
      }
      
      searchTimeout.value = setTimeout(() => {
        if (newVal !== previousSearchQuery.value) {
          filterModels(newVal);
          previousSearchQuery.value = newVal;
        }
      }, 300);
    });
    
    // 清除搜索
    const clearSearch = () => {
      searchQuery.value = '';
      filterModels('');
    };
    
    // 处理搜索输入 - 添加中间处理函数处理类型问题
    const handleSearchInput = (value: string | number | null) => {
      if (value === null) {
        filterModels('');
      } else {
        filterModels(String(value));
      }
    };
    
    // 改进数据库模式切换处理
    const onDatabaseModeChange = (newMode: any) => {
      // 类型安全处理
      if (typeof newMode === 'string' && ['cache', 'local', 'remote'].includes(newMode)) {
        databaseMode.value = newMode as ModelFetchMode;
      } else if (typeof newMode === 'object' && newMode !== null && 
                typeof newMode.value === 'string' && 
                ['cache', 'local', 'remote'].includes(newMode.value)) {
        databaseMode.value = newMode.value as ModelFetchMode;
      } else {
        // 默认值
        databaseMode.value = 'cache';
      }
      
      // 重新获取模型
      fetchModels();
    };
    
    // 轮询下载进度
    const pollDownloadProgress = async () => {
      if (!downloadTaskId.value) return;
      
      // 清除可能已存在的轮询
      if (downloadPollingInterval.value) {
        clearInterval(downloadPollingInterval.value);
      }
      
      // 设置轮询间隔
      downloadPollingInterval.value = setInterval(async () => {
        if (!downloadTaskId.value) {
          if (downloadPollingInterval.value) {
            clearInterval(downloadPollingInterval.value);
            downloadPollingInterval.value = null;
          }
          return;
        }
        
        try {
          // 修复：使用正确的API路径获取下载进度
          const response = await api.get(`models/progress/${downloadTaskId.value}`);
          const progressData = await extractResponseData<any>(response);
          
          if (progressData) {
            // 修改：不再依赖modelName字段
            if (progressData.status) {
              // 如果正在下载的模型存在
              if (installing.value) {
                // 更新指定模型的下载进度
                downloadProgress.value[installing.value] = {
                  downloadedBytes: progressData.downloadedBytes || 0,
                  totalBytes: progressData.totalBytes || 0,
                  speed: progressData.speed || 0,
                  status: progressData.status,
                  currentModelProgress: progressData.currentModelProgress || 0,
                  currentModel: progressData.currentModel,
                  currentModelIndex: progressData.currentModelIndex || 0,
                  error: progressData.error || null
                };
                
                // 检查是否完成
                if (progressData.status === 'completed' || progressData.completed) {
                  // 显示通知
                  $q.notify({
                    type: 'positive',
                    message: `模型 ${installing.value} 安装完成`
                  });
                  
                  // 刷新模型列表
                  fetchModels();
                  
                  // 停止轮询并重置状态
                  if (downloadPollingInterval.value) {
                    clearInterval(downloadPollingInterval.value);
                    downloadPollingInterval.value = null;
                  }
                  
                  isDownloading.value = false;
                  downloadTaskId.value = null;
                  // 清除下载进度
                  delete downloadProgress.value[installing.value];
                  installing.value = '';
                }
                
                // 检查是否出错
                if (progressData.status === 'error' || progressData.error) {
                  $q.notify({
                    type: 'negative',
                    message: `模型下载失败: ${progressData.error || '未知错误'}`
                  });
                  
                  // 停止轮询
                  if (downloadPollingInterval.value) {
                    clearInterval(downloadPollingInterval.value);
                    downloadPollingInterval.value = null;
                  }
                  
                  isDownloading.value = false;
                  downloadTaskId.value = null;
                  // 清除下载进度
                  delete downloadProgress.value[installing.value];
                  installing.value = '';
                }
              }
            }
          }
        } catch (error) {
          console.error('获取下载进度失败:', error);
        }
      }, 1000);
    };
    
    // 安装模型 - 修改为使用自定义对话框
    const handleInstallModel = (modelName: string) => {
      // 如果已经在下载中或已安装则不处理
      if (isDownloading.value) return;
      
      const model = models.value.find(m => m.name === modelName);
      if (!model || model.installed) return;
      
      // 显示自定义对话框
      modelToInstall.value = modelName;
      confirmDialogVisible.value = true;
    };
    
    // 取消安装
    const cancelInstall = () => {
      modelToInstall.value = '';
    };
    
    // 确认安装 - 实际执行安装逻辑
    const confirmInstall = async () => {
      const modelName = modelToInstall.value;
      if (!modelName) return;
      
      try {
        isLoading.value = true;
        installing.value = modelName;
        
        // 使用适当的 API 调用方式
        const response = await api.post(`models/install/${modelName}`); 
        const data = await extractResponseData<{taskId?: string}>(response);
        
        if (data?.taskId) {
          downloadTaskId.value = data.taskId;
          isDownloading.value = true;
          
          // 初始化下载进度
          downloadProgress.value[modelName] = {
            downloadedBytes: 0,
            totalBytes: 0,
            speed: 0,
            status: 'downloading',
            currentModelProgress: 0,
            currentModel: null,
            currentModelIndex: 0,
            error: null
          };
          
          pollDownloadProgress();
          
          $q.notify({
            type: 'info',
            message: `开始安装模型: ${modelName}`
          });
        } else {
          throw new Error('服务器未返回有效任务ID');
        }
      } catch (error) {
        console.error('安装模型失败:', error);
        $q.notify({
          type: 'negative',
          message: '安装模型失败'
        });
      } finally {
        isLoading.value = false;
        if (!isDownloading.value) {
          installing.value = '';
          modelToInstall.value = '';
        }
      }
    };
    
    // 格式化文件大小
    const formatFileSize = (bytes: number): string => {
      if (!bytes || isNaN(bytes)) return '0 B';
      
      bytes = Math.max(0, bytes); // 确保非负
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let value = bytes;
      let unitIndex = 0;
      
      while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
      }
      
      return `${value.toFixed(2)} ${units[unitIndex]}`;
    };
    
    // 格式化下载速度
    const formatSpeed = (bytesPerSecond: number): string => {
      if (!bytesPerSecond || isNaN(bytesPerSecond)) return '0 B/s';
      return `${formatFileSize(bytesPerSecond)}/s`;
    };
    
    // 获取下载百分比
    const getDownloadPercentage = (modelName: string): number => {
      const progress = downloadProgress.value[modelName];
      if (!progress || !progress.totalBytes) return 0;
      
      return Math.round((progress.downloadedBytes / progress.totalBytes) * 100);
    };
    
    // 获取模型类型标签
    const getTypeLabel = (type: string): string => {
      const typeLabels: Record<string, string> = {
        checkpoint: 'SD模型',
        vae: 'VAE',
        vae_approx: '预览解码器',
        lora: 'LoRA',
        controlnet: 'ControlNet',
        upscaler: '超分模型',
        embedding: '词嵌入',
        ipadapter: 'IP-Adapter',
        motion: '动画模型',
        facerestore: '人脸修复',
        detector: '检测器',
        segmentation: '分割模型',
        other: '其他'
      };
      
      return typeLabels[type] || type;
    };
    
    // 获取模型类型颜色
    const getTypeColor = (type: string): string => {
      const typeColors: Record<string, string> = {
        checkpoint: 'primary',
        vae: 'deep-purple',
        vae_approx: 'purple',
        lora: 'teal',
        controlnet: 'orange',
        upscaler: 'green',
        embedding: 'cyan',
        ipadapter: 'red',
        motion: 'blue',
        facerestore: 'indigo',
        detector: 'brown',
        segmentation: 'light-green',
        other: 'grey'
      };
      
      return typeColors[type] || 'grey';
    };
    
    // 添加刷新函数
    const onRefresh = () => {
      // 清空搜索以确保显示所有结果
      searchQuery.value = '';
      // 重新获取模型
      fetchModels();
      
      $q.notify({
        type: 'info',
        message: '正在刷新模型列表...'
      });
    };
    
    // 组件加载时获取数据
    onMounted(() => {
      fetchModels();
    });
    
    // 组件卸载时清理资源
    onUnmounted(() => {
      if (downloadPollingInterval.value) {
        clearInterval(downloadPollingInterval.value);
        downloadPollingInterval.value = null;
      }
      if (searchTimeout.value) {
        clearTimeout(searchTimeout.value);
        searchTimeout.value = null;
      }
    });
    
    return {
      // 状态
      models,
      filteredModels,
      isLoading,
      activeTab,
      searchQuery,
      databaseMode,
      databaseModeOptions,
      isDownloading,
      downloadTaskId,
      downloadProgress,
      installing,
      confirmDialogVisible,
      modelToInstall,
      
      // 方法
      fetchModels,
      filterModels,
      handleInstallModel,
      onDatabaseModeChange,
      clearSearch,
      formatFileSize,
      formatSpeed,
      pollDownloadProgress,
      onRefresh,
      
      // 辅助功能
      getFilteredModelsByType: (type: string) => {
        return filteredModels.value.filter(model => model.type === type);
      },
      
      getTypeLabel,
      getTypeColor,
      getDownloadPercentage,
      
      // 添加新的处理函数
      handleSearchInput,
      cancelInstall,
      confirmInstall
    };
  }
});
</script>

<style scoped>
.model-card {
  transition: all 0.3s ease;
  height: 100%;
}

.model-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.model-card.installed {
  border-left: 4px solid #4CAF50;
}

.description {
  max-height: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 添加下载进度相关样式 */
.download-progress {
  width: 100%;
  padding: 8px;
}

.progress-info {
  margin-bottom: 8px;
}

.progress-info .text-caption {
  display: flex;
  justify-content: space-between;
  color: #666;
}

.q-linear-progress {
  border-radius: 4px;
}
</style> 