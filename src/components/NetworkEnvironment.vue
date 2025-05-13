<template>
  <div class="q-mb-lg">
    <q-card flat bordered class="network-status" style="padding-left: 0px; padding-right: 0px;">
      <q-card-section style="width: 100%; margin-left: 0px; margin-right: 0px; padding-left: 0px; padding-right: 0px;">
        <div class="row justify-between items-center q-mb-sm" style="margin-left: 16px;margin-right: 16px;">
          <div class="text-subtitle1" style="color: var(--text-important);">{{ $t('network.environment') }}</div>
          <q-btn flat round :icon="allAccessible ? 'wifi' : 'wifi_off'" size="sm" color="grey-7" @click="checkNetworkStatus" />
        </div>
        <q-separator class="q-mb-md" style="width: 100%;" />
        
        <!-- Skeleton loading screen -->
        <div v-if="loading" class="row q-col-gutter-md" style="margin-left: 16px;margin-right: 16px;">
          <div v-for="i in 3" :key="i" class="col-4">
            <div class="network-item">
              <q-skeleton type="QAvatar" size="md" class="q-mr-sm" />
              <div class="network-item-content">
                <div class="row justify-between items-center full-width">
                  <q-skeleton type="text" width="40%" />
                  <div class="status-indicator">
                    <q-skeleton type="QBadge" size="8px" class="q-mr-xs" />
                    <q-skeleton type="text" width="50px" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Actual content -->
        <div v-else class="row q-col-gutter-md" style="margin-left: 16px;margin-right: 16px;">
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

    <!-- 添加网络检查日志弹窗 -->
    <q-dialog v-model="logDialog.show" persistent>
      <q-card style="min-width: 600px; max-width: 80vw;">
        <q-card-section class="row items-center bg-primary text-white">
          <div class="text-h6">{{ $t('network.checkingLog') }}</div>
          <q-space />

          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        
        <q-card-section style="max-height: 70vh; overflow-y: auto;">
          <!-- 网络状态概览 -->
          <div class="q-mb-md">
            <div class="text-subtitle1 q-mb-sm">{{ $t('network.checkStatus') }}</div>
            <div class="row q-col-gutter-md">
              <div class="col-4">
                <q-item>
                  <q-item-section avatar>
                    <q-avatar>
                      <img :src="githubLogo" alt="GitHub">
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>GitHub</q-item-label>
                    <q-item-label caption>
                      <q-chip 
                        dense 
                        :color="currentNetworkStatus.github?.accessible ? 'positive' : 'negative'" 
                        text-color="white"
                      >
                        {{ currentNetworkStatus.github?.accessible ? $t('network.accessible') : $t('network.inaccessible') }}
                      </q-chip>
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </div>
              <div class="col-4">
                <q-item>
                  <q-item-section avatar>
                    <q-avatar>
                      <img :src="pypiLogo" alt="PyPI">
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ $t('network.pipSource') }}</q-item-label>
                    <q-item-label caption>
                      <q-chip 
                        dense 
                        :color="currentNetworkStatus.pip?.accessible ? 'positive' : 'negative'" 
                        text-color="white"
                      >
                        {{ currentNetworkStatus.pip?.accessible ? $t('network.accessible') : $t('network.inaccessible') }}
                      </q-chip>
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </div>
              <div class="col-4">
                <q-item>
                  <q-item-section avatar>
                    <q-avatar>
                      <img :src="huggingfaceLogo" alt="Hugging Face">
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Hugging Face</q-item-label>
                    <q-item-label caption>
                      <q-chip 
                        dense 
                        :color="currentNetworkStatus.huggingface?.accessible ? 'positive' : 'negative'" 
                        text-color="white"
                      >
                        {{ currentNetworkStatus.huggingface?.accessible ? $t('network.accessible') : $t('network.inaccessible') }}
                      </q-chip>
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </div>
            </div>
          </div>

          <!-- 检查日志列表 -->
          <div class="text-subtitle1 q-mb-sm">{{ $t('network.checkLogs') }}</div>
          
          <div v-if="logDialog.loading" class="text-center q-pa-md">
            <q-spinner color="primary" size="3em" />
            <div class="q-mt-sm">{{ $t('network.loadingLogs') }}</div>
          </div>
          
          <div v-else-if="logDialog.logs.length === 0" class="text-center q-pa-md text-grey">
            {{ $t('network.noLogs') }}
          </div>
          
          <div v-else class="log-container">
            <q-list separator>
              <q-item v-for="(log, index) in logDialog.logs" :key="index">
                <q-item-section avatar>
                  <q-icon 
                    :name="logIcon(log.type)" 
                    :color="logColor(log.type)" 
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label>
                    <span v-if="log.service" class="log-service">
                      [{{ log.service }}]
                    </span>
                    {{ log.message }}
                  </q-item-label>
                  <q-item-label caption>
                    {{ formatTime(log.time) }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-card-section>
        
        <q-card-section align="right">
          <div class="network-check-buttons">
            <q-btn 
              color="secondary" 
              :loading="checkingNetwork" 
              @click="forceCheckNetworkStatus" 
              class="q-ml-sm"
            >
              {{ $t('network.forceCheck') }}
            </q-btn>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import api from 'src/api';
// Import logo images
import githubLogo from '../assets/github-logo.png';
import pypiLogo from '../assets/pypi-logo.png';
import huggingfaceLogo from '../assets/huggingface-logo.png';

// 定义日志项的类型接口
interface LogItem {
  type: string;
  service?: string;
  message: string;
  time: number;
}

// 定义网络状态的类型接口
interface NetworkStatusItem {
  accessible: boolean;
}

export default defineComponent({
  name: 'NetworkEnvironment',
  data() {
    return {
      // 添加logo引用到data中，使其在模板中可用
      githubLogo,
      pypiLogo,
      huggingfaceLogo,
      networkStatuses: [] as { name: string; available: boolean; statusText: string; statusColor: string; textColorClass: string; logo: string }[],
      allAccessible: true,
      loading: true, // Add loading state
      // 网络检查日志对话框
      logDialog: {
        show: false,
        loading: false,
        checkId: null as string | null,
        logs: [] as LogItem[],
        polling: null as NodeJS.Timeout | null, // 修改类型以接受Timeout
        pollingInterval: 1000, // 轮询间隔(毫秒)
        status: 'in_progress' as 'in_progress' | 'completed' | 'failed'
      },
      // 当前检查获取的网络状态
      currentNetworkStatus: {
        github: { accessible: false } as NetworkStatusItem,
        pip: { accessible: false } as NetworkStatusItem,
        huggingface: { accessible: false } as NetworkStatusItem
      },
      // 是否正在强制检查网络
      checkingNetwork: false
    };
  },
  async mounted() {
    try {
      // Set loading to true when starting to fetch data
      this.loading = true;
      
      // 先获取一个网络检查ID
      const response = await api.get('system/network-status');
      if (response.data.code === 200) {
        const result = response.data.data;
        
        // 获取检查ID并用它获取真正的网络状态
        const checkId = result.checkId;
        if (checkId) {
          // 初始化日志状态
          this.logDialog.checkId = checkId;
          this.logDialog.logs = [];
          this.logDialog.status = 'in_progress';
          
          // 获取网络检查日志和状态
          const statusResponse = await api.getNetworkCheckLog(checkId);
          if (statusResponse.body && statusResponse.body.code === 200) {
            const data = statusResponse.body.data;
            this.currentNetworkStatus = data.currentNetworkStatus;
            
            // 更新界面展示
            if (this.currentNetworkStatus) {
              this.networkStatuses = [
                {
                  name: 'Github',
                  available: this.currentNetworkStatus.github.accessible,
                  statusText: this.currentNetworkStatus.github.accessible ? this.$t('network.github.accessible') : this.$t('network.github.inaccessible'),
                  statusColor: this.currentNetworkStatus.github.accessible ? 'green' : 'red',
                  textColorClass: this.currentNetworkStatus.github.accessible ? 'text-green' : 'text-red',
                  logo: githubLogo
                },
                {
                  name: 'PyPI',
                  available: this.currentNetworkStatus.pip.accessible,
                  statusText: this.currentNetworkStatus.pip.accessible ? this.$t('network.pypi.accessible') : this.$t('network.pypi.inaccessible'),
                  statusColor: this.currentNetworkStatus.pip.accessible ? 'green' : 'red',
                  textColorClass: this.currentNetworkStatus.pip.accessible ? 'text-green' : 'text-red',
                  logo: pypiLogo
                },
                {
                  name: 'HuggingFace',
                  available: this.currentNetworkStatus.huggingface.accessible,
                  statusText: this.currentNetworkStatus.huggingface.accessible ? this.$t('network.huggingface.accessible') : this.$t('network.huggingface.inaccessible'),
                  statusColor: this.currentNetworkStatus.huggingface.accessible ? 'green' : 'red',
                  textColorClass: this.currentNetworkStatus.huggingface.accessible ? 'text-green' : 'text-red',
                  logo: huggingfaceLogo
                }
              ];
              this.allAccessible = this.networkStatuses.every(status => status.available);
            }
          }
        }
      }
    } catch (error) {
      // Log error in English
      console.error('Failed to get network status:', error);
    } finally {
      // 确保无论成功还是失败都设置 loading 为 false
      this.loading = false;
    }
  },
  methods: {
    // 检查网络状态
    async checkNetworkStatus() {
      try {
        // 获取当前语言并传递给后端
        const currentLocale = this.$i18n.locale;
        
        const response = await api.get('system/network-status', {
          params: { 
            lang: currentLocale 
          }
        });
        
        console.log('response:', response);
        if (response.data.code === 200) {
          const result = response.data.data;
          
          // 获取检查ID并开始轮询日志
          const checkId = result.checkId;
          if (checkId) {
            this.logDialog.checkId = checkId;
            this.logDialog.logs = [];
            this.logDialog.loading = true;
            this.logDialog.show = true;
            this.logDialog.status = 'in_progress';
            this.startPolling();
          }
        }
      } catch (error) {
        // Log error in English
        console.error('Failed to check network status:', error);
      }
    },
    
    // 强制重新检测网络状态（忽略缓存）
    async forceCheckNetworkStatus() {
      this.checkingNetwork = true;
      try {
        // 获取当前语言并传递给后端
        const currentLocale = this.$i18n.locale;
        
        // 使用 POST 请求并传递 force=true 参数
        const response = await api.post('system/network-status', { 
          force: true,
          lang: currentLocale 
        });
        
        console.log('Force check network response:', response);
        
        if (response.data.code === 200) {
          const result = response.data.data;
          const checkId = result.checkId;
          
          if (checkId) {
            this.logDialog.checkId = checkId;
            this.logDialog.logs = [];
            this.logDialog.loading = true;
            this.logDialog.show = true;
            this.logDialog.status = 'in_progress';
            this.startPolling();
          }
        }
      } catch (error) {
        // Log error in English
        console.error('Failed to force check network status:', error);
      } finally {
        this.checkingNetwork = false;
      }
    },
    
    // 停止轮询
    stopPolling() {
      if (this.logDialog.polling) {
        clearInterval(this.logDialog.polling);
        this.logDialog.polling = null;
      }
    },
    
    // 获取网络检查日志
    async fetchNetworkCheckLog() {
      if (!this.logDialog.checkId) return;
      
      try {
        // 获取当前语言
        const currentLocale = this.$i18n.locale;
        
        // 使用正确的 API 调用获取网络检查日志，并传递语言参数
        const response = await api.getNetworkCheckLog(this.logDialog.checkId, { lang: currentLocale });
        
        console.log('log response:', response);
        if (response.body && response.body.code === 200) {
          const data = response.body.data;
          this.logDialog.logs = data.log.logs;
          this.logDialog.status = data.log.status;
          this.currentNetworkStatus = data.currentNetworkStatus;
          
          // 如果检查已完成，停止轮询并更新总体网络状态
          if (data.log.status === 'completed' || data.log.status === 'failed') {
            this.stopPolling();
            
            // 更新页面上的网络状态
            this.refreshNetworkStatus();
          }
        }
      } catch (error) {
        // Log error in English
        console.error('Failed to fetch network check log:', error);
        // 如果获取日志失败，停止轮询
        this.stopPolling();
      } finally {
        this.logDialog.loading = false;
      }
    },
    
    // 开始轮询网络检查日志
    startPolling() {
      // 先停止现有的轮询
      this.stopPolling();
      
      // 立即获取一次日志
      this.fetchNetworkCheckLog();
      
      // 设置轮询间隔
      this.logDialog.polling = setInterval(() => {
        this.fetchNetworkCheckLog();
      }, this.logDialog.pollingInterval);
    },
    
    // 刷新网络状态显示
    refreshNetworkStatus() {
      if (this.currentNetworkStatus) {
        this.networkStatuses = [
          {
            name: 'Github',
            available: this.currentNetworkStatus.github.accessible,
            statusText: this.currentNetworkStatus.github.accessible ? this.$t('network.github.accessible') : this.$t('network.github.inaccessible'),
            statusColor: this.currentNetworkStatus.github.accessible ? 'green' : 'red',
            textColorClass: this.currentNetworkStatus.github.accessible ? 'text-green' : 'text-red',
            logo: githubLogo
          },
          {
            name: 'PyPI',
            available: this.currentNetworkStatus.pip.accessible,
            statusText: this.currentNetworkStatus.pip.accessible ? this.$t('network.pypi.accessible') : this.$t('network.pypi.inaccessible'),
            statusColor: this.currentNetworkStatus.pip.accessible ? 'green' : 'red',
            textColorClass: this.currentNetworkStatus.pip.accessible ? 'text-green' : 'text-red',
            logo: pypiLogo
          },
          {
            name: 'HuggingFace',
            available: this.currentNetworkStatus.huggingface.accessible,
            statusText: this.currentNetworkStatus.huggingface.accessible ? this.$t('network.huggingface.accessible') : this.$t('network.huggingface.inaccessible'),
            statusColor: this.currentNetworkStatus.huggingface.accessible ? 'green' : 'red',
            textColorClass: this.currentNetworkStatus.huggingface.accessible ? 'text-green' : 'text-red',
            logo: huggingfaceLogo
          }
        ];
        this.allAccessible = this.networkStatuses.every(status => status.available);
      }
    },
    
    // 根据日志类型返回图标
    logIcon(type: string): string {
      switch(type) {
        case 'error': return 'error';
        case 'success': return 'check_circle';
        case 'info': 
        default: return 'info';
      }
    },
    
    // 根据日志类型返回颜色
    logColor(type: string): string {
      switch(type) {
        case 'error': return 'negative';
        case 'success': return 'positive';
        case 'info': 
        default: return 'info';
      }
    },
    
    // 格式化时间戳
    formatTime(timestamp: number): string {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    }
  },
  beforeUnmount() {
    // 组件卸载前停止轮询
    this.stopPolling();
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

.log-container {
  max-height: 400px;
  overflow-y: auto;
}

.log-service {
  font-weight: bold;
  margin-right: 6px;
}

.network-check-buttons {
  margin-top: 16px;
  text-align: right;
}
</style>