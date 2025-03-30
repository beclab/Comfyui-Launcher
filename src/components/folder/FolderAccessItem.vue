<template>
  <div class="folder-item">
    <div class="row justify-start items-center q-py-sm">
      <q-img class="folder-img" :src="getRequireImage('folder.svg')">
        <!--        TODO -->
        <template v-slot:loading></template>
      </q-img>
      <div class="column justify-center q-ml-sm">
        <span class="folder-name text-body1 text-ink-1">{{ folder.name }}</span>

        <div class="row text-body2 text-ink-2">
          <!--        TODO -->
          <div v-if="used" class="q-mr-md">已安装: {{ folder.used }}</div>
          <div v-if="available">可用: {{ folder.available }}</div>
        </div>
      </div>
    </div>

    <div class="row items-center q-mt-sm">
      <q-input
        dense
        readonly
        borderless
        hide-bottom-space
        :model-value="folder.path"
        class="folder-path q-mr-md"
      />
      <!--        TODO -->
      <q-btn
        outline
        label="打开"
        color="light-blue-default"
        @click="openDirectory"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { getRequireImage } from 'src/utils/imageUtils';
import { FolderProps } from 'src/types/contants';
import { useQuasar } from 'quasar';
import { PropType } from 'vue';
import api from 'src/api';

const props = defineProps({
  folder: {
    type: Object as PropType<FolderProps>,
    required: true,
  },
});

const $q = useQuasar();

const openDirectory = async (dirKey: string) => {
  try {
    if (!props.folder.path) {
      throw new Error('未找到指定目录');
    }

    await api.openPath(props.folder.path);

    $q.notify({
      type: 'positive',
      message: `正在打开 ${dirKey} 目录`,
      position: 'top',
      timeout: 2000,
    });
  } catch (error) {
    console.error('打开目录失败:', error);
    $q.notify({
      type: 'negative',
      message: '打开目录失败，请检查系统设置',
      position: 'top',
    });
  }
};
</script>

<style lang="scss" scoped>
.folder-item {
  padding: 10px 0;

  .folder-img {
    width: 39px;
    height: 31px;
  }

  .folder-name {
    display: -webkit-box;
    width: 206px;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .folder-path {
    gap: 10px;
    flex: 1 0 0;
    display: flex;
    height: 32px;
    padding: 8px 12px;
    border-radius: 8px;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    border: 1px solid $input-stroke;
    background: $input-bg-disabled;
  }
}
</style>
