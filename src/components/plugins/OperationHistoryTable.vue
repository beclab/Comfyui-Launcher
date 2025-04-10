<template>
  <div class="history-table-container rounded-borders">
    <!-- 标题和按钮区域 -->
    <div class="row justify-between items-center q-px-md q-py-md q-gutter-x-sm">
      <div class="text-h6">操作历史记录</div>
      <div class="row items-center">
        <q-btn 
          color="grey" 
          icon="delete" 
          label="清除历史" 
          outline 
          @click="confirmClearHistory" 
          class="custom-btn q-mr-sm"
          style="border-radius: 8px"
        />
        <q-btn
          color="grey"
          icon="refresh"
          label="刷新"
          outline
          @click="fetchHistory"
          :loading="loading"
          class="custom-btn"
          style="border-radius: 8px"
        />
      </div>
    </div>
    
    <!-- 分割线 -->
    <q-separator />

    <!-- 表格 -->
    <q-table
      :rows="operations"
      :columns="tableColumns"
      row-key="id"
      :loading="loading"
      :pagination="pagination"
      dense
      binary-state-sort
      flat
    >
      <!-- 名称列 -->
      <template v-slot:body-cell-name="props">
        <q-td :props="props">
          {{ props.row.pluginName || 'ComfyUI-Manager' }}
        </q-td>
      </template>

      <!-- 操作类型列 -->
      <template v-slot:body-cell-type="props">
        <q-td :props="props">
          {{ getOperationLocalizedName(props.row) }}
        </q-td>
      </template>

      <!-- 开始时间列 -->
      <template v-slot:body-cell-startTime="props">
        <q-td :props="props">
          {{ formatTime(props.row.startTime) }}
        </q-td>
      </template>

      <!-- 结束时间列 -->
      <template v-slot:body-cell-endTime="props">
        <q-td :props="props">
          {{ formatTime(props.row.endTime) }}
        </q-td>
      </template>

      <!-- 耗时列 -->
      <template v-slot:body-cell-duration="props">
        <q-td :props="props">
          {{ formatDuration(props.row.startTime, props.row.endTime) }}
        </q-td>
      </template>

      <!-- 状态列 -->
      <template v-slot:body-cell-status="props">
        <q-td :props="props" class="q-pa-sm">
          <div class="flex items-center no-wrap">
            <q-icon 
              name="circle"
              size="10px"
              :color="getStatusColor(props.row.status)"
              class="q-mr-xs"
            />
            <span class="text-caption text-weight-medium">
              {{ getStatusLocalizedName(props.row) }}
            </span>
          </div>
        </q-td>
      </template>

      <!-- 操作列 -->
      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="q-gutter-xs">
          <q-btn
            dense
            flat
            round
            color="grey"
            icon="visibility"
            size="sm"
            @click="onViewLogs(props.row)"
          >
            <q-tooltip>查看详细日志</q-tooltip>
          </q-btn>
          <q-btn
            dense
            flat
            round
            color="grey"
            icon="delete"
            size="sm"
            @click="onDeleteRecord(props.row)"
          >
            <q-tooltip>删除记录</q-tooltip>
          </q-btn>
        </q-td>
      </template>

      <!-- 底部分页 -->
      <template v-slot:pagination="scope">
        <div class="row items-center justify-end q-py-sm">
          <span class="q-mr-md text-caption">Records per page: </span>
          <q-select
            v-model="pagination.rowsPerPage"
            :options="[10, 20, 50]"
            dense
            borderless
            emit-value
            map-options
            options-dense
            style="min-width: 60px"
            @update:model-value="updatePagination(scope)"
          />
          <span class="q-mx-md text-caption">
            {{ scope.pagesNumber > 0 ? scope.pagination.page : 0 }} of {{ scope.pagesNumber }}
          </span>
          <q-btn
            icon="chevron_left"
            color="grey-8"
            round
            dense
            flat
            :disable="scope.isFirstPage"
            @click="scope.prevPage"
          />
          <q-btn
            icon="chevron_right"
            color="grey-8"
            round
            dense
            flat
            :disable="scope.isLastPage"
            @click="scope.nextPage"
          />
        </div>
      </template>

      <!-- 无数据提示 -->
      <template v-slot:no-data>
        <div class="full-width row flex-center q-gutter-sm q-pa-lg">
          <q-icon name="history" size="2em" color="grey-7" />
          <span class="text-grey-7">暂无操作历史记录</span>
        </div>
      </template>
    </q-table>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { QTableColumn } from 'quasar';

// 操作类型定义
interface PluginOperation {
  id: string;
  pluginId: string;
  pluginName?: string;
  type: 'install' | 'uninstall' | 'disable' | 'enable';
  startTime: number;
  endTime?: number;
  status: 'running' | 'success' | 'failed';
  logs?: string[];
  result?: string;
  typeText?: string;
  statusText?: string;
}

