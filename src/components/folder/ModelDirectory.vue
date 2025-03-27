<template>
  <div class="directory-container">
    <div class="row justify-start items-center q-py-sm">
      <q-img class="directory-img" :src="getRequireImage('directory.svg')">
        <template v-slot:loading> </template>
      </q-img>
      <div class="column justify-center q-ml-sm">
        <span class="directory-name text-body1 text-ink-1">{{ name }}</span>

        <div class="row text-body2 text-ink-2">
          <div v-if="used" class="q-mr-md">已安装: {{ used }}</div>
          <div v-if="available">可用: {{ available }}</div>
        </div>
      </div>
    </div>

    <div class="row items-center q-mt-sm">
      <q-input
        :model-value="path"
        @update:modelValue="onOpen"
        class="directory-path q-mr-md"
        readonly
        dense
        borderless
        hide-bottom-space
      />
      <q-btn outline label="打开" color="light-blue-default" @click="onOpen" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { getRequireImage } from 'src/utils/imageUtils';

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  used: {
    type: [String, null],
    default: null,
  },
  available: {
    type: [String, null],
    default: null,
  },
});

const emit = defineEmits(['open']);

function onOpen() {
  emit('open', props.path);
}
</script>

<style lang="scss" scoped>
.directory-container {
  padding: 10px 0;

  .directory-img {
    width: 40px;
    height: 40px;
  }

  .directory-name{
    display: -webkit-box;
    width: 206px;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .directory-path{
    display: flex;
    height: 32px;
    padding: 8px 12px;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    gap: 10px;
    flex: 1 0 0;
    border-radius: 8px;
    border: 1px solid $input-stroke;
    background: $input-bg-disabled;
  }
}
</style>
