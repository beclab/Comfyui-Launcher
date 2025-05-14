<template>
  <q-dialog
    v-model="isOpen"
    persistent
    transition-show="scale"
    transition-hide="scale"
    class="resource-pack-dialog-container"
  >
    <q-card class="resource-pack-dialog" style="width: 90vw; max-width: 1200px; max-height: 90vh; display: flex; flex-direction: column;">
      <q-card-section class="bg-white text-dark q-pb-xs">
        <div class="row items-center justify-between">
          <div class="text-h6">{{ $t('resourcePack.packageDetails') }}</div>
          <q-btn flat round icon="close" color="dark" @click="closeDialog" />
        </div>
      </q-card-section>
      
      <q-separator />


      <!-- 加载状态 -->
      <div v-if="loading" class="text-center q-pa-lg">
        <q-spinner color="primary" size="3em" />
        <div class="q-mt-md">{{ $t('resourcePack.loadingPackDetails') }}</div>
      </div>
      
      <!-- 错误状态 -->
      <div v-else-if="error" class="text-center q-pa-lg">
        <q-icon name="error" color="negative" size="3em" />
        <div class="text-h6 q-mt-md">{{ $t('resourcePack.loadError') }}</div>
        <div class="q-mt-sm">{{ error }}</div>
        <q-btn 
          color="primary" 
          :label="$t('resourcePack.retry')" 
          @click="loadResourcePack" 
          class="q-mt-md" 
        />
      </div>
      
      <!-- 资源包信息 -->
      <div v-else-if="pack" class="flex-grow" style="display: flex; flex-direction: column;">
        <!-- 基本信息区域 -->
        <q-card-section class="q-pb-none">
          <div class="row items-center q-mb-md">
            <div class="col-auto q-mr-md">
              <q-icon name="model_training" size="3rem" color="primary" />
            </div>
            <div class="col">
              <div class="text-subtitle1 text-weight-bold row items-center">
              {{ pack.name }}
              <div class="text-caption text-grey-7 q-ml-sm">{{ $t('resourcePack.currentVersion', { version: pack.version }) }}</div>
              </div>
              <div class="text-caption">{{ pack.description }}</div>
              
            </div>
            <div class="col-auto">
              <q-btn 
                color="primary" 
                :label="$t('resourcePack.getAllResources')" 
                @click="installResourcePack"
                :disable="installing"
              />
            </div>
          </div>
          
          <!-- 安装进度面板 -->
          <div v-if="installing && installProgress" class="install-progress-panel q-mb-md">
            <div class="text-h6">{{ $t('resourcePack.installationProgress') }}</div>
            
            <!-- 上方：详细信息 -->
            <div class="q-mt-md">
              <div class="row q-col-gutter-md">
                <div class="col-md-3 col-sm-6 col-xs-6">
                  <div class="text-caption">{{ $t('resourcePack.startTime') }}</div>
                  <div>{{ formatDate(installProgress.startTime) }}</div>
                </div>
                
                <div class="col-md-3 col-sm-6 col-xs-6" v-if="installProgress.endTime">
                  <div class="text-caption">{{ $t('resourcePack.endTime') }}</div>
                  <div>{{ formatDate(installProgress.endTime) }}</div>
                </div>
                
                <div class="col-md-3 col-sm-6 col-xs-6">
                  <div class="text-caption">{{ $t('resourcePack.elapsed') }}</div>
                  <div>{{ formatDuration(installProgress.startTime, installProgress.endTime) }}</div>
                </div>
                
                <div class="col-md-3 col-sm-6 col-xs-6">
                  <div class="text-caption">{{ $t('resourcePack.completedResources') }}</div>
                  <div>{{ getCompletedResourcesCount(installProgress) }} / {{ pack.resources.length }}</div>
                </div>
              </div>
            </div>
            
            <!-- 下方：总体进度 -->
            <div class="q-mt-md">
              <div class="text-subtitle2">{{ $t('resourcePack.overallProgress') }}</div>
              <div class="progress-info">
                <q-linear-progress
                  :value="installProgress.progress / 100"
                  color="primary"
                  class="q-mb-xs"
                  size="15px"
                />
                <div class="text-caption row justify-between">
                  <span>{{ formatProgressText(installProgress.progress) }}</span>
                  <span>{{ getCompletedResourcesCount(installProgress) }} / {{ pack.resources.length }}</span>
                </div>
              </div>
            </div>
          </div>
        </q-card-section>
        
        <!-- 使用新样式的分隔线 -->
        <q-separator class="full-width-separator" />
        
        <!-- 资源列表区域 - 紧贴底部 -->
        <q-card-section class="q-pt-none flex-grow resource-list-section full-width-separator">
          
          <div class="resource-list-container">
            <q-table
              :rows="pack.resources"
              :columns="resourceColumns"
              row-key="id"
              :pagination="{ rowsPerPage: 10 }"
              class="resource-table no-border"
              style="height: 40vh;"
              :virtual-scroll="false"
            >
              <!-- 类型列自定义渲染 -->
              <template v-slot:body-cell-type="props">
                <q-td :props="props">
                  <q-chip dense outline :color="getTypeColor(props.value)">
                    {{ props.value }}
                  </q-chip>
                </q-td>
              </template>
              
              <!-- 大小列自定义渲染 -->
              <template v-slot:body-cell-size="props">
                <q-td :props="props">
                  {{ formatFileSize(props.value) }}
                </q-td>
              </template>
              
              <!-- 状态列自定义渲染 -->
              <template v-slot:body-cell-status="props">
                <q-td :props="props" class="status-cell">
                  <div v-if="installing && installProgress" class="status-container">
                    <div class="row items-center no-wrap status-row">
                      <q-icon
                        :name="getResourceStatusIcon(props.row.id, installProgress)"
                        :color="getResourceStatusColor(props.row.id, installProgress)"
                        size="1.2em"
                        class="q-mr-xs"
                      />
                      <span>{{ getResourceStatusLabel(props.row.id, installProgress) }}</span>
                    </div>
                    
                    <!-- 如果正在下载，显示进度条 -->
                    <div v-if="getResourceStatus(props.row.id, installProgress) === 'downloading'" class="progress-container q-mt-xs">
                      <div class="progress-info">
                        <q-linear-progress
                          :value="getResourceProgress(props.row.id, installProgress) / 100"
                          :color="getProgressColor(getResourceProgress(props.row.id, installProgress))"
                          class="q-mb-xs"
                        />
                        <div class="text-caption text-center">
                          {{ formatProgressText(getResourceProgress(props.row.id, installProgress)) }}
                        </div>
                      </div>
                    </div>
                    
                    <!-- 显示错误信息 -->
                    <div v-if="getResourceStatus(props.row.id, installProgress) === 'error'" class="error-container text-negative q-mt-xs">
                      <q-icon name="error_outline" size="1em" class="q-mr-xs" />
                      <span class="error-message">{{ getResourceError(props.row.id, installProgress) || $t('resourcePack.unknownError') }}</span>
                    </div>
                  </div>
                  <div v-else class="status-placeholder">-</div>
                </q-td>
              </template>
            </q-table>
          </div>
        </q-card-section>
      </div>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import api from '../../api';

