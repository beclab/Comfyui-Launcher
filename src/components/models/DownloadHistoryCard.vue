<template>
  <q-card flat bordered class="q-mb-md">
    <q-card-section class="row items-center justify-between">
      <div class="text-h6">{{ $t('downloadHistory.title') }}</div>
      <div>
        <q-btn outline color="grey-7" icon="delete_sweep" :label="$t('downloadHistory.clearHistory')" @click="confirmClearHistory" class="q-mr-sm" style="height: 40px; border-radius: var(--border-radius-lg) !important;"/>
        <q-btn outline color="grey-7" icon="refresh" :label="$t('downloadHistory.refresh')" @click="refreshHistory" :loading="loading" style="height: 40px; border-radius: var(--border-radius-lg) !important;"/>
      </div>
    </q-card-section>

    <q-card-section>
      <div v-if="loading" class="text-center q-pa-md">
        <q-spinner color="primary" size="2em" />
        <div class="q-mt-sm">{{ $t('downloadHistory.loading') }}</div>
      </div>
      
      <div v-else-if="!history.length" class="text-center q-pa-md text-grey">
        <q-icon name="history" size="2em" />
        <div class="q-mt-sm">{{ $t('downloadHistory.noHistory') }}</div>
      </div>
      
      <q-table
        v-else
        :rows="history"
        :columns="columns"
        row-key="id"
        flat
        :pagination="pagination"
        :rows-per-page-options="[10, 20, 50]"
        class="history-table"
      >
        <!-- 名称列 -->
        <template v-slot:body-cell-modelName="props">
          <q-td :props="props">
            {{ props.row.modelName }}
          </q-td>
        </template>
        
        <!-- 时间列 -->
        <template v-slot:body-cell-startTime="props">
          <q-td :props="props">
            {{ formatDate(props.row.startTime) }}
          </q-td>
        </template>
        
        <!-- 来源列 -->
        <template v-slot:body-cell-source="props">
          <q-td :props="props">
            {{ props.row.source || 'mirror' }}
          </q-td>
        </template>
        
        <!-- 大小列 -->
        <template v-slot:body-cell-fileSize="props">
          <q-td :props="props">
            {{ formatSize(props.row.fileSize) }}
          </q-td>
        </template>
        
        <!-- 耗时列 -->
        <template v-slot:body-cell-duration="props">
          <q-td :props="props">
            {{ formatDuration(props.row.endTime && props.row.startTime ? props.row.endTime - props.row.startTime : 0) }}
          </q-td>
        </template>
        
        <!-- 平均速度列 -->
        <template v-slot:body-cell-speed="props">
          <q-td :props="props">
            {{ formatSpeed(props.row.speed) }}
          </q-td>
        </template>
        
        <!-- 状态列 -->
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <div class="status-indicator" style="display: flex; align-items: center;">
              <q-badge :color="getStatusColor(props.row.status)" rounded style="width: 8px; height: 8px;" class="q-mr-xs" />
              <span class="text-caption">{{ props.row.statusText || getStatusText(props.row.status) }}</span>
            </div>
          </q-td>
        </template>
        
        <!-- 操作列 -->
        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn flat round dense color="grey" icon="delete" @click="confirmDeleteItem(props.row)">
              <q-tooltip>{{ $t('downloadHistory.actions.deleteRecord') }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, computed } from 'vue';
import api from '../../api';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';

// Define download history item type interface
interface DownloadHistoryItem {
  id: string;
  modelName: string;
  status: 'success' | 'failed' | 'canceled' | 'downloading';
  statusText?: string;
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

// Define table column type interface
interface TableColumn {
  name: string;
  required?: boolean;
  label: string;
  align?: 'left' | 'right' | 'center';
  field: string | ((row: DownloadHistoryItem) => string | number | null | undefined);
  sortable?: boolean;
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
    const { t } = useI18n();
    const history = ref<DownloadHistoryItem[]>([]);
    const loading = ref(false);
    const selectedLanguage = ref(props.preferredLanguage);
    
    // Pagination settings
    const pagination = ref({
      rowsPerPage: 10,
      sortBy: 'startTime',
      descending: true
    });
    
    // Table columns with i18n
    const columns = computed<TableColumn[]>(() => [
      {
        name: 'modelName',
        required: true,
        label: t('downloadHistory.columns.modelName'),
        align: 'left',
        field: 'modelName',
        sortable: true
      },
      {
        name: 'startTime',
        required: true,
        label: t('downloadHistory.columns.startTime'),
        align: 'left',
        field: 'startTime',
        sortable: true
      },
      {
        name: 'source',
        required: true,
        label: t('downloadHistory.columns.source'),
        align: 'left',
        field: 'source',
        sortable: true
      },
      {
        name: 'fileSize',
        required: true,
        label: t('downloadHistory.columns.fileSize'),
        align: 'left',
        field: 'fileSize',
        sortable: true
      },
      {
        name: 'duration',
        required: true,
        label: t('downloadHistory.columns.duration'),
        align: 'left',
        field: (row: DownloadHistoryItem) => row.endTime && row.startTime ? row.endTime - row.startTime : 0,
        sortable: true
      },
      {
        name: 'speed',
        required: true,
        label: t('downloadHistory.columns.speed'),
        align: 'left',
        field: 'speed',
        sortable: true
      },
      {
        name: 'status',
        required: true,
        label: t('downloadHistory.columns.status'),
        align: 'left',
        field: 'status',
        sortable: true
      },
      {
        name: 'actions',
        required: true,
        label: t('downloadHistory.columns.actions'),
        align: 'center',
        field: 'actions',
        sortable: false
      }
    ]);
    
