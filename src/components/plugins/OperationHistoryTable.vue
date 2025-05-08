<template>
  <div class="history-table-container rounded-borders">
    <!-- 标题和按钮区域 -->
    <div class="row justify-between items-center q-px-md q-py-md q-gutter-x-sm">
      <div class="text-h6">{{ $t('plugins.history.title') }}</div>
      <div class="row items-center">
        <q-btn 
          color="grey" 
          icon="delete" 
          :label="$t('plugins.history.clearHistory')" 
          outline 
          @click="confirmClearHistory" 
          class="custom-btn q-mr-sm"
          style="border-radius: 8px"
        />
        <q-btn
          color="grey"
          icon="refresh"
          :label="$t('plugins.history.refresh')"
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
          {{ props.row.pluginName || props.row.pluginId }}
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
            <q-tooltip>{{ $t('plugins.history.viewLogs') }}</q-tooltip>
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
            <q-tooltip>{{ $t('plugins.history.deleteRecord') }}</q-tooltip>
          </q-btn>
        </q-td>
      </template>

      <!-- 底部分页 -->
      <template v-slot:pagination="scope">
        <div class="row items-center justify-end q-py-sm">
          <span class="q-mr-md text-caption">{{ $t('plugins.pagination.rowsPerPage') }}: </span>
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
            {{ scope.pagesNumber > 0 ? scope.pagination.page : 0 }} {{ $t('plugins.pagination.of', {currentPage: scope.pagination.page, totalPages: scope.pagesNumber}) }}
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
          <span class="text-grey-7">{{ $t('plugins.history.noHistory') }}</span>
        </div>
      </template>
    </q-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { QTableColumn } from 'quasar';

// Setup i18n
const { t } = useI18n();

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
const { operations } = defineProps({
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

// Table columns definition - now using i18n
const tableColumns = computed<QTableColumn[]>(() => [
  {
    name: 'name',
    required: true,
    label: t('plugins.columns.name'),
    align: 'left',
    field: row => row.pluginName || row.pluginId,
    sortable: true
  },
  {
    name: 'type',
    required: true,
    label: t('plugins.history.operationType'),
    align: 'left',
    field: 'type',
    sortable: true
  },
  {
    name: 'startTime',
    required: true,
    label: t('plugins.history.startTime'),
    align: 'left',
    field: 'startTime',
    sortable: true
  },
  {
    name: 'endTime',
    required: true,
    label: t('plugins.history.endTime'),
    align: 'left',
    field: 'endTime',
    sortable: true
  },
  {
    name: 'duration',
    required: true,
    label: t('plugins.history.duration'),
    align: 'left',
    field: row => row.endTime ? (row.endTime - row.startTime) : 0,
    sortable: true
  },
  {
    name: 'status',
    required: true,
    label: t('plugins.history.status'),
    align: 'left',
    field: 'status',
    sortable: true
  },
  {
    name: 'actions',
    required: true,
    label: t('plugins.columns.actions'),
    align: 'center',
    field: 'actions',
    sortable: false
  }
]);

// Methods for operation and status handling
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
  if (!type) return t('plugins.operations.unknown');
  switch (type) {
    case 'install': return t('plugins.operations.install');
    case 'uninstall': return t('plugins.operations.uninstall');
    case 'disable': return t('plugins.operations.disable');
    case 'enable': return t('plugins.operations.enable');
    default: return type;
  }
};

const getStatusName = (status: string): string => {
  if (!status) return t('plugins.pluginStatus.unknown');
  switch (status) {
    case 'running': return t('plugins.history.running');
    case 'success': return t('plugins.history.success');
    case 'failed': return t('plugins.history.failed');
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
  
  // Use i18n for duration formatting
  if (duration < 1000) {
    return `${duration}${t('plugins.history.milliseconds')}`;
  } else if (duration < 60000) {
    return t('plugins.history.seconds', { count: Math.floor(duration / 1000) });
  } else {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return t('plugins.history.minutes', { minutes, seconds });
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

// 定义一个更具体的类型来替代 any
interface PaginationScope {
  pagination: {
    sortBy: string | null;
    descending: boolean;
    page: number;
    rowsPerPage: number;
    rowsNumber?: number;
  };
  pagesNumber: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  prevPage: () => void;
  nextPage: () => void;
}

const updatePagination = (scope: PaginationScope): void => {
  // 确保 sortBy 不为 null
  scope.pagination.sortBy = scope.pagination.sortBy || ''; // 直接修改 scope 对象
  
  // 更新页码等其他操作
  scope.pagination.page = 1; // 重置到第一页
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