<template>
  <q-dialog v-model="dialogVisible" maximized persistent @hide="onDialogHide">
    <q-card>
      <q-card-section class="row items-center">
        <div class="text-h6">
          <q-icon name="article" class="q-mr-sm" />
          操作日志详情
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pa-none">
        <q-item>
          <q-item-section>
            <q-item-label caption>插件</q-item-label>
            <q-item-label>{{ operation?.pluginName || operation?.pluginId }}</q-item-label>
          </q-item-section>
          <q-item-section>
            <q-item-label caption>操作类型</q-item-label>
            <q-item-label>{{ getOperationName(operation?.type) }}</q-item-label>
          </q-item-section>
          <q-item-section>
            <q-item-label caption>状态</q-item-label>
            <q-item-label>
              <q-chip
                dense
                :color="getStatusColor(operation?.status)"
                text-color="white"
                size="sm"
              >
                {{ getStatusName(operation?.status) }}
              </q-chip>
            </q-item-label>
          </q-item-section>
          <q-item-section>
            <q-item-label caption>开始时间</q-item-label>
            <q-item-label>{{ operation ? formatTime(operation.startTime) : '' }}</q-item-label>
          </q-item-section>
          <q-item-section v-if="operation?.endTime">
            <q-item-label caption>结束时间</q-item-label>
            <q-item-label>{{ formatTime(operation.endTime) }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-card-section>

      <q-card-section class="q-pa-none">
        <q-list bordered separator>
          <q-item-label header>详细日志</q-item-label>
          <q-item v-for="(log, index) in logs" :key="index">
            <q-item-section>
              <q-item-label class="log-entry">{{ log }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-section v-if="operation?.result" class="bg-grey-2">
        <div class="text-h6">操作结果</div>
        <p class="text-body1">{{ operation.result }}</p>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="关闭" color="primary" v-close-popup />
        <q-btn 
          v-if="operation?.type === 'install' && operation?.status === 'failed'"
          color="primary" 
          label="重试安装" 
          @click="onRetryInstall" 
          v-close-popup 
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

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
}

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  operation: {
    type: Object as () => PluginOperation | null,
    default: null
  },
  logs: {
    type: Array as () => string[],
    default: () => []
  }
});

// Emits
const emit = defineEmits(['update:visible', 'retry-install']);

// Local state for dialog visibility
const dialogVisible = ref(props.visible);

// Watch for changes to visible prop
watch(() => props.visible, (newVal) => {
  dialogVisible.value = newVal;
});

// Watch for changes to dialog visibility and emit event
watch(dialogVisible, (newVal) => {
  emit('update:visible', newVal);
});

// Utility methods
const getOperationName = (type?: string): string => {
  if (!type) return '未知';
  switch (type) {
    case 'install': return '安装';
    case 'uninstall': return '卸载';
    case 'disable': return '禁用';
    case 'enable': return '启用';
    default: return type;
  }
};

const getStatusColor = (status?: string): string => {
  if (!status) return 'grey';
  switch (status) {
    case 'running': return 'blue';
    case 'success': return 'positive';
    case 'failed': return 'negative';
    default: return 'grey';
  }
};

const getStatusName = (status?: string): string => {
  if (!status) return '未知';
  switch (status) {
    case 'running': return '进行中';
    case 'success': return '成功';
    case 'failed': return '失败';
    default: return status;
  }
};

const formatTime = (timestamp?: number): string => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString();
};

// Event handlers
const onDialogHide = (): void => {
  emit('update:visible', false);
};

const onRetryInstall = (): void => {
  emit('retry-install', props.operation);
};
</script>

<style scoped>
.log-entry {
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 0.9em;
}
</style> 