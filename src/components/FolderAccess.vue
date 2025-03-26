<template>
  <div class="q-mb-lg">
    <div class="text-subtitle1 q-mb-sm">文件夹</div>
    <div class="row q-col-gutter-md">
      <div v-for="folder in folders" :key="folder.name" class="col-12 col-md-6">
        <q-card flat bordered class="folder-card">
          <q-card-section class="row items-center no-wrap">
            <div>
              <div class="row items-center">
                <q-icon name="folder" size="xs" class="q-mr-xs" />
                <div class="text-weight-medium">{{ folder.name }}</div>
              </div>
              <div v-if="folder.used && folder.available" class="text-caption q-mt-xs">
                <q-icon name="storage" size="xs" class="q-mr-xs" />
                已使用 {{ folder.used }}
                <q-icon name="layers" size="xs" class="q-ml-sm q-mr-xs" />
                可用 {{ folder.available }}
              </div>
              <div class="text-caption text-grey">
                {{ folder.path }}
              </div>
            </div>
            <q-space />
            <q-btn label="打开" color="primary" flat @click="openFolder(folder.path)" />
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'FolderAccess',
  data() {
    return {
      folders: [
        { name: '模型目录', path: '/external/ai/models', used: '128', available: '541' },
        { name: '模型目录', path: '/external/ai/models', used: '128', available: '541' },
        { name: '输出目录', path: '/external/ai/models', used: null, available: null },
        { name: '输入目录', path: '/external/ai/models', used: null, available: null }
      ]
    }
  },
  methods: {
    openFolder(path: string) {
      console.log('打开文件夹:', path);
      // 这里可以添加打开文件夹的逻辑
    }
  }
});
</script>

<style scoped>
.folder-card {
  border-radius: 8px;
  transition: all 0.2s ease;
}

.folder-card:hover {
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
}
</style> 