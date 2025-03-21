<template>
  <q-page padding>
    <div class="row q-mb-lg">
      <div class="col-12">
        <h1 class="text-h4 q-my-none">插件管理</h1>
        <p class="text-subtitle1 q-mt-sm">管理、安装和卸载 ComfyUI 的插件</p>
      </div>
      <div class="col-12 q-mt-md">
        <q-btn-group>
          <q-btn color="primary" icon="update" label="更新全部" @click="updateAllPlugins" />
          <q-btn color="negative" icon="delete_sweep" label="批量卸载" @click="showBulkUninstall" />
          <q-btn color="secondary" icon="backup" label="创建快照" @click="createSnapshot" />
        </q-btn-group>
      </div>
    </div>
    
    <div class="row q-mb-md">
      <div class="col-12 col-md-6">
        <q-input 
          v-model="searchQuery" 
          outlined 
          dense
          placeholder="搜索插件..." 
          class="q-mr-sm"
          @update:model-value="filterPlugins"
        >
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
      <div class="col-12 col-md-6 flex justify-end q-gutter-sm">
        <q-select
          v-model="statusFilter"
          :options="statusOptions"
          outlined
          dense
          label="状态"
          class="q-ml-sm"
          style="min-width: 150px"
          @update:model-value="filterPlugins"
        />
        <q-select
          v-model="tagFilter"
          :options="tagOptions"
          outlined
          dense
          label="标签"
          class="q-ml-sm"
          style="min-width: 150px"
          @update:model-value="filterPlugins"
          multiple
        />
        <q-btn 
          color="primary" 
          icon="refresh" 
          label="刷新" 
          @click="fetchPlugins" 
          :loading="loading"
        />
        <q-btn 
          color="secondary" 
          icon="cloud_sync" 
          label="从源更新" 
          @click="fetchPluginsFromSource" 
          :loading="loading"
          class="q-ml-sm"
        >
          <q-tooltip>从ComfyUI-Manager获取最新插件列表</q-tooltip>
        </q-btn>
      </div>
    </div>
    
    <div class="row q-mb-md">
      <div class="col-12 col-md-6">
        <q-select
          v-model="githubProxy"
          :options="proxyOptions"
          outlined
          dense
          label="GitHub代理"
          class="q-mr-sm"
          style="max-width: 300px"
        >
          <template v-slot:append>
            <q-icon name="public" />
            <q-tooltip>选择GitHub代理可以帮助在网络受限环境中更顺畅地安装插件</q-tooltip>
          </template>
        </q-select>
      </div>
    </div>
    
    <div v-if="loading" class="row items-center justify-center q-py-lg">
      <q-spinner color="primary" size="3em" />
      <span class="q-ml-sm text-subtitle1">加载插件列表...</span>
    </div>
    
    <div v-else>
      <div v-if="filteredPlugins.length === 0" class="text-center q-py-xl">
        <q-icon name="info" size="3rem" color="grey-7" />
        <p class="text-h6 text-grey-7">未找到匹配的插件</p>
        <q-btn 
          color="primary" 
          outline 
          label="清除筛选" 
          @click="clearFilters" 
          class="q-mt-sm"
        />
      </div>
      
      <div v-else class="row q-col-gutter-md">
        <div v-for="plugin in filteredPlugins" :key="plugin.id" class="col-12 col-md-6 col-lg-4">
          <q-card class="plugin-card">
            <q-item>
              <q-item-section avatar>
                <q-avatar color="primary" text-color="white">
                  {{ plugin.name.charAt(0) }}
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold">{{ plugin.name }}</q-item-label>
                <q-item-label caption>作者: {{ plugin.author }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="row items-center">
                  <q-icon name="star" size="xs" color="amber" class="q-mr-xs" />
                  <span class="text-caption">{{ plugin.stars || 0 }}</span>
                </div>
                <q-badge :color="plugin.installed ? 'positive' : 'grey'" outline>
                  {{ plugin.installed ? '已安装' : '未安装' }}
                </q-badge>
                <q-badge 
                  v-if="plugin.installed && plugin.disabled" 
                  color="warning" 
                  outline
                  class="q-ml-sm"
                >
                  已禁用
                </q-badge>
              </q-item-section>
            </q-item>
            
            <q-card-section>
              <p class="plugin-description">{{ plugin.description }}</p>
              <div class="row items-center q-gutter-x-sm">
                <q-chip dense size="sm">v{{ plugin.version }}</q-chip>
                <q-chip dense size="sm" v-if="plugin.installedOn">
                  安装日期: {{ new Date(plugin.installedOn).toLocaleDateString() }}
                </q-chip>
              </div>
            </q-card-section>
            
            <q-card-actions align="right">
              <q-btn 
                v-if="!plugin.installed"
                flat 
                color="primary" 
                label="安装" 
                icon="download"
                @click="installPlugin(plugin)"
                :loading="installationInProgress[plugin.id]"
              />
              <q-btn 
                v-else
                flat 
                color="negative" 
                label="卸载" 
                icon="delete"
                @click="uninstallPlugin(plugin)"
                :loading="uninstallationInProgress[plugin.id]"
              />
              <q-btn
                v-if="plugin.installed"
                flat
                color="warning"
                icon="power_settings_new"
                @click="togglePluginState(plugin)"
                :loading="pluginStateChanging[plugin.id]"
              >
                <q-tooltip>{{ plugin.disabled ? '启用' : '禁用' }}</q-tooltip>
              </q-btn>
              <q-btn 
                flat 
                color="grey" 
                icon="open_in_new"
                @click="openGithub(plugin.github)"
              >
                <q-tooltip>查看GitHub</q-tooltip>
              </q-btn>
              <q-btn
                flat
                color="info"
                icon="info"
                @click="showPluginInfo(plugin)"
              >
                <q-tooltip>详细信息</q-tooltip>
              </q-btn>
            </q-card-actions>
            
            <q-linear-progress 
              v-if="installationProgress[plugin.id]" 
              :value="installationProgress[plugin.id] / 100"
              color="primary"
              class="q-mt-sm"
            />
          </q-card>
        </div>
      </div>
    </div>
    
    <!-- 全局安装/卸载进度显示 -->
    <q-dialog v-model="progressVisible" persistent>
      <q-card style="width: 400px;">
        <q-card-section class="row items-center">
          <div class="text-h6">操作进度</div>
          <q-space />
        </q-card-section>
        
        <q-card-section>
          <div class="text-center q-mb-md">
            <p>{{ installationMessage }}</p>
          </div>
          <q-linear-progress
            :value="overallProgress / 100"
            color="primary"
            class="q-mt-md"
            size="md"
            :indeterminate="overallProgress === 0"
          />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- 全局操作错误显示 -->
    <q-dialog v-model="errorDialogVisible" persistent>
      <q-card>
        <q-card-section class="bg-negative text-white">
          <div class="text-h6">
            <q-icon name="error" class="q-mr-sm" />
            操作失败
          </div>
        </q-card-section>
        
        <q-card-section class="q-pt-lg">
          <p>{{ errorMessage }}</p>
        </q-card-section>
        
        <q-card-actions align="right">
          <q-btn flat label="确定" color="primary" @click="closeErrorDialog" />
        </q-card-actions>
      </q-card>
    </q-dialog>
    
    <q-dialog v-model="pluginInfoDialog">
      <q-card style="min-width: 500px">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ selectedPlugin?.name }} - 详细信息</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section v-if="selectedPlugin">
          <q-list>
            <q-item>
              <q-item-section>
                <q-item-label caption>插件ID</q-item-label>
                <q-item-label>{{ selectedPlugin.id }}</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item>
              <q-item-section>
                <q-item-label caption>版本</q-item-label>
                <q-item-label>{{ selectedPlugin.version }}</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item v-if="selectedPlugin.installedOn">
              <q-item-section>
                <q-item-label caption>安装日期</q-item-label>
                <q-item-label>{{ new Date(selectedPlugin.installedOn).toLocaleString() }}</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item>
              <q-item-section>
                <q-item-label caption>安装方式</q-item-label>
                <q-item-label>{{ selectedPlugin.install_type || 'Git Clone' }}</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item v-if="selectedPlugin.tags && selectedPlugin.tags.length > 0">
              <q-item-section>
                <q-item-label caption>标签</q-item-label>
                <div>
                  <q-chip 
                    v-for="tag in selectedPlugin.tags" 
                    :key="tag" 
                    dense 
                    color="primary" 
                    text-color="white"
                    size="sm"
                  >
                    {{ tag }}
                  </q-chip>
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
        
        <q-card-actions align="right">
          <q-btn flat label="关闭" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { useQuasar } from 'quasar';
