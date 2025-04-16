<template>
  <div class="plugin-list-container">
    <div v-if="loading" class="row items-center justify-center q-py-lg">
      <q-spinner color="primary" size="3em" />
      <span class="q-ml-sm text-subtitle1">{{ $t('plugins.loadingPlugins') }}</span>
    </div>
    
    <div v-else>
      <div v-if="plugins.length === 0" class="text-center q-py-xl">
        <q-icon name="info" size="3rem" color="grey-7" />
        <p class="text-h6 text-grey-7">{{ $t('plugins.noPluginsFound') }}</p>
        <q-btn 
          color="primary" 
          outline 
          :label="$t('plugins.actions.clearFilters')" 
          @click="onClearFilters" 
          class="q-mt-sm"
        />
      </div>
      
      <div v-else>
        <!-- 可用插件标题和筛选工具栏在同一行 -->
        <div class="row items-center justify-between q-mb-sm">
          <!-- 左侧标题 -->
          <div class="row items-center">
            <div class="text-h6">{{ $t('plugins.availablePlugins') }}</div>
            <div class="text-caption q-ml-sm text-grey">
              {{ $t('plugins.registeredPlugins') }}
            </div>
          </div>
          
          <!-- 右侧筛选工具 -->
          <div class="row items-center">
            <q-input 
              v-model="searchQuery" 
              outlined 
              dense
              :placeholder="$t('plugins.searchPlaceholder')" 
              class="q-mr-sm"
              style="width: 200px"
              @update:model-value="onSearch"
            >
              <template v-slot:prepend>
                <q-icon name="search" />
              </template>
            </q-input>
            
            <q-select
              v-model="statusFilter"
              :options="statusOptions"
              outlined
              dense
              :label="$t('plugins.columns.status')"
              class="q-mr-sm"
              style="width: 120px"
              @update:model-value="onFilter"
            />
            
            <!-- <q-select
              v-model="tagFilter"
              :options="tagOptions"
              outlined
              dense
              :label="$t('plugins.columns.tags')"
              class="q-mr-sm"
              style="width: 120px"
              @update:model-value="onFilter"
              multiple
            /> -->
            
            <q-btn 
            color="grey-7"
            outline
            icon="refresh" 
            :label="$t('plugins.actions.refresh')"
            @click="onRefresh"
            :loading="loading"
            size="md"
            style="border-radius: var(--border-radius-md);padding-top: 8px;padding-bottom: 8px;"
            >
              <q-tooltip>{{ $t('plugins.refreshTooltip') }}</q-tooltip>
            </q-btn>
          </div>
        </div>
        
        <!-- 标题下方分割线 -->
        <q-separator class="q-mb-md" />
        
        <!-- 表头 -->
        <div class="row items-center q-py-sm q-px-md text-weight-medium">
          <div class="col-1">{{ $t('plugins.columns.id') }}</div>
          <div class="col-2">{{ $t('plugins.columns.name') }}</div>
          <div class="col-1 text-center">{{ $t('plugins.columns.version') }}</div>
          <div class="col-1 text-center">{{ $t('plugins.columns.status') }}</div>
          <div class="col-1">{{ $t('plugins.columns.author') }}</div>
          <div class="col-4">{{ $t('plugins.columns.description') }}</div>
          <div class="col-2 text-right">{{ $t('plugins.columns.actions') }}</div>
        </div>
        
        <!-- 表头和条目之间的分割线 -->
        <q-separator class="q-mb-sm" />
        
        <!-- 插件列表 -->
        <div class="plugin-items">
          <div v-for="plugin in plugins" :key="plugin.id" v-memo="[plugin.id, plugin.disabled]">
            <plugin-card
              :plugin="plugin"
              :installation-in-progress="installationInProgress[plugin.id]"
              :uninstallation-in-progress="uninstallationInProgress[plugin.id]"
              :state-changing="stateChanging[plugin.id]"
              :installation-progress="installationProgress[plugin.id]"
              @install="onInstall(plugin)"
              @uninstall="onUninstall(plugin)"
              @toggle-state="onToggleState(plugin)"
              @show-info="onShowInfo(plugin)"
            />
          </div>
        </div>
        
        <!-- 分页控制 -->
        <div class="row items-center justify-end q-py-sm q-mt-md">
          <span class="q-mr-sm">{{ $t('plugins.pagination.rowsPerPage') }}:</span>
          <q-select
            v-model="rowsPerPage"
            :options="[10, 20, 50]"
            dense
            borderless
            emit-value
            map-options
            style="min-width: 60px"
          />
          <span class="q-mx-md">
            {{ $t('plugins.pagination.pageInfo', { 
              currentPage: 1, 
              totalPages: Math.ceil(plugins.length / rowsPerPage),
              total: plugins.length 
            }) }}
          </span>
          <q-btn
            icon="chevron_left"
            color="primary"
            round
            dense
            flat
            :disable="true"
          />
          <q-btn
            icon="chevron_right"
            color="primary"
            round
            dense
            flat
            :disable="!hasMorePlugins"
            @click="onLoadMore"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { debounce } from 'quasar';
