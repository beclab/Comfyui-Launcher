<template>
  <q-card class="q-mb-lg essential-models">
    <q-card-section class="bg-primary text-white">
      <div class="text-h6">
        <q-icon name="verified" class="q-mr-sm" />
        必要基础模型
      </div>
      <div class="text-caption">这些模型对于ComfyUI的正常运行是必需的</div>

      <!-- 显示安装状态 -->
      <q-chip
        v-if="allEssentialModelsInstalled"
        color="positive"
        text-color="white"
        icon="check_circle"
      >
        所有必要模型已安装
      </q-chip>
      <q-chip v-else color="warning" text-color="white" icon="warning">
        缺少必要模型
      </q-chip>
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
            :loading="isDownloading && !!downloadTaskId && !installing"
            :disable="isDownloading || allEssentialModelsInstalled"
          />
        </div>
      </div>

      <!-- 基础模型下载进度显示 - 合并的统一布局 -->
      <div
        v-if="isDownloading && downloadTaskId"
        class="download-progress-panel"
      >
        <div class="progress-header">
          <div>
            <div class="text-subtitle1">正在下载基础模型</div>
            <span class="model-count-indicator">
              模型 {{ currentDownloadState.currentModelIndex + 1 }}/{{
                essentialModels.length || 0
              }}
            </span>
          </div>
          <q-btn
            flat
            color="negative"
            label="取消下载"
            icon="cancel"
            @click="cancelDownload"
          />
        </div>

        <div class="progress-details">
          <div class="text-subtitle2 q-mb-sm">
            {{ currentModel ? currentModel.name : '准备下载...' }}
            <q-chip size="sm" outline>{{
              currentModel ? getModelTypeName(currentModel.type) : ''
            }}</q-chip>
          </div>

          <q-linear-progress
            :value="currentDownloadState.currentModelProgress / 100"
            size="20px"
            color="primary"
          >
            <div class="absolute-full flex flex-center">
              <q-badge
                color="white"
                text-color="primary"
                :label="`${formatPercentage(
                  currentDownloadState.currentModelProgress
                )}%`"
              />
            </div>
          </q-linear-progress>

          <div class="download-stats q-mt-md">
            <div class="stat-item">
              <q-icon name="save" size="sm" />
              <span
                >文件大小:
                {{ formatFileSize(currentDownloadState.totalBytes) }}</span
              >
            </div>
            <div class="stat-item">
              <q-icon name="cloud_download" size="sm" />
              <span
                >已下载:
                {{ formatFileSize(currentDownloadState.downloadedBytes) }}</span
              >
            </div>
            <div class="stat-item">
              <q-icon name="speed" size="sm" />
              <span
                >下载速度: {{ formatSpeed(currentDownloadState.speed) }}</span
              >
            </div>
            <div class="stat-item">
              <q-icon name="percent" size="sm" />
              <span
                >总体进度:
                {{ currentDownloadState.overallProgress.toFixed(1) }}%</span
              >
            </div>
          </div>
        </div>

        <!-- 下载历史 -->
        <div class="download-history">
          <div class="text-subtitle2 q-mb-sm">下载历史</div>
          <div
            v-for="(log, index) in downloadLogs"
            :key="index"
            class="log-item"
          >
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
</template>

<script lang="ts" setup>
import type { EssentialModel, DownloadProgress } from 'src/types/models';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import api from '../../api';

// 使用 eslint-disable 注释来禁用未使用变量的警告
/*
 * 暂未使用，保留以备后续扩展
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface DownloadLog {
  status: string;
  message: string;
  time: string;
}

// 当前下载状态接口
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

// 下载进度映射类型
export interface ModelDownloadProgress {
  [key: string]: DownloadProgress;
}

// 下载日志项
interface DownloadLogItem {
  time: string;
  message: string;
  status: string;
}

// 定义API响应类型
interface ApiResponse {
  data?: unknown;
  body?: unknown;
}

// 提取API响应数据函数
const extractResponseData = async <T>(
  response: ApiResponse | Response | undefined
): Promise<T | null> => {
  if (!response) return null;

  if (typeof response === 'object') {
    if ('data' in response && response.data !== undefined)
      return response.data as T;
    if ('body' in response && response.body !== undefined) {
      return response.body as T;
    }

    if (response instanceof Response) {
      try {
        return (await response.json()) as T;
      } catch (error) {
        console.error('解析响应JSON失败:', error);
      }
    }
  }

  return null;
};

// 使用具体类型替代any[]
interface InstalledModel {
  name: string;
  type: string;
  installed: boolean;
  path?: string;
  size?: string | number;

  [key: string]: unknown;
}

const $q = useQuasar();

// 本地状态
const essentialModels = ref<EssentialModel[]>([]);
const isLoading = ref(false);
const installedModels = ref<InstalledModel[]>([]);
const isDownloading = ref(false);
const downloadTaskId = ref<string | null>(null);
const downloadProgress = ref<ModelDownloadProgress>({});
const downloadPollingInterval = ref<ReturnType<typeof setInterval> | null>(
  null
);
const downloadSource = ref('HuggingFace中国镜像站');
const downloadSourceOptions = ['HuggingFace中国镜像站', 'HuggingFace官方'];
const downloadLogs = ref<DownloadLogItem[]>([]);
const installing = ref(false);

// 下载状态
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
  completed: false,
});

// 计算属性：所有必要模型是否已安装
const allEssentialModelsInstalled = computed(() => {
  if (!essentialModels.value.length) return false;
  return essentialModels.value.every((essModel) =>
    installedModels.value.some((insModel) => insModel.name === essModel.name)
  );
});

// 计算属性：基础模型安装状态
const essentialInstalled = computed(() => {
  return allEssentialModelsInstalled.value;
});

// API调用：获取必要模型列表
const fetchEssentialModels = async () => {
  try {
    isLoading.value = true;
    const response = await api.get('models/essential');
    const data = await extractResponseData<EssentialModel[]>(response);

    if (data && Array.isArray(data)) {
      essentialModels.value = data;
      console.log('获取到必要模型列表:', essentialModels.value.length);
      fetchInstalledModels();
    } else {
      console.error('获取模型列表失败: 响应格式不正确', response);
    }
  } catch (error) {
    console.error('获取必要模型列表失败:', error);
    $q.notify({
      type: 'negative',
      message: '无法获取必要模型列表',
    });
  } finally {
    isLoading.value = false;
  }
};

// API调用：获取已安装模型列表（用于检查必要模型是否已安装）
const fetchInstalledModels = async () => {
  try {
    const response = await api.get('models');
    const data = await extractResponseData<InstalledModel[]>(response);

    if (data && Array.isArray(data)) {
      installedModels.value = data.filter((model) => model.installed);
      console.log('获取到已安装模型:', installedModels.value.length);
    }
  } catch (error) {
    console.error('获取已安装模型列表失败:', error);
  }
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
      // 修改为使用新的API端点
      const response = await api.get(
        `models/essential-progress/${downloadTaskId.value}`
      );
      const progress = await extractResponseData<CurrentDownloadState>(
        response
      );

      if (progress) {
        // 更新全局下载状态
        currentDownloadState.value = { ...progress };

        // 更新基础模型下载进度
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
          completed: progress.completed || false,
        };

        // 添加下载日志
        if (progress.status === 'completed' && !progress.error) {
          addLog('基础模型已全部下载完成', '完成');

          // 刷新模型列表以反映最新状态
          await fetchEssentialModels();
        } else if (progress.error) {
          addLog(`下载出错: ${progress.error}`, '错误');
        }

        // 如果下载完成或出错，清除轮询
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
      console.error('获取下载进度失败:', error);

      // 添加错误日志
      addLog(
        `获取进度失败: ${error instanceof Error ? error.message : '未知错误'}`,
        '错误'
      );

      // 如果连续多次失败，可以考虑停止轮询
      if (downloadPollingInterval.value) {
        clearInterval(downloadPollingInterval.value);
        downloadPollingInterval.value = null;
      }
    }
  }, 1000);
};

// 下载基础模型
const downloadEssentialModels = async () => {
  if (isDownloading.value) return;

  // 添加下载开始日志
  addLog('开始下载基础模型集合', '开始');

  try {
    isLoading.value = true;

    // 根据选择的下载源确定API参数
    const source = downloadSource.value === 'HuggingFace官方' ? 'hf' : 'mirror';
    console.log('使用下载源:', source);

    const response = await api.post('models/download-essential', { source });
    const data = await extractResponseData<{ taskId?: string }>(response);

    if (data?.taskId) {
      downloadTaskId.value = data.taskId;
      isDownloading.value = true;

      // 初始化下载状态
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
        modelType: 'essential',
      };

      // 开始轮询
      pollDownloadProgress();

      $q.notify({
        type: 'info',
        message: '开始下载基础模型',
      });
    } else {
      throw new Error('服务器未返回有效的任务ID');
    }
  } catch (error) {
    console.error('启动下载失败:', error);
    $q.notify({
      type: 'negative',
      message: `启动下载失败: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });

    // 添加错误日志
    addLog(
      `启动下载失败: ${error instanceof Error ? error.message : String(error)}`,
      '错误'
    );
  } finally {
    isLoading.value = false;
  }
};

