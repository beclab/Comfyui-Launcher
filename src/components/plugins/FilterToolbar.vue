<template>
  <div class="row q-mb-md items-center">
    <div class="col-12 col-md-6">
      <q-input 
        v-model="searchQuery" 
        outlined 
        dense
        placeholder="搜索插件..." 
        class="q-mr-sm"
        @update:model-value="onSearch"
      >
        <template v-slot:prepend>
          <q-icon name="search" />
        </template>
      </q-input>
    </div>
    <div class="col-12 col-md-6 flex justify-end">
      <q-select
        v-model="statusFilter"
        :options="statusOptions"
        outlined
        dense
        label="状态"
        class="q-mx-sm"
        style="min-width: 120px"
        @update:model-value="onFilter"
      />
      <q-select
        v-model="tagFilter"
        :options="tagOptions"
        outlined
        dense
        label="标签"
        class="q-mx-sm"
        style="min-width: 120px"
        @update:model-value="onFilter"
        multiple
      />
      <q-btn 
        color="primary" 
        icon="refresh" 
        flat
        round
        @click="onRefresh" 
        :loading="loading"
      >
        <q-tooltip>刷新插件列表</q-tooltip>
      </q-btn>
      <q-btn 
        color="primary" 
        icon="upgrade" 
        flat
        round
        @click="onFetchFromSource" 
        :loading="loading"
      >
        <q-tooltip>更新全部插件</q-tooltip>
      </q-btn>
      <q-btn
        color="primary"
        icon="folder_open"
        flat
        round
        @click="openPluginsFolder"
      >
        <q-tooltip>打开插件目录</q-tooltip>
      </q-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits, defineExpose } from 'vue';
import { debounce } from 'quasar';

// Props
const props = defineProps({
  loading: Boolean,
  statusOptions: Array,
  tagOptions: Array,
  proxyOptions: Array,
  initialValues: {
    type: Object,
    default: () => ({
      searchQuery: '',
      statusFilter: { label: '全部', value: 'all' },
      tagFilter: [],
      proxy: ''
    })
  }
});

// Emits
const emit = defineEmits([
  'search', 
  'filter', 
  'refresh', 
  'fetch-from-source',
  'proxy-change',
  'clear-filters',
  'open-folder'
]);

// Data
const searchQuery = ref(props.initialValues.searchQuery);
const statusFilter = ref(props.initialValues.statusFilter);
const tagFilter = ref(props.initialValues.tagFilter);
const proxy = ref(props.initialValues.proxy);

// Watch for external changes to props
watch(() => props.initialValues, (newValues) => {
  searchQuery.value = newValues.searchQuery;
  statusFilter.value = newValues.statusFilter;
  tagFilter.value = newValues.tagFilter;
  proxy.value = newValues.proxy;
}, { deep: true });

// Methods
const onSearch = debounce(function() {
  emit('search', searchQuery.value);
}, 300);

const onFilter = () => {
  emit('filter', {
    statusFilter: statusFilter.value,
    tagFilter: tagFilter.value
  });
};

const onRefresh = () => {
  emit('refresh');
};

const onFetchFromSource = () => {
  emit('fetch-from-source');
};

const openPluginsFolder = () => {
  emit('open-folder');
};

const clearFilters = () => {
  searchQuery.value = '';
  statusFilter.value = { label: '全部', value: 'all' };
  tagFilter.value = [];
  emit('clear-filters');
};

// Expose method to parent component
defineExpose({
  clearFilters
});
</script> 