import PluginCard from './PluginCard.vue';

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
  size?: string;
}

// 进度状态类型
interface ProgressState {
  [key: string]: boolean | number;
}

// Props
const props = defineProps({
  plugins: {
    type: Array as () => Plugin[],
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  installationInProgress: {
    type: Object as () => ProgressState,
    default: () => ({})
  },
  uninstallationInProgress: {
    type: Object as () => ProgressState,
    default: () => ({})
  },
  stateChanging: {
    type: Object as () => ProgressState,
    default: () => ({})
  },
  installationProgress: {
    type: Object as () => ProgressState,
    default: () => ({})
  },
  hasMorePlugins: {
    type: Boolean,
    default: false
  },
  statusOptions: {
    type: Array,
    default: () => [
      { label: '全部', value: 'all' },
      { label: '已安装', value: 'installed' },
      { label: '未安装', value: 'not-installed' }
    ]
  },
  tagOptions: {
    type: Array,
    default: () => []
  },
  initialValues: {
    type: Object,
    default: () => ({
      searchQuery: '',
      statusFilter: { label: '全部', value: 'all' },
      tagFilter: []
    })
  }
});

// 分页设置
const rowsPerPage = ref(10);

// 筛选状态
const searchQuery = ref(props.initialValues.searchQuery);
const statusFilter = ref(props.initialValues.statusFilter);
const tagFilter = ref(props.initialValues.tagFilter);

// 监听初始值变化
// watch(() => props.initialValues, (newValues) => {
  // searchQuery.value = newValues.searchQuery;
  // statusFilter.value = newValues.statusFilter;
  // tagFilter.value = newValues.tagFilter;
// }, { deep: true });

// Emits
const emit = defineEmits([
  'install', 
  'uninstall', 
  'toggle-state', 
  'show-info', 
  'clear-filters', 
  'load-more', 
  'search', 
  'filter',
  'refresh'
]);

// Methods
const onInstall = (plugin: Plugin): void => {
  emit('install', plugin);
};

const onUninstall = (plugin: Plugin): void => {
  emit('uninstall', plugin);
};

const onToggleState = (plugin: Plugin): void => {
  emit('toggle-state', plugin);
};

const onShowInfo = (plugin: Plugin): void => {
  emit('show-info', plugin);
};

const onClearFilters = (): void => {
  searchQuery.value = '';
  statusFilter.value = { label: '全部', value: 'all' };
  tagFilter.value = [];
  emit('clear-filters');
};

const onLoadMore = (): void => {
  emit('load-more');
};

// 搜索防抖
const onSearch = debounce(function() {
  emit('search', searchQuery.value);
}, 300);

// 筛选
const onFilter = () => {

  emit('filter', {
    statusFilter: { label: statusFilter.value.label, value: statusFilter.value.value },
    tagFilter: tagFilter.value
  });
};

// 刷新
const onRefresh = (): void => {
  console.log('onRefresh called');
  emit('refresh');
};
</script>

<style scoped>
.plugin-list-container {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background-color: white;
}

.plugin-items {
  margin-top: 8px;
}

/* 确保插件卡片之间有分隔线 */
.plugin-items > div:not(:last-child) .plugin-card {
  border-bottom: 1px solid #f0f0f0;
}

/* 添加刷新按钮样式 */
.refresh-btn {
  border-radius: var(--border-radius-md);
}
</style>