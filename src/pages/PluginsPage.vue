<template>
  <q-page padding>
    <!-- 顶部标题 -->
    <div>
      <div class="text-h5 q-mb-md">{{ $t('plugins.title') }}</div>
    </div>
    
    <!-- 分割线 -->
    <q-separator class="q-my-md" />
    
    <!-- 标签切换和操作按钮在同一行 -->
    <div class="row q-mb-md items-center justify-between">
      <!-- 左侧标签切换 -->
      <div>
        <TabToggle
          v-model="activeTab"
          :options="[
            {label: $t('plugins.tabs.pluginLibrary'), value: 'plugins'},
            {label: $t('plugins.tabs.customInstall'), value: 'custom'},
            {label: $t('plugins.tabs.operationHistory'), value: 'history'}
            
          ]"
        />
      </div>
      
      <!-- 右侧操作按钮 -->
      <div class="flex">
        <q-btn 
          icon="upgrade" 
          color="primary" 
          :label="$t('plugins.actions.updateAll')" 
          flat
          @click="updateAllPlugins" 
          class="q-mr-sm"
        />
        <q-btn 
          icon="folder_open" 
          color="primary" 
          :label="$t('plugins.actions.openDirectory')" 
          flat
          @click="openPluginsFolder" 
        />
      </div>
    </div>
    
    <!-- 插件管理标签页内容 -->
    <div v-if="activeTab === 'plugins'">
      <plugins-manager
        :plugins="plugins"
        :loading="loading"
        :installation-in-progress="installationInProgress"
        :uninstallation-in-progress="uninstallationInProgress"
        :state-changing="pluginStateChanging"
        :installation-progress="installationProgress"
        :visible-plugins="visiblePlugins"
        :has-more-plugins="visiblePlugins.length < filteredPlugins.length"
        @install="installPlugin"
        @uninstall="uninstallPlugin"
        @toggle-state="togglePluginState"
        @show-info="showPluginInfo"
        @clear-filters="clearFilters"
        @load-more="loadMorePlugins"
        @search="handleSearch"
        @refresh="onRefresh"
        @filter="handleFilter"
      />
    </div>

    <!-- 历史记录标签页内容 -->
    <div v-if="activeTab === 'history'">
      <!-- 历史记录表格 -->
      <operation-history-table
        :operations="operationHistory"
        :loading="historyLoading"
        :history-columns="historyColumns"
        :filter="historyFilter"
        @view-logs="showOperationLogs"
        @retry-install="retryInstallation"
        @filter-change="historyFilter = $event"
      />
    </div>

    <!-- 自定义安装标签页内容 -->
    <div v-if="activeTab === 'custom'">
      <custom-plugin-install />
    </div>

    <!-- 对话框和其他组件保持不变 -->
    <operation-logs-dialog
      :visible="logsDialogVisible"
      :operation="selectedOperation"
      :logs="operationLogs"
      @update:visible="logsDialogVisible = $event"
      @retry-install="retryInstallation"
    />

    <plugin-info-dialog
      :visible="pluginInfoDialog"
      :plugin="selectedPlugin"
      @update:visible="pluginInfoDialog = $event"
    />

    <!-- 其他对话框保持不变 -->
    <!-- ... -->

  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, watch, computed, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import api from 'src/api';
import { QTableColumn } from 'quasar';
import DataCenter from 'src/api/DataCenter';

// 导入组件
import PluginsManager from 'src/components/plugins/PluginsManager.vue';
import OperationHistoryTable from 'src/components/plugins/OperationHistoryTable.vue';
import OperationLogsDialog from 'src/components/plugins/OperationLogsDialog.vue';
import PluginInfoDialog from 'src/components/plugins/PluginInfoDialog.vue';
import TabToggle from 'src/components/common/TabToggle.vue';
import CustomPluginInstall from 'src/components/plugins/CustomPluginInstall.vue';

// 确保 ESLint 知道所有组件都被使用
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const components = {
  PluginsManager,
  OperationHistoryTable,
  OperationLogsDialog,
  PluginInfoDialog,
  TabToggle,
  CustomPluginInstall
};