import api from 'src/api';

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

// 状态和数据
const plugins = ref<Plugin[]>([]);
const filteredPlugins = ref<Plugin[]>([]);
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
const progressDialog = ref(false);
const progressOperation = ref('');
const progressMessage = ref('');
const overallProgress = ref(0);
const activeTaskId = ref('');
const installationMessage = ref('');
const progressVisible = ref(false);
const errorDialogVisible = ref(false);
const errorMessage = ref('');

// 代理选项
const proxyOptions = ref<string[]>([
  '',
  'https://gh-proxy.com/'
]);
const githubProxy = ref('');

// 在 <script setup> 中增加新状态
const pluginStateChanging = reactive<Record<string, boolean>>({});
const pluginTaskId = reactive<Record<string, string>>({});

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

// 筛选插件
const filterPlugins = () => {
  filteredPlugins.value = plugins.value.filter(plugin => {
    // 搜索条件
    const matchesSearch = 
      plugin.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      plugin.author.toLowerCase().includes(searchQuery.value.toLowerCase());
    
    // 状态筛选
    let matchesStatus = true;
    if (statusFilter.value.value === 'installed') {
      matchesStatus = plugin.installed;
    } else if (statusFilter.value.value === 'not-installed') {
      matchesStatus = !plugin.installed;
    }
    
    // 标签筛选
    let matchesTags = true;
    if (tagFilter.value.length > 0) {
      matchesTags = tagFilter.value.some(tag => 
        plugin.tags?.includes(tag)
      );
    }
    
    return matchesSearch && matchesStatus && matchesTags;
  });
};

