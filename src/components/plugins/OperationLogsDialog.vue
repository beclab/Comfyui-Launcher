<template>
  <q-dialog v-model="dialogVisible" persistent @hide="onDialogHide">
    <q-card style="min-width: 650px; max-width: 80vw; max-height: 85vh; display: flex; flex-direction: column;">
      <!-- Fixed title bar -->
      <q-card-section class="row items-center q-pb-xs">
        <div class="text-h6">
          <q-icon name="article" class="q-mr-sm" />
          {{ $t('plugins.dialog.operationLogsDialog.title') }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <!-- Scrollable content area -->
      <q-card-section class="scroll" style="flex: 1; overflow: auto;">
        <div class="row q-col-gutter-sm q-mb-sm">
          <!-- Operation details - using more compact layout -->
          <div class="col-6 col-md-3">
            <q-item dense class="q-pa-none">
              <q-item-section>
                <q-item-label caption>{{ $t('plugins.dialog.operationLogsDialog.plugin') }}</q-item-label>
                <q-item-label class="ellipsis">{{ operation?.pluginName || operation?.pluginId }}</q-item-label>
              </q-item-section>
            </q-item>
          </div>
          
          <div class="col-6 col-md-3">
            <q-item dense class="q-pa-none">
              <q-item-section>
                <q-item-label caption>{{ $t('plugins.dialog.operationLogsDialog.operationType') }}</q-item-label>
                <q-item-label>{{ getOperationName(operation?.type) }}</q-item-label>
              </q-item-section>
            </q-item>
          </div>
          
          <div class="col-6 col-md-2">
            <q-item dense class="q-pa-none">
              <q-item-section>
                <q-item-label caption>{{ $t('plugins.dialog.operationLogsDialog.status') }}</q-item-label>
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
                <q-item-label caption>{{ $t('plugins.dialog.operationLogsDialog.startTime') }}</q-item-label>
                <q-item-label>{{ operation ? formatTime(operation.startTime) : '' }}</q-item-label>
              </q-item-section>
            </q-item>
          </div>
          
          <div class="col-6 col-md-2" v-if="operation?.endTime">
            <q-item dense class="q-pa-none">
              <q-item-section>
                <q-item-label caption>{{ $t('plugins.dialog.operationLogsDialog.endTime') }}</q-item-label>
                <q-item-label>{{ formatTime(operation.endTime) }}</q-item-label>
              </q-item-section>
            </q-item>
          </div>
        </div>

        <q-separator class="q-my-sm" />
        
        <!-- Logs -->
        <div class="row items-center q-mb-xs">
          <div class="text-subtitle2">{{ $t('plugins.dialog.operationLogsDialog.detailedLogs') }}</div>
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
            <q-tooltip>{{ $t('plugins.dialog.operationLogsDialog.downloadLogs') }}</q-tooltip>
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
          <p>{{ $t('plugins.dialog.operationLogsDialog.noLogs') }}</p>
        </div>
        
        <!-- Result -->
        <div v-if="operation?.result" class="result-container q-mt-md q-pa-md">
          <div class="text-subtitle2 q-mb-xs">{{ $t('plugins.dialog.operationLogsDialog.operationResult') }}</div>
          <p class="result-text">{{ operation.resultLocalized }}</p>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';

// Get i18n instance
const { t } = useI18n();

// Operation type definition
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
  resultLocalized?: string;
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
  if (!type) return t('plugins.dialog.operationLogsDialog.unknown');
  switch (type) {
    case 'install': return t('plugins.operations.install');
    case 'uninstall': return t('plugins.operations.uninstall');
    case 'disable': return t('plugins.operations.disable');
    case 'enable': return t('plugins.operations.enable');
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
  if (!status) return t('plugins.dialog.operationLogsDialog.unknown');
  switch (status) {
    case 'running': return t('plugins.history.running');
    case 'success': return t('plugins.history.success');
    case 'failed': return t('plugins.history.failed');
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

// Download logs function
const downloadLogs = (): void => {
  if (!props.logs || props.logs.length === 0) return;
  
  // Create log file content
  const pluginInfo = props.operation?.pluginName || props.operation?.pluginId || t('plugins.dialog.operationLogsDialog.unknown');
  const operationType = getOperationName(props.operation?.type);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${pluginInfo}-${operationType}-logs-${timestamp}.txt`;
  
  // Build log content, add operation info
  let content = `${t('plugins.dialog.operationLogsDialog.plugin')}: ${pluginInfo}\n`;
  content += `${t('plugins.dialog.operationLogsDialog.operationType')}: ${operationType}\n`;
  content += `${t('plugins.dialog.operationLogsDialog.status')}: ${getStatusName(props.operation?.status)}\n`;
  content += `${t('plugins.dialog.operationLogsDialog.startTime')}: ${formatTime(props.operation?.startTime)}\n`;
  
  if (props.operation?.endTime) {
    content += `${t('plugins.dialog.operationLogsDialog.endTime')}: ${formatTime(props.operation?.endTime)}\n`;
  }
  
  content += `\n=== ${t('plugins.dialog.operationLogsDialog.detailedLogs')} ===\n\n`;
  content += props.logs.join('\n');
  
  if (props.operation?.result) {
    content += `\n\n=== ${t('plugins.dialog.operationLogsDialog.operationResult')} ===\n\n${props.operation.result}\n`;
  }
  
  // Create Blob and download
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  
  // Cleanup
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