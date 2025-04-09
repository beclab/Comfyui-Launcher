<template>
  <div class="q-mb-lg">
    <q-card flat bordered class="network-status">
      <q-card-section>
        <div class="row justify-between items-center q-mb-sm">
          <div class="text-subtitle1">网络环境</div>
          <q-icon name="wifi" size="sm" color="grey-7" />
        </div>
        <q-separator class="q-mb-md" />
        <div class="row q-col-gutter-md">
          <div v-for="status in networkStatuses" :key="status.name" class="col-4">
            <div class="network-item">
              <q-avatar size="md" class="q-mr-sm">
                <img :src="status.logo" :alt="status.name">
              </q-avatar>
              <div class="network-item-content">
                <div class="row justify-between items-center full-width">
                  <div>{{ status.name }}</div>
                  <div class="status-indicator">
                    <q-badge :color="status.statusColor" rounded style="width: 8px; height: 8px;" class="q-mr-xs" />
                    <span class="text-caption" :class="status.textColorClass">{{ status.statusText }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
// Import logo images
import githubLogo from '../assets/github-logo.png';
import pypiLogo from '../assets/pypi-logo.png';
import huggingfaceLogo from '../assets/huggingface-logo.png';

export default defineComponent({
  name: 'NetworkEnvironment',
  data() {
    return {
      networkStatuses: [
        { 
          name: 'Github', 
          available: true, 
          statusText: '可访问', 
          statusColor: 'green', 
          textColorClass: 'text-green',
          logo: githubLogo
        },
        { 
          name: 'PyPI', 
          available: true, 
          statusText: '可访问', 
          statusColor: 'green', 
          textColorClass: 'text-green',
          logo: pypiLogo
        },
        { 
          name: 'HuggingFace', 
          available: false, 
          statusText: '访问超时', 
          statusColor: 'red', 
          textColorClass: 'text-red',
          logo: huggingfaceLogo
        }
      ]
    }
  }
});
</script>

<style scoped>
.network-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 8px;
  min-width: 150px;
  height: 100%;
}

.network-item-content {
  flex: 1;
}

.status-indicator {
  display: flex;
  align-items: center;
}

.network-status {
  border-radius: 8px;
}
</style> 