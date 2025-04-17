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
                <div class="cloum full-width" style="padding-top: 4px;">
                  <div >
                    {{ folder.name }}
                  </div>
                  <div v-if="folder.used && folder.available" class="text-caption" style="color: var(--text-normal);">
                    {{ $t('folderAccess.installed') }} {{ folder.used }} {{ $t('folderAccess.available') }} {{ folder.available }}
                  </div>
                  <div v-else class="text-caption" style="color: var(--text-normal);">
                    {{ folder.hint }}
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
import { defineComponent, ref, onMounted } from 'vue';
import api from '../api';
import DataCenter from '../api/DataCenter';
import { useI18n } from 'vue-i18n';

export default defineComponent({ 
  name: 'FolderAccess', 
  setup() { 
    const { t } = useI18n();
    const isInIframe = ref(false);
    const folders = ref([ 
      { name: t('folderAccess.rootDir'), path: '/Files/External/ai/comfyui/ComfyUI/', used: null, available: null, hint: t('folderAccess.rootDirHint') }, 
      { name: t('folderAccess.pluginDir'), path: '/Files/External/ai/comfyui/ComfyUI/custom_nodes/', used: '', available: '', hint: null }, 
      { name: t('folderAccess.modelDir'), path: '/Files/External/ai/model/', used: '', available: '', hint: null }, 
      { name: t('folderAccess.outputDir'), path: '/Files/External/ai/output/comfyui/', used: null, available: null, hint: t('folderAccess.outputDirHint') }, 
      { name: t('folderAccess.inputDir'), path: '/Files/External/ai/comfyui/ComfyUI/input/', used: null, available: null, hint: t('folderAccess.inputDirHint') }, 
    ]); 

    const fetchData = async () => { 
      let newFolders = [...folders.value];
      const installedModelsCount = await DataCenter.getInstalledModelsCount(); 
      const optionalModelsCount = await DataCenter.getOptionalModelsCount(); 
      const installedPluginsCount = await DataCenter.getInstalledPluginsCount(); 
      const optionalPluginsCount = await DataCenter.getOptionalPluginsCount(); 

      const modelFolderIndex = newFolders.findIndex(folder => folder.name === t('folderAccess.modelDir')); 
      const pluginFolderIndex = newFolders.findIndex(folder => folder.name === t('folderAccess.pluginDir')); 
      if (modelFolderIndex!== -1) { 
        newFolders[modelFolderIndex].used = installedModelsCount.toString(); 
        newFolders[modelFolderIndex].available = optionalModelsCount.toString(); 
      } 
      if (pluginFolderIndex!== -1) { 
        newFolders[pluginFolderIndex].used = installedPluginsCount.toString(); 
        newFolders[pluginFolderIndex].available = optionalPluginsCount.toString(); 
      } 
      folders.value = newFolders;
    }; 

    onMounted(() => {
      // Check if the current page is in an iframe
      try {
        isInIframe.value = window.self !== window.top;
      } catch (e) {
        // If there's a cross-domain issue, assume we're in an iframe
        isInIframe.value = true;
      }
    });

    const openFolder = async (path: string) => { 
      console.log('Opening folder:', path); 
      try { 
        if (isInIframe.value) {
          // If in iframe, use the original method
          await api.openPath(path);
          console.log('Folder opened successfully in iframe mode'); 
        } else {
          // If not in iframe, open in a new page
          const hostname = window.location.hostname;
          const parts = hostname.split('.');
          parts[0] = 'files';
          const filesDomain = parts.join('.');
          const url = `https://${filesDomain}${path}`;
          window.open(url, '_blank');
          console.log('Folder opened in new tab:', url);
        }
      } catch (error) { 
        console.error('Failed to open folder:', error); 
      } 
    }; 

    fetchData(); 

    return { 
      folders, 
      openFolder,
      isInIframe
    }; 
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