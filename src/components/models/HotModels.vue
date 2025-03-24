<template>
  <div>
    <h5 class="q-mt-none">最火模型</h5>
    <p class="text-grey-7">这里将显示下载量最高的模型</p>
    
    <div class="row q-col-gutter-md">
      <!-- 模型卡片示例 -->
      <div v-for="i in 6" :key="i" class="col-xs-12 col-sm-6 col-md-4">
        <q-card class="dashboard-card">
          <q-img src="https://via.placeholder.com/300x200" />
          <q-card-section>
            <div class="text-h6">热门模型 {{ i }}</div>
            <div class="text-subtitle2">下载次数: {{ 1000 + i * 100 }}</div>
          </q-card-section>
          <q-card-section class="q-pt-none">
            这是一个热门模型描述。
          </q-card-section>
          <q-card-actions>
            <q-btn flat color="primary" label="查看详情" />
            <q-btn flat color="secondary" label="下载" />
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'HotModels',
});
</script> 