// 定义资源包类型
interface Resource {
  id: string;
  name: string;
  type: string;
  size: number;
  description?: string;
  url?: string;
}

interface ResourcePack {
  id: string;
  name: string;
  description?: string;
  version?: string;
  author?: string;
  website?: string;
  resources: Resource[];
}

// 定义资源状态
interface ResourceStatus {
  resourceId: string;
  status: string;
  progress: number;
  error?: string;
}

// 定义安装进度
interface InstallProgress {
  taskId: string;
  packId: string;
  status: string;
  progress: number;
  startTime: number;
  endTime?: number;
  error?: string;
  resourceStatuses: ResourceStatus[];
}

// 定义下载源选项类型
interface DownloadSourceOption {
  label: string;
  value: string;
}

// 定义列配置
interface ColumnDefinition {
  name: string;
  align: 'left' | 'right' | 'center';
  label: string;
  field: string;
  sortable: boolean;
  format?: (val: number | string) => string;
}

export default defineComponent({
  name: 'ResourcePackDialog',
  
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    packId: {
      type: String,
      default: ''
    }
  },
  
  emits: ['update:visible', 'installation-complete'],
  
  setup(props, { emit }) {
    const $q = useQuasar();
    const { t } = useI18n();
    
    // 控制对话框显示状态
    const isOpen = ref(false);
    
    // 资源包数据
    const pack = ref<ResourcePack | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);
    
    // 安装相关状态
    const installing = ref(false);
    const installProgress = ref<InstallProgress | null>(null);
    const pollingInterval = ref<number | null>(null);
    
    // 下载源选择
    const downloadSource = ref('default');
    const downloadSourceOptions = ref<DownloadSourceOption[]>([
      { label: '默认源', value: 'default' },
      { label: '国内源', value: 'china' }
    ]);
    
    // 资源表格列定义
    const resourceColumns = ref<ColumnDefinition[]>([
      {
        name: 'name',
        align: 'left',
        label: '名称',
        field: 'name',
        sortable: true
      },
      {
        name: 'type',
        align: 'center',
        label: '类型',
        field: 'type',
        sortable: true
      },
      {
        name: 'size',
        align: 'right',
        label: '大小',
        field: 'size',
        sortable: true
      },

      {
        name: 'description',
        align: 'left',
        label: '描述',
        field: 'description',
        sortable: false
      },
      {
        name: 'status',
        align: 'center',
        label: '状态',
        field: 'id',
        sortable: false
      }
    ]);
    
    // 监视prop变化
    watch(() => props.visible, (newVal: boolean) => {
      isOpen.value = newVal;
      if (newVal && props.packId) {
        loadResourcePack();
      }
    });
    
    // 监视dialog状态变化
    watch(isOpen, (newVal: boolean) => {
      emit('update:visible', newVal);
      if (!newVal) {
        // 停止轮询
        stopPolling();
        // 添加重置状态调用
        resetState();
      }
    });
    
    // 加载资源包详情
    const loadResourcePack = async () => {
      loading.value = true;
      error.value = null;
      
      try {
        if (!props.packId) {
          throw new Error('Resource pack ID is required');
        }
        
        // Use resourcePacks API from index.ts
        const response = await api.resourcePacks.getById(props.packId);
        pack.value = response.data;
        
        // Log for debugging
        console.log('Loaded resource pack:', pack.value);
        
        // 检查是否有正在进行的安装任务
        await checkInstallationStatus();
      } catch (err: Error | unknown) {
        console.error('Failed to load resource pack:', err);
        const errorObj = err as { response?: { data?: { message?: string } } };
        error.value = errorObj.response?.data?.message || '加载资源包信息失败';
      } finally {
        loading.value = false;
      }
    };
    
    // 检查安装任务状态
    const checkInstallationStatus = async () => {
      try {
        if (!props.packId) return;
        
        // 使用包ID作为任务ID查询安装状态
        const response = await api.resourcePacks.getInstallProgress(props.packId);
        
        // 如果能获取到初步状态数据
        if (response.data) {
          console.log('Found potential installation task, checking status...');
          
          // 检测到可能的安装任务，进行二次确认
          try {
            // 延迟一小段时间再次获取进度
            await new Promise(resolve => setTimeout(resolve, 1000));
            const confirmResponse = await api.resourcePacks.getInstallProgress(props.packId);
            
            // 只有确认获取到进度数据后，才设置为安装状态
            if (confirmResponse.data) {
              installProgress.value = confirmResponse.data;
              installing.value = true;
              
              // 如果任务还在进行中，启动持续轮询
              if (installProgress.value && !['completed', 'error', 'canceled'].includes(installProgress.value.status)) {
                startPolling(props.packId);
              }
              
              console.log('Confirmed active installation task:', installProgress.value);
            }
          } catch (confirmErr) {
            console.log('Could not confirm installation task is active');
          }
        }
      } catch (err) {
        // 找不到任务状态或其他错误，忽略即可
        console.log('No active installation task found');
      }
    };
    
    // 安装资源包
    const installResourcePack = async () => {
      try {
        if (!pack.value) return;
        
        installing.value = true;
        
        // Use resourcePacks.install API - 使用包ID作为任务ID
        const response = await api.resourcePacks.install(props.packId, {
          downloadSource: downloadSource.value,
        });
        
        // 获取任务ID，如果API不返回，则使用包ID
        const taskId = response.data.taskId || props.packId;
        if (taskId) {
          startPolling(taskId);
        } else {
          throw new Error('安装任务ID未返回');
        }
        
        $q.notify({
          color: 'positive',
          message: `开始安装资源包 ${pack.value.name}`,
          icon: 'download'
        });
      } catch (err: Error | unknown) {
        installing.value = false;
        console.error('Failed to install resource pack:', err);
        const errorObj = err as { response?: { data?: { error?: string } } };
        $q.notify({
          color: 'negative',
          message: errorObj.response?.data?.error || '安装资源包失败',
          icon: 'error'
        });
      }
    };
    
    // 取消安装
    const cancelInstallation = async () => {
      try {
        if (!installProgress.value) return;
        
        // Use resourcePacks.cancelInstallation API
        await api.resourcePacks.cancelInstallation(installProgress.value.taskId);
        
        $q.notify({
          color: 'warning',
          message: '取消安装操作已发送',
          icon: 'cancel'
        });
      } catch (err: Error | unknown) {
        console.error('Failed to cancel installation:', err);
        const errorObj = err as { response?: { data?: { error?: string } } };
        $q.notify({
          color: 'negative',
          message: errorObj.response?.data?.error || '取消安装失败',
          icon: 'error'
        });
      }
    };
    
    // 开始轮询安装进度
    const startPolling = (taskId: string) => {
      // 立即获取一次状态
      fetchInstallProgress(taskId);
      
      // 设置轮询间隔
      pollingInterval.value = window.setInterval(() => {
        fetchInstallProgress(taskId);
      }, 2000); // 每2秒更新一次
    };
    
    // 获取安装进度
    const fetchInstallProgress = async (taskId: string) => {
      try {
        // Use resourcePacks.getInstallProgress API
        const response = await api.resourcePacks.getInstallProgress(taskId);
        installProgress.value = response.data;
        
        // 如果有进度数据
        if (installProgress.value) {
          
          // 如果安装完成或失败或取消，停止轮询
          if (['completed', 'error', 'canceled'].includes(installProgress.value.status)) {
            stopPolling();
            
            // 发送安装完成事件
            emit('installation-complete', {
              success: installProgress.value.status === 'completed',
              error: installProgress.value.error,
              packId: props.packId
            });
            
            // 显示通知
            if (installProgress.value.status === 'completed') {
              $q.notify({
                color: 'positive',
                message: `资源包 ${pack.value?.name} 安装完成`,
                icon: 'check_circle'
              });
            } else if (installProgress.value.status === 'error') {
              $q.notify({
                color: 'negative',
                message: `资源包 ${pack.value?.name} 安装失败: ${installProgress.value.error}`,
                icon: 'error'
              });
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch installation progress:', error);
      }
    };
    
    // 停止轮询
    const stopPolling = () => {
      if (pollingInterval.value) {
        window.clearInterval(pollingInterval.value);
        pollingInterval.value = null;
      }
    };
    
    // 关闭对话框
    const closeDialog = () => {
      if (installing.value && installProgress.value?.status !== 'completed' && installProgress.value?.status !== 'error') {
        // $q.dialog({
        //   title: '取消安装',
        //   message: '资源包正在安装中，确定要关闭对话框吗？安装将在后台继续进行。',
        //   cancel: true,
        //   persistent: true
        // }).onOk(() => {
          isOpen.value = false;
        // });
      } else {
        isOpen.value = false;
      }
    };
    
    // 添加新方法 - 重置组件状态
    const resetState = () => {
      // 只有在安装未完成时，保留安装状态和进度
      // if (!installing.value || (installProgress.value && ['completed', 'error', 'canceled'].includes(installProgress.value.status))) {
        pack.value = null;
        loading.value = false;
        error.value = null;
        installing.value = false;
        installProgress.value = null;
        stopPolling();
      // }
    };
    
    // 获取资源类型对应的颜色
    const getTypeColor = (type: string) => {
      switch (type.toLowerCase()) {
        case 'model': return 'primary';
        case 'plugin': return 'secondary';
        case 'workflow': return 'accent';
        default: return 'grey';
      }
    };
    
    // 获取资源状态
    const getResourceStatus = (resourceId: string, progress: InstallProgress): string => {
      const resourceStatus = progress.resourceStatuses.find(rs => rs.resourceId === resourceId);
      return resourceStatus ? resourceStatus.status : 'pending';
    };
    
    // 获取资源进度
    const getResourceProgress = (resourceId: string, progress: InstallProgress): number => {
      const resourceStatus = progress.resourceStatuses.find(rs => rs.resourceId === resourceId);
      return resourceStatus ? resourceStatus.progress : 0;
    };
    
    // 获取资源状态图标
    const getResourceStatusIcon = (resourceId: string, progress: InstallProgress): string => {
      const status = getResourceStatus(resourceId, progress);
      switch (status) {
        case 'pending': return 'hourglass_empty';
        case 'downloading': return 'download';
        case 'installing': return 'settings';
        case 'completed': return 'check_circle';
        case 'error': return 'error';
        case 'skipped': return 'skip_next';
        case 'canceled': return 'cancel';
        default: return 'help';
      }
    };
    
    // 获取资源状态颜色
    const getResourceStatusColor = (resourceId: string, progress: InstallProgress): string => {
      const status = getResourceStatus(resourceId, progress);
      switch (status) {
        case 'pending': return 'grey';
        case 'downloading': return 'info';
        case 'installing': return 'warning';
        case 'completed': return 'positive';
        case 'error': return 'negative';
        case 'skipped': return 'orange';
        case 'canceled': return 'grey';
        default: return 'grey';
      }
    };
    
    // 获取资源状态标签
    const getResourceStatusLabel = (resourceId: string, progress: InstallProgress): string => {
      const status = getResourceStatus(resourceId, progress);
      return t(`resourcePack.status.${status}`);
    };
    
    // 格式化进度文本
    const formatProgressText = (progress: number): string => {
      return `${Math.floor(progress)}%`;
    };
    
    // 获取进度条颜色
    const getProgressColor = (progress: number): string => {
      if (progress < 30) return 'red';
      if (progress < 70) return 'orange';
      return 'green';
    };
    
    // 格式化文件大小
    const formatFileSize = (bytes: number | string): string => {
      const numBytes = typeof bytes === 'string' ? parseInt(bytes) : bytes;
      if (numBytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(numBytes) / Math.log(k));
      return parseFloat((numBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    
    // 格式化日期
    const formatDate = (timestamp?: number): string => {
      if (!timestamp) return '-';
      return new Date(timestamp).toLocaleString();
    };
    
    // 计算时长
    const formatDuration = (startTime: number, endTime?: number): string => {
      const end = endTime || Date.now();
      const diffSeconds = Math.floor((end - startTime) / 1000);
      
      const hours = Math.floor(diffSeconds / 3600);
      const minutes = Math.floor((diffSeconds % 3600) / 60);
      const seconds = diffSeconds % 60;
      
      let result = '';
      if (hours > 0) result += `${hours}小时 `;
      if (minutes > 0 || hours > 0) result += `${minutes}分钟 `;
      result += `${seconds}秒`;
      
      return result;
    };
    
    // 获取已完成资源数量
    const getCompletedResourcesCount = (progress: InstallProgress): number => {
      return progress.resourceStatuses.filter(rs => 
        rs.status === 'completed' || rs.status === 'error' || rs.status === 'skipped'
      ).length;
    };
    
    // 获取资源错误信息
    const getResourceError = (resourceId: string, progress: InstallProgress): string | undefined => {
      const resourceStatus = progress.resourceStatuses.find(rs => rs.resourceId === resourceId);
      return resourceStatus?.error;
    };
    
    // 在组件创建时，使用国际化文本设置列标题
    const setColumnLabels = () => {
      resourceColumns.value.forEach(column => {
        switch(column.name) {
          case 'name':
            column.label = t('resourcePack.columns.name');
            break;
          case 'type':
            column.label = t('resourcePack.columns.type');
            break;
          case 'size':
            column.label = t('resourcePack.columns.size');
            break;
          case 'description':
            column.label = t('resourcePack.columns.description');
            break;
          case 'status':
            column.label = t('resourcePack.columns.status');
            break;
        }
      });
    };
    
    // 组件挂载时
    onMounted(() => {
      setColumnLabels(); // Set i18n labels for columns
      if (props.visible && props.packId) {
        loadResourcePack();
      }
    });
    
    // 组件卸载时停止轮询
    onUnmounted(() => {
      stopPolling();
    });
    
    return {
      isOpen,
      pack,
      loading,
      error,
      installing,
      installProgress,
      downloadSource,
      downloadSourceOptions,
      resourceColumns,
      
      loadResourcePack,
      installResourcePack,
      cancelInstallation,
      closeDialog,
      resetState,
      
      formatFileSize,
      formatDate,
      formatDuration,
      formatProgressText,
      getProgressColor,
      getResourceStatusIcon,
      getResourceStatusColor,
      getResourceStatusLabel,
      getCompletedResourcesCount,
      getResourceStatus,
      getResourceProgress,
      getResourceError,
      getTypeColor,
      setColumnLabels
    };
  }
});
</script>

<style scoped>
.resource-pack-dialog {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  max-height: 90vh;
}

.resource-pack-dialog-container {
  overflow: hidden;
}

.install-progress-panel {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 16px;
}

.resource-list-section {
  display: flex;
  flex-direction: column;
}

.resource-list-container {
  background-color: white;
  height: 40vh;
  border: none;
  box-shadow: none;
}

.resource-table {
  height: 100%;
  box-shadow: none;
}

.no-border .q-table__top,
.no-border .q-table__bottom,
.no-border thead tr:first-child th,
.no-border .q-table__container {
  border: 0 !important;
  box-shadow: none !important;
}

/* 移除表格行的边框和悬浮效果 */
.resource-table tbody tr {
  border: none !important;
}

.resource-table tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.03);
}

/* 设置表格顶部背景色 */
.q-table thead tr {
  background-color: #f8f8f8;
  border: none;
}

/* 关闭子像素渲染，使文本更清晰 */
.q-table {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  transform: none !important;
}

.q-table__container {
  height: 100%;
}

/* 确保表格内容清晰显示 */
.q-table thead tr, .q-table tbody td {
  height: auto;
  padding: 8px 16px;
}

.q-linear-progress {
  border-radius: 4px;
}

.flex-grow {
  flex-grow: 1;
}

.status-cell {
  vertical-align: middle;
}

.status-container {
  display: flex;
  flex-direction: column;
}

.status-row {
  display: flex;
  align-items: center;
}

.progress-container {
  width: 100%;
}

.error-container {
  display: flex;
  align-items: center;
}

.error-message {
  word-break: break-word;
  line-height: 1.2;
}

.status-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 24px;
}

/* 修改分隔线位置和样式 */
.full-width-separator {
  margin-left: -16px;
  margin-right: -16px;
  width: calc(100% + 32px);
}
</style> 