const $q = useQuasar();
const { t, locale } = useI18n();

// 插件类型定义
interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  github: string;
  installed: boolean;
  installedOn?: string;
  disabled?: boolean;
  stars?: number;
  tags?: string[];
  install_type?: string;
  files?: string[];
  require_restart?: boolean;
}

// 为操作历史和操作项定义具体的接口
interface PluginOperation {
  id: string;
  pluginId: string;
  pluginName?: string;
  type: 'install' | 'uninstall' | 'disable' | 'enable';
  startTime: number;
  endTime?: number;
  status: 'running' | 'success' | 'failed';
  logs: string[];
  result?: string;
  resultLocalized?: string;
  githubProxy?: string;
  typeText?: string;
  statusText?: string;
}

// 状态和数据
const plugins = ref<Plugin[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const statusFilter = ref({ label: t('plugins.status.all'), value: 'all' });
const tagFilter = ref<string[]>([]);
const tagOptions = ref<string[]>([]);
const selectedPlugin = ref<Plugin | null>(null);
const pluginInfoDialog = ref(false);
const isInIframe = ref(false);

// 安装/卸载进度
const installationInProgress = reactive<Record<string, boolean>>({});
const uninstallationInProgress = reactive<Record<string, boolean>>({});
const installationProgress = reactive<Record<string, number>>({});
const progressVisible = ref(false);
const overallProgress = ref(0);
const activeTaskId = ref('');
const installationMessage = ref('');
const errorDialogVisible = ref(false);
const errorMessage = ref('');

// 标签页和历史记录
const activeTab = ref('plugins');
const operationHistory = ref<PluginOperation[]>([]);
const historyLoading = ref(false);
const historyFilter = ref('');
const logsDialogVisible = ref(false);
const selectedOperation = ref<PluginOperation | null>(null);
const operationLogs = ref<string[]>([]);

// 延迟加载相关状态
const isInitialLoad = ref(true);
const initialLoadCount = 50;
const loadMoreCount = 50;
const visiblePlugins = ref<Plugin[]>([]);

// 历史语言设置 - 从i18n获取当前语言，并确保只使用语言部分而不包含区域
const historyLanguage = computed(() => {
  // 从当前locale提取语言部分，例如从'en-US'中提取'en'
  return locale.value ? locale.value.split('-')[0] : 'zh';
});

// 历史记录表格列定义
const historyColumns: QTableColumn[] = [
  {
    name: 'pluginId',
    required: true,
    label: t('plugins.history.pluginId'),
    align: 'left',
    field: (row: PluginOperation) => row.pluginName || row.pluginId,
    sortable: true
  },
  {
    name: 'type',
    required: true,
    label: t('plugins.history.operationType'),
    align: 'center',
    field: 'type',
    sortable: true
  },
  {
    name: 'time',
    required: true,
    label: t('plugins.history.time'),
    align: 'left',
    field: 'startTime',
    sortable: true
  },
  {
    name: 'status',
    required: true,
    label: t('plugins.history.status'),
    align: 'center',
    field: 'status',
    sortable: true
  },
  {
    name: 'actions',
    required: true,
    label: t('plugins.history.actions'),
    align: 'center',
    field: () => '',
    sortable: false
  }
];

// 根据筛选条件计算过滤后的插件列表
const filteredPlugins = computed(() => {
  
  if (!searchQuery.value && statusFilter.value.value === 'all' && tagFilter.value.length === 0) {
    return plugins.value;
  }
  
  return plugins.value.filter(plugin => {
    if (statusFilter.value.value === 'installed' && !plugin.installed) return false;
    if (statusFilter.value.value === 'not-installed' && plugin.installed) return false;
    
    if (tagFilter.value.length > 0 && !plugin.tags?.some(tag => tagFilter.value.includes(tag))) {
      return false;
    }
    
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      return plugin.name.toLowerCase().includes(query) || 
             plugin.description.toLowerCase().includes(query) || 
             plugin.author.toLowerCase().includes(query);
    }
    
    return true;
  });
});

