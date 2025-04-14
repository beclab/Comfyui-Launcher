<template>
  <q-card class="model-card" flat bordered>
    <q-card-section class="q-py-md">
      <div class="row items-center justify-between">
        <div class="col-md-6 col-sm-12">
          <div class="text-subtitle1 text-weight-medium q-mb-xs">
            {{ $t('installedModelsCard.installedModels') }}
          </div>
          <div class="row q-gutter-md items-center">
            <div class="row items-center">
              <q-icon name="circle" size="8px" color="primary" class="q-mr-xs" />
              <span class="text-caption text-grey-8">{{ $t('installedModelsCard.installedCount', { installedModelsCount } ) }}</span>
            </div>
            <div class="row items-center">
              <q-icon name="circle" size="8px" color="green" class="q-mr-xs" />
              <span class="text-caption text-grey-8">{{ $t('installedModelsCard.storageUsed', { totalStorageUsed }) }}</span>
            </div>
          </div>
        </div>

        <div class="col-md-6 col-sm-12 row items-center justify-end q-gutter-sm">
          <q-input
            v-model="searchQuery"
            :placeholder="$t('installedModelsCard.searchPlaceholder')"
            dense
            outlined
            class="search-input"
            bg-color="white"
          >
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>
          
          <q-btn color="grey-7" outline icon="search" :label="$t('installedModelsCard.scanModels')" 
                 @click="onScanModels" :loading="isScanning" />
          <q-btn color="grey-7" outline icon="refresh" :label="$t('installedModelsCard.refresh')" @click="onRefresh" />
        </div>
      </div>
    </q-card-section>
    
    <q-separator />
    
    <q-card-section class="q-pa-none">
      <q-table
        :rows="filteredModels"
        :columns="modelColumns"
        row-key="id"
        :pagination="{ rowsPerPage: 10 }"
        class="installed-models-table"
        flat
        borderless
      >
        <template v-slot:body-cell-name="props">
          <q-td :props="props" class="text-weight-medium">
            {{ props.row.name }}
          </q-td>
        </template>
        
        <template v-slot:body-cell-type="props">
          <q-td :props="props" class="text-center">
            <q-badge :color="getTypeColor(props.row.type)" outline>{{ props.row.type }}</q-badge>
          </q-td>
        </template>
        
        <template v-slot:body-cell-size="props">
          <q-td :props="props" class="text-center">
            {{ props.row.size || $t('installedModelsCard.unknown') }}
          </q-td>
        </template>
        
        <template v-slot:body-cell-mode="props">
          <q-td :props="props" class="text-center">
            {{ props.row.mode || $t('installedModelsCard.unknown') }}
          </q-td>
        </template>
        
        <template v-slot:body-cell-source="props">
          <q-td :props="props" class="text-center">
            {{ props.row.source || 'local' }}
          </q-td>
        </template>
        
        <template v-slot:body-cell-description="props">
          <q-td :props="props">
            {{ props.row.description || 'AnimateDiff Adapter LORA(SD1.5)' }}
          </q-td>
        </template>
        
        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-center">
            <q-btn size="sm" flat dense round icon="visibility" color="grey-7" @click="onInfoClick(props.row)">
              <q-tooltip>查看详情</q-tooltip>
            </q-btn>
            <q-btn size="sm" flat dense round icon="delete_outline" color="grey-7" @click="onDeleteClick(props.row)">
              <q-tooltip>删除模型</q-tooltip>
            </q-btn>
          </q-td>
        </template>
        
        <template v-slot:pagination="scope">
          <div class="row items-center justify-end q-py-sm q-px-md">
            <span class="q-mr-md text-caption text-grey-8">Records per page:</span>
            <q-select
              v-model="scope.pagination.rowsPerPage"
              :options="[10, 20, 50]"
              dense
              borderless
              emit-value
              map-options
              options-dense
              style="min-width: 60px"
              class="q-mr-md"
            />
            <span class="q-mr-md text-caption text-grey-8">
              {{ ((scope.pagination.page - 1) * scope.pagination.rowsPerPage) + 1 }} - 
              {{ Math.min(scope.pagination.page * scope.pagination.rowsPerPage, filteredModels.length) }} 
              of {{ filteredModels.length }}
            </span>
            <q-btn
              flat
              round
              dense
              icon="chevron_left"
              :disable="scope.isFirstPage"
              @click="scope.prevPage"
              color="grey-7"
            />
            <q-btn
              flat
              round
              dense
              icon="chevron_right"
              :disable="scope.isLastPage"
              @click="scope.nextPage"
              color="grey-7"
            />
          </div>
        </template>
      </q-table>
    </q-card-section>
    
    <q-dialog v-model="deleteConfirmDialog">
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <span class="q-ml-sm">{{ $t('installedModelsCard.confirmDelete') }}</span>
        </q-card-section>
        
        <q-card-section>
          {{ $t('installedModelsCard.deleteMessage', { 'selectedModel?.name': selectedModel?.name }) }}
        </q-card-section>
        
        <q-card-actions align="right">
          <q-btn flat label="取消" color="primary" v-close-popup />
          <q-btn flat label="删除" color="negative" @click="confirmDelete" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
    
    <q-dialog v-model="modelInfoDialog">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">{{ $t('installedModelsCard.modelInfo') }}</div>
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
  </q-card>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import api from '../../api';
