<template>
  <q-page padding>
    <div class="text-h5 q-mb-md text-primary">模型管理中心</div>
    
    <!-- 1. 基础模型安装区域 -->
    <q-card class="q-mb-lg essential-models">
      <q-card-section class="bg-primary text-white">
        <div class="text-h6">
          <q-icon name="verified" class="q-mr-sm" />
          必要基础模型
        </div>
        <div class="text-caption">这些模型对于ComfyUI的正常运行是必需的</div>
      </q-card-section>
      
      <q-separator />
      
      <q-card-section>
        <div class="row items-center q-mb-md">
          <div class="col-grow">
            <div class="text-subtitle1">基础模型包</div>
            <div class="text-caption">包含基本的SD模型、VAE和ControlNet模型</div>
          </div>
          <div class="col-auto">
            <q-select
              v-model="downloadSource"
              :options="downloadSourceOptions"
              label="下载源"
              dense
              outlined
              style="min-width: 180px"
              class="q-mr-md"
            />
            <q-btn 
              color="primary" 
              icon="download" 
              label="安装基础模型" 
              @click="downloadEssentialModels"
              :loading="essentialLoading"
              :disable="isDownloading"
            />
          </div>
        </div>
        
        <!-- 下载进度展示面板 -->
        <div v-if="downloadTaskId" class="download-progress-panel">
          <div class="progress-header">
            <span class="model-count-indicator">
              模型 {{ currentDownloadState.currentModelIndex + 1 }}/{{ essentialModels?.length || 0 }}
            </span>
            <span class="model-name">{{ currentModel ? currentModel.name : '加载中...' }}</span>
            <q-btn flat type="negative" label="取消下载" @click="cancelDownload" />
          </div>
          
          <div class="progress-details">
            <q-linear-progress
              :value="currentDownloadState.currentModelProgress / 100"
              size="20px"
              color="primary"
            >
              <div class="absolute-full flex flex-center">
                <q-badge color="white" text-color="primary" :label="`${formatPercentage(currentDownloadState.currentModelProgress)}%`" />
              </div>
            </q-linear-progress>
            
            <div v-if="currentModel" class="model-info">
              <span>当前模型: {{ currentModel.name }}</span>
              <span>类型: {{ getModelTypeName(currentModel.type) }}</span>
            </div>
            
            <div class="progress-stats">
              <span>总体进度: {{ currentDownloadState.overallProgress.toFixed(1) }}%</span>
              <span>已完成: {{ currentDownloadState.currentModelIndex + 1 }}/{{ essentialModels?.length || 0 }}</span>
            </div>
            
            <div class="download-stats">
              <div class="stat-item">
                <q-icon name="save" size="sm" />
                <span>文件大小: {{ formatFileSize(currentDownloadState.totalBytes) }}</span>
              </div>
              <div class="stat-item">
                <q-icon name="cloud_download" size="sm" />
                <span>已下载: {{ formatFileSize(currentDownloadState.downloadedBytes) }}</span>
              </div>
              <div class="stat-item">
                <q-icon name="speed" size="sm" />
                <span>下载速度: {{ formatSpeed(currentDownloadState.speed) }}</span>
              </div>
            </div>
          </div>
          
          <!-- 下载历史 -->
          <div class="download-history">
            <h4>下载历史</h4>
            <div v-for="(log, index) in downloadLogs" :key="index" class="log-item">
              <q-badge
                :color="getLogBadgeColor(log.status)"
                :label="log.status"
              />
              <span>{{ log.message }}</span>
              <span class="log-time">{{ log.time }}</span>
            </div>
          </div>
        </div>
        
        <q-banner v-if="essentialInstalled" class="bg-positive text-white">
          <template v-slot:avatar>
            <q-icon name="check_circle" />
          </template>
          基础模型已全部安装完成，您可以开始使用ComfyUI了。
        </q-banner>
      </q-card-section>
    </q-card>
    
    <!-- 2. 可选模型库 -->
    <q-card class="q-mb-lg">
      <q-card-section class="bg-secondary text-white">
        <div class="text-h6">
          <q-icon name="collections" class="q-mr-sm" />
          可选模型库
        </div>
        <div class="text-caption">按需下载各类模型增强您的AI创作能力</div>
        
        <!-- 添加数据源选择和刷新按钮 -->
        <div class="row items-center q-mt-sm">
          <q-select
            v-model="databaseMode"
            :options="databaseModeOptions"
            option-value="value"
            option-label="label"
            dense
            outlined
            class="bg-white text-black q-mr-md"
            style="width: 200px"
            label="数据源"
            @update:model-value="fetchModels"
          />
          <q-btn 
            color="white" 
            text-color="secondary" 
            icon="refresh" 
            label="刷新" 
            @click="fetchModels"
            :loading="isLoading"
          />
          
          <!-- 添加搜索框 -->
          <q-input
            v-model="searchQuery"
            dense
            outlined
            placeholder="搜索模型..."
            class="bg-white q-ml-md"
            style="width: 200px"
            @update:model-value="filterModels"
          >
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
      </q-card-section>
      
      <q-tabs
        v-model="activeTab"
        dense
        class="text-grey-7"
        active-color="secondary"
        indicator-color="secondary"
        align="justify"
      >
        <q-tab name="all" label="全部" icon="apps" />
        <q-tab name="checkpoint" label="SD模型" icon="image" />
        <q-tab name="lora" label="LoRA" icon="tune" />
        <q-tab name="controlnet" label="ControlNet" icon="explore" />
        <q-tab name="vae" label="VAE" icon="auto_fix_high" />
        <q-tab name="upscaler" label="超分辨率" icon="hd" />
      </q-tabs>
      
      <q-separator />
      
      <q-tab-panels v-model="activeTab" animated>
        <!-- 所有模型面板 -->
        <q-tab-panel name="all">
          <div v-if="isLoading" class="text-center q-pa-lg">
            <q-spinner color="secondary" size="3em" />
            <div class="q-mt-md">加载模型中...</div>
          </div>
          
          <div v-else-if="filteredModels.length === 0" class="text-center q-pa-lg text-grey">
            没有找到匹配的模型
          </div>
          
          <div v-else class="row q-col-gutter-md">
            <div v-for="model in filteredModels" :key="model.name" class="col-xs-12 col-sm-6 col-md-4 col-lg-3">
              <q-card class="model-card" :class="{ 'installed': model.installed }">
                <q-card-section>
                  <div class="text-h6 ellipsis">{{ model.name }}</div>
                  <q-badge :color="getTypeColor(model.type)">{{ model.type }}</q-badge>
                </q-card-section>
                
                <q-card-section>
                  <p v-if="model.description" class="description">{{ model.description }}</p>
                  <p v-else class="text-grey">无描述</p>
                </q-card-section>
                
                <q-card-actions align="right">
                  <template v-if="downloadProgress[model.name]">
                    <q-card-section class="download-progress q-pa-none">
                      <div class="progress-info">
                        <div class="text-subtitle2">
                          {{ model.name }} 下载中...
                        </div>
                        <div class="text-caption q-gutter-x-md">
                          <span>
                            已下载: {{ formatFileSize(downloadProgress[model.name].downloadedBytes) }} / 
                            {{ formatFileSize(downloadProgress[model.name].totalBytes) }}
                          </span>
                          <span>
                            速度: {{ formatSpeed(downloadProgress[model.name].speed) }}
                          </span>
                        </div>
                      </div>
                      <q-linear-progress
                        :value="downloadProgress[model.name].downloadedBytes / downloadProgress[model.name].totalBytes"
                        color="primary"
                        class="q-mt-sm"
                        size="10px"
                      >
                        <div class="absolute-full flex flex-center">
                          <q-badge color="white" text-color="primary" :label="`${Math.round((downloadProgress[model.name].downloadedBytes / downloadProgress[model.name].totalBytes) * 100)}%`" />
                        </div>
                      </q-linear-progress>
                    </q-card-section>
                  </template>
                  <template v-else>
                    <q-btn
                      :color="model.installed ? 'positive' : 'primary'"
                      :icon="model.installed ? 'check' : 'download'"
                      :label="model.installed ? '已安装' : '安装'"
                      :loading="installing === model.name"
                      @click="installModel(model.name)"
                      :disable="model.installed"
                    />
                  </template>
                </q-card-actions>
              </q-card>
            </div>
          </div>
        </q-tab-panel>
        
        <!-- 其他标签页 - 使用相同的模板但过滤不同类型 -->
        <q-tab-panel v-for="tabType in ['checkpoint', 'lora', 'controlnet', 'vae', 'upscaler']" :key="tabType" :name="tabType">
          <div v-if="isLoading" class="text-center q-pa-lg">
            <q-spinner color="secondary" size="3em" />
            <div class="q-mt-md">加载模型中...</div>
          </div>
          
          <div v-else-if="getFilteredModelsByType(tabType).length === 0" class="text-center q-pa-lg text-grey">
            没有找到匹配的{{ getTypeLabel(tabType) }}模型
          </div>
          
          <div v-else class="row q-col-gutter-md">
            <div v-for="model in getFilteredModelsByType(tabType)" :key="model.name" class="col-xs-12 col-sm-6 col-md-4 col-lg-3">
              <q-card class="model-card" :class="{ 'installed': model.installed }">
                <q-card-section>
                  <div class="text-h6 ellipsis">{{ model.name }}</div>
                  <q-badge :color="getTypeColor(model.type)">{{ model.type }}</q-badge>
                </q-card-section>
                
                <q-card-section>
                  <p v-if="model.description" class="description">{{ model.description }}</p>
                  <p v-else class="text-grey">无描述</p>
                </q-card-section>
                
                <q-card-actions align="right">
                  <template v-if="downloadProgress[model.name]">
                    <q-card-section class="download-progress q-pa-none">
                      <div class="progress-info">
                        <div class="text-subtitle2">
                          {{ model.name }} 下载中...
                        </div>
                        <div class="text-caption q-gutter-x-md">
                          <span>
                            已下载: {{ formatFileSize(downloadProgress[model.name].downloadedBytes) }} / 
                            {{ formatFileSize(downloadProgress[model.name].totalBytes) }}
                          </span>
                          <span>
                            速度: {{ formatSpeed(downloadProgress[model.name].speed) }}
                          </span>
                        </div>
                      </div>
                      <q-linear-progress
                        :value="downloadProgress[model.name].downloadedBytes / downloadProgress[model.name].totalBytes"
                        color="primary"
                        class="q-mt-sm"
                        size="10px"
                      >
                        <div class="absolute-full flex flex-center">
                          <q-badge color="white" text-color="primary" :label="`${Math.round((downloadProgress[model.name].downloadedBytes / downloadProgress[model.name].totalBytes) * 100)}%`" />
                        </div>
                      </q-linear-progress>
                    </q-card-section>
                  </template>
                  <template v-else>
                    <q-btn
                      :color="model.installed ? 'positive' : 'primary'"
                      :icon="model.installed ? 'check' : 'download'"
                      :label="model.installed ? '已安装' : '安装'"
                      :loading="installing === model.name"
                      @click="installModel(model.name)"
                      :disable="model.installed"
                    />
                  </template>
                </q-card-actions>
              </q-card>
            </div>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>
    
    <!-- 3. 已安装模型管理 -->
    <q-card>
      <q-card-section class="bg-dark text-white">
        <div class="text-h6">
          <q-icon name="folder" class="q-mr-sm" />
          已安装模型管理
        </div>
        <div class="text-caption">查看和管理您已下载的模型</div>
      </q-card-section>
      
      <q-separator />
      
      <q-card-section>
        <div class="row items-center q-mb-md">
          <div class="col">
            <div class="text-subtitle1">已安装模型总数: {{ installedModelsCount }}</div>
            <div class="text-caption">占用存储空间: {{ totalStorageUsed }}</div>
          </div>
          <div class="col-auto">
            <q-btn color="secondary" icon="refresh" label="刷新列表" @click="refreshModels" />
          </div>
        </div>
        
        <q-table
          :rows="installedModels"
          :columns="modelColumns"
          row-key="id"
          :pagination="{ rowsPerPage: 10 }"
          class="installed-models-table"
        >
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn size="sm" flat round color="red" icon="delete" @click="confirmDelete(props.row)" />
              <q-btn size="sm" flat round color="info" icon="info" @click="showModelInfo(props.row)" />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
    
    <!-- 4. 确认对话框 -->
    <q-dialog v-model="deleteConfirmDialog">
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <span class="q-ml-sm">确认删除模型</span>
        </q-card-section>
        
        <q-card-section>
          您确定要删除模型 <strong>{{ selectedModel?.name }}</strong> 吗？此操作不可撤销。
        </q-card-section>
        
        <q-card-actions align="right">
          <q-btn flat label="取消" color="primary" v-close-popup />
          <q-btn flat label="删除" color="negative" @click="deleteModel" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
    
    <!-- 5. 模型详情对话框 -->
    <q-dialog v-model="modelInfoDialog">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">模型详情</div>
        </q-card-section>
        
        <q-card-section v-if="selectedModel">
          <q-list>
            <q-item>
              <q-item-section>
                <q-item-label overline>名称</q-item-label>
                <q-item-label>{{ selectedModel.name }}</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item>
              <q-item-section>
                <q-item-label overline>类型</q-item-label>
                <q-item-label>{{ selectedModel.type }}</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item>
              <q-item-section>
                <q-item-label overline>大小</q-item-label>
                <q-item-label>{{ selectedModel.size }}</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item>
              <q-item-section>
                <q-item-label overline>安装日期</q-item-label>
                <q-item-label>{{ selectedModel.installedDate }}</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item>
              <q-item-section>
                <q-item-label overline>路径</q-item-label>
                <q-item-label>{{ selectedModel.path }}</q-item-label>
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

