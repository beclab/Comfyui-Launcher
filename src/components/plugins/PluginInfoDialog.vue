<template>
  <q-dialog v-model="dialogVisible" @hide="onDialogHide">
    <q-card style="min-width: 500px">
      <q-card-section class="row items-center">
        <div class="text-h6">{{ plugin?.name }} - 详细信息</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section v-if="plugin">
        <q-list>
          <q-item>
            <q-item-section>
              <q-item-label caption>插件ID</q-item-label>
              <q-item-label>{{ plugin.id }}</q-item-label>
            </q-item-section>
          </q-item>
          
          <q-item>
            <q-item-section>
              <q-item-label caption>版本</q-item-label>
              <q-item-label>{{ plugin.version }}</q-item-label>
            </q-item-section>
          </q-item>
          
          <q-item v-if="plugin.installedOn">
            <q-item-section>
              <q-item-label caption>安装日期</q-item-label>
              <q-item-label>{{ new Date(plugin.installedOn).toLocaleString() }}</q-item-label>
            </q-item-section>
          </q-item>
          
          <q-item>
            <q-item-section>
              <q-item-label caption>安装方式</q-item-label>
              <q-item-label>{{ plugin.install_type || 'Git Clone' }}</q-item-label>
            </q-item-section>
          </q-item>
          
          <q-item v-if="plugin.tags && plugin.tags.length > 0">
            <q-item-section>
              <q-item-label caption>标签</q-item-label>
              <div>
                <q-chip 
                  v-for="tag in plugin.tags" 
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
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

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

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  plugin: {
    type: Object as () => Plugin | null,
    default: null
  }
});

// Emits
const emit = defineEmits(['update:visible']);

// Local state for dialog visibility
const dialogVisible = ref(props.visible);

// Watch for changes to visible prop
watch(() => props.visible, (newVal) => {
  dialogVisible.value = newVal;
});

// Watch for changes to dialog visibility and emit event
watch(dialogVisible, (newVal) => {
  emit('update:visible', newVal);
});

// Event handlers
const onDialogHide = (): void => {
  emit('update:visible', false);
};
</script> 