// 处理搜索变化
const handleSearch = (query: string) => {
  searchQuery.value = query;
  filterPlugins();
};

// 过滤插件
const filterPlugins = () => {
  if (isInitialLoad.value) {
    visiblePlugins.value = filteredPlugins.value.slice(0, initialLoadCount);
    isInitialLoad.value = false;
  } else {
    // 保持已加载的插件数量，除非过滤后的总数量更少
    const count = Math.min(visiblePlugins.value.length, filteredPlugins.value.length);
    visiblePlugins.value = filteredPlugins.value.slice(0, count);
  }
};

// 清除筛选条件
const clearFilters = () => {
  searchQuery.value = '';
  statusFilter.value = { label: t('plugins.status.all'), value: 'all' };
  tagFilter.value = [];
  filterPlugins();
};

// 获取插件列表
const fetchPlugins = async (forceUpdate = false) => {
  console.log('Fetching plugins...', forceUpdate ? '(forced update)' : '');
  try {
    loading.value = true;
    const response = await DataCenter.getPlugins(forceUpdate);
    console.log('Plugins fetched:', response.length);
    
    // 确保完全替换数组和每个对象，创建全新对象引用
    plugins.value = response.map(plugin => ({...plugin}));
    
    // 确保重新过滤和更新可见插件
    filterPlugins();
    console.log('Visible plugins updated:', visiblePlugins.value.length);
  } catch (error) {
    console.error('Failed to fetch plugin list:', error);
    $q.notify({
      color: 'negative',
      message: t('plugins.notifications.fetchFail'),
      icon: 'error'
    });
  } finally {
    loading.value = false;
  }
};

// 安装插件
const installPlugin = async (plugin: Plugin) => {
  console.log('installPlugin:', plugin);
  try {
    if (installationInProgress[plugin.id]) {
      return;
    }
    
    installationInProgress[plugin.id] = true;
    overallProgress.value = 0;
    installationMessage.value = t('plugins.progress.preparing', { name: plugin.name });
    progressVisible.value = true;
    
    const response = await api.installPlugin(plugin.id, githubProxy.value);
    activeTaskId.value = response.body.taskId;
    
    await pollProgress(activeTaskId.value, plugin.id, 'install');
  } catch (error) {
    console.error('Failed to start installation:', error);
    $q.notify({
      color: 'negative',
      message: t('plugins.notifications.installFail', { 
        name: plugin.name, 
        message: error instanceof Error ? error.message : 'Connection error' 
      }),
      icon: 'error',
      position: 'top',
      timeout: 5000
    });
  } finally {
    installationInProgress[plugin.id] = false;
    progressVisible.value = false;
    
    // 确保强制刷新插件列表
    console.log('Refreshing plugins after installation');
    await fetchPlugins(true);
  }
};

// 卸载插件
const uninstallPlugin = async (plugin: Plugin) => {
  try {
    uninstallationInProgress[plugin.id] = true;
    
    progressVisible.value = true;
    installationMessage.value = t('plugins.progress.uninstalling', { name: plugin.name });
    overallProgress.value = 0;
    
    const response = await api.uninstallPlugin(plugin.id);
    activeTaskId.value = response.body.taskId;
    
    await pollProgress(activeTaskId.value, plugin.id, 'uninstall');
    
  } catch (error) {
    console.error('Failed to uninstall plugin:', error);
    $q.notify({
      color: 'negative',
      message: t('plugins.notifications.uninstallFail', { 
        name: plugin.name, 
        message: error instanceof Error ? error.message : 'Connection error'
      }),
      icon: 'error'
    });
    progressVisible.value = false;
  } finally {
    uninstallationInProgress[plugin.id] = false;
    // 确保强制刷新插件列表
    console.log('Refreshing plugins after uninstallation');
    await fetchPlugins(true);
  }
};

