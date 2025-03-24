<template>
  <div>
    <h5 class="q-mt-none">最火工作流</h5>
    <p class="text-grey-7">这里将显示使用量最高的工作流</p>
    
    <div class="row q-col-gutter-md">
      <!-- 工作流卡片示例 -->
      <div v-for="i in 6" :key="i" class="col-xs-12 col-sm-6 col-md-4">
        <q-card class="dashboard-card">
          <q-img src="https://via.placeholder.com/300x200" />
          <q-card-section>
            <div class="text-h6">热门工作流 {{ i }}</div>
            <div class="text-subtitle2">使用次数: {{ 1000 + i * 100 }}</div>
          </q-card-section>
          <q-card-section class="q-pt-none">
            这是一个热门工作流描述。
          </q-card-section>
          <q-card-actions>
            <q-btn flat color="primary" label="查看详情" />
            <q-btn flat color="secondary" label="使用" />
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'HotWorkflows',
});
</script> 