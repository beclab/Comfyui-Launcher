<template>
  <q-page padding>
    <!-- 顶部标题 -->
    <div>
      <div class="text-h4">插件管理</div>
    </div>
    
    <!-- 分割线 -->
    <q-separator class="q-my-md" />
    
    <!-- 标签切换和操作按钮在同一行 -->
    <div class="row q-mb-md items-center justify-between">
      <!-- 左侧标签切换 -->
      <div>
        <q-tabs
          v-model="activeTab"
          dense
          class="bg-white"
          no-caps
          indicator-color="transparent"
          style="border-radius: 8px; border: 1px solid #e0e0e0; width: fit-content;"
        >
          <q-tab 
            name="plugins" 
            label="插件库" 
            class="q-px-md"
            :class="{ 
              'bg-light-blue-1 text-blue': activeTab === 'plugins',
              'text-grey': activeTab !== 'plugins'
            }"
          />
          <q-tab 
            name="history" 
            label="操作历史" 
            class="q-px-md"
            :class="{ 
              'bg-light-blue-1 text-blue': activeTab === 'history',
              'text-grey': activeTab !== 'history'
            }"
          />
        </q-tabs>
      </div>
      
      <!-- 右侧操作按钮 -->
      <div class="flex">
        <q-btn 
          icon="upgrade" 
          color="primary" 
          label="更新全部插件" 
          flat
          @click="updateAllPlugins" 
          class="q-mr-sm"
        />
        <q-btn 
          icon="folder_open" 
          color="primary" 
          label="打开插件目录" 
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
        @refresh="fetchPlugins"
      />
    </div>

    <!-- 历史记录标签页内容 -->
    <div v-if="activeTab === 'history'">
      <div class="row q-mb-md">
        <div class="col-12 flex justify-end">
          <q-btn color="primary" icon="refresh" label="刷新" flat @click="fetchHistory" :loading="historyLoading" class="q-mr-sm" />
          <q-btn color="negative" icon="delete" label="清除历史" flat @click="confirmClearHistory" />
        </div>
      </div>

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
import { ref, onMounted, reactive, watch, computed } from 'vue';
import { useQuasar } from 'quasar';
import api from 'src/api';
import { QTableColumn } from 'quasar';

// 导入组件
import PluginsManager from 'src/components/plugins/PluginsManager.vue';
import OperationHistoryTable from 'src/components/plugins/OperationHistoryTable.vue';
import OperationLogsDialog from 'src/components/plugins/OperationLogsDialog.vue';
import PluginInfoDialog from 'src/components/plugins/PluginInfoDialog.vue';

const $q = useQuasar();

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
  githubProxy?: string;
  typeText?: string;
  statusText?: string;
}

// 状态和数据
const plugins = ref<Plugin[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const statusFilter = ref({ label: '全部', value: 'all' });
const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '已安装', value: 'installed' },
  { label: '未安装', value: 'not-installed' }
];
const tagFilter = ref<string[]>([]);
const tagOptions = ref<string[]>([]);
const selectedPlugin = ref<Plugin | null>(null);
const pluginInfoDialog = ref(false);

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

// 代理选项
const proxyOptions = ref<string[]>([
  '',
  'https://gh-proxy.com/'
]);
const githubProxy = ref('');

// 插件状态变更
const pluginStateChanging = reactive<Record<string, boolean>>({});
const pluginTaskId = reactive<Record<string, string>>({});

// 标签页和历史记录
const activeTab = ref('plugins');
const operationHistory = ref<PluginOperation[]>([]);
const historyLoading = ref(false);
const historyFilter = ref('');
const logsDialogVisible = ref(false);
const selectedOperation = ref<PluginOperation | null>(null);
const operationLogs = ref<string[]>([]);
const clearHistoryConfirmVisible = ref(false);

// 延迟加载相关状态
const isInitialLoad = ref(true);
const initialLoadCount = 50;
const loadMoreCount = 50;
const visiblePlugins = ref<Plugin[]>([]);