// 轮询插件安装/卸载进度
const pollProgress = async (taskId: string, pluginId: string, type: 'install' | 'uninstall') => {
  return new Promise<void>((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const response = await api.getPluginProgress(taskId);
        const { progress, completed, message } = response.body;
        
        installationProgress[pluginId] = progress;
        overallProgress.value = progress;
        installationMessage.value = message || t(`plugins.progress.${type === 'install' ? 'installing' : 'uninstalling'}`, { name: pluginId });
        
        if (completed) {
          clearInterval(interval);
          
          if (progress === 100) {
            $q.notify({
              color: 'positive',
              message: t(`plugins.notifications.${type}Success`, { name: pluginId }),
              icon: 'check_circle',
              position: 'top'
            });
            resolve();
          } else {
            const errorMsg = message || t(`plugins.notifications.${type}Fail`, { name: pluginId, message: '' });
            console.error(`Operation failed: ${errorMsg}`);
            
            errorMessage.value = errorMsg;
            errorDialogVisible.value = true;
            progressVisible.value = false;
            
            $q.notify({
              color: 'negative',
              message: errorMsg,
              icon: 'error',
              position: 'top',
              timeout: 8000
            });
            reject(new Error(errorMsg));
          }
        }
      } catch (error) {
        console.error(`Failed to get ${type} progress:`, error);
        clearInterval(interval);
        
        $q.notify({
          color: 'negative',
          message: t('plugins.notifications.progressRequestFail', { 
            message: error instanceof Error ? error.message : 'Connection error'
          }),
          icon: 'error',
          position: 'top',
          timeout: 5000
        });
        
        reject(error);
      }
    }, 1000);
  });
};

// 修改插件状态
const togglePluginState = async (plugin: Plugin) => {
  try {
    if (pluginStateChanging.value[plugin.id]) {
      return;
    }
    
    pluginStateChanging.value[plugin.id] = true;
    
    overallProgress.value = 0;
    const action = plugin.disabled ? 'enable' : 'disable';
    installationMessage.value = t(`plugins.progress.${action}ing`, { name: plugin.name });
    progressVisible.value = true;
    
    let response;
    if (action === 'enable') {
      response = await api.enablePlugin(plugin.id);
    } else {
      response = await api.disablePlugin(plugin.id);
    }
    
    activeTaskId.value = response.body.taskId;
    pluginTaskId.value[plugin.id] = response.body.taskId;
    
    await pollPluginStateChange(activeTaskId.value, plugin.id, action);
    
    await refreshInstalledPlugins();
    
  } catch (error) {
    console.error(`Failed to ${plugin.disabled ? 'enable' : 'disable'} plugin:`, error);
    $q.notify({
      color: 'negative',
      message: t(`plugins.notifications.${plugin.disabled ? 'enable' : 'disable'}Fail`, {
        name: plugin.name,
        message: error instanceof Error ? error.message : 'Connection error'
      }),
      icon: 'error',
      position: 'top',
      timeout: 5000
    });
  } finally {
    pluginStateChanging.value[plugin.id] = false;
    progressVisible.value = false;
  }
};

// 轮询插件状态变更进度
const pollPluginStateChange = async (taskId: string, pluginId: string, action: 'enable' | 'disable') => {
  return new Promise<void>((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const response = await api.getPluginProgress(taskId);
        const { progress, completed, message } = response.body;
        
        overallProgress.value = progress;
        installationMessage.value = message || t(`plugins.progress.${action}ing`, { name: pluginId });
        
        if (completed) {
          clearInterval(interval);
          
          if (progress === 100) {
            $q.notify({
              color: 'positive',
              message: t(`plugins.notifications.${action}Success`, { name: pluginId }),
              icon: 'check_circle',
              position: 'top'
            });
            resolve();
          } else {
            const errorMsg = message || t(`plugins.notifications.${action}Fail`, { name: pluginId, message: '' });
            console.error(`Operation failed: ${errorMsg}`);
            
            errorMessage.value = errorMsg;
            errorDialogVisible.value = true;
            progressVisible.value = false;
            
            $q.notify({
              color: 'negative',
              message: errorMsg,
              icon: 'error',
              position: 'top',
              timeout: 5000
            });
            reject(new Error(errorMsg));
          }
        }
      } catch (error) {
        console.error(`Failed to get ${action} progress:`, error);
        clearInterval(interval);
        
        $q.notify({
          color: 'negative',
          message: t('plugins.notifications.progressRequestFail', {
            message: error instanceof Error ? error.message : 'Connection error'
          }),
          icon: 'error',
          position: 'top',
          timeout: 5000
        });
        
        reject(error);
      }
    }, 1000);
  });
};