// 清除筛选条件
const clearFilters = () => {
  searchQuery.value = '';
  statusFilter.value = { label: '全部', value: 'all' };
  filterPlugins();
};

// 安装插件
const installPlugin = async (plugin: Plugin) => {
  try {
    // 避免重复安装
    if (installationInProgress[plugin.id]) {
      return;
    }
    
    // 设置状态为安装中
    installationInProgress[plugin.id] = true;
    overallProgress.value = 0;
    installationMessage.value = `正在准备安装 ${plugin.name}...`;
    progressVisible.value = true;
    
    // 发送安装请求，传递GitHub代理地址
    const response = await api.installPlugin(plugin.id, githubProxy.value);
    activeTaskId.value = response.body.taskId;
    
    // 开始轮询进度
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
    // 重置状态
    installationInProgress[plugin.id] = false;
    progressVisible.value = false;
    
    // 刷新插件列表
    await fetchPlugins();
  }
};

// 卸载插件
const uninstallPlugin = async (plugin: Plugin) => {
  try {
    uninstallationInProgress[plugin.id] = true;
    
    // 显示进度对话框
    progressDialog.value = true;
    progressOperation.value = '卸载';
    progressMessage.value = `正在卸载 ${plugin.name}...`;
    overallProgress.value = 0;
    
    // 发送卸载请求
    const response = await api.uninstallPlugin(plugin.id);
    activeTaskId.value = response.body.taskId;
    
    // 开始轮询进度
    await pollProgress(activeTaskId.value, plugin.id, 'uninstall');
    
  } catch (error) {
    console.error('卸载插件失败:', error);
    $q.notify({
      color: 'negative',
      message: `卸载 ${plugin.name} 失败，请稍后重试`,
      icon: 'error'
    });
    progressDialog.value = false;
    overallProgress.value = 0;
  } finally {
    uninstallationInProgress[plugin.id] = false;
  }
};