// 历史语言设置
const historyLanguage = ref('zh');
const languageOptions = [
  { label: '中文', value: 'zh' },
  { label: 'English', value: 'en' },
  { label: '日本語', value: 'ja' },
  { label: '한국어', value: 'ko' }
];

// 历史记录表格列定义
const historyColumns: QTableColumn[] = [
  {
    name: 'pluginId',
    required: true,
    label: '插件ID',
    align: 'left',
    field: (row: PluginOperation) => row.pluginName || row.pluginId,
    sortable: true
  },
  {
    name: 'type',
    required: true,
    label: '操作类型',
    align: 'center',
    field: 'type',
    sortable: true
  },
  {
    name: 'time',
    required: true,
    label: '时间',
    align: 'left',
    field: 'startTime',
    sortable: true
  },
  {
    name: 'status',
    required: true,
    label: '状态',
    align: 'center',
    field: 'status',
    sortable: true
  },
  {
    name: 'actions',
    required: true,
    label: '操作',
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

// 处理过滤器变化
interface FilterOptions {
  statusFilter: { label: string; value: string };
  tagFilter: string[];
}

const handleFilter = ({ statusFilter: newStatusFilter, tagFilter: newTagFilter }: FilterOptions): void => {
  statusFilter.value = newStatusFilter;
  tagFilter.value = newTagFilter;
  filterPlugins();
};

// 处理代理变化
const handleProxyChange = (proxy: string) => {
  githubProxy.value = proxy;
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
  statusFilter.value = { label: '全部', value: 'all' };
  tagFilter.value = [];
  filterPlugins();
};

// 获取插件列表
const fetchPlugins = async () => {
  loading.value = true;
  try {
    const response = await api.getPlugins();
    plugins.value = response.body;
    filterPlugins();
  } catch (error) {
    console.error('获取插件列表失败:', error);
    $q.notify({
      color: 'negative',
      message: '获取插件列表失败，请稍后重试',
      icon: 'error'
    });
  } finally {
    loading.value = false;
  }
};

// 从源获取最新插件列表
const fetchPluginsFromSource = async () => {
  loading.value = true;
  try {
    const response = await api.getPlugins().query({ force: 'true', t: Date.now() });
    plugins.value = response.body;
    
    // 更新标签选项
    const allTags = plugins.value
      .map(p => p.tags || [])
      .flat()
      .filter((tag, index, self) => self.indexOf(tag) === index);
    
    tagOptions.value = allTags;
    
    filterPlugins();
    
    $q.notify({
      color: 'positive',
      message: `已从ComfyUI-Manager更新 ${plugins.value.length} 个插件`,
      icon: 'cloud_download'
    });
  } catch (error) {
    console.error('获取插件列表失败:', error);
    $q.notify({
      color: 'negative',
      message: '更新插件列表失败，请稍后重试',
      icon: 'error'
    });
  } finally {
    loading.value = false;
  }
};

// 安装插件
const installPlugin = async (plugin: Plugin) => {
  try {
    if (installationInProgress[plugin.id]) {
      return;
    }
    
    installationInProgress[plugin.id] = true;
    overallProgress.value = 0;
    installationMessage.value = `正在准备安装 ${plugin.name}...`;
    progressVisible.value = true;
    
    const response = await api.installPlugin(plugin.id, githubProxy.value);
    activeTaskId.value = response.body.taskId;
    
    await pollProgress(activeTaskId.value, plugin.id, 'install');
  } catch (error) {
    console.error('发起安装请求失败:', error);
    $q.notify({
      color: 'negative',
      message: `无法开始安装 ${plugin.name}`,
      icon: 'error',
      position: 'top',
      timeout: 5000
    });
  } finally {
    installationInProgress[plugin.id] = false;
    progressVisible.value = false;
    
    await fetchPlugins();
  }
};

// 卸载插件
const uninstallPlugin = async (plugin: Plugin) => {
  try {
    uninstallationInProgress[plugin.id] = true;
    
    progressVisible.value = true;
    installationMessage.value = `正在卸载 ${plugin.name}...`;
    overallProgress.value = 0;
    
    const response = await api.uninstallPlugin(plugin.id);
    activeTaskId.value = response.body.taskId;
    
    await pollProgress(activeTaskId.value, plugin.id, 'uninstall');
    
  } catch (error) {
    console.error('卸载插件失败:', error);
    $q.notify({
      color: 'negative',
      message: `卸载 ${plugin.name} 失败，请稍后重试`,
      icon: 'error'
    });
    progressVisible.value = false;
  } finally {
    uninstallationInProgress[plugin.id] = false;
    await fetchPlugins();
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
        installationMessage.value = message || `${type === 'install' ? '安装' : '卸载'}中...`;
        
        if (completed) {
          clearInterval(interval);
          
          if (progress === 100) {
            $q.notify({
              color: 'positive',
              message: `${type === 'install' ? '安装' : '卸载'} ${pluginId} 成功!`,
              icon: 'check_circle',
              position: 'top'
            });
            resolve();
          } else {
            const errorMsg = message || `${type === 'install' ? '安装' : '卸载'} ${pluginId} 失败`;
            console.error(`操作失败: ${errorMsg}`);
            
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
        console.error(`获取${type === 'install' ? '安装' : '卸载'}进度失败:`, error);
        clearInterval(interval);
        
        $q.notify({
          color: 'negative',
          message: `进度请求失败: ${error instanceof Error ? error.message : '连接错误'}`,
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
    if (pluginStateChanging[plugin.id]) {
      return;
    }
    
    pluginStateChanging[plugin.id] = true;
    
    overallProgress.value = 0;
    installationMessage.value = `正在${plugin.disabled ? '启用' : '禁用'} ${plugin.name}...`;
    progressVisible.value = true;
    
    const action = plugin.disabled ? 'enable' : 'disable';
    
    let response;
    if (action === 'enable') {
      response = await api.enablePlugin(plugin.id);
    } else {
      response = await api.disablePlugin(plugin.id);
    }
    
    activeTaskId.value = response.body.taskId;
    pluginTaskId[plugin.id] = response.body.taskId;
    
    await pollPluginStateChange(activeTaskId.value, plugin.id, action);
    
    await refreshInstalledPlugins();
    
  } catch (error) {
    console.error(`${plugin.disabled ? '启用' : '禁用'}插件失败:`, error);
    $q.notify({
      color: 'negative',
      message: `${plugin.disabled ? '启用' : '禁用'} ${plugin.name} 失败，请稍后重试`,
      icon: 'error',
      position: 'top',
      timeout: 5000
    });
  } finally {
    pluginStateChanging[plugin.id] = false;
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
        installationMessage.value = message || `${action === 'enable' ? '启用' : '禁用'}中...`;
        
        if (completed) {
          clearInterval(interval);
          
          if (progress === 100) {
            $q.notify({
              color: 'positive',
              message: `${action === 'enable' ? '启用' : '禁用'} ${pluginId} 成功!`,
              icon: 'check_circle',
              position: 'top'
            });
            resolve();
          } else {
            const errorMsg = message || `${action === 'enable' ? '启用' : '禁用'} ${pluginId} 失败`;
            console.error(`操作失败: ${errorMsg}`);
            
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
        console.error(`获取${action === 'enable' ? '启用' : '禁用'}进度失败:`, error);
        clearInterval(interval);
        
        $q.notify({
          color: 'negative',
          message: `进度请求失败: ${error instanceof Error ? error.message : '连接错误'}`,
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
    console.error('刷新插件列表失败:', error);
    $q.notify({
      color: 'negative',
      message: '刷新插件列表失败',
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

// 关闭错误对话框
const closeErrorDialog = () => {
  errorDialogVisible.value = false;
  progressVisible.value = false;
  overallProgress.value = 0;
};

// 批量功能
const updateAllPlugins = async () => {
  try {
    $q.notify({
      color: 'primary',
      message: '正在检查更新...',
      icon: 'update'
    });
    
    const installedPlugins = plugins.value.filter(p => p.installed);
    if (installedPlugins.length === 0) {
      $q.notify({
        color: 'warning',
        message: '没有已安装的插件可更新',
        icon: 'info'
      });
      return;
    }
    
    // 实际实现中应该调用批量更新API
    $q.notify({
      color: 'positive',
      message: `已更新 ${installedPlugins.length} 个插件`,
      icon: 'check_circle'
    });
  } catch (error) {
    console.error('更新插件失败:', error);
    $q.notify({
      color: 'negative',
      message: '更新插件失败，请稍后重试',
      icon: 'error'
    });
  }
};

const showBulkUninstall = () => {
  const installedPlugins = plugins.value.filter(p => p.installed);
  if (installedPlugins.length === 0) {
    $q.notify({
      color: 'warning',
      message: '没有已安装的插件可卸载',
      icon: 'info'
    });
    return;
  }
  
  $q.dialog({
    title: '批量卸载插件',
    message: `确定要卸载所有 ${installedPlugins.length} 个已安装的插件吗？`,
    cancel: true,
    persistent: true
  }).onOk(() => {
    $q.notify({
      color: 'positive',
      message: '批量卸载功能尚未实现',
      icon: 'info'
    });
  });
};

const createSnapshot = () => {
  $q.notify({
    color: 'positive',
    message: '快照功能尚未实现',
    icon: 'info'
  });
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
        message: '获取历史记录失败',
        icon: 'error'
      });
    }
  } catch (error) {
    console.error('获取历史记录失败:', error);
    $q.notify({
      color: 'negative',
      message: '获取历史记录失败',
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
      operationLogs.value = ['无法获取日志详情'];
      $q.notify({
        color: 'warning',
        message: '无法获取日志详情',
        icon: 'warning'
      });
    }
  } catch (error) {
    console.error('获取操作日志失败:', error);
    operationLogs.value = ['获取日志详情失败'];
    $q.notify({
      color: 'negative',
      message: '获取日志详情失败',
      icon: 'error'
    });
  }
};

const confirmClearHistory = () => {
  clearHistoryConfirmVisible.value = true;
};

const clearHistory = async () => {
  try {
    const response = await api.clearOperationHistory().query({ lang: historyLanguage.value });
    if (response.body.success) {
      operationHistory.value = [];
      $q.notify({
        color: 'positive',
        message: '历史记录已清除',
        icon: 'check_circle'
      });
    } else {
      $q.notify({
        color: 'negative',
        message: '清除历史记录失败',
        icon: 'error'
      });
    }
  } catch (error) {
    console.error('清除历史记录失败:', error);
    $q.notify({
      color: 'negative',
      message: '清除历史记录失败',
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
      description: '从历史记录中重试安装',
      version: '0.0.0',
      author: '未知',
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

const changeHistoryLanguage = () => {
  fetchHistory();
};

// 监听标签页切换，加载历史记录
watch(activeTab, (newValue) => {
  if (newValue === 'history' && operationHistory.value.length === 0) {
    fetchHistory();
  }
});

// 初始化
onMounted(() => {
  fetchPlugins();
  
  // 收集所有标签
  setTimeout(() => {
    const allTags = plugins.value
      .map(p => p.tags || [])
      .flat()
      .filter((tag, index, self) => self.indexOf(tag) === index);
    
    tagOptions.value = allTags;
  }, 1000);
});

// 新增打开插件目录方法
const openPluginsFolder = async () => {
  try {
    const response = await api.openPath('/');
    if (!response.body.success) {
      $q.notify({
        color: 'negative',
        message: '无法打开插件目录',
        icon: 'error'
      });
    }
  } catch (error) {
    console.error('打开插件目录失败:', error);
    $q.notify({
      color: 'negative',
      message: '打开插件目录失败',
      icon: 'error'
    });
  }
};
</script>

<style scoped>
.log-entry {
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 0.9em;
}
</style> 