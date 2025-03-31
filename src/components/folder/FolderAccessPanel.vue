<template>
  <card-container grid :title="t('base.folder')">
    <div v-for="folder in folders" :key="folder.name">
      <folder-access-item :folder="folder" />
    </div>
  </card-container>
</template>

<script lang="ts" setup>
import FolderAccessItem from 'components/folder/FolderAccessItem.vue';
import CardContainer from 'components/base/CardContainer.vue';
import { FolderProps } from 'src/types/contants';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const folders: FolderProps[] = [
  {
    name: '根目录',
    path: process.env.COMFYUI_PATH || '/Files/External/ai/comfyui/ComfyUI/',
    used: null,
    available: null,
  },
  {
    name: '插件目录',
    path: process.env.CUSTOM_NODES_PATH || '/Files/External/ai/comfyui/ComfyUI/custom_nodes/',
    used: null,
    available: null,
  },
  {
    name: '模型目录',
    path: process.env.MODELS_PATH || '/Files/External/ai/model/',
    used: null,
    available: null,
  },
  {
    name: '输出目录',
    path: process.env.OUTPUT_PATH || '/Files/External/ai/output/comfyui/',
    used: null,
    available: null,
  },
  {
    name: '输入目录',
    path: process.env.INPUT_PATH || '/Files/External/ai/comfyui/ComfyUI/input/',
    used: null,
    available: null,
  },
];
</script>

<style lang="scss" scoped></style>
