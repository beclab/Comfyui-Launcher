<template>
  <q-page padding>
    <h1 class="text-h3">关于本应用</h1>
    <p class="text-body1">
      这是一个使用Quasar框架构建的Vue.js应用。Quasar是一个基于Vue.js的框架，可用于构建响应式网站、PWA、移动应用和桌面应用。
    </p>
    
    <h2 class="text-h4 q-mt-lg">Quasar的特点</h2>
    <q-list bordered separator>
      <q-item v-for="feature in features" :key="feature">
        <q-item-section>
          <q-item-label>{{ feature }}</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
    
    <q-btn color="primary" class="q-mt-lg" label="返回首页" to="/" />
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineOptions({
  name: 'AboutPage'
});

const features = ref([
  '丰富的UI组件库',
  '一套代码多平台构建',
  '性能优化',
  '响应式布局',
  '主题定制'
]);
</script> 