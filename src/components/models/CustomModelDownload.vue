<template>
  <q-card flat bordered class="custom-model-download">
    <q-card-section>
      <div class="text-h6">{{ $t('customModelDownload.title') }}</div>
      <div class="text-subtitle2">{{ $t('customModelDownload.subtitle') }}</div>
    </q-card-section>

    <q-card-section>
      <q-form @submit="downloadModel" class="q-gutter-md">
        <!-- 模型URL输入 -->
        <q-input
          v-model="modelUrl"
          :label="$t('customModelDownload.modelUrlLabel')"
          :hint="$t('customModelDownload.modelUrlHint')"
          :rules="[val => !!val || $t('customModelDownload.urlRequired')]"
          outlined
          clearable
        />

        <!-- 模型目录选择 -->
        <q-select
          v-model="modelDir"
          :options="modelDirOptions"
          :label="$t('customModelDownload.modelDirLabel')"
          :hint="$t('customModelDownload.modelDirHint')"
          :rules="[val => !!val || $t('customModelDownload.dirRequired')]"
          outlined
          emit-value
          map-options
          @update:model-value="handleDirectoryChange"
        />

        <!-- 自定义目录输入框 -->
        <q-input
          v-if="showCustomDirInput"
          v-model="customDirName"
          :label="$t('customModelDownload.customDirLabel')"
          :hint="$t('customModelDownload.customDirHint')"
          :rules="[val => !!val || $t('customModelDownload.customDirRequired')]"
          outlined
          clearable
        />

        <!-- 下载按钮 -->
        <div class="row justify-end q-mt-md">
          <q-btn
            :label="$t('customModelDownload.downloadButton')"
            type="submit"
            color="primary"
            :loading="downloading"
          />
        </div>
      </q-form>
    </q-card-section>

    <!-- 下载进度显示 -->
    <q-card-section v-if="currentTask">
      <div class="text-subtitle1 q-mb-sm">{{ $t('customModelDownload.downloadStatus') }}</div>
      
      <div class="row items-center q-mb-sm">
        <div class="col">
          <span class="text-weight-medium">{{ currentTask.currentModel?.name || '模型' }}</span>
        </div>
        <div class="col-auto">
          <q-btn
            v-if="!currentTask.completed && !currentTask.error"
            flat
            dense
            color="negative"
            icon="cancel"
            @click="cancelDownload"
            :label="$t('customModelDownload.cancelButton')"
          />
        </div>
      </div>
      
      <q-linear-progress
        :value="currentTask.overallProgress || 0"
        size="md"
        :color="getProgressColor(currentTask)"
        class="q-mb-xs"
      />
      
      <div class="row justify-between q-mt-sm text-caption">
        <span>{{ formatProgress(currentTask.overallProgress || 0) }}</span>
        <span>{{ formatFileSize(currentTask.downloadedBytes || 0) }} / {{ formatFileSize(currentTask.totalBytes || 0) }}</span>
      </div>
      
      <div v-if="currentTask.speed" class="text-caption q-mt-xs">
        {{ $t('customModelDownload.speed') }}: {{ formatSpeed(currentTask.speed) }}
      </div>
      
      <div v-if="currentTask.error" class="text-negative q-mt-sm">
        {{ $t('customModelDownload.errorOccurred') }}: {{ currentTask.error }}
      </div>
      
      <div v-if="currentTask.completed" class="text-positive q-mt-sm">
        {{ $t('customModelDownload.downloadCompleted') }}
      </div>
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import { defineComponent, ref, onBeforeUnmount } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import api from '../../api';

// 定义下载任务接口
interface DownloadTask {
  currentModel?: {
    name: string;
  };
  overallProgress?: number;
  currentModelProgress?: number;
  completed?: boolean;
  error?: string | null;
  downloadedBytes?: number;
  totalBytes?: number;
  speed?: number;
  status?: string;
}

// 定义API响应中的任务数据格式
interface TaskData {
  taskId: string;
  [key: string]: unknown;
}

