<template>
  <div class="q-mb-lg">
    <div class="network-status">
      <div class="text-subtitle1 q-mb-sm">网络环境</div>
      <div class="row q-col-gutter-md">
        <div v-for="status in networkStatuses" :key="status.name" class="col-auto">
          <q-btn class="network-btn" flat align="left">
            <q-avatar size="md" class="q-mr-sm">
              <img :src="`~assets/${status.name.toLowerCase()}-logo.png`" :alt="status.name">
            </q-avatar>
            <div>
              <div>{{ status.name }}</div>
              <div class="text-caption">{{ status.available ? '可访问' : '不可访问' }}</div>
            </div>
          </q-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'NetworkEnvironment',
  data() {
    return {
      networkStatuses: [
        { name: 'Github', available: true },
        { name: 'PyPI', available: true },
        { name: 'HuggingFace', available: true }
      ]
    }
  }
});
</script>

<style scoped>
.network-btn {
  border-radius: 8px;
  padding: 8px 16px;
  min-width: 150px;
}
</style> 