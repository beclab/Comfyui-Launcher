import { defineStore } from 'pinia';
import api from 'src/api';
import {
  CurrentDownloadState,
  DownloadLogItem,
  EssentialModel,
  extractResponseData,
  InstalledModel,
  ModelDownloadProgress,
} from 'src/types/models';
import { useNetworkStore } from 'stores/network';
import { NetworkType } from 'src/types/contants';

interface EssentialModelState {
  isLoading: boolean;
  isDownloading: boolean;
  installing: boolean;
  installedModels: InstalledModel[];
  essentialModels: EssentialModel[];
  downloadTaskId: string | null;
  downloadLogs: DownloadLogItem[];
  downloadProgress: ModelDownloadProgress;
  downloadPollingInterval: ReturnType<typeof setInterval> | null;
  currentDownloadState: CurrentDownloadState;
}

const defaultDownloadState: CurrentDownloadState = {
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
};

export const useEssentialModelStore = defineStore('essentialModel', {
  state: () => {
    return {
      isLoading: false,
      isDownloading: false,
      installing: false,
      installedModels: [],
      essentialModels: [],
      downloadTaskId: null,
      downloadLogs: [],
      downloadProgress: {},
      downloadPollingInterval: null,
      currentDownloadState: defaultDownloadState,
    } as EssentialModelState;
  },
  getters: {
    // 计算属性：所有必要模型是否已安装
    allEssentialModelsInstalled(): boolean {
      if (!this.essentialModels.length) return false;
      return this.essentialModels.every((essModel: EssentialModel) =>
        this.installedModels.some((insModel) => insModel.name === essModel.name)
      );
    },

    // 计算属性 - 当前正在下载的模型
    currentModel(): EssentialModel | null {
      return this.currentDownloadState.currentModel;
    },
  },

  actions: {
    // API调用：获取必要模型列表
    async fetchEssentialModels() {
      try {
        // isLoading = true;
        const response = await api.get('models/essential');
        const data = await extractResponseData<EssentialModel[]>(response);

        if (data && Array.isArray(data)) {
          this.essentialModels = data;
          console.log('获取到必要模型列表:', this.essentialModels.length);
          this.fetchInstalledModels();
        } else {
          console.error('获取模型列表失败: 响应格式不正确', response);
        }
      } catch (error) {
        console.error('获取必要模型列表失败:', error);
        // $q.notify({
        //   type: 'negative',
        //   message: '无法获取必要模型列表'
        // });
      } finally {
        // isLoading = false;
      }
    },
    // API调用：获取已安装模型列表（用于检查必要模型是否已安装）
    async fetchInstalledModels() {
      try {
        const response = await api.get('models');
        const data = await extractResponseData<InstalledModel[]>(response);

        if (data && Array.isArray(data)) {
          this.installedModels = data.filter((model) => model.installed);
          console.log('获取到已安装模型:', this.installedModels.length);
        }
      } catch (error) {
        console.error('获取已安装模型列表失败:', error);
      }
    },

    // 轮询下载进度
    async pollDownloadProgress() {
      if (!this.downloadTaskId) return;

      // 清除可能已存在的轮询
      if (this.downloadPollingInterval) {
        clearInterval(this.downloadPollingInterval);
      }

      // 设置轮询间隔
      this.downloadPollingInterval = setInterval(async () => {
        if (!this.downloadTaskId) {
          if (this.downloadPollingInterval) {
            clearInterval(this.downloadPollingInterval);
            this.downloadPollingInterval = null;
          }
          return;
        }

        try {
          // 修改为使用新的API端点
          const response = await api.get(
            `models/essential-progress/${this.downloadTaskId}`
          );
          const progress = await extractResponseData<CurrentDownloadState>(
            response
          );

          if (progress) {
            // 更新全局下载状态
            this.currentDownloadState = { ...progress };

            // 更新基础模型下载进度
            this.downloadProgress['essentialModels'] = {
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
              this.addLog('基础模型已全部下载完成', '完成');

              // 刷新模型列表以反映最新状态
              await this.fetchEssentialModels();
            } else if (progress.error) {
              this.addLog(`下载出错: ${progress.error}`, '错误');
            }

            // 如果下载完成或出错，清除轮询
            if (
              progress.status === 'completed' ||
              progress.status === 'error'
            ) {
              this.isDownloading = false;
              this.downloadTaskId = null;

              if (this.downloadPollingInterval) {
                clearInterval(this.downloadPollingInterval);
                this.downloadPollingInterval = null;
              }
            }
          }
        } catch (error) {
          console.error('获取下载进度失败:', error);

          // 添加错误日志
          this.addLog(
            `获取进度失败: ${
              error instanceof Error ? error.message : '未知错误'
            }`,
            '错误'
          );

          // 如果连续多次失败，可以考虑停止轮询
          if (this.downloadPollingInterval) {
            clearInterval(this.downloadPollingInterval);
            this.downloadPollingInterval = null;
          }
        }
      }, 1000);
    },

    // 下载基础模型
    async downloadEssentialModels() {
      if (this.isDownloading) return;

      // 添加下载开始日志
      this.addLog('开始下载基础模型集合', '开始');

      try {
        // this.isLoading = true;

        // 根据选择的下载源确定API参数
        const networkStore = useNetworkStore();
        const huggingFaceUrl = networkStore.getNetworkConfig(
          NetworkType.HUGGING_FACE
        ).url;
        console.log('使用下载源:', huggingFaceUrl);
        const source = huggingFaceUrl.includes('mirror') ? 'mirror' : 'hf';
        console.log('使用下载源:', source);

        const response = await api.post('models/download-essential', {
          source,
        });
        const data = await extractResponseData<{ taskId?: string }>(response);

        if (data?.taskId) {
          this.downloadTaskId = data.taskId;
          this.isDownloading = true;

          // 初始化下载状态
          this.currentDownloadState = {
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
          this.pollDownloadProgress();

          // $q.notify({
          //   type: 'info',
          //   message: '开始下载基础模型'
          // });
        } else {
          throw new Error('服务器未返回有效的任务ID');
        }
      } catch (error) {
        console.error('启动下载失败:', error);
        // $q.notify({
        //   type: 'negative',
        //   message: `启动下载失败: ${
        //     error instanceof Error ? error.message : String(error)
        //   }`
        // });

        // 添加错误日志
        this.addLog(
          `启动下载失败: ${
            error instanceof Error ? error.message : String(error)
          }`,
          '错误'
        );
      } finally {
        // isLoading = false;
      }
    },

    // 取消下载
    async cancelDownload() {
      if (!this.downloadTaskId) return;

      // 直接发送取消请求（不使用对话框确认）
      try {
        // 发送正确的取消下载请求
        await api.post('models/cancel-essential', {
          taskId: this.downloadTaskId,
        });

        // 清除轮询和重置状态
        if (this.downloadPollingInterval) {
          clearInterval(this.downloadPollingInterval);
          this.downloadPollingInterval = null;
        }

        this.isDownloading = false;
        this.downloadTaskId = null;
        this.downloadProgress = {};

        // 添加取消日志
        this.addLog('用户取消了下载', '取消');

        console.log('已取消下载');
      } catch (error) {
        console.error('取消下载失败:', error);
        console.error('取消下载失败');

        // 添加错误日志
        this.addLog(
          `取消下载失败: ${
            error instanceof Error ? error.message : '未知错误'
          }`,
          '错误'
        );
      }
    },

    // 添加下载日志
    addLog(message: string, status: string) {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      this.downloadLogs.unshift({
        time: timeStr,
        message,
        status,
      });

      // 限制日志条数
      if (this.downloadLogs.length > 50) {
        this.downloadLogs = this.downloadLogs.slice(0, 50);
      }
    },

    // 刷新模型列表
    async refreshModels() {
      await this.fetchEssentialModels();
    },

    // 格式化函数
    formatFileSize(bytes: number) {
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
    },

    // 格式化下载速度
    formatSpeed(bytesPerSecond: number) {
      if (!bytesPerSecond || isNaN(bytesPerSecond)) return '0 B/s';
      return `${this.formatFileSize(bytesPerSecond)}/s`;
    },

    formatPercentage(percentage: number) {
      return percentage.toFixed(0);
    },

    // 获取日志徽章颜色
    getLogBadgeColor(status: string): string {
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
    },

    // 获取模型类型名称
    getModelTypeName(type: string): string {
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
    },

    clearInterval() {
      if (this.downloadPollingInterval) {
        clearInterval(this.downloadPollingInterval);
        this.downloadPollingInterval = null;
      }
    },
  },
});
