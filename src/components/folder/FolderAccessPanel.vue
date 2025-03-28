<template>
  <card-container grid :title="t('base.folder')">
    <div v-for="folder in folders" :key="folder.name">
      <folder-access-item
        :name="folder.name"
        :path="folder.path"
        :used="folder.used"
        :available="folder.available"
        @open="openFolder"
      />
    </div>
  </card-container>
</template>

<script lang="ts" setup>
import FolderAccessItem from 'components/folder/FolderAccessItem.vue';
import CardContainer from 'components/base/CardContainer.vue';
import { useI18n } from 'vue-i18n';

const folders = [
  {
    name: '根目录',
    path: '/external/ai/models',
    used: null,
    available: null,
  },
  {
    name: '插件目录',
    path: '/external/ai/models',
    used: '128',
    available: '541',
  },
  {
    name: '模型目录',
    path: '/external/ai/models',
    used: '128',
    available: '541',
  },
  {
    name: '输出目录',
    path: '/external/ai/models',
    used: null,
    available: null,
  },
  {
    name: '输入目录',
    path: '/external/ai/models',
    used: null,
    available: null,
  },
];

const { t } = useI18n();

function openFolder(path: string) {
  console.log('打开文件夹:', path);
  // 这里可以添加打开文件夹的逻辑
}
</script>

<style lang="scss" scoped></style>
