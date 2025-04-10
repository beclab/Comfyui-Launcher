<template>
  <div class="q-mb-lg">
    <q-card flat bordered>
      <q-card-section class="q-pb-xs">
        <div class="text-subtitle1">文件类</div>
      </q-card-section>
      
      <q-separator />
      
      <div class="row q-col-gutter-none">
        <template v-for="folder in folders" :key="folder.name">
          <div class="col-12 col-md-4 folder-container">
            <div class="folder-content q-pa-md">
              <div class="row no-wrap items-start">
                <img src="src/assets/icon-folder.png" class="folder-icon q-mr-sm q-mt-xs" />
                <div class="column full-width">
                  <div>
                    {{ folder.name }}
                  </div>
                  <div v-if="folder.used && folder.available" class="text-caption" style="color: var(--text-normal);">
                    已安装 {{ folder.used }} 可用 {{ folder.available }}
                  </div>
                </div>
              </div>
              
              <div class="row items-center justify-between q-mt-md">
                <div class="path-badge text-caption flex-grow-1 mr-2" style="color: var(--text-normal);">{{ folder.path }}</div>
                <q-btn outline rounded label="打开" class="open-btn" size="sm" @click="openFolder(folder.path)" />
              </div>
            </div>
          </div>
        </template>
      </div>
    </q-card>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'FolderAccess',
  data() {
    return {
      folders: [
        { name: '模型目录', path: 'External/ai/models', used: '128', available: '541' },
        { name: '插件目录', path: 'External/ai/models', used: '128', available: '541' },
        { name: '模型目录', path: 'External/ai/models', used: '128', available: '541' },
        { name: '输出目录', path: 'External/ai/models', used: null, available: null },
        { name: '输入目录', path: 'External/ai/models', used: null, available: null }
      ]
    }
  },
  methods: {
    openFolder(path: string) {
      console.log('Opening folder:', path);
      // The logic to open the folder will be implemented here
    }
  }
});
</script>

<style scoped>
.text-subtitle1 {
  color: var(--text-important);
}
.folder-container {
  position: relative;
}

.folder-content {
  height: 100%;
}

.path-badge {
  background-color: #f5f5f5;
  border-radius: var(--border-radius-md);
  border: gainsboro solid 1px;
  padding: 4px 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 80%;
  height: 30px;
}

.folder-icon {
  width: 40px;
  height: 40px;
}

.open-btn {
  min-width: 60px;
  border-radius: var(--border-radius-md);
  padding: 8px 6px;
  color: var(--button-text-color);
  border-color: var(--button-text-color);
}
.q-card {
  border-radius: var(--border-radius-xl);
}
.folder-content div:first-child {
  color: var(--text-important);
}
</style>