// 取消下载
const cancelDownload = async () => {
  if (!downloadTaskId.value) return;

  // 直接发送取消请求（不使用对话框确认）
  try {
    // 发送正确的取消下载请求
    await api.post('models/cancel-essential', { taskId: downloadTaskId.value });

    // 清除轮询和重置状态
    if (downloadPollingInterval.value) {
      clearInterval(downloadPollingInterval.value);
      downloadPollingInterval.value = null;
    }

    isDownloading.value = false;
    downloadTaskId.value = null;
    downloadProgress.value = {};

    // 添加取消日志
    addLog('用户取消了下载', '取消');

    console.log('已取消下载');
  } catch (error) {
    console.error('取消下载失败:', error);
    console.error('取消下载失败');

    // 添加错误日志
    addLog(
      `取消下载失败: ${error instanceof Error ? error.message : '未知错误'}`,
      '错误'
    );
  }
};

// 添加下载日志
const addLog = (message: string, status: string) => {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

  downloadLogs.value.unshift({
    time: timeStr,
    message,
    status,
  });

  // 限制日志条数
  if (downloadLogs.value.length > 50) {
    downloadLogs.value = downloadLogs.value.slice(0, 50);
  }
};

// 刷新模型列表
const refreshModels = async () => {
  await fetchEssentialModels();
};

