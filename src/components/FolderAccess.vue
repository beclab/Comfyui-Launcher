<template>
  <div class="q-mb-lg">
    <q-card flat bordered>
      <q-card-section class="q-pb-xs">
        <div class="text-subtitle1">{{ $t('folderAccess.fileType') }}</div>
      </q-card-section>
      
      <q-separator />
      
      <div class="row q-col-gutter-none">
        <template v-for="folder in folders" :key="folder.name">
          <div class="col-12 col-md-4 folder-container">
            <div class="folder-content q-pa-md">
              <div class="row no-wrap items-start">
                <img src="../assets/icon-folder.png" class="folder-icon q-mr-sm q-mt-xs" />
                <div class="column full-width">
                  <div>
                    {{ folder.name }}
                  </div>
                  <div v-if="folder.used && folder.available" class="text-caption" style="color: var(--text-normal);">
                    {{ $t('folderAccess.installed') }} {{ folder.used }} {{ $t('folderAccess.available') }} {{ folder.available }}
                  </div>
                </div>
              </div>
              
              <div class="row items-center justify-between q-mt-md">
                <div class="path-badge text-caption flex-grow-1 mr-2" style="color: var(--text-normal);">{{ folder.path }}</div>
                <q-btn outline rounded class="open-btn" size="sm" @click="openFolder(folder.path)" >
                  {{ $t('folderAccess.open') }}
                </q-btn>
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
import api from '../api';
import DataCenter from '../api/DataCenter';

export default defineComponent({
  name: 'FolderAccess',
  data() {
    return {
      folders: [
        { name: this.$t('folderAccess.rootDir'), path: '/Files/External/ai/comfyui/ComfyUI', used: null, available: null },
        { name: this.$t('folderAccess.pluginDir'), path: '/Files/External/ai/comfyui/ComfyUI/custom_nodes/', used: '128', available: '541' },
        { name: this.$t('folderAccess.modelDir'), path: '/Files/External/ai/model/', used: null, available: null },
        { name: this.$t('folderAccess.outputDir'), path: '/Files/External/ai/output/comfyui/', used: null, available: null },
        { name: this.$t('folderAccess.inputDir'), path: '/Files/External/ai/comfyui/ComfyUI/input/', used: null, available: null }
      ]
    }
  },
  async created() {
    const installedModelsCount = await DataCenter.getInstalledModelsCount();
    const optionalModelsCount = await DataCenter.getOptionalModelsCount();
    const installedPluginsCount = await DataCenter.getInstalledPluginsCount();
    const optionalPluginsCount = await DataCenter.getOptionalPluginsCount();
    const modelFolderIndex = this.folders.findIndex(folder => folder.name === '模型目录');
    const pluginFolderIndex = this.folders.findIndex(folder => folder.name === '插件目录');
    if (modelFolderIndex!== -1) {
      this.folders[modelFolderIndex].used = installedModelsCount.toString();
      this.folders[modelFolderIndex].available = optionalModelsCount.toString();
    }
    if (pluginFolderIndex!== -1) {
      this.folders[pluginFolderIndex].used = installedPluginsCount.toString();
      this.folders[pluginFolderIndex].available = optionalPluginsCount.toString();
    }
  },
  methods: {
    async openFolder(path: string) {
      console.log('Opening folder:', path);
      try {
        await api.openPath(path);
        console.log('文件夹打开成功');
      } catch (error) {
        console.error('打开文件夹失败:', error);
      }
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