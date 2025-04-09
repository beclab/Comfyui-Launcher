<template>
  <div>
    <q-table
      :rows="operations"
      :columns="historyColumns"
      row-key="id"
      :loading="loading"
      :pagination="{ rowsPerPage: 10 }"
      :filter="filter"
      dense
      binary-state-sort
    >
      <!-- 顶部工具栏 -->
      <template v-slot:top-right>
        <q-input
          dense
          v-model="localFilter"
          debounce="300"
          placeholder="搜索历史记录..."
        >
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>
      </template>

      <!-- 操作类型列 -->
      <template v-slot:body-cell-type="props">
        <q-td :props="props">
          <q-chip
            dense
            :color="getOperationColor(props.row.type)"
            text-color="white"
            size="sm"
          >
            {{ getOperationLocalizedName(props.row) }}
          </q-chip>
        </q-td>
      </template>

      <!-- 状态列 -->
      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <q-chip
            dense
            :color="getStatusColor(props.row.status)"
            text-color="white"
            size="sm"
          >
            {{ getStatusLocalizedName(props.row) }}
          </q-chip>
        </q-td>
      </template>

      <!-- 时间列 -->
      <template v-slot:body-cell-time="props">
        <q-td :props="props">
          <div>开始: {{ formatTime(props.row.startTime) }}</div>
          <div v-if="props.row.endTime">
            结束: {{ formatTime(props.row.endTime) }}
          </div>
          <div v-if="props.row.endTime">
            耗时: {{ formatDuration(props.row.startTime, props.row.endTime) }}
          </div>
        </q-td>
      </template>

      <!-- 操作列 -->
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn
            dense
            flat
            color="primary"
            icon="visibility"
            @click="onViewLogs(props.row)"
          >
            <q-tooltip>查看详细日志</q-tooltip>
          </q-btn>
          <q-btn
            v-if="props.row.type === 'install' && props.row.status === 'failed'"
            dense
            flat
            color="primary"
            icon="refresh"
            @click="onRetryInstall(props.row)"
          >
            <q-tooltip>重试安装</q-tooltip>
          </q-btn>
        </q-td>
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
import { ref, watch } from 'vue';
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
  },
  historyColumns: {
    type: Array as () => QTableColumn[],
    required: true
  },
  filter: {
    type: String,
    default: ''
  }
});

// Emits
const emit = defineEmits(['view-logs', 'retry-install', 'filter-change']);

// Data
const localFilter = ref(props.filter);

// Watch for filter changes
watch(localFilter, (newVal) => {
  emit('filter-change', newVal);
});

// Watch for external filter changes
watch(() => props.filter, (newVal) => {
  localFilter.value = newVal;
});

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
    case 'success': return 'positive';
    case 'failed': return 'negative';
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

const onRetryInstall = (operation: PluginOperation): void => {
  emit('retry-install', operation);
};
</script> 