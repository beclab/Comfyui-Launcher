<template>
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
          <q-btn color="primary" icon="search" label="扫描模型" class="q-mr-sm" 
                 @click="onScanModels" :loading="isScanning" />
          <q-btn color="secondary" icon="refresh" label="刷新列表" @click="onRefresh" />
        </div>
      </div>
      
      <q-table
        :rows="filteredModels"
        :columns="modelColumns"
        row-key="id"
        :pagination="{ rowsPerPage: 10 }"
        class="installed-models-table"
      >
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-badge 
              :color="getStatusColor(props.row.fileStatus)" 
              :label="getStatusLabel(props.row.fileStatus)" 
              class="q-mr-xs" 
            />
            <q-tooltip>
              <div v-if="props.row.fileSize">
                实际大小: {{ formatFileSize(props.row.fileSize) }}
              </div>
              <div v-if="props.row.size">
                预期大小: {{ props.row.size }}
              </div>
              <div v-if="props.row.save_path">
                路径: {{ props.row.save_path }}
              </div>
            </q-tooltip>
          </q-td>
        </template>
        <template v-slot:body-cell-size="props">
          <q-td :props="props">
            <div>
              {{ props.row.size || '未知' }}
              <template v-if="props.row.fileSize && props.row.size">
                <div class="text-caption" :class="getSizeComparisonClass(props.row)">
                  实际: {{ formatFileSize(props.row.fileSize) }}
                </div>
              </template>
            </div>
          </q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn size="sm" flat round color="red" icon="delete" @click="onDeleteClick(props.row)" />
            <q-btn size="sm" flat round color="info" icon="info" @click="onInfoClick(props.row)" />
          </q-td>
        </template>
      </q-table>
    </q-card-section>
    
    <!-- 确认对话框 -->
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
          <q-btn flat label="删除" color="negative" @click="confirmDelete" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
    
    <!-- 模型详情对话框 -->
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
  </q-card>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import api from '../../api';

// 定义API响应类型
interface ApiResponse {
  data?: unknown;
  body?: unknown;
}

// 提取API响应数据函数
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

// 模型接口
interface Model {
  id: string;
  name: string;
  description: string;
  type: string;
  size: string;  // 预期大小
  path?: string;
  installed: boolean;
  installedDate?: string;
  essential?: boolean;
  fileStatus?: 'complete' | 'incomplete' | 'corrupted';  // 文件完整性状态
  fileSize?: number;  // 实际文件大小（字节）
  save_path?: string;  // 模型保存路径
}

// 表格列定义
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
    
    // 本地状态
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
    
    // 计算已安装模型的过滤结果
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
    
    // 表格列定义
    const modelColumns = ref<TableColumn[]>([
      { name: 'name', label: '名称', field: 'name', sortable: true },
      { name: 'type', label: '类型', field: 'type', sortable: true },
      { name: 'status', label: '文件状态', field: 'fileStatus', sortable: true },
      { name: 'size', label: '大小', field: 'size', sortable: true },
      { name: 'description', label: '描述', field: 'description' },
      { name: 'installedDate', label: '安装日期', field: 'installedDate', sortable: true },
      { name: 'actions', label: '操作', field: 'actions', align: 'right' }
    ]);
    
    // 获取已安装模型列表
    const fetchInstalledModels = async () => {
      try {
        isLoading.value = true;
        const response = await api.get('models');
        const data = await extractResponseData<Model[]>(response);
        
        if (data && Array.isArray(data)) {
          installedModels.value = data.filter(model => model.installed);
          installedModelsCount.value = installedModels.value.length;
          
          // 计算总存储使用量
          updateTotalStorageUsed();
        } else {
          console.error('获取已安装模型列表失败: 响应格式不正确', response);
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
    
    // 更新存储使用量
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
    
    // 刷新模型列表
    const onRefresh = () => {
      fetchInstalledModels();
      
      $q.notify({
        type: 'info',
        message: '正在刷新已安装模型列表...'
      });
    };
    
    // 删除模型
    const onDeleteClick = (model: Model) => {
      selectedModel.value = model;
      
      // 显示确认对话框
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
            // 更新模型列表
            installedModels.value = installedModels.value.filter(m => m.id !== model.id);
            installedModelsCount.value = installedModels.value.length;
            
            // 更新存储统计
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
    
    // 查看模型信息
    const onInfoClick = (model: Model) => {
      selectedModel.value = model;
      modelInfoDialog.value = true;
    };
    
    // 关闭模型信息对话框
    const closeModelInfo = () => {
      modelInfoDialog.value = false;
      selectedModel.value = null;
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
    
    // 格式化日期
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
    
    // 获取模型类型标签
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
    
    // 获取模型类型颜色
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
    
    // 扫描模型目录
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
          // 更新模型列表
          installedModels.value = data.models.filter(model => model.installed);
          installedModelsCount.value = data.count || installedModels.value.length;
          
          // 计算总存储使用量
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
    
    // 组件加载时获取数据
    onMounted(() => {
      fetchInstalledModels();
    });
    
    const confirmDelete = () => {
      // 在这里实现删除逻辑
      console.log('确认删除');
      // 例如，调用 API 删除模型
    };
    
    // 添加获取状态颜色和标签的方法
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
    
    // 根据大小对比添加样式类的方法
    const getSizeComparisonClass = (model: Model): string => {
      if (!model.size || !model.fileSize) return '';
      
      // 解析预期大小
      const expectedSize = parseSizeString(model.size);
      if (!expectedSize) return '';
      
      // 计算差异百分比
      const diff = Math.abs(model.fileSize - expectedSize) / expectedSize;
      
      if (diff > 0.1) {
        return model.fileSize < expectedSize ? 'text-warning' : 'text-positive';
      }
      return 'text-grey-8';
    };
    
    // 添加解析大小字符串的方法
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
    
    return {
      // 状态
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
      
      // 方法
      onRefresh,
      onDeleteClick,
      onInfoClick,
      closeModelInfo,
      formatFileSize,
      formatDate,
      onScanModels,
      
      // 辅助功能
      getModelTypeLabel,
      getModelTypeColor,
      confirmDelete,
      getStatusColor,
      getStatusLabel,
      getSizeComparisonClass,
      parseSizeString
    };
  }
});
</script>

<style scoped>
.installed-models-table {
  height: 400px;
}
</style> 