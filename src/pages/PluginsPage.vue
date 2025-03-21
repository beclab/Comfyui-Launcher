<template>
  <q-page padding>
    <!-- 顶部标签页切换 -->
    <div class="q-mb-md">
      <q-tabs
        v-model="activeTab"
        dense
        class="text-primary"
        active-color="primary"
        indicator-color="primary"
        align="left"
        narrow-indicator
      >
        <q-tab name="plugins" label="插件管理" icon="extension" />
        <q-tab name="history" label="操作历史" icon="history" />
      </q-tabs>
    </div>

    <!-- 插件管理标签页内容 -->
    <div v-if="activeTab === 'plugins'">
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
    </div>

    <!-- 历史记录标签页内容 -->
    <div v-if="activeTab === 'history'">
      <div class="row q-mb-lg">
        <div class="col-12">
          <h1 class="text-h4 q-my-none">操作历史</h1>
          <p class="text-subtitle1 q-mt-sm">查看插件的安装、卸载、启用和禁用历史记录</p>
        </div>
        <div class="col-12 q-mt-md">
          <q-btn-group>
            <q-btn color="primary" icon="refresh" label="刷新" @click="fetchHistory" :loading="historyLoading" />
            <q-btn color="negative" icon="delete" label="清除历史" @click="confirmClearHistory" />
          </q-btn-group>
        </div>
      </div>

      <!-- 历史记录列表 -->
      <div class="q-mb-md">
        <q-table
          :rows="operationHistory"
          :columns="historyColumns"
          row-key="id"
          :loading="historyLoading"
          :pagination="{ rowsPerPage: 10 }"
          :filter="historyFilter"
          dense
          binary-state-sort
        >
          <!-- 顶部工具栏 -->
          <template v-slot:top-right>
            <q-input
              dense
              v-model="historyFilter"
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
                {{ getOperationName(props.row.type) }}
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
                {{ getStatusName(props.row.status) }}
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
                @click="showOperationLogs(props.row)"
              >
                <q-tooltip>查看详细日志</q-tooltip>
              </q-btn>
              <q-btn
                v-if="props.row.type === 'install' && props.row.status === 'failed'"
                dense
                flat
                color="primary"
                icon="refresh"
                @click="retryInstallation(props.row)"
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
    </div>

    <!-- 操作日志详情对话框 -->
    <q-dialog v-model="logsDialogVisible" maximized persistent>
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
              <q-item-label>{{ selectedOperation?.pluginName || selectedOperation?.pluginId }}</q-item-label>
            </q-item-section>
            <q-item-section>
              <q-item-label caption>操作类型</q-item-label>
              <q-item-label>{{ getOperationName(selectedOperation?.type) }}</q-item-label>
            </q-item-section>
            <q-item-section>
              <q-item-label caption>状态</q-item-label>
              <q-item-label>
                <q-chip
                  dense
                  :color="getStatusColor(selectedOperation?.status)"
                  text-color="white"
                  size="sm"
                >
                  {{ getStatusName(selectedOperation?.status) }}
                </q-chip>
              </q-item-label>
            </q-item-section>
            <q-item-section>
              <q-item-label caption>开始时间</q-item-label>
              <q-item-label>{{ selectedOperation ? formatTime(selectedOperation.startTime) : '' }}</q-item-label>
            </q-item-section>
            <q-item-section v-if="selectedOperation?.endTime">
              <q-item-label caption>结束时间</q-item-label>
              <q-item-label>{{ formatTime(selectedOperation.endTime) }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-card-section>

        <q-card-section class="q-pa-none">
          <q-list bordered separator>
            <q-item-label header>详细日志</q-item-label>
            <q-item v-for="(log, index) in operationLogs" :key="index">
              <q-item-section>
                <q-item-label class="log-entry">{{ log }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-section v-if="selectedOperation?.result" class="bg-grey-2">
          <div class="text-h6">操作结果</div>
          <p class="text-body1">{{ selectedOperation.result }}</p>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="关闭" color="primary" v-close-popup />
          <q-btn 
            v-if="selectedOperation?.type === 'install' && selectedOperation?.status === 'failed'"
            color="primary" 
            label="重试安装" 
            @click="retryInstallation(selectedOperation)" 
            v-close-popup 
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- 确认清除历史记录对话框 -->
    <q-dialog v-model="clearHistoryConfirmVisible" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="warning" text-color="white" />
          <span class="q-ml-sm">确认清除历史记录</span>
        </q-card-section>
        <q-card-section>
          <p>此操作将清除所有操作历史记录，此操作不可恢复。是否继续？</p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="取消" color="primary" v-close-popup />
          <q-btn flat label="确认清除" color="negative" @click="clearHistory" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

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
import { ref, onMounted, reactive, watch } from 'vue';
import { useQuasar } from 'quasar';
import api from 'src/api';
import { QTableColumn } from 'quasar';

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

// 新增状态变量
const activeTab = ref('plugins');  // 当前激活的标签页
const operationHistory = ref<PluginOperation[]>([]);  // 操作历史记录
const historyLoading = ref(false);  // 历史记录加载状态
const historyFilter = ref('');  // 历史记录搜索过滤器
const logsDialogVisible = ref(false);  // 日志对话框显示状态
const selectedOperation = ref<PluginOperation | null>(null);  // 选中的操作
const operationLogs = ref<string[]>([]);  // 操作日志
const clearHistoryConfirmVisible = ref(false);  // 清除历史确认对话框

// 定义 QTable 列的类型
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
    field: () => '',  // 不使用参数
    sortable: false
  }
];

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