import dataCenter from '../../api/DataCenter';

interface ApiResponse {
  data?: unknown;
  body?: unknown;
}

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

interface Model {
  id: string;
  name: string;
  description: string;
  type: string;
  size: string;
  path?: string;
  installed: boolean;
  installedDate?: string;
  essential?: boolean;
  fileStatus?: 'complete' | 'incomplete' | 'corrupted';
  fileSize?: number;
  save_path?: string;
  mode?: string;
  source?: string;
}

interface TableColumn {
  name: string;
  label: string;
  field: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
}

export default defineComponent({
  name: 'InstalledModelsCard',
  setup() {
    const $q = useQuasar();
    
    const installedModels = ref<Model[]>([]);
    const installedModelsCount = ref(0);
    const totalStorageUsed = ref('0 B');
    const isLoading = ref(false);
    const isScanning = ref(false);
    const deleteConfirmDialog = ref(false);
    const modelInfoDialog = ref(false);
    const selectedModel = ref<Model | null>(null);
    const searchQuery = ref('');
    const sortBy = ref('installedDate');
    const sortDesc = ref(true);
    
    const filteredModels = computed(() => {
      if (!searchQuery.value.trim()) {
        return installedModels.value;
      }
      
      const query = searchQuery.value.toLowerCase().trim();
      return installedModels.value.filter(model => 
        model.name.toLowerCase().includes(query) || 
        model.description?.toLowerCase().includes(query) ||
        model.type.toLowerCase().includes(query)
      );
    });
    
    const modelColumns = ref<TableColumn[]>([
      { name: 'name', label: '名称', field: 'name', sortable: true, align: 'left' },
      { name: 'type', label: '类型', field: 'type', sortable: true, align: 'center' },
      { name: 'size', label: '大小', field: 'size', sortable: true, align: 'center' },
      { name: 'mode', label: '底层', field: 'mode', align: 'center' },
      { name: 'source', label: '来源', field: 'source', align: 'center' },
      { name: 'description', label: '描述', field: 'description', align: 'left' },
      { name: 'actions', label: '操作', field: 'actions', align: 'center' }
    ]);
    
    const fetchInstalledModels = async () => {
      try {
        isLoading.value = true;
        const data = await dataCenter.getInstalledModels(false);
        if (data && Array.isArray(data)) {
          installedModels.value = data;
          installedModelsCount.value = installedModels.value.length;
          updateTotalStorageUsed();
        } else {
          console.error('获取已安装模型列表失败: 响应格式不正确', data);
          $q.notify({
            type: 'negative',
            message: '获取已安装模型列表失败'
          });
        }
      } catch (error) {
        console.error('获取已安装模型列表失败:', error);
        $q.notify({
          type: 'negative',
          message: '获取已安装模型列表失败'
        });
      } finally {
        isLoading.value = false;
      }
    };
    
    const updateTotalStorageUsed = () => {
      const totalBytes = installedModels.value.reduce((sum, model) => {
        const sizeMatch = model.size?.match(/(\d+(\.\d+)?)\s*(KB|MB|GB)/i);
        if (sizeMatch) {
          const size = parseFloat(sizeMatch[1]);
          const unit = sizeMatch[3].toUpperCase();
          let bytes = size;
          if (unit === 'KB') bytes *= 1024;
          if (unit === 'MB') bytes *= 1024 * 1024;
          if (unit === 'GB') bytes *= 1024 * 1024 * 1024;
          return sum + bytes;
        }
        return sum;
      }, 0);
      
      totalStorageUsed.value = formatFileSize(totalBytes);
    };
    
    const onRefresh = () => {
      fetchInstalledModels();
      
      $q.notify({
        type: 'info',
        message: '正在刷新已安装模型列表...'
      });
    };
    
    const onDeleteClick = (model: Model) => {
      selectedModel.value = model;
      
      $q.dialog({
        title: '确认删除',
        message: `您确定要删除模型 "${model.name}" 吗？此操作不可撤销。`,
        cancel: true,
        persistent: true,
        color: 'negative'
      }).onOk(async () => {
        try {
          const response = await api.post(`models/delete/${model.id}`);
          const data = await extractResponseData<{success?: boolean}>(response);
          
          if (data?.success) {
            installedModels.value = installedModels.value.filter(m => m.id !== model.id);
            installedModelsCount.value = installedModels.value.length;
            
            updateTotalStorageUsed();
            
            $q.notify({
              type: 'positive',
              message: `已删除模型: ${model.name}`
            });
          } else {
            throw new Error('删除失败');
          }
        } catch (error) {
          console.error('删除模型失败:', error);
          $q.notify({
            type: 'negative',
            message: '删除模型失败'
          });
        }
      });
    };
    
    const onInfoClick = (model: Model) => {
      selectedModel.value = model;
      modelInfoDialog.value = true;
    };
    
    const closeModelInfo = () => {
      modelInfoDialog.value = false;
      selectedModel.value = null;
    };
    
    const formatFileSize = (bytes: number): string => {
      if (!bytes || isNaN(bytes)) return '0 B';
      
      bytes = Math.max(0, bytes);
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let value = bytes;
      let unitIndex = 0;
      
      while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
      }
      
      return `${value.toFixed(2)} ${units[unitIndex]}`;
    };
    
    const formatDate = (dateStr?: string): string => {
      if (!dateStr) return '未知';
      
      try {
        const date = new Date(dateStr);
        return date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        return dateStr;
      }
    };
    
    const getModelTypeLabel = (type: string): string => {
      const typeLabels: Record<string, string> = {
        checkpoint: 'SD模型',
        vae: 'VAE',
        vae_approx: '预览解码器',
        lora: 'LoRA',
        controlnet: 'ControlNet',
        upscaler: '超分模型',
        embedding: '词嵌入',
        ipadapter: 'IP-Adapter',
        motion: '动画模型',
        facerestore: '人脸修复',
        other: '其他'
      };
      
      return typeLabels[type] || type;
    };
    
    const getModelTypeColor = (type: string): string => {
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
        other: 'grey'
      };
      
      return typeColors[type] || 'grey';
    };
    
    const onScanModels = async () => {
      try {
        isScanning.value = true;
        $q.notify({
          type: 'info',
          message: '正在扫描模型目录，这可能需要一些时间...'
        });
        
        const response = await api.post('models/scan');
        const data = await extractResponseData<{
          success: boolean,
          count: number,
          models: Model[]
        }>(response);
        
        if (data?.success) {
          installedModels.value = data.models.filter(model => model.installed);
          installedModelsCount.value = data.count || installedModels.value.length;
          
          updateTotalStorageUsed();
          
          $q.notify({
            type: 'positive',
            message: `扫描完成，找到 ${installedModelsCount.value} 个已安装模型`
          });
        } else {
          throw new Error('扫描模型失败');
        }
      } catch (error) {
        console.error('扫描模型失败:', error);
        $q.notify({
          type: 'negative',
          message: '扫描模型失败，请检查日志'
        });
      } finally {
        isScanning.value = false;
      }
    };
    
    onMounted(() => {
      fetchInstalledModels();
    });
    
    const confirmDelete = () => {
      console.log('确认删除');
    };
    
    const getStatusColor = (status?: string): string => {
      switch (status) {
        case 'complete': return 'positive';
        case 'incomplete': return 'warning';
        case 'corrupted': return 'negative';
        case 'unknown': return 'blue-grey';
        default: return 'grey';
      }
    };
    
    const getStatusLabel = (status?: string): string => {
      switch (status) {
        case 'complete': return '完整';
        case 'incomplete': return '不完整';
        case 'corrupted': return '已损坏';
        case 'unknown': return '未知模型,无法确认完整性';
        default: return '未知';
      }
    };
    
    const getSizeComparisonClass = (model: Model): string => {
      if (!model.size || !model.fileSize) return '';
      
      const expectedSize = parseSizeString(model.size);
      if (!expectedSize) return '';
      
      const diff = Math.abs(model.fileSize - expectedSize) / expectedSize;
      
      if (diff > 0.1) {
        return model.fileSize < expectedSize ? 'text-warning' : 'text-positive';
      }
      return 'text-grey-8';
    };
    
    const parseSizeString = (sizeStr: string): number | null => {
      try {
        if (!sizeStr) return null;
        
        const match = sizeStr.match(/^([\d.]+)\s*([KMGT]B?)?$/i);
        if (!match) return null;
        
        const value = parseFloat(match[1]);
        const unit = match[2]?.toUpperCase() || '';
        
        if (isNaN(value)) return null;
        
        switch (unit) {
          case 'KB':
          case 'K':
            return value * 1024;
          case 'MB':
          case 'M':
            return value * 1024 * 1024;
          case 'GB':
          case 'G':
            return value * 1024 * 1024 * 1024;
          case 'TB':
          case 'T':
            return value * 1024 * 1024 * 1024 * 1024;
          default:
            return value;
        }
      } catch (error) {
        return null;
      }
    };
    
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
    
    return {
      installedModels,
      installedModelsCount,
      totalStorageUsed,
      isLoading,
      isScanning,
      deleteConfirmDialog,
      modelInfoDialog,
      selectedModel,
      modelColumns,
      searchQuery,
      filteredModels,
      sortBy,
      sortDesc,
      onRefresh,
      onDeleteClick,
      onInfoClick,
      closeModelInfo,
      formatFileSize,
      formatDate,
      onScanModels,
      getModelTypeLabel,
      getModelTypeColor,
      confirmDelete,
      getStatusColor,
      getStatusLabel,
      getSizeComparisonClass,
      parseSizeString,
      getTypeColor
    };
  }
});
</script>