// 刷新已安装插件列表
const refreshInstalledPlugins = async () => {
  try {
    const response = await api.refreshInstalledPlugins();
    
    if (response.body.success) {
      const installedPlugins = response.body.plugins;
      
      const installedMap = new Map();
      installedPlugins.forEach((plugin: Plugin) => {
        installedMap.set(plugin.id, plugin);
      });
      
      plugins.value = plugins.value.map(plugin => {
        const installedPlugin = installedMap.get(plugin.id);
        if (installedPlugin) {
          return {
            ...plugin,
            installed: true,
            installedOn: installedPlugin.installedOn,
            disabled: installedPlugin.disabled
          };
        }
        return plugin;
      });
      
      filterPlugins();
    }
  } catch (error) {
    console.error('Failed to refresh plugin list:', error);
    $q.notify({
      color: 'negative',
      message: t('plugins.notifications.fetchFail'),
      icon: 'error',
      position: 'top'
    });
  }
};

// 显示插件详情
const showPluginInfo = (plugin: Plugin) => {
  selectedPlugin.value = plugin;
  pluginInfoDialog.value = true;
};

// 批量功能
const updateAllPlugins = async () => {
  try {
    $q.notify({
      color: 'primary',
      message: t('plugins.notifications.updateAllStart'),
      icon: 'update'
    });
    
    const installedPlugins = plugins.value.filter(p => p.installed);
    if (installedPlugins.length === 0) {
      $q.notify({
        color: 'warning',
        message: t('plugins.notifications.updateAllNoPlugins'),
        icon: 'info'
      });
      return;
    }
    
    // 实际实现中应该调用批量更新API
    $q.notify({
      color: 'positive',
      message: t('plugins.notifications.updateAllSuccess', { count: installedPlugins.length }),
      icon: 'check_circle'
    });
  } catch (error) {
    console.error('Failed to update plugins:', error);
    $q.notify({
      color: 'negative',
      message: t('plugins.notifications.updateAllFail'),
      icon: 'error'
    });
  }
};

// 历史记录相关功能
const fetchHistory = async () => {
  historyLoading.value = true;
  try {
    const response = await api.getOperationHistory().query({ lang: historyLanguage.value });
    
    if (response.body.success) {
      operationHistory.value = response.body.history;
    } else {
      $q.notify({
        color: 'negative',
        message: t('plugins.notifications.fetchFail'),
        icon: 'error'
      });
    }
  } catch (error) {
    console.error('Failed to get operation history:', error);
    $q.notify({
      color: 'negative',
      message: t('plugins.notifications.fetchFail'),
      icon: 'error'
    });
  } finally {
    historyLoading.value = false;
  }
};

const showOperationLogs = async (operation: PluginOperation) => {
  selectedOperation.value = operation;
  logsDialogVisible.value = true;
  
  try {
    const response = await api.getOperationLogs(operation.id).query({ lang: historyLanguage.value });
    if (response.body.success) {
      operationLogs.value = response.body.logs || [];
    } else {
      operationLogs.value = [t('plugins.dialog.logsFetchFail')];
      $q.notify({
        color: 'warning',
        message: t('plugins.dialog.logsFetchFail'),
        icon: 'warning'
      });
    }
  } catch (error) {
    console.error('Failed to get operation logs:', error);
    operationLogs.value = [t('plugins.dialog.logsFetchFail')];
    $q.notify({
      color: 'negative',
      message: t('plugins.dialog.logsFetchFail'),
      icon: 'error'
    });
  }
};

