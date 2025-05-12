<template>
  <q-card class="model-card" flat bordered>
    <q-card-section class="header-section">
      <div class="row items-center justify-between">
        <div class="col-auto">
          <div class="text-subtitle1 text-weight-medium q-mb-xs">
            {{ $t('optionalModels.title') }}
          </div>
          <div class="text-caption text-grey-7">{{ $t('optionalModels.subtitle') }}</div>
        </div>
        
        <div class="row items-center col-auto">
          <q-input
            v-model="searchQuery"
            :placeholder="$t('optionalModels.searchPlaceholder')"
            dense
            outlined
            clearable
            @clear="clearSearch"
            class="bg-white q-mr-md"
            style="width: 200px"
            @update:model-value="handleSearchInput"
          >
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>
          
          <q-select
            v-model="databaseMode"
            :options="databaseModeOptions"
            dense
            outlined
            class="bg-white text-black q-mr-md custom-select-radius"
            style="width: 180px;"
            :label="$t('optionalModels.databaseSource')"
            @update:model-value="onDatabaseModeChange"
          />
          
          <q-btn 
            color="grey-7"
            outline
            icon="refresh" 
            :label="$t('optionalModels.refresh')"
            @click="onRefresh"
            :loading="isLoading"
            size="md"
            style="height: 40px; border-radius: var(--border-radius-lg) !important;"
          />
        </div>
      </div>
    </q-card-section>
    
    <q-tabs
      v-model="activeTab"
      dense
      align="left"
      active-color="primary"
      indicator-color="primary"
      class="text-grey-7"
    >
      <q-tab name="all" :label="$t('optionalModels.tabs.all')" />
      <q-tab name="sd" :label="$t('optionalModels.tabs.sd')" />
      <q-tab name="lora" :label="$t('optionalModels.tabs.lora')" />
      <q-tab name="controlnet" :label="$t('optionalModels.tabs.controlnet')" />
      <q-tab name="vae" :label="$t('optionalModels.tabs.vae')" />
      <q-tab name="upscaler" :label="$t('optionalModels.tabs.upscaler')" />
    </q-tabs>
    
    <q-separator />
    
    <q-tab-panels v-model="activeTab" animated>
      <!-- 模型列表面板 - 表格布局 -->
      <q-tab-panel :name="tabName" v-for="tabName in ['all', 'sd', 'lora', 'controlnet', 'vae', 'upscaler']" :key="tabName">
        <div v-if="isLoading" class="text-center q-pa-lg">
          <q-spinner color="primary" size="3em" />
          <div class="q-mt-md">{{ $t('optionalModels.loadingModels') }}</div>
        </div>
        
        <!-- 根据tabName过滤显示对应类型的模型 -->
        <div v-else-if="getFilteredModelsByTab(tabName).length === 0" class="text-center q-pa-lg text-grey">
          {{ $t('optionalModels.noModelsFound') }}
        </div>
        
        <div v-else>
          <!-- 表格布局 -->
          <q-table
            :rows="getFilteredModelsByTab(tabName)"
            :columns="columns"
            row-key="name"
            flat
            separator="horizontal"
            :pagination="{ rowsPerPage: 10 }"
            class="model-table"
          >
            <!-- 自定义表头 -->
            <template v-slot:header="props">
              <q-tr :props="props">
                <q-th v-for="col in props.cols" :key="col.name" :props="props" class="text-subtitle2">
                  {{ col.label }}
                </q-th>
              </q-tr>
            </template>
            
            <!-- 自定义行 -->
            <template v-slot:body="props">
              <q-tr :props="props">
                <!-- 名称列 -->
                <q-td key="name" :props="props" class="text-weight-medium">
                  {{ props.row.name }}
                </q-td>
                
                <!-- 类型列 -->
                <q-td key="type" :props="props">
                  <q-badge :color="getTypeColor(props.row.type)">{{ getTypeLabel(props.row.type) }}</q-badge>
                </q-td>
                
                <!-- 大小列 -->
                <q-td key="size" :props="props">{{ props.row.size || (props.row.fileSize ? formatFileSize(props.row.fileSize) : $t('models.modelDetails.noDescription')) }}</q-td>
                
                <!-- 底模列 -->
                <q-td key="baseModel" :props="props">{{ props.row.base || 'unknown' }}</q-td>
                
                <!-- 来源列 -->
                <q-td key="source" :props="props">{{ props.row.source || 'local' }}</q-td>
                
                <!-- 说明列 -->
                <q-td key="description" :props="props">
                  <div class="description text-grey-8">{{ props.row.description || $t('models.modelDetails.noDescription') }}</div>
                </q-td>
                
                <!-- 操作列 -->
                <q-td key="actions" :props="props" class="text-center">
                  <template v-if="downloadProgress[props.row.name]">
                    <!-- 下载进度显示 -->
                    <div class="download-progress">
                      <div class="progress-info text-caption text-grey-8">
                        {{ Math.round((downloadProgress[props.row.name].downloadedBytes / downloadProgress[props.row.name].totalBytes) * 100) }}% | 
                        {{ formatSpeed(downloadProgress[props.row.name].speed) }}
                      </div>
                      <q-linear-progress
                        :value="downloadProgress[props.row.name].downloadedBytes / downloadProgress[props.row.name].totalBytes"
                        color="primary"
                        size="4px"
                      />
                    </div>
                  </template>
                  <template v-else>
                    <div class="row justify-center q-gutter-sm">
                      <!-- 预览按钮 -->
                      <q-btn
                        flat
                        round
                        size="sm"
                        color="grey-7"
                        icon="visibility"
                        @click="viewModelDetails(props.row.name)"
                      >
                        <q-tooltip>{{ $t('optionalModels.actions.viewDetails') }}</q-tooltip>
                      </q-btn>
                      
                      <!-- 下载/安装按钮 -->
                      <q-btn
                        round
                        flat
                        size="sm"
                        :color="props.row.installed ? 'positive' : 'grey-7'"
                        :icon="props.row.installed ? 'check' : 'download'"
                        :loading="isDownloading && props.row.name === modelToInstall"
                        @click="handleInstallModel(props.row.name)"
                        :disable="props.row.installed"
                      >
                        <q-tooltip>{{ props.row.installed ? $t('optionalModels.actions.installed') : $t('optionalModels.actions.install') }}</q-tooltip>
                      </q-btn>
                    </div>
                  </template>
                </q-td>
              </q-tr>
            </template>
            
            <!-- 底部分页 -->
            <template v-slot:pagination="scope">
              <div class="row items-center justify-between q-px-md">
                <div class="text-caption text-grey-8">
                  {{ $t('optionalModels.pagination.rowsPerPage') }}: {{ scope.pagination.rowsPerPage }}
                </div>
                <div>
                  <q-pagination
                    v-model="scope.pagination.page"
                    :max="scope.pagesNumber"
                    :max-pages="6"
                    :boundary-links="true"
                    :direction-links="true"
                    size="sm"
                  />
                </div>
                <div class="text-caption text-grey-8">
                  {{ scope.pagination.rowsPerPage * (scope.pagination.page-1) + 1 }}-{{ Math.min(scope.pagination.page * scope.pagination.rowsPerPage, scope.pagination.rowsNumber || 0) }} of {{ scope.pagination.rowsNumber || 0 }}
                </div>
              </div>
            </template>
          </q-table>
        </div>
      </q-tab-panel>
    </q-tab-panels>
  </q-card>
  
  <!-- 修改确认安装对话框的样式但保持文案和功能不变 -->
  <q-dialog v-model="confirmDialogVisible" persistent>
    <q-card class="confirmation-dialog">
      <!-- 修改标题样式但保留文案 -->
      <q-card-section>
        <div class="text-h6 text-weight-bold">{{ $t('optionalModels.dialog.confirmTitle') }}</div>
      </q-card-section>

      <q-card-section>
        {{ $t('optionalModels.dialog.confirmMessage', { model: modelToInstall }) }}
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn 
          :label="$t('optionalModels.dialog.cancel')" 
          color="grey-7" 
          class="dialog-btn" 
          v-close-popup 
          @click="cancelInstall" 
        />
        <q-btn 
          :label="$t('optionalModels.dialog.confirm')" 
          color="primary" 
          class="dialog-btn q-ml-sm" 
          v-close-popup 
          @click="confirmInstall" 
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
  
  <q-dialog v-model="modelInfoDialog">
    <q-card style="min-width: 350px">
      <q-card-section class="row items-center">
        <div class="text-h6">{{ $t('optionalModels.dialog.modelDetails') }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      <q-card-section v-if="selectedModel">
        <q-list>
          <q-item>
            <q-item-section side style="width: 120px; min-width: 120px">
              <q-item-label class="text-weight-medium">{{ $t('models.modelDetails.name') }}</q-item-label>
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-left">{{ selectedModel.name }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section side style="width: 120px; min-width: 120px">
              <q-item-label class="text-weight-medium">{{ $t('models.modelDetails.type') }}</q-item-label>
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-left">{{ selectedModel.type }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section side style="width: 120px; min-width: 120px">
              <q-item-label class="text-weight-medium">{{ $t('models.modelDetails.size') }}</q-item-label>
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-left">{{ selectedModel.size }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section side style="width: 120px; min-width: 120px">
              <q-item-label class="text-weight-medium">{{ $t('models.modelDetails.baseModel') }}</q-item-label>
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-left">{{ selectedModel.baseModel || 'FLUX.1' }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section side style="width: 120px; min-width: 120px">
              <q-item-label class="text-weight-medium">{{ $t('models.modelDetails.source') }}</q-item-label>
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-left">{{ selectedModel.source || 'local' }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section side style="width: 120px; min-width: 120px">
              <q-item-label class="text-weight-medium">{{ $t('models.modelDetails.description') }}</q-item-label>
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-left">{{ selectedModel.description || $t('models.modelDetails.noDescription') }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useQuasar } from 'quasar';
import api from '../../api';
import DataCenter from 'src/api/DataCenter';
import { useI18n } from 'vue-i18n';

// 本地模型接口定义
interface Model {
  id: string;
  name: string;
  description: string;
  type: string;
  size: string;
  path?: string;
  installed: boolean;
  downloading?: boolean;
  installedDate?: string;
  essential?: boolean;
  baseModel?: string;
  source?: string;
}

// 定义更具体的API响应类型
interface ApiResponse {
  data?: unknown; // 替换any为unknown
  body?: unknown; // 替换any为unknown
}

// 为索引签名使用更具体的类型
interface EssentialModel {
  name: string;
  dir: string;
  filename: string;
  description?: string;
  size?: number;
  url?: string | {
    hf?: string;
    mirror?: string;
    [key: string]: string | undefined;
  };
  [key: string]: unknown; // 替换any为unknown
}

// ModelFetchModeOption 类型，用于数据库模式选项
interface ModelFetchModeOption {
  label: string;
  value: ModelFetchMode;
}

// 下载进度映射类型
interface ModelDownloadProgress {
  [key: string]: {
    downloadedBytes: number;
    totalBytes: number;
    speed: number;
    status: string;
    currentModelProgress: number;
    currentModel: EssentialModel | null; // 使用明确的类型
    currentModelIndex: number;
    error: string | null;
  };
}

// 定义 ModelFetchMode 类型
type ModelFetchMode = 'cache' | 'local' | 'remote';

// 定义 ProgressData 类型
interface ProgressData {
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  status: string;
  currentModelProgress: number;
  currentModel: EssentialModel | null; // 使用明确的类型
  currentModelIndex: number;
  error: string | null;
  completed?: boolean; // 使用可选属性
  overallProgress: number;
}

// 添加类型守卫函数
const isCompletedProgress = (data: ProgressData): data is ProgressData & { completed: boolean } => {
  return 'completed' in data && typeof data.completed === 'boolean';
};

// 添加类型守卫函数
// function hasModelFetchModeValue(obj: unknown): obj is { value: ModelFetchMode } {
//   return typeof obj === 'object' && obj !== null && 'value' in obj;
// }

// 工具函数：提取API响应数据
const extractResponseData = async <T>(response: ApiResponse | Response | undefined): Promise<T | null> => {
  if (!response) return null;
  
  if (typeof response === 'object') {
    if ('data' in response && response.data !== undefined) return response.data as T;
    if ('body' in response && response.body !== undefined) {
      return response.body as T;
    }
    
    if (response instanceof Response) {
      try {
        return await response.json() as T;
      } catch (error) {
        console.error('解析响应JSON失败:', error);
      }
    }
  }
  
  return null;
};

// 重新定义TableColumn接口，使用更具体的类型代替any
interface TableColumn {
  name: string;
  label: string;
  field: string | ((row: Model) => unknown);
  required?: boolean;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  sort?: (a: unknown, b: unknown, rowA: Model, rowB: Model) => number;
  sortOrder?: 'ad' | 'da';
  format?: (val: unknown, row: Model) => unknown;
  style?: string | ((row: Model) => string);
  classes?: string | ((row: Model) => string);
  headerStyle?: string;
  headerClasses?: string;
}

export default defineComponent({
  name: 'OptionalModelsCard',
  setup() {
    const $q = useQuasar();
    const t = useI18n().t;

    // 本地状态
    const models = ref<Model[]>([]);
    const filteredModels = ref<Model[]>([]);
    const isLoading = ref(false);
    const activeTab = ref('all');
    const searchQuery = ref('');
    const databaseMode = ref<ModelFetchMode>('cache');
    const previousSearchQuery = ref('');
    const isDownloading = ref(false);
    const downloadTaskId = ref<string | null>(null);
    const downloadProgress = ref<ModelDownloadProgress>({});
    const downloadPollingInterval = ref<ReturnType<typeof setInterval> | null>(null);
    const installing = ref('');
    const modelInfoDialog = ref(false);
    const selectedModel = ref<Model | null>(null);
    
    const databaseModeOptions = computed(() => [
      {label: t('optionalModels.dataSource.cache'), value: 'cache' as ModelFetchMode},
      {label: t('optionalModels.dataSource.local'), value: 'local' as ModelFetchMode},
      {label: t('optionalModels.dataSource.remote'), value: 'remote' as ModelFetchMode}
    ]);
    
    // 添加对话框状态
    const confirmDialogVisible = ref(false);
    const modelToInstall = ref('');
    
    // 添加下载源选择
    const downloadSource = ref(t('optionalModels.download.source.mirror'));
    const downloadSourceOptions = computed(() => [
      t('optionalModels.download.source.mirror'), 
      t('optionalModels.download.source.official')
    ]);
    
    // 修改列定义为使用i18n并添加明确的类型声明
    const columns = computed<TableColumn[]>(() => [
      { name: 'name', label: t('optionalModels.columns.name'), field: 'name', align: 'left', sortable: true },
      { name: 'type', label: t('optionalModels.columns.type'), field: 'type', align: 'center' },
      { name: 'size', label: t('optionalModels.columns.size'), field: 'size', align: 'center', sortable: true },
      { name: 'baseModel', label: t('optionalModels.columns.baseModel'), field: 'baseModel', align: 'center' },
      { name: 'source', label: t('optionalModels.columns.source'), field: 'source', align: 'center' },
      { name: 'description', label: t('optionalModels.columns.description'), field: 'description', align: 'left' },
      { name: 'actions', label: t('optionalModels.columns.actions'), field: 'actions', align: 'center' }
    ]);
    
    // 获取模型列表
    const fetchModels = async () => {
      try {
        isLoading.value = true;
        // 调用数据中心的方法获取模型列表
        const data = await DataCenter.getOptionalModels();
        if (data && Array.isArray(data)) {
          models.value = data;
          console.log('获取到可选模型列表:', models.value.length);
          // 初始过滤
          filterModels(searchQuery.value);
        } else {
          console.error('获取模型列表失败: 响应格式不正确', data);
          $q.notify({
            type: 'negative',
            message: '获取模型列表失败'
          });
        }
      } catch (error) {
        console.error('获取模型列表失败:', error);
        $q.notify({
          type: 'negative',
          message: '获取模型列表失败'
        });
      } finally {
        isLoading.value = false;
      }
    };
    
    // 模型搜索过滤
    const filterModels = (query: string) => {
      if (!query.trim()) {
        filteredModels.value = [...models.value];
        return;
      }
      
      const searchTerms = query.toLowerCase().trim().split(/\s+/);
      
      filteredModels.value = models.value.filter(model => {
        const modelText = `${model.name} ${model.description || ''} ${model.type}`.toLowerCase();
        return searchTerms.every(term => modelText.includes(term));
      });
    };
    
    // 监听搜索修改，添加防抖
    const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null);
    watch(searchQuery, (newVal) => {
      if (searchTimeout.value) {
        clearTimeout(searchTimeout.value);
      }
      
      searchTimeout.value = setTimeout(() => {
        if (newVal !== previousSearchQuery.value) {
          filterModels(newVal);
          previousSearchQuery.value = newVal;
        }
      }, 300);
    });
    
    // 清除搜索
    const clearSearch = () => {
      searchQuery.value = '';
      filterModels('');
    };
    
    // 处理搜索输入 - 添加中间处理函数处理类型问题
    const handleSearchInput = (value: string | number | null) => {
      if (value === null) {
        filterModels('');
      } else {
        filterModels(String(value));
      }
    };
    
    // 改进数据库模式切换处理
    const onDatabaseModeChange = (newMode: ModelFetchMode | ModelFetchModeOption) => {
      // 类型安全处理
      if (typeof newMode === 'string' && ['cache', 'local', 'remote'].includes(newMode)) {
        databaseMode.value = newMode as ModelFetchMode;
      } else if (typeof newMode === 'object' && newMode !== null && 
                typeof newMode.value === 'string' && 
                ['cache', 'local', 'remote'].includes(newMode.value)) {
        databaseMode.value = newMode.value as ModelFetchMode;
      } else {
        // 默认值
        databaseMode.value = 'cache';
      }
      
      // 重新获取模型
      fetchModels();
    };
    
    // 轮询下载进度
    const pollDownloadProgress = async () => {
      if (!downloadTaskId.value) return;
      
      // 清除可能已存在的轮询
      if (downloadPollingInterval.value) {
        clearInterval(downloadPollingInterval.value);
      }
      
      // 设置轮询间隔
      downloadPollingInterval.value = setInterval(async () => {
        if (!downloadTaskId.value) {
          if (downloadPollingInterval.value) {
            clearInterval(downloadPollingInterval.value);
            downloadPollingInterval.value = null;
          }
          return;
        }
        
        try {
          // 修复：使用正确的API路径获取下载进度
          const response = await api.get(`models/progress/${downloadTaskId.value}`);
          const progressData = await extractResponseData<ProgressData>(response);
          
          if (progressData) {
            // 修改：不再依赖modelName字段
            if (progressData.status) {
              // 如果正在下载的模型存在
              if (installing.value) {
                // 更新指定模型的下载进度
                downloadProgress.value[installing.value] = {
                  downloadedBytes: progressData.downloadedBytes || 0,
                  totalBytes: progressData.totalBytes || 0,
                  speed: progressData.speed || 0,
                  status: progressData.status,
                  currentModelProgress: progressData.currentModelProgress || 0,
                  currentModel: progressData.currentModel,
                  currentModelIndex: progressData.currentModelIndex || 0,
                  error: progressData.error || null
                };
                
                // 检查是否完成
                if (progressData.status === 'completed' || isCompletedProgress(progressData) && progressData.completed) {
                  // 显示通知
                  $q.notify({
                    type: 'positive',
                    message: `模型 ${installing.value} 安装完成`
                  });
                  
                  // 刷新模型列表
                  fetchModels();
                  
                  // 停止轮询并重置状态
                  if (downloadPollingInterval.value) {
                    clearInterval(downloadPollingInterval.value);
                    downloadPollingInterval.value = null;
                  }
                  
                  isDownloading.value = false;
                  downloadTaskId.value = null;
                  // 清除下载进度
                  delete downloadProgress.value[installing.value];
                  installing.value = '';
                }
                
                // 检查是否出错
                if (progressData.status === 'error' || progressData.error) {
                  $q.notify({
                    type: 'negative',
                    message: `模型下载失败: ${progressData.error || '未知错误'}`
                  });
                  
                  // 停止轮询
                  if (downloadPollingInterval.value) {
                    clearInterval(downloadPollingInterval.value);
                    downloadPollingInterval.value = null;
                  }
                  
                  isDownloading.value = false;
                  downloadTaskId.value = null;
                  // 清除下载进度
                  delete downloadProgress.value[installing.value];
                  installing.value = '';
                }
              }
            }
          }
        } catch (error) {
          console.error('Failed to get download progress:', error);
        }
      }, 1000);
    };
    
    // 安装模型 - 修改为使用自定义对话框
    const handleInstallModel = (modelName: string) => {
      // 如果已经在下载中或已安装则不处理
      if (isDownloading.value) return;
      
      const model = models.value.find(m => m.name === modelName);
      if (!model || model.installed) return;
      
      // 显示自定义对话框
      modelToInstall.value = modelName;
      confirmDialogVisible.value = true;
    };
    
    // 取消安装
    const cancelInstall = () => {
      modelToInstall.value = '';
    };
    
    // 确认安装 - 实际执行安装逻辑
    const confirmInstall = async () => {
      const modelName = modelToInstall.value;
      if (!modelName) return;
      
      try {
        isLoading.value = true;
        installing.value = modelName;
        
        // 根据选择的下载源确定API参数
        const source = downloadSource.value === t('optionalModels.download.source.official') ? 'hf' : 'mirror';
        
        // 使用适当的 API 调用方式，并传递下载源参数
        const response = await api.post(`models/install/${modelName}`, { source }); 
        const data = await extractResponseData<{taskId?: string}>(response);
        
        if (data?.taskId) {
          downloadTaskId.value = data.taskId;
          isDownloading.value = true;
          
          // 初始化下载进度
          downloadProgress.value[modelName] = {
            downloadedBytes: 0,
            totalBytes: 0,
            speed: 0,
            status: 'downloading',
            currentModelProgress: 0,
            currentModel: null,
            currentModelIndex: 0,
            error: null
          };
          
          pollDownloadProgress();
          
          $q.notify({
            type: 'info',
            message: t('optionalModels.download.startInstall', { model: modelName })
          });
        } else {
          throw new Error('服务器未返回有效任务ID');
        }
      } catch (error) {
        console.error('Installing model failed:', error);
        $q.notify({
          type: 'negative',
          message: t('optionalModels.download.installFailed', { error: error instanceof Error ? error.message : String(error) })
        });
      } finally {
        isLoading.value = false;
        if (!isDownloading.value) {
          installing.value = '';
          modelToInstall.value = '';
        }
      }
    };
    
    // 格式化文件大小
    const formatFileSize = (bytes: number): string => {
      if (!bytes || isNaN(bytes)) return '0 B';
      
      bytes = Math.max(0, bytes); // 确保非负
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let value = bytes;
      let unitIndex = 0;
      
      while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
      }
      
      return `${value.toFixed(2)} ${units[unitIndex]}`;
    };
    
    // 格式化下载速度
    const formatSpeed = (bytesPerSecond: number): string => {
      if (!bytesPerSecond || isNaN(bytesPerSecond)) return '0 B/s';
      return `${formatFileSize(bytesPerSecond)}/s`;
    };
    
    // 获取下载百分比
    const getDownloadPercentage = (modelName: string): number => {
      const progress = downloadProgress.value[modelName];
      if (!progress || !progress.totalBytes) return 0;
      
      return Math.round((progress.downloadedBytes / progress.totalBytes) * 100);
    };
    
    // 获取模型类型标签
    const getTypeLabel = (type: string): string => {
      // 使用 i18n 获取模型类型标签
      return t(`optionalModels.modelTypes.${type}`) || type;
    };
    
    // 获取模型类型颜色
    const getTypeColor = (type: string): string => {
      const typeColors: Record<string, string> = {
        checkpoint: 'primary',
        vae: 'deep-purple',
        vae_approx: 'purple',
        lora: 'teal',
        controlnet: 'orange',
        upscaler: 'green',
        embedding: 'cyan',
        ipadapter: 'red',
        motion: 'blue',
        facerestore: 'indigo',
        detector: 'brown',
        segmentation: 'light-green',
        other: 'grey'
      };
      
      return typeColors[type] || 'grey';
    };
    
    // 添加刷新函数
    const onRefresh = () => {
      // 清空搜索以确保显示所有结果
      searchQuery.value = '';
      // 重新获取模型
      fetchModels();
      
      $q.notify({
        type: 'info',
        message: t('optionalModels.download.refreshing')
      });
    };
    
    // 添加查看模型详情方法
    const viewModelDetails = (name: string) => {
      selectedModel.value = models.value.find(model => model.name === name) || null;
      modelInfoDialog.value = true;
    };
    
    // 组件加载时获取数据
    onMounted(() => {
      fetchModels();
    });
    
    // 组件卸载时清理资源
    onUnmounted(() => {
      if (downloadPollingInterval.value) {
        clearInterval(downloadPollingInterval.value);
        downloadPollingInterval.value = null;
      }
      if (searchTimeout.value) {
        clearTimeout(searchTimeout.value);
        searchTimeout.value = null;
      }
    });
    
    // 修改活动标签的映射关系
    const tabTypeMapping = {
      'all': null, // 所有类型
      'sd': 'checkpoint',
      'lora': 'lora',
      'controlnet': 'controlnet',
      'vae': 'vae',
      'upscaler': 'upscaler'
    };
    
    // 添加根据标签过滤模型的方法
    const getFilteredModelsByTab = (tabName: string) => {
      const models = filteredModels.value;
      const filterType = tabTypeMapping[tabName as keyof typeof tabTypeMapping];
      
      if (!filterType) return models; // 'all' tab
      return models.filter(model => model.type === filterType);
    };
    
    return {
      // 状态
      models,
      filteredModels,
      isLoading,
      activeTab,
      searchQuery,
      databaseMode,
      databaseModeOptions,
      isDownloading,
      downloadTaskId,
      downloadProgress,
      installing,
      confirmDialogVisible,
      modelToInstall,
      downloadSource,
      downloadSourceOptions,
      selectedModel,
      modelInfoDialog,
      
      // 方法
      fetchModels,
      filterModels,
      handleInstallModel,
      onDatabaseModeChange,
      clearSearch,
      formatFileSize,
      formatSpeed,
      pollDownloadProgress,
      onRefresh,
      
      // 辅助功能
      getFilteredModelsByTab,
      
      getTypeLabel,
      getTypeColor,
      getDownloadPercentage,
      
      // 添加新的处理函数
      handleSearchInput,
      cancelInstall,
      confirmInstall,
      
      // 添加新的表格列配置
      columns,
      viewModelDetails,
    };
  }
});
</script>