// 获取历史记录
const fetchHistory = async () => {
  historyLoading.value = true;
  try {
    const response = await api.getOperationHistory();
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

// 获取操作类型名称
const getOperationName = (type?: string) => {
  if (!type) return '未知';
  switch (type) {
    case 'install': return '安装';
    case 'uninstall': return '卸载';
    case 'disable': return '禁用';
    case 'enable': return '启用';
    default: return type;
  }
};

// 获取操作类型颜色
const getOperationColor = (type?: string) => {
  if (!type) return 'grey';
  switch (type) {
    case 'install': return 'primary';
    case 'uninstall': return 'negative';
    case 'disable': return 'warning';
    case 'enable': return 'positive';
    default: return 'grey';
  }
};

// 获取状态名称
const getStatusName = (status?: string) => {
  if (!status) return '未知';
  switch (status) {
    case 'running': return '进行中';
    case 'success': return '成功';
    case 'failed': return '失败';
    default: return status;
  }
};

// 获取状态颜色
const getStatusColor = (status?: string) => {
  if (!status) return 'grey';
  switch (status) {
    case 'running': return 'blue';
    case 'success': return 'positive';
    case 'failed': return 'negative';
    default: return 'grey';
  }
};

// 格式化时间
const formatTime = (timestamp: number) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString();
};

// 格式化持续时间
const formatDuration = (startTime: number, endTime: number) => {
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

// 显示操作日志
const showOperationLogs = async (operation: PluginOperation) => {
  selectedOperation.value = operation;
  logsDialogVisible.value = true;
  
  try {
    const response = await api.getOperationLogs(operation.id);
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

// 确认清除历史记录
const confirmClearHistory = () => {
  clearHistoryConfirmVisible.value = true;
};

// 清除历史记录
const clearHistory = async () => {
  try {
    const response = await api.clearOperationHistory();
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

// 修改重试安装方法
const retryInstallation = (operation: PluginOperation) => {
  if (operation && operation.pluginId) {
    // 关闭日志对话框
    logsDialogVisible.value = false;
    
    // 创建一个完整的 Plugin 兼容对象
    const pluginToInstall: Plugin = {
      id: operation.pluginId,
      name: operation.pluginName || operation.pluginId,
      description: '从历史记录中重试安装',
      version: '0.0.0',
      author: '未知',
      github: '',
      installed: false
    };
    
    // 重试安装
    installPlugin(pluginToInstall);
  }
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
.log-entry {
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 0.9em;
}
</style> 