    // Fetch download history
    const fetchHistory = async () => {
      loading.value = true;
      try {
        // Add language parameter to API request
        const response = await api.getDownloadHistory(selectedLanguage.value);
        history.value = response.body.history || [];
        // Sort by time in descending order
        history.value.sort((a, b) => b.startTime - a.startTime);
      } catch (error) {
        console.error('Failed to fetch download history:', error);
        $q.notify({
          color: 'negative',
          message: '获取下载历史记录失败',
          icon: 'error'
        });
      } finally {
        loading.value = false;
      }
    };
    
    // Refresh history
    const refreshHistory = () => {
      fetchHistory();
    };
    
    // Confirm clear history
    const confirmClearHistory = () => {
      $q.dialog({
        title: t('downloadHistory.dialog.confirmClear.title'),
        message: t('downloadHistory.dialog.confirmClear.message'),
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          // Add language parameter to API request
          await api.clearDownloadHistory(selectedLanguage.value);
          history.value = [];
          $q.notify({
            color: 'positive',
            message: t('downloadHistory.dialog.success.cleared'),
            icon: 'check_circle'
          });
        } catch (error) {
          console.error('Failed to clear history:', error);
          $q.notify({
            color: 'negative',
            message: t('downloadHistory.dialog.error.clearFailed'),
            icon: 'error'
          });
        }
      });
    };
    
    // Confirm delete single item
    const confirmDeleteItem = (item: DownloadHistoryItem) => {
      $q.dialog({
        title: t('downloadHistory.dialog.confirmDelete.title'),
        message: t('downloadHistory.dialog.confirmDelete.message', { modelName: item.modelName }),
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          // Add language parameter to API request
          await api.deleteDownloadHistoryItem(item.id, selectedLanguage.value);
          // Remove from list
          history.value = history.value.filter(record => record.id !== item.id);
          $q.notify({
            color: 'positive',
            message: t('downloadHistory.dialog.success.deleted'),
            icon: 'check_circle'
          });
        } catch (error) {
          console.error('Failed to delete record:', error);
          $q.notify({
            color: 'negative',
            message: t('downloadHistory.dialog.error.deleteFailed'),
            icon: 'error'
          });
        }
      });
    };
    
    // Get status color
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'success': return 'positive';
        case 'failed': return 'negative';
        case 'canceled': return 'orange';
        case 'downloading': return 'info';
        default: return 'grey';
      }
    };
    
    // Get status text
    const getStatusText = (status: string) => {
      switch (status) {
        case 'success': return t('downloadHistory.status.success');
        case 'failed': return t('downloadHistory.status.failed');
        case 'canceled': return t('downloadHistory.status.canceled');
        case 'downloading': return t('downloadHistory.status.downloading');
        default: return t('downloadHistory.status.unknown');
      }
    };
    
    // Format date time
    const formatDate = (timestamp: number) => {
      if (!timestamp) return t('downloadHistory.time.unknown');
      const date = new Date(timestamp);
      return date.toLocaleString();
    };
    
    // Format file size
    const formatSize = (bytes: number) => {
      if (!bytes) return t('downloadHistory.size.unknown');
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      if (bytes === 0) return '0 B';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
    };
    
    // Format download speed
    const formatSpeed = (bytesPerSecond: number) => {
      if (!bytesPerSecond) return t('downloadHistory.speed.unknown');
      return formatSize(bytesPerSecond) + '/s';
    };
    
    // Format duration
    const formatDuration = (ms: number) => {
      if (!ms) return t('downloadHistory.time.unknown');
      
      const seconds = Math.floor(ms / 1000);
      if (seconds < 60) return t('downloadHistory.time.seconds', { count: seconds });
      
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      if (minutes < 60) return t('downloadHistory.time.minutes', { minutes, seconds: remainingSeconds });
      
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return t('downloadHistory.time.hours', { hours, minutes: remainingMinutes });
    };
    
    // Watch for preferredLanguage property changes
    watch(() => props.preferredLanguage, (newLang) => {
      selectedLanguage.value = newLang;
      fetchHistory();
    });
    
    // Fetch history on component mount
    onMounted(() => {
      fetchHistory();
    });
    
    return {
      history,
      loading,
      columns,
      pagination,
      selectedLanguage,
      refreshHistory,
      confirmClearHistory,
      confirmDeleteItem,
      getStatusColor,
      getStatusText,
      formatDate,
      formatSize,
      formatSpeed,
      formatDuration,
      t
    };
  }
});
</script>

<style scoped>
.q-table th {
  font-weight: bold;
}

/* 增加卡片圆角 */
.q-card {
  border-radius: 16px;
}

/* 表格样式调整 */
.history-table {
  /* 去掉表格外边框 */
  border: none !important;
}

/* 让分隔线填充满宽度 */
.history-table .q-table__middle {
  border-left: none;
  border-right: none;
}

.history-table tbody tr {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.history-table tbody tr:last-child {
  border-bottom: none;
}

/* 确保表格内容不会突破边界 */
.history-table .q-table__container {
  border-radius: 16px;
  overflow: hidden;
}

/* 给按钮增加圆角 */
.q-btn {
  border-radius: 8px;
}
</style>