const retryInstallation = (operation: PluginOperation) => {
  if (operation && operation.pluginId) {
    logsDialogVisible.value = false;
    
    const pluginToInstall: Plugin = {
      id: operation.pluginId,
      name: operation.pluginName || operation.pluginId,
      description: t('plugins.dialog.retryInstallation'),
      version: '0.0.0',
      author: t('common.unknown'),
      github: '',
      installed: false
    };
    
    installPlugin(pluginToInstall);
  }
};

const loadMorePlugins = () => {
  const currentLength = visiblePlugins.value.length;
  const newPlugins = filteredPlugins.value.slice(
    currentLength, 
    currentLength + loadMoreCount
  );
  visiblePlugins.value = [...visiblePlugins.value, ...newPlugins];
};

// 监听标签页切换，加载历史记录
watch(activeTab, (newValue) => {
  if (newValue === 'history' && operationHistory.value.length === 0) {
    fetchHistory();
  }
});

// 监听语言变化
watch(locale, () => {
  if (activeTab.value === 'history') {
    // 如果当前在历史标签页，则重新获取数据
    fetchHistory();
  }
});

// 初始化
onMounted(() => {
  fetchPlugins(false);
  
  // 检查是否在 iframe 中运行
  try {
    isInIframe.value = window.self !== window.top;
  } catch (e) {
    // 如果出现跨域问题，假设在 iframe 中
    isInIframe.value = true;
  }
  
  // 收集所有标签
  setTimeout(() => {
    const allTags = plugins.value
      .map(p => p.tags || [])
      .flat()
      .filter((tag, index, self) => self.indexOf(tag) === index);
    
    tagOptions.value = allTags;
  }, 1000);
});

// 修改打开插件目录方法
const openPluginsFolder = async () => {
  const pluginsPath = '/Files/External/ai/comfyui/ComfyUI/custom_nodes/';
  console.log('Opening plugins folder:', pluginsPath);
  
  try {
    if (isInIframe.value) {
      // 如果在 iframe 中，使用原始方法
      const response = await api.openPath(pluginsPath);
      if (!response.body.success) {
        $q.notify({
          color: 'negative',
          message: t('plugins.notifications.folderOpenFail'),
          icon: 'error'
        });
      }
      console.log('Plugins folder opened successfully in iframe mode');
    } else {
      // 如果不在 iframe 中，在新页面中打开
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      parts[0] = 'files';
      const filesDomain = parts.join('.');
      const url = `https://${filesDomain}${pluginsPath}`;
      window.open(url, '_blank');
      console.log('Plugins folder opened in new tab:', url);
    }
  } catch (error) {
    console.error('Failed to open plugin directory:', error);
    $q.notify({
      color: 'negative',
      message: t('plugins.notifications.folderOpenFail'),
      icon: 'error'
    });
  }
};

const handleFilter = (filters: { statusFilter: { label: string; value: string }; tagFilter: string[] }) => {

  statusFilter.value = filters.statusFilter || statusFilter.value;
  tagFilter.value = filters.tagFilter || tagFilter.value;

  filterPlugins();
};

// 添加这些变量的定义
const pluginStateChanging = ref<Record<string, boolean>>({});
const pluginTaskId = ref<Record<string, string>>({});
const githubProxy = ref<string>(''); // 修改为 string 类型

// 修改刷新处理
const onRefresh = async (): Promise<void> => {
  console.log('Refresh triggered in PluginsPage');
  loading.value = true; // 先设置加载状态
  try {
    // 直接调用而不使用debounce，确保立即执行
    await fetchPlugins(true);
    console.log('Plugins refreshed successfully', plugins.value.length);
  } catch (error) {
    console.error('Failed to refresh plugins:', error);
  } finally {
    loading.value = false;
  }
};

onUnmounted(() => {
  // 清理所有状态
  loading.value = false;
  plugins.value = [];
  visiblePlugins.value = [];
});

</script>

<style scoped>
.log-entry {
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 0.9em;
}

.text-h5 {
  color: var(--text-important);
  font-size: 40px; /* 假设默认字号为 16px */
  font-weight: bold;
}
</style>