export default defineComponent({
  name: 'CustomModelDownload',
  
  setup() {
    const $q = useQuasar();
    const { t } = useI18n();
    const modelUrl = ref('');
    const modelDir = ref(null);
    const customDirName = ref('');
    const showCustomDirInput = ref(false);
    const downloading = ref(false);
    const currentTaskId = ref('');
    const currentTask = ref<DownloadTask | null>(null);
    const pollingInterval = ref<number | null>(null);
    
    // 模型目录选项
    const modelDirOptions = [
      { label: 'Checkpoints', value: 'checkpoints' },
      { label: 'Lora', value: 'loras' },
      { label: 'VAE', value: 'vae' },
      { label: 'ControlNet', value: 'controlnet' },
      { label: 'Embeddings', value: 'embeddings' },
      { label: 'CLIP Vision', value: 'clip_vision' },
      { label: 'GLIGEN', value: 'gligen' },
      { label: 'UNET', value: 'unet' },
      { label: 'T2I Adapter', value: 't2i_adapter' },
      { label: 'Upscale Models', value: 'upscale_models' },
      { label: 'ESRGAN', value: 'upscale_models/ESRGAN' },
      { label: 'SwinIR', value: 'upscale_models/SwinIR' },
      { label: 'RealESRGAN', value: 'upscale_models/RealESRGAN' },
      { label: 'LDSR', value: 'upscale_models/LDSR' },
      { label: t('customModelDownload.customDir'), value: 'custom' }
    ];
    
    // 处理目录选择变化
    const handleDirectoryChange = (value: string) => {
      showCustomDirInput.value = value === 'custom';
    };
    
    // 获取实际存储目录
    const getActualModelDir = (): string => {
      if (modelDir.value === 'custom' && customDirName.value) {
        return customDirName.value;
      }
      return String(modelDir.value || '');
    };
    
    // 从响应中安全地提取数据
    const extractResponseData = (response: unknown): unknown => {
      if (response && typeof response === 'object') {
        if ('data' in response && response.data) return response.data;
        if ('body' in response && response.body) return response.body;
      }
      return response;
    };
    
    // 下载模型方法
    const downloadModel = async () => {
      // 检查自定义目录是否填写
      if (modelDir.value === 'custom' && !customDirName.value) {
        $q.notify({
          color: 'negative',
          message: t('customModelDownload.customDirRequired'),
          icon: 'warning'
        });
        return;
      }
      
      if (!modelUrl.value || !modelDir.value) {
        $q.notify({
          color: 'negative',
          message: t('customModelDownload.allFieldsRequired'),
          icon: 'warning'
        });
        return;
      }
      
      // 获取实际目录路径并验证
      const actualDir = getActualModelDir();
      if (!actualDir) {
        $q.notify({
          color: 'negative',
          message: t('customModelDownload.dirRequired'),
          icon: 'warning'
        });
        return;
      }
      
      try {
        downloading.value = true;
        
        // 显示开始下载通知
        $q.notify({
          message: t('customModelDownload.downloadStarted'),
          color: 'info',
          icon: 'cloud_download'
        });
        
        // 调用API开始下载
        const response = await api.downloadCustomModel(modelUrl.value, actualDir);
        const responseData = extractResponseData(response) as TaskData;
        
        // 验证响应数据中有taskId
        if (!responseData || typeof responseData !== 'object' || !('taskId' in responseData)) {
          throw new Error('无效的响应数据：缺少任务ID');
        }
        
        // 获取任务ID
        currentTaskId.value = String(responseData.taskId);
        
        // 开始轮询下载进度
        startPolling();
        
      } catch (error) {
        console.error('启动下载失败:', error);
        downloading.value = false;
        
        // 显示错误通知
        $q.notify({
          color: 'negative',
          message: `下载失败: ${error instanceof Error ? error.message : String(error)}`,
          icon: 'error'
        });
      }
    };
    
    // 取消下载方法
    const cancelDownload = async () => {
      if (!currentTaskId.value) return;
      
      try {
        await api.post('models/cancel-download', { taskId: currentTaskId.value });
        
        $q.notify({
          color: 'info',
          message: '下载已取消',
          icon: 'cancel'
        });
      } catch (error) {
        console.error('取消下载失败:', error);
        
        $q.notify({
          color: 'negative',
          message: `取消下载失败: ${error instanceof Error ? error.message : String(error)}`,
          icon: 'error'
        });
      }
    };
    
    // 开始轮询下载进度
    const startPolling = () => {
      // 如果已经有轮询，先清除
      if (pollingInterval.value) {
        clearInterval(pollingInterval.value);
      }
      
      // 立即获取一次进度
      fetchProgress();
      
      // 设置轮询间隔
      pollingInterval.value = window.setInterval(() => {
        fetchProgress();
      }, 1000) as unknown as number;
    };
    
    // 获取下载进度
    const fetchProgress = async () => {
      if (!currentTaskId.value) return;
      
      try {
        const response = await api.get(`models/progress/${currentTaskId.value}`);
        const progressData = extractResponseData(response);
        
        // 将进度数据转换为DownloadTask类型
        if (progressData && typeof progressData === 'object') {
          currentTask.value = progressData as DownloadTask;
        
          // 如果下载完成或出错，停止轮询
          if (currentTask.value && (
            currentTask.value.completed || 
            currentTask.value.error || 
            currentTask.value.status === 'completed' || 
            currentTask.value.status === 'error'
          )) {
            if (pollingInterval.value) {
              clearInterval(pollingInterval.value);
              pollingInterval.value = null;
            }
            
            downloading.value = false;
            
            // 显示完成通知
            if (currentTask.value && currentTask.value.completed) {
              $q.notify({
                color: 'positive',
                message: '模型下载完成',
                icon: 'check_circle'
              });
            } else if (currentTask.value && currentTask.value.error) {
              $q.notify({
                color: 'negative',
                message: `下载失败: ${currentTask.value.error}`,
                icon: 'error'
              });
            }
          }
        }
      } catch (error) {
        console.error('获取下载进度失败:', error);
      }
    };
    
    // 格式化进度百分比
    const formatProgress = (progress: number) => {
      return `${Math.round(progress * 100)}%`;
    };
    
    // 格式化文件大小
    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    };
    
    // 格式化下载速度
    const formatSpeed = (bytesPerSecond: number) => {
      if (bytesPerSecond === 0) return '0 B/s';
      const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
      const i = Math.floor(Math.log(bytesPerSecond) / Math.log(1024));
      return `${(bytesPerSecond / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    };
    
    // 获取进度条颜色
    const getProgressColor = (task: DownloadTask) => {
      if (task.error) return 'negative';
      if (task.completed) return 'positive';
      return 'primary';
    };
    
    // 组件卸载时清除轮询
    onBeforeUnmount(() => {
      if (pollingInterval.value) {
        clearInterval(pollingInterval.value);
        pollingInterval.value = null;
      }
    });
    
    return {
      modelUrl,
      modelDir,
      customDirName,
      showCustomDirInput,
      modelDirOptions,
      downloading,
      currentTask,
      downloadModel,
      cancelDownload,
      handleDirectoryChange,
      formatProgress,
      formatFileSize,
      formatSpeed,
      getProgressColor,
      $t: t
    };
  }
});
</script>

<style scoped>
.custom-model-download {
  max-width: 100%;
}
</style> 