<script lang="ts">
import { defineComponent, ref, onMounted, computed, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import api from '../api';
import { modelsApi, ModelFetchMode } from '../api';
import type { EssentialModel, DownloadProgress } from '../types/models';

// 使用 Quasar QTable 的列类型定义
interface TableColumn {
  name: string;
  label: string;
  field: string | ((row: Record<string, unknown>) => unknown);
  required?: boolean;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  sort?: (a: unknown, b: unknown) => number;
  format?: (val: unknown) => string;
}

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
}

// 下载日志类型
interface DownloadLog {
  status: string;
  message: string;
  time: string;
}

// 恢复使用 ModelDownloadProgress 类型，但做为映射类型
export interface ModelDownloadProgress {
  [key: string]: DownloadProgress;
}

// 当前下载状态接口
interface CurrentDownloadState {
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  status: 'downloading' | 'completed' | 'error';
  error: string | null;
  overallProgress: number;
  currentModelIndex: number;
  currentModelProgress: number;
  currentModel: EssentialModel | null;
  completed: boolean;
}

export default defineComponent({
  name: 'ModelsPage',
  setup() {
    const $q = useQuasar();
    
    // 状态变量
    const essentialLoading = ref(false);
    const essentialProgress = ref(0);
    const essentialInstalled = ref(false);
    
    const activeTab = ref('all');
    const sdModels = ref<Model[]>([]); 
    
    const installedModels = ref<Model[]>([]);
    const installedModelsCount = ref(0);
    const totalStorageUsed = ref('0 MB');
    
    const deleteConfirmDialog = ref(false);
    const modelInfoDialog = ref(false);
    const selectedModel = ref<Model | null>(null);
    
    // 下载源选项
    const downloadSource = ref('HuggingFace中国镜像站');
    const downloadSourceOptions = [
      { label: 'HuggingFace中国镜像站', value: 'mirror' },
      { label: 'HuggingFace官方站点', value: 'hf' }
    ];
    
    // 下载状态
    const isDownloading = ref(false);
    const downloadTaskId = ref<string | null>(null);
    const currentDownloadState = ref<CurrentDownloadState>({
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 0,
      status: 'downloading',
      error: null,
      overallProgress: 0,
      currentModelIndex: 0,
      currentModelProgress: 0,
      currentModel: null,
      completed: false
    });
    
    // 修改 downloadProgress 的类型定义
    const downloadProgress = ref<ModelDownloadProgress>({});
    const downloadPollingInterval = ref<ReturnType<typeof setInterval> | null>(null);
    
    // 明确声明为DownloadLog数组
    const downloadLogs = ref<Array<DownloadLog>>([]);
    
    // 声明必要模型列表
    const essentialModels = ref<EssentialModel[]>([]);
    
    // 添加新的状态变量
    const models = ref<Model[]>([]);
    const filteredModels = ref<Model[]>([]);
    const isLoading = ref(false);
    const databaseMode = ref<ModelFetchMode>('cache');
    const searchQuery = ref('');
    const installing = ref('');
    
    const databaseModeOptions = [
      {label: '通道 (1天缓存)', value: 'cache' as ModelFetchMode},
      {label: '本地', value: 'local' as ModelFetchMode},
      {label: '远程', value: 'remote' as ModelFetchMode}
    ];
    
    // 添加在 setup 函数开始处
    const lastPolledModel = ref<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const lastLoggedProgress = ref(0);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const lastLoggedSpeed = ref(0);
    
    // 获取必要模型列表
    const fetchEssentialModels = async () => {
      try {
        essentialLoading.value = true;
        
        // 使用正确的API获取模型列表，而不是触发下载
        const response = await api.getEssentialModels();
        
        if (response && response.body && response.body.models) {
          // 更新列表数据
          essentialModels.value = response.body.models;
          console.log('获取到必要模型列表:', essentialModels.value.length);
          
          // 检查模型是否已安装（这里可以添加您需要的逻辑）
          checkEssentialModelsInstalled();
        } else {
          console.error('获取模型列表失败: 响应格式不正确', response);
        }
      } catch (error) {
        console.error('获取必要模型列表失败:', error);
        $q.notify({
          type: 'negative',
          message: `获取必要模型列表失败: ${error instanceof Error ? error.message : String(error)}`
        });
      } finally {
        essentialLoading.value = false;
      }
    };
    
    // 添加一个检查基础模型是否已安装的辅助函数
    const checkEssentialModelsInstalled = () => {
      // 这里可以添加检查逻辑
      // 例如，检查本地模型中是否包含所有必要模型
    };
    
    // 使用正确类型定义表格列
    const modelColumns = [
      { name: 'name', label: '名称', field: 'name', sortable: true },
      { name: 'type', label: '类型', field: 'type', sortable: true },
      { name: 'description', label: '描述', field: 'description' },
      { name: 'installedDate', label: '安装日期', field: 'installedDate', sortable: true },
      { name: 'actions', label: '操作', field: 'actions', align: 'right' as const }
    ] as TableColumn[];
    
    // 计算属性 - 当前正在下载的模型
    const currentModel = computed(() => currentDownloadState.value.currentModel);
    
    // 修改轮询函数
    const pollDownloadProgress = async () => {
      // 停止现有的轮询
      if (downloadPollingInterval.value) {
        clearInterval(downloadPollingInterval.value);
        downloadPollingInterval.value = null;
      }
      
      // 创建新的轮询
      downloadPollingInterval.value = setInterval(async () => {
        try {
          if (!downloadTaskId.value) return;
          
          const response = await api.getModelProgress(downloadTaskId.value);
          if (!response || !response.body) return;
          
          const progress = response.body;
          
          // 更新全局下载状态
          currentDownloadState.value = { ...progress };
          
          // 更新特定模型的进度
          if (progress.currentModel) {
            const modelId = progress.currentModel.id || downloadTaskId.value;
            
            // 修复类型问题，提供所有必要的属性
            downloadProgress.value[modelId] = {
              downloadedBytes: progress.downloadedBytes || 0,
              totalBytes: progress.totalBytes || 1, // 避免除以零
              speed: progress.speed || 0,
              status: progress.status || 'downloading',
              overallProgress: progress.overallProgress || 0,
              currentModelProgress: progress.currentModelProgress || 0,
              // 添加缺少的属性
              currentModel: progress.currentModel,
              currentModelIndex: progress.currentModelIndex || 0,
              completed: progress.completed || false,
              error: progress.error || null
            };
            
            // 如果是新开始的下载，添加日志
            if (!lastPolledModel.value || lastPolledModel.value !== modelId) {
              addLog('信息', `开始下载: ${progress.currentModel.name || modelId}`);
              lastPolledModel.value = modelId;
            }
          }
          
          // 处理完成状态
          if (progress.completed || progress.status === 'completed') {
            if (downloadPollingInterval.value) {
              clearInterval(downloadPollingInterval.value);
              downloadPollingInterval.value = null;
            }
            
            // 清除当前任务
            installing.value = '';
            isDownloading.value = false;
            
            // 添加完成日志
            addLog('成功', '下载任务完成');
            
            // 刷新模型列表
            await fetchModels();
            
            // 通知用户
            $q.notify({
              type: 'positive',
              message: '模型下载完成'
            });
          } else if (progress.error || progress.status === 'error') {
            // 处理错误状态
            if (downloadPollingInterval.value) {
              clearInterval(downloadPollingInterval.value);
              downloadPollingInterval.value = null;
            }
            
            // 清除当前任务
            installing.value = '';
            isDownloading.value = false;
            
            // 添加错误日志
            addLog('错误', `下载失败: ${progress.error || '未知错误'}`);
            
            // 通知用户
            $q.notify({
              type: 'negative',
              message: `下载失败: ${progress.error || '未知错误'}`
            });
          }
        } catch (error) {
          console.error('获取下载进度失败:', error);
        }
      }, 1000);
    };
    
    // 修改取消下载的处理
    const cancelDownload = async () => {
      try {
        if (downloadTaskId.value) {
          await api.post('models/cancel-download', { taskId: downloadTaskId.value });
          downloadTaskId.value = null;
        }
      } catch (error) {
        console.error('取消下载失败:', error);
      }
    };
    
    // 添加日志 - 修复类型错误
    const addLog = (status: string, message: string) => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      
      // 使用spread操作符创建新数组
      const newLog: DownloadLog = {
        status,
        message,
        time: timeStr
      };
      
      downloadLogs.value = [newLog, ...downloadLogs.value];
      
      // 保留最新的20条日志
      if (downloadLogs.value.length > 20) {
        downloadLogs.value = downloadLogs.value.slice(0, 20);
      }
    };
    
    // 格式化百分比
    const formatPercentage = (percentage: number) => {
      return percentage.toFixed(0);
    };
    
    // 获取日志徽章颜色
    const getLogBadgeColor = (status: string): string => {
      switch (status) {
        case '完成': return 'positive';
        case '错误': return 'negative';
        case '取消': return 'warning';
        case '开始': return 'primary';
        default: return 'info';
      }
    };
    
    // 获取模型类型名称
    const getModelTypeName = (type: string): string => {
      const typeMap: Record<string, string> = {
        'checkpoint': '模型底座',
        'vae': 'VAE模型',
        'vae_approx': '预览解码器',
        'upscaler': '放大模型',
        'embedding': '提示词嵌入',
        'detector': '检测器',
        'segmentation': '分割模型',
        'facerestore': '人脸修复',
        'faceswap': '人脸替换',
        'config': '配置文件'
      };
      
      return typeMap[type] || type;
    };
    
    // 下载单个模型
    const downloadModel = async (modelId: string) => {
      console.log('下载模型:', modelId);
      // TODO: 实现下载逻辑
    };
    
    // 确认删除模型
    const confirmDelete = (model: Model) => {
      console.log('确认删除模型:', model);
      // TODO: 实现删除确认逻辑
    };
    
    // 删除模型
    const deleteModel = async () => {
      // 实现...
    };
    
    // 显示模型信息
    const showModelInfo = (model: Model) => {
      console.log('显示模型信息:', model);
      // TODO: 实现显示模型信息逻辑
    };
    
    // 刷新模型列表
    const refreshModels = async () => {
      // 实现...
    };
    
    // 添加格式化函数
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
    
    const formatSpeed = (bytesPerSecond: number): string => {
      if (!bytesPerSecond || isNaN(bytesPerSecond)) return '0 B/s';
      return `${formatFileSize(bytesPerSecond)}/s`;
    };
    
    // 添加预估剩余时间格式化函数
    const formatEstimatedTime = (seconds: number): string => {
      if (!seconds || !isFinite(seconds)) return '--:--';
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      
      if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    // 获取模型列表
    const fetchModels = async () => {
      try {
        isLoading.value = true;
        
        // 使用类型断言而不是 any
        const mode = typeof databaseMode.value === 'object' && databaseMode.value !== null
          ? (databaseMode.value as { value: string }).value
          : databaseMode.value;
          
        // 获取API模型并转换为本地模型格式
        const apiModels = await modelsApi.getModels(mode as ModelFetchMode);
        models.value = apiModels.map(apiModel => ({
          id: apiModel.name,
          name: apiModel.name,
          description: apiModel.description || '无描述',
          type: apiModel.type,
          size: '未知',
          installed: apiModel.installed || false,
          downloading: false,
          installedDate: apiModel.installed ? new Date().toISOString() : undefined
        }));
        
        filterModels();
        $q.notify({
          type: 'positive',
          message: `成功加载 ${models.value.length} 个模型`
        });
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
    
    // 过滤模型
    const filterModels = () => {
      if (!searchQuery.value) {
        filteredModels.value = [...models.value];
        return;
      }
      
      const query = searchQuery.value.toLowerCase();
      filteredModels.value = models.value.filter(model => {
        return model.name.toLowerCase().includes(query) || 
               (model.description && model.description.toLowerCase().includes(query));
      });
    };
    
    // 按类型获取过滤后的模型
    const getFilteredModelsByType = (type: string) => {
      return filteredModels.value.filter(model => model.type === type);
    };
    
    // 安装模型
    const installModel = async (modelName: string) => {
      try {
        isLoading.value = true;
        installing.value = modelName;
        
        const response = await api.installModel(modelName);
        
        if (response?.body?.taskId) {
          // 保存任务ID并开始轮询
          downloadTaskId.value = response.body.taskId;
          isDownloading.value = true;
          
          // 初始化该模型的进度对象，修复类型错误
          downloadProgress.value[modelName] = {
            downloadedBytes: 0,
            totalBytes: 1, // 避免除以零
            speed: 0,
            status: 'downloading',
            overallProgress: 0,
            currentModelProgress: 0,
            // 添加缺少的属性
            currentModel: null,
            currentModelIndex: 0,
            completed: false,
            error: null
          };
          
          // 启动进度轮询
          pollDownloadProgress();
          
          $q.notify({
            type: 'positive',
            message: `开始下载模型: ${modelName}`
          });
        } else {
          console.error('安装响应无效:', response);
          $q.notify({
            type: 'negative',
            message: '无法开始安装，服务器未返回有效任务ID'
          });
        }
      } catch (error) {
        console.error('安装请求失败:', error);
        $q.notify({
          type: 'negative',
          message: `安装请求失败: ${error instanceof Error ? error.message : String(error)}`
        });
      } finally {
        isLoading.value = false;
      }
    };
    
    // 获取类型标签
    const getTypeLabel = (type: string) => {
      const labels: Record<string, string> = {
        'checkpoint': 'SD模型',
        'lora': 'LoRA',
        'controlnet': 'ControlNet',
        'vae': 'VAE',
        'upscaler': '超分辨率'
      };
      return labels[type] || type;
    };
    
    // 获取类型颜色
    const getTypeColor = (type: string) => {
      const colors: Record<string, string> = {
        'checkpoint': 'primary',
        'lora': 'deep-purple',
        'controlnet': 'teal',
        'vae': 'amber',
        'upscaler': 'green',
        'embedding': 'blue-grey',
        'textualinversion': 'indigo'
      };
      return colors[type] || 'grey';
    };
    
    // 在组件加载时获取模型列表
    onMounted(() => {
      // 仅加载模型列表信息，不自动触发下载
      fetchModels();
      fetchEssentialModels();
    });
    
    // 在组件卸载时清理
    onUnmounted(() => {
      if (downloadPollingInterval.value) {
        const intervalId = downloadPollingInterval.value;
        clearInterval(intervalId);
      }
    });
    
    // 在 setup 中添加取消下载方法
    const cancelModelDownload = async (modelName: string) => {
      try {
        await api.post('models/cancel-download', { modelName });
        $q.notify({
          type: 'info',
          message: `已取消下载 ${modelName}`
        });
      } catch (error) {
        console.error('取消下载失败:', error);
        $q.notify({
          type: 'negative',
          message: '取消下载失败'
        });
      }
    };
    
    // 修改进度更新逻辑
    const updateProgress = (modelName: string, newProgress: Partial<DownloadProgress>) => {
      if (!downloadProgress.value[modelName]) {
        downloadProgress.value[modelName] = {
          currentModel: null,
          currentModelIndex: 0,
          overallProgress: 0,
          completed: false,
          downloadedBytes: 0,
          totalBytes: 0,
          speed: 0,
          status: 'downloading',
          error: null,
          currentModelProgress: 0
        };
      }
      
      downloadProgress.value[modelName] = {
        ...downloadProgress.value[modelName],
        ...newProgress
      };
    };
    
    // 添加或修改为正确的 downloadEssentialModels 定义
    const downloadEssentialModels = async () => {
      if (isDownloading.value) return;
      
      try {
        isLoading.value = true;
        essentialLoading.value = true;
        
        // 使用正确的下载源发起请求
        const source = downloadSource.value === 'HuggingFace中国镜像站' ? 'mirror' : 'hf';
        const response = await api.downloadEssentialModels(source);
        
        // 从响应中提取任务ID
        if (response?.body?.taskId) {
          downloadTaskId.value = response.body.taskId;
          
          // 输出调试信息
          console.log('开始下载基础模型，任务ID:', downloadTaskId.value);
          addLog('信息', `开始下载基础模型，任务ID: ${downloadTaskId.value}`);
          
          // 清除旧轮询
          if (downloadPollingInterval.value) {
            clearInterval(downloadPollingInterval.value);
          }
          
          // 开始轮询进度
          isDownloading.value = true;
          pollDownloadProgress();
          
          // 显示成功通知
          $q.notify({
            type: 'positive',
            message: '已开始下载基础模型'
          });
        } else {
          throw new Error('服务器未返回有效的任务ID');
        }
      } catch (error) {
        console.error('下载基础模型失败:', error);
        addLog('错误', `下载基础模型失败: ${error instanceof Error ? error.message : String(error)}`);
        
        // 显示错误通知
        $q.notify({
          type: 'negative',
          message: `下载基础模型失败: ${error instanceof Error ? error.message : String(error)}`
        });
      } finally {
        isLoading.value = false;
        essentialLoading.value = false;
        // 不在这里将isDownloading设为false，应在下载完成或失败时设置
      }
    };
    
    return {
      // 状态
      essentialLoading,
      essentialProgress,
      essentialInstalled,
      activeTab,
      sdModels,
      installedModels,
      installedModelsCount,
      totalStorageUsed,
      deleteConfirmDialog,
      modelInfoDialog,
      selectedModel,
      modelColumns,
      
      // 下载相关
      downloadSource,
      downloadSourceOptions,
      isDownloading,
      currentDownloadState,
      
      // 新增变量
      downloadTaskId,
      downloadProgress,
      downloadLogs,
      currentModel,
      
      // 新增方法
      formatPercentage,
      getLogBadgeColor,
      getModelTypeName,
      addLog,
      
      // 已有方法
      downloadEssentialModels,
      cancelDownload,
      downloadModel,
      confirmDelete,
      deleteModel,
      showModelInfo,
      refreshModels,
      
      // 新增方法
      formatFileSize,
      formatSpeed,
      formatEstimatedTime,
      
      // 新增变量
      models,
      filteredModels,
      isLoading,
      databaseMode,
      searchQuery,
      installing,
      fetchModels,
      filterModels,
      getFilteredModelsByType,
      installModel,
      getTypeLabel,
      getTypeColor,
      databaseModeOptions,
      downloadPollingInterval,
      cancelModelDownload,
      updateProgress,
      essentialModels
    };
  }
});
</script>

<style scoped>
.essential-models {
  border-left: 5px solid var(--q-primary);
}

.installed-models-table {
  height: 400px;
}

.download-progress-panel {
  margin-top: 20px;
  padding: 20px;
  border-radius: 8px;
  background-color: #f9f9f9;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.progress-details {
  margin-bottom: 20px;
}

.model-info {
  margin-top: 10px;
  display: flex;
  gap: 20px;
}

.progress-stats {
  margin-top: 15px;
  display: flex;
  gap: 20px;
}

.download-history {
  margin-top: 20px;
  max-height: 300px;
  overflow-y: auto;
  border-top: 1px solid #eee;
  padding-top: 10px;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  padding: 5px;
  border-bottom: 1px dashed #eee;
}

.log-time {
  color: #999;
  margin-left: auto;
  font-size: 12px;
}

.download-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 15px;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.stat-item .q-icon {
  color: var(--q-primary);
}

.model-card {
  transition: all 0.3s ease;
  height: 100%;
}

.model-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.model-card.installed {
  border-left: 4px solid #4CAF50;
}

.description {
  max-height: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 添加下载进度相关样式 */
.download-progress {
  width: 100%;
  padding: 8px;
}

.progress-info {
  margin-bottom: 8px;
}

.progress-info .text-caption {
  display: flex;
  justify-content: space-between;
  color: #666;
}

.q-linear-progress {
  border-radius: 4px;
}
</style> 