// 格式化函数
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

const formatPercentage = (percentage: number) => {
  return percentage.toFixed(0);
};

// 获取日志徽章颜色
const getLogBadgeColor = (status: string): string => {
  switch (status) {
    case '完成':
      return 'positive';
    case '错误':
      return 'negative';
    case '取消':
      return 'warning';
    case '开始':
      return 'primary';
    default:
      return 'info';
  }
};

// 获取模型类型名称
const getModelTypeName = (type: string): string => {
  const typeMap: Record<string, string> = {
    checkpoint: '模型底座',
    vae: 'VAE模型',
    vae_approx: '预览解码器',
    upscaler: '放大模型',
    embedding: '提示词嵌入',
    detector: '检测器',
    segmentation: '分割模型',
    facerestore: '人脸修复',
    faceswap: '人脸替换',
    config: '配置文件',
    controlnet: 'ControlNet',
  };

  return typeMap[type] || type;
};

// 计算属性 - 当前正在下载的模型
const currentModel = computed(() => currentDownloadState.value.currentModel);

// 组件加载时获取数据
onMounted(() => {
  fetchEssentialModels();
});

// 组件卸载时清理资源
onUnmounted(() => {
  if (downloadPollingInterval.value) {
    clearInterval(downloadPollingInterval.value);
    downloadPollingInterval.value = null;
  }
});
</script>

<style scoped>
.essential-models {
  border-left: 5px solid var(--q-primary);
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
