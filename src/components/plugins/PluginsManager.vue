<template>
  <div>
    <!-- 插件管理内容 -->
    <div>
      <!-- 可用插件列表 -->
      <plugin-list
        :plugins="visiblePlugins"
        :loading="loading"
        :installation-in-progress="installationInProgress"
        :uninstallation-in-progress="uninstallationInProgress"
        :state-changing="stateChanging"
        :installation-progress="installationProgress"
        :has-more-plugins="hasMorePlugins"
        :status-options="statusOptions"
        :tag-options="tagOptions"
        :initial-values="{
          searchQuery,
          statusFilter,
          tagFilter
        }"
        @install="onInstall"
        @uninstall="onUninstall"
        @toggle-state="onToggleState"
        @show-info="onShowInfo"
        @clear-filters="onClearFilters"
        @load-more="onLoadMore"
        @search="onSearch"
        @filter="onFilter"
        @refresh="onRefresh"
      />
    </div>
  </div>
</template>

<script lang="ts">
import PluginList from './PluginList.vue';
import { useI18n } from 'vue-i18n';

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

export default {
  components: {
    PluginList
  },
  props: {
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
    visiblePlugins: {
      type: Array as () => Plugin[],
      required: true
    },
    hasMorePlugins: {
      type: Boolean,
      default: false
    },
    // statusOptions: {
    //   type: Array,
    //   default: () => []
    // },
    tagOptions: {
      type: Array,
      default: () => []
    },
    searchQuery: {
      type: String,
      default: ''
    },
    // statusFilter: {
    //   type: Object,
    //   default: () => ({})
    // },
    tagFilter: {
      type: Array,
      default: () => []
    }
  },
  emits: [
    'install', 
    'uninstall', 
    'toggle-state', 
    'show-info', 
    'clear-filters', 
    'load-more',
    'search',
    'filter',
    'refresh'
  ],
  setup(props, { emit }) {
    const { t } = useI18n();
    const statusOptions = [
      { label: t('plugins.status.all'), value: 'all' },
      { label: t('plugins.status.installed'), value: 'installed' },
      { label: t('plugins.status.notInstalled'), value: 'not-installed' }
    ];
    const statusFilter = { label: t('plugins.status.all'), value: 'all' };

    // 方法转发
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
      emit('clear-filters');
    };

    const onLoadMore = (): void => {
      emit('load-more');
    };

    const onSearch = (query: string): void => {
      emit('search', query);
    };

    const onFilter = (filters: { statusFilter: { label: string; value: string }; tagFilter: string[] }): void => {

      emit('filter', filters);
    };

    const onRefresh = (): void => {
      console.log('Refresh plugins in PluginsManager');
      emit('refresh');
    };

    return {
      onInstall,
      onUninstall,
      onToggleState,
      onShowInfo,
      onClearFilters,
      onLoadMore,
      onSearch,
      onFilter,
      onRefresh,
      statusOptions,
      statusFilter
    };
  }
};
</script>