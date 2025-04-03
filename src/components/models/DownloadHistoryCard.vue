<template>
  <q-card flat bordered class="q-mb-md">
    <q-card-section class="row items-center justify-between">
      <div class="text-h6">下载历史记录</div>
      <div>
        <q-select
          v-model="selectedLanguage"
          :options="languageOptions"
          dense
          outlined
          emit-value
          map-options
          options-dense
          class="q-mr-md language-selector"
          style="min-width: 120px"
          @update:model-value="onLanguageChange"
        />
        <q-btn flat round color="grey" icon="refresh" @click="refreshHistory" :loading="loading">
          <q-tooltip>刷新历史记录</q-tooltip>
        </q-btn>
        <q-btn flat round color="negative" icon="delete_sweep" @click="confirmClearHistory">
          <q-tooltip>清空历史记录</q-tooltip>
        </q-btn>
      </div>
    </q-card-section>

    <q-card-section>
      <div v-if="loading" class="text-center q-pa-md">
        <q-spinner color="primary" size="2em" />
        <div class="q-mt-sm">加载历史记录...</div>
      </div>
      
      <div v-else-if="!history.length" class="text-center q-pa-md text-grey">
        <q-icon name="history" size="2em" />
        <div class="q-mt-sm">暂无下载历史记录</div>
      </div>
      
      <q-list v-else bordered separator>
        <q-item v-for="item in history" :key="item.id" :class="getItemClass(item)">
          <q-item-section avatar>
            <q-avatar :color="getStatusColor(item.status)" text-color="white">
              <q-icon :name="getStatusIcon(item.status)" />
            </q-avatar>
          </q-item-section>
          
          <q-item-section>
            <q-item-label>{{ item.modelName }}</q-item-label>
            <q-item-label caption lines="2">
              来源: {{ item.source || '未知' }} | 
              {{ formatDate(item.startTime) }} | 
              状态: {{ item.statusText || getStatusText(item.status) }}
              <template v-if="item.error">
                <br />错误信息: {{ item.error }}
              </template>
            </q-item-label>
          </q-item-section>
          
          <q-item-section side>
            <div class="text-grey-8">
              <div v-if="item.fileSize">{{ formatSize(item.fileSize) }}</div>
              <div v-if="item.endTime && item.startTime">
                耗时: {{ formatDuration(item.endTime - item.startTime) }}
              </div>
              <div v-if="item.speed">
                平均速度: {{ formatSpeed(item.speed) }}
              </div>
            </div>
          </q-item-section>
          
          <q-item-section side>
            <q-btn flat round color="grey" icon="delete" @click="confirmDeleteItem(item)">
              <q-tooltip>删除此记录</q-tooltip>
            </q-btn>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch } from 'vue';
import api from '../../api';
import { useQuasar } from 'quasar';

// 定义下载历史项类型接口
interface DownloadHistoryItem {
  id: string;
  modelName: string;
  status: 'success' | 'failed' | 'canceled' | 'downloading';
  statusText?: string; // 添加本地化状态文本
  startTime: number;
  endTime?: number;
  fileSize?: number;
  downloadedSize?: number;
  error?: string;
  source?: string;
  speed?: number;
  savePath?: string;
  downloadUrl?: string;
  taskId?: string;
}