// Props
const props = defineProps({
  operations: {
    type: Array as () => PluginOperation[],
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits([
  'view-logs', 
  'retry-install', 
  'delete-record',
  'clear-history',
  'refresh'
]);

// Data
const pagination = ref({
  sortBy: 'startTime',
  descending: true,
  page: 1,
  rowsPerPage: 10
});

// Table columns definition
const tableColumns = computed<QTableColumn[]>(() => [
  {
    name: 'name',
    required: true,
    label: '名称',
    align: 'left',
    field: row => row.pluginName || 'ComfyUI-Manager',
    sortable: true
  },
  {
    name: 'type',
    required: true,
    label: '操作类型',
    align: 'left',
    field: 'type',
    sortable: true
  },
  {
    name: 'startTime',
    required: true,
    label: '开始时间',
    align: 'left',
    field: 'startTime',
    sortable: true
  },
  {
    name: 'endTime',
    required: true,
    label: '结束时间',
    align: 'left',
    field: 'endTime',
    sortable: true
  },
  {
    name: 'duration',
    required: true,
    label: '耗时',
    align: 'left',
    field: row => row.endTime ? (row.endTime - row.startTime) : 0,
    sortable: true
  },
  {
    name: 'status',
    required: true,
    label: '状态',
    align: 'left',
    field: 'status',
    sortable: true
  },
  {
    name: 'actions',
    required: true,
    label: '操作',
    align: 'center',
    field: 'actions',
    sortable: false
  }
]);

// Methods for operation and status handling
const getOperationColor = (type: string): string => {
  if (!type) return 'grey';
  switch (type) {
    case 'install': return 'primary';
    case 'uninstall': return 'negative';
    case 'disable': return 'warning';
    case 'enable': return 'positive';
    default: return 'grey';
  }
};

const getStatusColor = (status: string): string => {
  if (!status) return 'grey';
  switch (status) {
    case 'running': return 'blue';
    case 'success': return 'green';
    case 'failed': return 'red';
    default: return 'grey';
  }
};

const getOperationLocalizedName = (row: PluginOperation): string => {
  if (row.typeText && !row.typeText.includes('.')) {
    return row.typeText;
  }
  return getOperationName(row.type);
};

const getStatusLocalizedName = (row: PluginOperation): string => {
  if (row.statusText && !row.statusText.includes('.')) {
    return row.statusText;
  }
  return getStatusName(row.status);
};

const getOperationName = (type: string): string => {
  if (!type) return '未知';
  switch (type) {
    case 'install': return '安装';
    case 'uninstall': return '卸载';
    case 'disable': return '禁用';
    case 'enable': return '启用';
    default: return type;
  }
};

const getStatusName = (status: string): string => {
  if (!status) return '未知';
  switch (status) {
    case 'running': return '进行中';
    case 'success': return '成功';
    case 'failed': return '失败';
    default: return status;
  }
};

const formatTime = (timestamp: number): string => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString();
};

const formatDuration = (startTime: number, endTime: number): string => {
  if (!startTime || !endTime) return '';
  const duration = endTime - startTime;
  if (duration < 1000) {
    return `${duration}毫秒`;
  } else if (duration < 60000) {
    return `${Math.floor(duration / 1000)}秒`;
  } else {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}分${seconds}秒`;
  }
};

// Event handlers
const onViewLogs = (operation: PluginOperation): void => {
  emit('view-logs', operation);
};

const onDeleteRecord = (operation: PluginOperation): void => {
  emit('delete-record', operation);
};

const confirmClearHistory = (): void => {
  emit('clear-history');
};

const fetchHistory = (): void => {
  emit('refresh');
};

const updatePagination = (scope: any): void => {
  // 更新本地分页状态
  pagination.value.rowsPerPage = pagination.value.rowsPerPage;
  
  // 使用 scope 提供的方法更新分页
  scope.pagination.rowsPerPage = pagination.value.rowsPerPage;
  scope.pagination.page = 1;
};
</script>

<style scoped>
.history-table-container {
  border: 1px solid #e0e0e0;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.05);
}

:deep(.q-table__top) {
  padding: 8px 16px;
}

:deep(.q-table thead th) {
  color: #616161;
  font-weight: 600;
}

:deep(.q-table tbody td) {
  padding-top: 16px;
  padding-bottom: 16px;
}

.rounded-borders {
  border-radius: 8px;
  overflow: hidden;
}

.custom-btn {
  border-width: 2px;
  border-color: #616161 !important;
  color: #616161 !important;
  transition: all 0.3s ease;
  margin-right: 8px;
  border-radius: 8px;
}

.custom-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: var(--q-primary) !important;
}

.custom-btn:active {
  transform: translateY(0);
  opacity: 0.8;
}
</style>