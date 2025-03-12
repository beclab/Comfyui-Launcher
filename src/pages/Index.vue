<template>
  <q-page class="q-pa-md">
    <ComfyUIStatus />
    
    <!-- 其他内容 -->
  </q-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ComfyUIStatus from '../components/ComfyUIStatus.vue';

export default defineComponent({
  name: 'IndexPage',
  components: {
    ComfyUIStatus
  }
});
</script> 