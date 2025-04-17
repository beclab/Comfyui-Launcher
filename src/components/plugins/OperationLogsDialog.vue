<template>
  <q-dialog v-model="dialogVisible" persistent @hide="onDialogHide">
    <q-card style="min-width: 650px; max-width: 80vw; max-height: 85vh; display: flex; flex-direction: column;">
      <!-- 固定的标题栏 -->
      <q-card-section class="row items-center q-pb-xs">
        <div class="text-h6">
          <q-icon name="article" class="q-mr-sm" />
          操作日志详情
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <!-- 可滚动的内容区域 -->
      <q-card-section class="scroll" style="flex: 1; overflow: auto;">
        <div class="row q-col-gutter-sm q-mb-sm">
          <!-- Operation details - 使用更紧凑的布局 -->
          <div class="col-6 col-md-3">
            <q-item dense class="q-pa-none">
              <q-item-section>
                <q-item-label caption>插件</q-item-label>
                <q-item-label class="ellipsis">{{ operation?.pluginName || operation?.pluginId }}</q-item-label>
              </q-item-section>
            </q-item>
          </div>
          
          <div class="col-6 col-md-3">
            <q-item dense class="q-pa-none">
              <q-item-section>
                <q-item-label caption>操作类型</q-item-label>
                <q-item-label>{{ getOperationName(operation?.type) }}</q-item-label>
              </q-item-section>
            </q-item>
          </div>
          
          <div class="col-6 col-md-2">
            <q-item dense class="q-pa-none">
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
            </q-item>
          </div>
          
          <div class="col-6 col-md-2">
            <q-item dense class="q-pa-none">
              <q-item-section>
                <q-item-label caption>开始时间</q-item-label>
                <q-item-label>{{ operation ? formatTime(operation.startTime) : '' }}</q-item-label>
              </q-item-section>
            </q-item>
          </div>
          
          <div class="col-6 col-md-2" v-if="operation?.endTime">
            <q-item dense class="q-pa-none">
              <q-item-section>
                <q-item-label caption>结束时间</q-item-label>
                <q-item-label>{{ formatTime(operation.endTime) }}</q-item-label>
              </q-item-section>
            </q-item>
          </div>
        </div>

        <q-separator class="q-my-sm" />
        
        <!-- Logs -->
        <div class="row items-center q-mb-xs">
          <div class="text-subtitle2">详细日志</div>
          <q-space />
          <q-btn
            v-if="logs && logs.length > 0"
            size="sm"
            flat
            dense
            round
            icon="download"
            color="primary"
            @click="downloadLogs"
            :disable="!logs || logs.length === 0"
            class="q-ml-xs"
          >
            <q-tooltip>下载日志</q-tooltip>
          </q-btn>
        </div>
        <div class="log-container" v-if="logs && logs.length > 0">
          <div v-for="(log, index) in logs" :key="index" class="log-entry">
            {{ log }}
          </div>
          <div ref="logEnd"></div>
        </div>
        <div v-else class="text-center text-grey q-py-md">
          <q-icon name="info" size="2rem" />
          <p>暂无日志信息</p>
        </div>
        
        <!-- Result -->
        <div v-if="operation?.result" class="result-container q-mt-md q-pa-md">
          <div class="text-subtitle2 q-mb-xs">操作结果</div>
          <p class="result-text">{{ operation.result }}</p>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

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
const logEnd = ref<HTMLElement | null>(null);

// Scroll to bottom of logs
const scrollToBottom = async () => {
  await nextTick();
  if (logEnd.value) {
    logEnd.value.scrollIntoView({ behavior: 'smooth' });
  }
};

// Watch for changes to visible prop
watch(() => props.visible, (newVal) => {
  dialogVisible.value = newVal;
  if (newVal) {
    nextTick(() => scrollToBottom());
  }
});

// Watch for changes to dialog visibility and emit event
watch(dialogVisible, (newVal) => {
  emit('update:visible', newVal);
});

// Watch for changes to logs to scroll to bottom
watch(() => props.logs, () => {
  nextTick(() => scrollToBottom());
}, { deep: true });

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

// 下载日志函数
const downloadLogs = (): void => {
  if (!props.logs || props.logs.length === 0) return;
  
  // 创建日志文件内容
  const pluginInfo = props.operation?.pluginName || props.operation?.pluginId || '未知插件';
  const operationType = getOperationName(props.operation?.type);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${pluginInfo}-${operationType}-logs-${timestamp}.txt`;
  
  // 构建日志内容，添加操作信息
  let content = `插件: ${pluginInfo}\n`;
  content += `操作: ${operationType}\n`;
  content += `状态: ${getStatusName(props.operation?.status)}\n`;
  content += `开始时间: ${formatTime(props.operation?.startTime)}\n`;
  
  if (props.operation?.endTime) {
    content += `结束时间: ${formatTime(props.operation?.endTime)}\n`;
  }
  
  content += '\n=== 详细日志 ===\n\n';
  content += props.logs.join('\n');
  
  if (props.operation?.result) {
    content += `\n\n=== 操作结果 ===\n\n${props.operation.result}\n`;
  }
  
  // 创建 Blob 并下载
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  
  // 清理
  URL.revokeObjectURL(url);
};

</script>

<style scoped>
.log-container {
  max-height: 350px;
  overflow-y: auto;
  background-color: #f5f5f5;
  border-radius: 4px;
  padding: 10px;
  font-family: monospace;
  font-size: 12px;
}

.log-entry {
  margin-bottom: 3px;
  white-space: pre-wrap;
  word-break: break-all;
}

.result-container {
  background-color: #f0f4f8;
  border-radius: 4px;
}

.result-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: monospace;
  font-size: 12px;
}

.ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style> 