export default defineComponent({
  name: 'DownloadHistoryCard',
  
  props: {
    preferredLanguage: {
      type: String,
      default: 'zh'
    }
  },
  
  setup(props) {
    const $q = useQuasar();
    const history = ref<DownloadHistoryItem[]>([]);
    const loading = ref(false);
    
    // 使用父组件传递的语言
    const selectedLanguage = ref(props.preferredLanguage);
    const languageOptions = [
      { label: '中文', value: 'zh' },
      { label: 'English', value: 'en' },
      { label: '日本語', value: 'ja' },
      { label: '한국어', value: 'ko' }
    ];
    
    // 语言变更处理函数
    const onLanguageChange = () => {
      // 刷新历史记录，使用新选择的语言
      fetchHistory();
    };
    
    // 获取下载历史
    const fetchHistory = async () => {
      loading.value = true;
      try {
        // 添加语言参数到API请求
        const response = await api.getDownloadHistory(selectedLanguage.value);
        history.value = response.body.history || [];
        // 按时间降序排列
        history.value.sort((a, b) => b.startTime - a.startTime);
      } catch (error) {
        console.error('获取下载历史记录失败:', error);
        $q.notify({
          color: 'negative',
          message: '获取下载历史记录失败',
          icon: 'error'
        });
      } finally {
        loading.value = false;
      }
    };
    
    // 刷新历史记录
    const refreshHistory = () => {
      fetchHistory();
    };
    
    // 确认清空历史记录
    const confirmClearHistory = () => {
      $q.dialog({
        title: '确认清空',
        message: '确定要清空所有下载历史记录吗？此操作不可恢复。',
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          // 添加语言参数到API请求
          await api.clearDownloadHistory(selectedLanguage.value);
          history.value = [];
          $q.notify({
            color: 'positive',
            message: '历史记录已清空',
            icon: 'check_circle'
          });
        } catch (error) {
          console.error('清空历史记录失败:', error);
          $q.notify({
            color: 'negative',
            message: '清空历史记录失败',
            icon: 'error'
          });
        }
      });
    };
    
    // 确认删除单条记录 - 使用正确的类型替代 any
    const confirmDeleteItem = (item: DownloadHistoryItem) => {
      $q.dialog({
        title: '确认删除',
        message: `确定要删除"${item.modelName}"的下载记录吗？`,
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          // 添加语言参数到API请求
          await api.deleteDownloadHistoryItem(item.id, selectedLanguage.value);
          // 从列表中移除
          history.value = history.value.filter(record => record.id !== item.id);
          $q.notify({
            color: 'positive',
            message: '记录已删除',
            icon: 'check_circle'
          });
        } catch (error) {
          console.error('删除记录失败:', error);
          $q.notify({
            color: 'negative',
            message: '删除记录失败',
            icon: 'error'
          });
        }
      });
    };
    
    // 获取状态颜色
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'success': return 'positive';
        case 'failed': return 'negative';
        case 'canceled': return 'orange';
        case 'downloading': return 'info';
        default: return 'grey';
      }
    };
    
    // 获取状态图标
    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'success': return 'check_circle';
        case 'failed': return 'error';
        case 'canceled': return 'cancel';
        case 'downloading': return 'downloading';
        default: return 'help';
      }
    };
    
    // 获取状态文本
    const getStatusText = (status: string) => {
      switch (status) {
        case 'success': return '成功';
        case 'failed': return '失败';
        case 'canceled': return '已取消';
        case 'downloading': return '下载中';
        default: return '未知';
      }
    };
    
    // 格式化日期时间
    const formatDate = (timestamp: number) => {
      if (!timestamp) return '未知时间';
      const date = new Date(timestamp);
      return date.toLocaleString('zh-CN');
    };
    
    // 格式化文件大小
    const formatSize = (bytes: number) => {
      if (!bytes) return '未知大小';
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      if (bytes === 0) return '0 B';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
    };
    
    // 格式化下载速度
    const formatSpeed = (bytesPerSecond: number) => {
      if (!bytesPerSecond) return '未知速度';
      return formatSize(bytesPerSecond) + '/s';
    };
    
    // 格式化持续时间
    const formatDuration = (ms: number) => {
      if (!ms) return '未知时间';
      
      const seconds = Math.floor(ms / 1000);
      if (seconds < 60) return `${seconds}秒`;
      
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      if (minutes < 60) return `${minutes}分${remainingSeconds}秒`;
      
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}小时${remainingMinutes}分`;
    };
    
    // 获取项目样式 - 使用正确的类型替代 any
    const getItemClass = (item: DownloadHistoryItem) => {
      return {
        'bg-red-1': item.status === 'failed',
        'bg-green-1': item.status === 'success',
        'bg-orange-1': item.status === 'canceled',
        'bg-blue-1': item.status === 'downloading'
      };
    };
    
    // 监听 preferredLanguage 属性变化
    watch(() => props.preferredLanguage, (newLang) => {
      selectedLanguage.value = newLang;
      fetchHistory();
    });
    
    // 组件挂载时获取历史记录
    onMounted(() => {
      fetchHistory();
    });
    
    return {
      history,
      loading,
      selectedLanguage,
      languageOptions,
      onLanguageChange,
      refreshHistory,
      confirmClearHistory,
      confirmDeleteItem,
      getStatusColor,
      getStatusIcon,
      getStatusText,
      formatDate,
      formatSize,
      formatSpeed,
      formatDuration,
      getItemClass
    };
  }
});
</script>

<style scoped>
.language-selector {
  display: inline-block;
  vertical-align: middle;
}
</style> 