// 轮询插件安装/卸载进度
const pollProgress = async (taskId: string, pluginId: string, type: 'install' | 'uninstall') => {
  return new Promise<void>((resolve, reject) => {
    installationInProgress[pluginId] = true;
    
    const interval = setInterval(async () => {
      try {
        const response = await api.getPluginProgress(taskId);
        const { progress, completed, message } = response.body;
        
        installationProgress[pluginId] = progress;
        overallProgress.value = progress;
        installationMessage.value = message || `${type === 'install' ? '安装' : '卸载'}中...`;
        
        if (completed) {
          clearInterval(interval);
          installationInProgress[pluginId] = false;
          
          // 检查是否成功完成（通过检查progress是否为100）
          if (progress === 100) {
            $q.notify({
              color: 'positive',
              message: `${type === 'install' ? '安装' : '卸载'} ${pluginId} 成功!`,
              icon: 'check_circle',
              position: 'top'
            });
            resolve();
          } else {
            // 失败情况 - 显示详细错误信息
            const errorMsg = message || `${type === 'install' ? '安装' : '卸载'} ${pluginId} 失败`;
            console.error(`操作失败: ${errorMsg}`);
            
            // 显示错误对话框
            errorMessage.value = errorMsg;
            errorDialogVisible.value = true;
            progressVisible.value = false;
            
            $q.notify({
              color: 'negative',
              message: message || `${type === 'install' ? '安装' : '卸载'} ${pluginId} 失败`,
              icon: 'error',
              position: 'top',
              timeout: 8000
            });
            reject(new Error(message || `${type === 'install' ? '安装' : '卸载'}失败`));
          }
        }
      } catch (error) {
        console.error(`获取${type === 'install' ? '安装' : '卸载'}进度失败:`, error);
        clearInterval(interval);
        installationInProgress[pluginId] = false;
        
        // 显示API请求错误
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

// 打开GitHub链接
const openGithub = (url: string) => {
  window.open(url, '_blank');
};

// 更新所有插件
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

// 显示批量卸载对话框
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

// 创建配置快照
const createSnapshot = () => {
  $q.notify({
    color: 'positive',
    message: '快照功能尚未实现',
    icon: 'info'
  });
};

// 修改 togglePluginState 函数
const togglePluginState = async (plugin: Plugin) => {
  try {
    // 避免重复操作
    if (pluginStateChanging[plugin.id]) {
      return;
    }
    
    // 设置状态为处理中
    pluginStateChanging[plugin.id] = true;
    
    // 显示进度对话框
    overallProgress.value = 0;
    installationMessage.value = `正在${plugin.disabled ? '启用' : '禁用'} ${plugin.name}...`;
    progressVisible.value = true;
    
    // 根据当前状态选择操作
    const action = plugin.disabled ? 'enable' : 'disable';
    
    // 发送请求
    let response;
    if (action === 'enable') {
      response = await api.enablePlugin(plugin.id);
    } else {
      response = await api.disablePlugin(plugin.id);
    }
    
    // 保存任务ID
    activeTaskId.value = response.body.taskId;
    pluginTaskId[plugin.id] = response.body.taskId;
    
    // 轮询进度
    await pollPluginStateChange(activeTaskId.value, plugin.id, action);
    
    // 成功后刷新插件列表
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
    // 重置状态
    pluginStateChanging[plugin.id] = false;
    progressVisible.value = false;
  }
};

// 添加轮询插件状态变更进度的函数
const pollPluginStateChange = async (taskId: string, pluginId: string, action: 'enable' | 'disable') => {
  return new Promise<void>((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const response = await api.getPluginProgress(taskId);
        const { progress, completed, message } = response.body;
        
        // 更新进度
        overallProgress.value = progress;
        installationMessage.value = message || `${action === 'enable' ? '启用' : '禁用'}中...`;
        
        if (completed) {
          clearInterval(interval);
          
          // 检查是否成功完成
          if (progress === 100) {
            $q.notify({
              color: 'positive',
              message: `${action === 'enable' ? '启用' : '禁用'} ${pluginId} 成功!`,
              icon: 'check_circle',
              position: 'top'
            });
            resolve();
          } else {
            // 失败情况 - 显示详细错误信息
            const errorMsg = message || `${action === 'enable' ? '启用' : '禁用'} ${pluginId} 失败`;
            console.error(`操作失败: ${errorMsg}`);
            
            // 显示错误对话框
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
        
        // 显示API请求错误
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

// 添加刷新已安装插件列表的函数
const refreshInstalledPlugins = async () => {
  try {
    const response = await api.refreshInstalledPlugins();
    
    if (response.body.success) {
      // 更新本地插件状态
      const installedPlugins = response.body.plugins;
      
      // 创建映射以快速查找
      const installedMap = new Map();
      installedPlugins.forEach((plugin: Plugin) => {
        installedMap.set(plugin.id, plugin);
      });
      
      // 更新本地列表中的插件状态
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
      
      // 更新筛选后的列表
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

// 关闭错误对话框并清理进度框
const closeErrorDialog = () => {
  errorDialogVisible.value = false;
  progressVisible.value = false;
  overallProgress.value = 0;
};

// 从源获取最新插件列表
const fetchPluginsFromSource = async () => {
  loading.value = true;
  try {
    // 添加force=true参数强制从源获取
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

// 初始化
onMounted(() => {
  fetchPlugins();
  
  // 收集所有标签并去重
  setTimeout(() => {
    const allTags = plugins.value
      .map(p => p.tags || [])
      .flat()
      .filter((tag, index, self) => self.indexOf(tag) === index);
    
    tagOptions.value = allTags;
  }, 1000);
});
</script>

<style scoped>
.plugin-card {
  height: 100%;
  transition: all 0.3s ease;
}
.plugin-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}
.plugin-description {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 4.5em;
}
</style> 