<style scoped>
.model-card {
  border-radius: 16px;
  overflow: hidden;
}

.search-input {
  min-width: 200px;
  max-width: 250px;
}

:deep(.q-field--outlined .q-field__control) {
  border-radius: 12px;
}

:deep(.q-btn) {
  border-radius: 12px;
}

:deep(.q-btn.q-btn--round) {
  border-radius: 50%;
}

:deep(.q-badge) {
  border-radius: 12px;
}

:deep(.q-table thead tr) {
  background-color: transparent;
}

:deep(.q-table th) {
  font-weight: 500;
  color: #616161;
  padding: 8px 16px;
  border-bottom: 1px solid #e0e0e0;
}

:deep(.q-table td) {
  padding: 10px 16px;
  font-size: 14px;
  border-bottom: 1px solid #e0e0e0;
}

:deep(.q-table tbody tr:hover) {
  background-color: #f0f8ff;
}

:deep(.q-table--bordered) {
  border: none;
}

:deep(.q-table__bottom) {
  border-top: 1px solid #e0e0e0;
  padding: 4px 0;
}

:deep(.q-badge--outline) {
  border: 1px solid currentColor;
  background-color: transparent;
  padding: 3px 8px;
  border-radius: 12px;
}

:deep(.q-field--borderless .q-field__control) {
  border-radius: 12px;
}

:deep(.q-pagination .q-btn) {
  border-radius: 50%;
}

@media (max-width: 600px) {
  :deep(.q-table__container) {
    overflow-x: auto;
  }
  
  .search-input {
    min-width: 100%;
    margin-bottom: 8px;
  }
}
</style>
