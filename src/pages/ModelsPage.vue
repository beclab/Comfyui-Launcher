<template>
  <q-page padding>
    <div class="text-h5 q-mb-md text-primary">模型管理中心</div>
    
    <!-- 1. 基础模型安装区域 -->
    <q-card class="q-mb-lg essential-models">
      <q-card-section class="bg-primary text-white">
        <div class="text-h6">
          <q-icon name="verified" class="q-mr-sm" />
          必要基础模型
        </div>
        <div class="text-caption">这些模型对于ComfyUI的正常运行是必需的</div>
      </q-card-section>
      
      <q-separator />
      
      <q-card-section>
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
              :loading="essentialLoading"
              :disable="isDownloading"
            />
          </div>
        </div>
        
        <!-- 下载进度展示面板 -->
        <div v-if="downloadTaskId" class="download-progress-panel">
          <div class="progress-header">
            <span class="model-count-indicator">
              模型 {{ downloadProgress.currentModelIndex + 1 }}/{{ essentialModels?.length || 0 }}
            </span>
            <span class="model-name">{{ currentModel ? currentModel.name : '加载中...' }}</span>
            <q-btn flat type="negative" label="取消下载" @click="cancelDownload" />
          </div>
          
          <div class="progress-details">
            <q-linear-progress
              :value="downloadProgress.currentModelProgress / 100"
              size="20px"
              color="primary"
            >
              <div class="absolute-full flex flex-center">
                <q-badge color="white" text-color="primary" :label="`${formatPercentage(downloadProgress.currentModelProgress)}%`" />
              </div>
            </q-linear-progress>
            
            <div v-if="currentModel" class="model-info">
              <span>当前模型: {{ currentModel.name }}</span>
              <span>类型: {{ getModelTypeName(currentModel.type) }}</span>
            </div>
            
            <div class="progress-stats">
              <span>总体进度: {{ downloadProgress.overallProgress.toFixed(1) }}%</span>
              <span>已完成: {{ downloadProgress.currentModelIndex + 1 }}/{{ essentialModels?.length || 0 }}</span>
            </div>
            
            <div class="download-stats">
              <div class="stat-item">
                <q-icon name="save" size="sm" />
                <span>文件大小: {{ formatFileSize(downloadProgress.totalBytes) }}</span>
              </div>
              <div class="stat-item">
                <q-icon name="cloud_download" size="sm" />
                <span>已下载: {{ formatFileSize(downloadProgress.downloadedBytes) }}</span>
              </div>
              <div class="stat-item">
                <q-icon name="speed" size="sm" />
                <span>下载速度: {{ formatSpeed(downloadProgress.speed) }}</span>
              </div>
              <div class="stat-item">
                <q-icon name="timer" size="sm" />
                <span>预计剩余: {{ formatEstimatedTime(
                  downloadProgress.totalBytes,
                  downloadProgress.downloadedBytes, 
                  downloadProgress.speed
                ) }}</span>
              </div>
            </div>
          </div>
          
          <!-- 下载历史 -->
          <div class="download-history">
            <h4>下载历史</h4>
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
        
        <q-banner v-if="essentialInstalled" class="bg-positive text-white">
          <template v-slot:avatar>
            <q-icon name="check_circle" />
          </template>
          基础模型已全部安装完成，您可以开始使用ComfyUI了。
        </q-banner>
      </q-card-section>
    </q-card>
    
    <!-- 2. 可选模型库 -->
    <q-card class="q-mb-lg">
      <q-card-section class="bg-secondary text-white">
        <div class="text-h6">
          <q-icon name="collections" class="q-mr-sm" />
          可选模型库
        </div>
        <div class="text-caption">按需下载各类模型增强您的AI创作能力</div>
      </q-card-section>
      
      <q-tabs
        v-model="activeTab"
        dense
        class="text-grey-7"
        active-color="secondary"
        indicator-color="secondary"
        align="justify"
      >
        <q-tab name="sd" label="SD模型" icon="image" />
        <q-tab name="lora" label="LoRA" icon="tune" />
        <q-tab name="controlnet" label="ControlNet" icon="explore" />
        <q-tab name="vae" label="VAE" icon="auto_fix_high" />
        <q-tab name="upscaler" label="超分辨率" icon="hd" />
      </q-tabs>
      
      <q-separator />
      
      <q-tab-panels v-model="activeTab" animated>
        <!-- SD模型面板 -->
        <q-tab-panel name="sd">
          <div class="text-subtitle1 q-mb-md">Stable Diffusion 模型</div>
          
          <q-list bordered separator>
            <q-item v-for="model in sdModels" :key="model.id" class="q-py-md">
              <q-item-section>
                <q-item-label>{{ model.name }}</q-item-label>
                <q-item-label caption>{{ model.description }}</q-item-label>
                <q-item-label caption>大小: {{ model.size }}</q-item-label>
              </q-item-section>
              
              <q-item-section side>
                <q-btn 
                  :color="model.installed ? 'positive' : 'primary'" 
                  :icon="model.installed ? 'check' : 'download'" 
                  :label="model.installed ? '已安装' : '下载'"
                  @click="downloadModel(model.id)"
                  :disable="model.installed"
                  :loading="model.downloading"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-tab-panel>
        
        <!-- 其他标签页按类似结构实现 -->
        <q-tab-panel name="lora">
          <div class="text-subtitle1 q-mb-md">LoRA 微调模型</div>
          <!-- LoRA 模型列表 -->
        </q-tab-panel>
        
        <q-tab-panel name="controlnet">
          <div class="text-subtitle1 q-mb-md">ControlNet 控制模型</div>
          <!-- ControlNet 模型列表 -->
        </q-tab-panel>
        
        <q-tab-panel name="vae">
          <div class="text-subtitle1 q-mb-md">VAE 编解码器</div>
          <!-- VAE 模型列表 -->
        </q-tab-panel>
        
        <q-tab-panel name="upscaler">
          <div class="text-subtitle1 q-mb-md">超分辨率模型</div>
          <!-- 超分辨率模型列表 -->
        </q-tab-panel>
      </q-tab-panels>
    </q-card>
    
    <!-- 3. 已安装模型管理 -->
    <q-card>
      <q-card-section class="bg-dark text-white">
        <div class="text-h6">
          <q-icon name="folder" class="q-mr-sm" />
          已安装模型管理
        </div>
        <div class="text-caption">查看和管理您已下载的模型</div>
      </q-card-section>
      
      <q-separator />
      
      <q-card-section>
        <div class="row items-center q-mb-md">
          <div class="col">
            <div class="text-subtitle1">已安装模型总数: {{ installedModelsCount }}</div>
            <div class="text-caption">占用存储空间: {{ totalStorageUsed }}</div>
          </div>
          <div class="col-auto">
            <q-btn color="secondary" icon="refresh" label="刷新列表" @click="refreshModels" />
          </div>
        </div>
        
        <q-table
          :rows="installedModels"
          :columns="modelColumns"
          row-key="id"
          :pagination="{ rowsPerPage: 10 }"
          class="installed-models-table"
        >
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn size="sm" flat round color="red" icon="delete" @click="confirmDelete(props.row)" />
              <q-btn size="sm" flat round color="info" icon="info" @click="showModelInfo(props.row)" />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
    
    <!-- 4. 确认对话框 -->
    <q-dialog v-model="deleteConfirmDialog">
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <span class="q-ml-sm">确认删除模型</span>
        </q-card-section>
        
        <q-card-section>
          您确定要删除模型 <strong>{{ selectedModel?.name }}</strong> 吗？此操作不可撤销。
        </q-card-section>
        
        <q-card-actions align="right">
          <q-btn flat label="取消" color="primary" v-close-popup />
          <q-btn flat label="删除" color="negative" @click="deleteModel" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
    
    <!-- 5. 模型详情对话框 -->
    <q-dialog v-model="modelInfoDialog">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">模型详情</div>
        </q-card-section>
        
        <q-card-section v-if="selectedModel">
          <q-list>
            <q-item>
              <q-item-section>
                <q-item-label overline>名称</q-item-label>
                <q-item-label>{{ selectedModel.name }}</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item>
              <q-item-section>
                <q-item-label overline>类型</q-item-label>
                <q-item-label>{{ selectedModel.type }}</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item>
              <q-item-section>
                <q-item-label overline>大小</q-item-label>
                <q-item-label>{{ selectedModel.size }}</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item>
              <q-item-section>
                <q-item-label overline>安装日期</q-item-label>
                <q-item-label>{{ selectedModel.installedDate }}</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item>
              <q-item-section>
                <q-item-label overline>路径</q-item-label>
                <q-item-label>{{ selectedModel.path }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
        
        <q-card-actions align="right">
          <q-btn flat label="关闭" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue';
import api from '../api';

// 必要模型定义接口
interface EssentialModel {
  id: string;
  name: string;
  type: string;
  url: {
    mirror: string;
    hf: string;
  };
  dir: string;
  out: string;
  description: string;
  size?: string;
  essential?: boolean;
}

// 使用 Quasar QTable 的列类型定义
interface TableColumn<T = Model> {
  name: string;
  label: string;
  field: string | ((row: T) => unknown);
  required?: boolean;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  sort?: (a: unknown, b: unknown, rowA: T, rowB: T) => number;
  sortOrder?: 'ad' | 'da';
  format?: (val: unknown, row: T) => unknown;
  style?: string | ((row: T) => string);
  classes?: string | ((row: T) => string);
  headerStyle?: string;
  headerClasses?: string;
}

// 定义模型接口
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

// 下载日志类型
interface DownloadLog {
  status: string;
  message: string;
  time: string;
}

// 下载进度接口
interface DownloadProgress {
  overallProgress: number;
  currentModelIndex: number;
  currentModelProgress: number;
  currentModel: EssentialModel | null;
  completed: boolean;
  error: string | null;
  totalBytes: number;
  downloadedBytes: number;
  speed: number;
}

export default defineComponent({
  name: 'ModelsPage',
  setup() {
    // 状态变量
    const essentialLoading = ref(false);
    const essentialProgress = ref(0);
    const essentialInstalled = ref(false);
    
    const activeTab = ref('sd');
    const sdModels = ref<Model[]>([]); 
    
    const installedModels = ref<Model[]>([]);
    const installedModelsCount = ref(0);
    const totalStorageUsed = ref('0 MB');
    
    const deleteConfirmDialog = ref(false);
    const modelInfoDialog = ref(false);
    const selectedModel = ref<Model | null>(null);
    
    // 下载源选项
    const downloadSource = ref('HuggingFace中国镜像站');
    const downloadSourceOptions = [
      { label: 'HuggingFace中国镜像站', value: 'mirror' },
      { label: 'HuggingFace官方站点', value: 'hf' }
    ];
    
    // 下载状态
    const isDownloading = ref(false);
    const downloadTaskId = ref<string | null>(null);
    const currentModelIndex = ref(-1);
    const currentModelProgress = ref(0);
    const overallProgress = ref(0);
    const currentDownloadingModel = ref<EssentialModel | null>(null);
    
    // 新增变量 - 显式声明类型
    const downloadProgress = ref<DownloadProgress>({
      overallProgress: 0,
      currentModelIndex: 0,
      currentModelProgress: 0,
      currentModel: null,
      completed: false,
      error: null,
      totalBytes: 0,
      downloadedBytes: 0,
      speed: 0
    });
    
    // 明确声明为DownloadLog数组
    const downloadLogs = ref<Array<DownloadLog>>([]);
    
    // 声明必要模型列表
    const essentialModels = ref<EssentialModel[]>([]);
    
    // 获取必要模型列表
    const fetchEssentialModels = async () => {
      try {
        const response = await api.getEssentialModels();
        if (response && response.body && response.body.models) {
          essentialModels.value = response.body.models;
          addLog('信息', `已加载${essentialModels.value.length}个必要模型信息`);
        }
      } catch (error) {
        console.error('获取必要模型列表失败:', error);
        addLog('错误', '获取必要模型列表失败');
      }
    };
    
    // 使用正确类型定义表格列
    const modelColumns = [
      { name: 'name', label: '名称', field: 'name', sortable: true },
      { name: 'type', label: '类型', field: 'type', sortable: true },
      { name: 'size', label: '大小', field: 'size', sortable: true },
      { name: 'installedDate', label: '安装日期', field: 'installedDate', sortable: true },
      { name: 'actions', label: '操作', field: 'actions', align: 'right' as const }
    ] as TableColumn<Model>[];
    
    // 计算属性 - 当前正在下载的模型
    const currentModel = computed<EssentialModel | null>(() => downloadProgress.value.currentModel);
    
    // 下载所有必要模型
    const downloadEssentialModels = async () => {
      if (isDownloading.value) return;
      
      essentialLoading.value = true;
      isDownloading.value = true;
      
      try {
        // 先尝试获取模型列表
        if (essentialModels.value.length === 0) {
          try {
            await fetchEssentialModels();
          } catch (err) {
            console.error('获取模型列表失败，使用默认列表', err);
            // 失败后继续，不终止下载流程
          }
        }
        
        // 使用正确的下载源发起请求
        const source = downloadSource.value === 'HuggingFace中国镜像站' ? 'mirror' : 'hf';
        const response = await api.downloadEssentialModels(source);
        
        // 从响应中提取任务ID
        if (response?.body?.taskId) {
          downloadTaskId.value = response.body.taskId;
          addLog('开始', '开始下载必要模型');
          // 开始轮询进度
          pollDownloadProgress();
        } else {
          throw new Error('服务器未返回有效的任务ID');
        }
      } catch (error) {
        console.error('下载请求失败:', error);
        addLog('错误', `下载请求失败: ${error instanceof Error ? error.message : '未知错误'}`);
      } finally {
        essentialLoading.value = false;
        // 不在这里将isDownloading设为false，因为下载可能是异步长期运行的
        // 在下载完成或失败时再设置
      }
    };
    
    // 轮询下载进度
    const pollDownloadProgress = async () => {
      if (!downloadTaskId.value) return;
      
      const interval = setInterval(async () => {
        try {
          const taskId = downloadTaskId.value!;
          const response = await api.getModelProgress(taskId);
          
          if (!response || !response.body) {
            console.error('获取进度失败: 没有有效响应');
            return;
          }
          
          const responseData = response.body;
          
          // 确保数据格式正确并包含新字段
          const newProgress = {
            overallProgress: responseData.progress || 0,
            currentModelIndex: responseData.currentIndex || 0,
            currentModelProgress: responseData.currentProgress || 0,
            currentModel: responseData.currentModel || null,
            completed: responseData.completed || false,
            error: responseData.error || null,
            totalBytes: responseData.totalBytes || 0,
            downloadedBytes: responseData.downloadedBytes || 0,
            speed: responseData.speed || 0
          } as DownloadProgress;
          
          // 检查当前模型是否发生变化
          if (newProgress.currentModel && 
              (!downloadProgress.value.currentModel || 
               newProgress.currentModel.id !== downloadProgress.value.currentModel?.id)) {
            addLog('进行中', `开始下载: ${newProgress.currentModel.name}`);
          }
          
          // 使用类型断言确保类型安全
          downloadProgress.value = { ...newProgress } as DownloadProgress;
          
          // 如果下载完成或出错，停止轮询
          if (newProgress.completed) {
            clearInterval(interval);
            
            if (newProgress.error) {
              addLog('错误', `下载出错: ${newProgress.error}`);
            } else {
              addLog('完成', '所有模型下载完成!');
              essentialInstalled.value = true;
            }
            
            isDownloading.value = false;
            essentialLoading.value = false;
            downloadTaskId.value = null;
          }
        } catch (error) {
          console.error('获取下载进度失败:', error);
          addLog('错误', `获取进度失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }, 1000); // 更新频率提高到每秒一次以获得更流畅的速度显示
    };
    
    // 取消下载
    const cancelDownload = async () => {
      if (!downloadTaskId.value) return;
      
      try {
        await api.cancelDownload(downloadTaskId.value);
        addLog('取消', '下载任务已取消');
        isDownloading.value = false;
        essentialLoading.value = false;
        // 不要立即清除任务ID，让用户能看到最终状态
        setTimeout(() => {
          downloadTaskId.value = null;
        }, 3000);
      } catch (error) {
        console.error('取消下载失败:', error);
        addLog('错误', `取消下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    };
    
    // 添加日志 - 修复类型错误
    const addLog = (status: string, message: string) => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      
      // 使用spread操作符创建新数组
      const newLog: DownloadLog = {
        status,
        message,
        time: timeStr
      };
      
      downloadLogs.value = [newLog, ...downloadLogs.value];
      
      // 保留最新的20条日志
      if (downloadLogs.value.length > 20) {
        downloadLogs.value = downloadLogs.value.slice(0, 20);
      }
    };
    
    // 格式化百分比
    const formatPercentage = (percentage: number) => {
      return percentage.toFixed(0);
    };
    
    // 获取日志徽章颜色
    const getLogBadgeColor = (status: string): string => {
      switch (status) {
        case '完成': return 'positive';
        case '错误': return 'negative';
        case '取消': return 'warning';
        case '开始': return 'primary';
        default: return 'info';
      }
    };
    
    // 获取模型类型名称
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
        'config': '配置文件'
      };
      
      return typeMap[type] || type;
    };
    
    // 下载单个模型
    const downloadModel = async (modelId: string) => {
      // 实现...
    };
    
    // 确认删除模型
    const confirmDelete = (model: Model) => {
      // 实现...
    };
    
    // 删除模型
    const deleteModel = async () => {
      // 实现...
    };
    
    // 显示模型信息
    const showModelInfo = (model: Model) => {
      // 实现...
    };
    
    // 刷新模型列表
    const refreshModels = async () => {
      // 实现...
    };
    
    // 添加格式化函数
    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
    };
    
    const formatSpeed = (bytesPerSecond: number): string => {
      if (bytesPerSecond === 0) return '0 B/s';
      
      const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
      const i = Math.floor(Math.log(bytesPerSecond) / Math.log(1024));
      return `${(bytesPerSecond / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
    };
    
    // 添加预估剩余时间格式化函数
    const formatEstimatedTime = (totalBytes: number, downloadedBytes: number, speed: number): string => {
      if (speed <= 0 || totalBytes <= downloadedBytes) return '计算中...';
      
      const remainingBytes = totalBytes - downloadedBytes;
      const remainingSeconds = remainingBytes / speed;
      
      if (remainingSeconds < 60) {
        return `${Math.ceil(remainingSeconds)}秒`;
      } else if (remainingSeconds < 3600) {
        return `${Math.ceil(remainingSeconds / 60)}分钟`;
      } else {
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.ceil((remainingSeconds % 3600) / 60);
        return `${hours}小时${minutes}分钟`;
      }
    };
    
    // 在组件加载时获取模型列表
    onMounted(() => {
      fetchEssentialModels();
      refreshModels();
    });
    
    return {
      // 状态
      essentialLoading,
      essentialProgress,
      essentialInstalled,
      activeTab,
      sdModels,
      installedModels,
      installedModelsCount,
      totalStorageUsed,
      deleteConfirmDialog,
      modelInfoDialog,
      selectedModel,
      modelColumns,
      
      // 下载相关
      downloadSource,
      downloadSourceOptions,
      isDownloading,
      currentModelIndex,
      currentModelProgress,
      overallProgress,
      essentialModels,
      currentDownloadingModel,
      
      // 新增变量
      downloadTaskId,
      downloadProgress,
      downloadLogs,
      currentModel,
      
      // 新增方法
      formatPercentage,
      getLogBadgeColor,
      getModelTypeName,
      addLog,
      
      // 已有方法
      downloadEssentialModels,
      cancelDownload,
      downloadModel,
      confirmDelete,
      deleteModel,
      showModelInfo,
      refreshModels,
      
      // 新增方法
      formatFileSize,
      formatSpeed,
      formatEstimatedTime
    };
  }
});
</script>

<style scoped>
.essential-models {
  border-left: 5px solid var(--q-primary);
}

.installed-models-table {
  height: 400px;
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

.model-info {
  margin-top: 10px;
  display: flex;
  gap: 20px;
}

.progress-stats {
  margin-top: 15px;
  display: flex;
  gap: 20px;
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
</style> 