<style scoped>
/* 修改样式 */
.model-card {
  border-radius: 16px;
  overflow: hidden;
}

.header-section {
  padding: 20px;
}

.model-table {
  width: 100%;
}

.description {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.download-progress {
  width: 150px;
}

/* 表格行高度调整 */
:deep(.q-table tbody td) {
  padding-top: 8px;
  padding-bottom: 8px;
}

/* 增大所有圆角尺寸 */
:deep(.q-card) {
  border-radius: 16px;
}

:deep(.q-btn) {
  border-radius: 12px;
}

:deep(.q-btn.q-btn--round) {
  border-radius: 50%;
}

:deep(.q-input) {
  border-radius: 16px;
}

:deep(.q-input .q-field__control) {
  border-radius: 12px;
}

:deep(.q-dialog__inner > div) {
  border-radius: 16px;
}

:deep(.q-table) {
  border-radius: 12px;
}

:deep(.q-table th:first-child) {
  border-top-left-radius: 12px;
}

:deep(.q-table th:last-child) {
  border-top-right-radius: 12px;
}

/* 操作按钮间距 */
.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}

/* 添加确认对话框样式 */
.confirmation-dialog {
  min-width: 350px;
  max-width: 400px;
}

.dialog-btn {
  border-radius: 8px;
  min-width: 80px;
}

.custom-select-radius {
  border-radius: var(--border-radius-lg);
}

/* 可能需要覆盖内部控件的圆角 */
:deep(.custom-select-radius .q-field__control) {
  border-radius: var(--border-radius-lg);
}
</style>