<template>
  <div class="q-mb-lg">
    <q-card flat bordered class="network-status" style="padding-left: 0px; padding-right: 0px;">
      <q-card-section style="width: 100%; margin-left: 0px; margin-right: 0px; padding-left: 0px; padding-right: 0px;">
        <div class="row justify-between items-center q-mb-sm" style="margin-left: 16px;margin-right: 16px;">
          <div class="text-subtitle1" style="color: var(--text-important);">网络环境</div>
          <q-icon :name="allAccessible ? 'wifi' : 'wifi_off'" size="sm" color="grey-7" />
        </div>
        <q-separator class="q-mb-md" style="width: 100%;" />
        <div class="row q-col-gutter-md" style="margin-left: 16px;margin-right: 16px;">
          <div v-for="status in networkStatuses" :key="status.name" class="col-4">
            <div class="network-item">
              <q-avatar size="md" class="q-mr-sm">
                <img :src="status.logo" :alt="status.name">
              </q-avatar>
              <div class="network-item-content">
                <div class="row justify-between items-center full-width">
                  <div style="color: var(--text-important);">{{ status.name }}</div>
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
import api from 'src/api';
// import { onMounted } from 'vue';
// Import logo images
import githubLogo from '../assets/github-logo.png';
import pypiLogo from '../assets/pypi-logo.png';
import huggingfaceLogo from '../assets/huggingface-logo.png';

export default defineComponent({
  name: 'NetworkEnvironment',
  data() {
    return {
      networkStatuses: [] as { name: string; available: boolean; statusText: string; statusColor: string; textColorClass: string; logo: string }[],
      allAccessible: true
    };
  },
  async mounted() {
    try {
      const response = await api.get('system/network-status');
      if (response.data.code === 200) {
        const result = response.data.data;
        this.networkStatuses = [
          {
            name: 'Github',
            available: result.github.accessible,
            statusText: result.github.accessible ? '可访问' : '不可访问',
            statusColor: result.github.accessible ? 'green' : 'red',
            textColorClass: result.github.accessible ? 'text-green' : 'text-red',
            logo: githubLogo
          },
          {
            name: 'PyPI',
            available: result.pip.accessible,
            statusText: result.pip.accessible ? '可访问' : '不可访问',
            statusColor: result.pip.accessible ? 'green' : 'red',
            textColorClass: result.pip.accessible ? 'text-green' : 'text-red',
            logo: pypiLogo
          },
          {
            name: 'HuggingFace',
            available: result.huggingface.accessible,
            statusText: result.huggingface.accessible ? '可访问' : '不可访问',
            statusColor: result.huggingface.accessible ? 'green' : 'red',
            textColorClass: result.huggingface.accessible ? 'text-green' : 'text-red',
            logo: huggingfaceLogo
          }
        ];
        this.allAccessible = this.networkStatuses.every(status => status.available);
      }
    } catch (error) {
      console.error('获取网络状态失败:', error);
    }
  }
});
</script>

<style scoped>
.network-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: var(--border-radius-xl);
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
  border-radius: var(--border-radius-xl);
}
</style>