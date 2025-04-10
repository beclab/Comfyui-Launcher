<template>
  <div>
    <q-card class="comfyui-card custom-card">
      <div class="comfyui-container">
        <!-- 左侧放logo -->
        <div class="logo-container">
          <img src="~assets/comfyui-logo2.png" alt="ComfyUI" class="app-logo" />
        </div>

        <!-- 右侧放标题和版本信息 -->
        <div class="content-container">
          <div class="header-row">
            <div class="title-section">
              <div class="comfyui-title">ComfyUI</div>
              <q-chip size="sm" class="creator-chip">
                <span class="creator-text">创作卡</span>
              </q-chip>
            </div>
          </div>
          
          <div class="version-row">
            <q-chip dense size="sm" class="version-chip">
              <span class="version-text">comfyui 0.3.26</span>
            </q-chip>
            <q-chip dense size="sm" class="version-chip">
              <span class="version-text">frontend v0.3.26</span>
            </q-chip>
            <q-chip dense size="sm" class="version-chip">
              <span class="version-text">launcher v0.3.26</span>
            </q-chip>
            <q-chip dense size="sm" class="version-chip">
              <span class="version-text">GPU: Shared</span>
            </q-chip>
          </div>
          

        </div>
          
          <div class="action-row">
            <q-btn 
              flat
              rounded
              icon="play_circle_outline"
              class="start-btn"
              @click="checkAndStartComfyUI"
              :loading="isStarting"
            >
              <span class="start-btn-text">启动</span>
            </q-btn>
            
            <q-btn 
              round
              flat
              color="grey-7"
              icon="more_vert"
              size="sm"
              class="menu-btn"
              style="background-color: #f5f5f5; border-radius: var(--border-radius-md);"
            >
              <q-menu>
                <q-list style="min-width: 140px">
                  <q-item clickable v-close-popup @click="showLogView">
                    <q-item-section avatar>
                      <q-icon name="visibility" />
                    </q-item-section>
                    <q-item-section>查看日志</q-item-section>
                  </q-item>
                  
                  <q-item clickable v-close-popup @click="resetComfyUI">
                    <q-item-section avatar>
                      <q-icon name="refresh" />
                    </q-item-section>
                    <q-item-section>抹掉并还原</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </div>
      </div>
    </q-card>

    <!-- 将日志显示改为对话框形式 -->
    <q-dialog v-model="showLogs" persistent class="log-dialog">
      <q-card class="log-dialog-card">
        <q-card-section class="log-dialog-header">
          <div class="row items-center justify-between full-width">
            <div class="text-h6">ComfyUI 日志</div>
            <q-btn flat round dense icon="close" @click="showLogs = false" />
          </div>
        </q-card-section>

        <q-card-section class="log-content-section q-pa-none">
          <q-scroll-area style="height: 400px;" class="log-scroll-area">
            <div class="q-pa-md log-content">
              <div v-for="(log, index) in logs" :key="index" :class="{'log-error': log.includes('ERROR')}">
                {{ log }}
              </div>
              <div v-if="logs.length === 0" class="text-grey-6 text-center q-pa-md">
                正在加载日志...
              </div>
            </div>
          </q-scroll-area>
        </q-card-section>

        <q-card-actions align="right" class="log-dialog-actions">
          <div class="row items-center full-width justify-end q-gutter-md">
            <q-btn flat round color="primary" icon="refresh" @click="fetchLogs">
              <q-tooltip>刷新日志</q-tooltip>
            </q-btn>
            <q-btn flat round color="primary" icon="file_download" @click="downloadLogs">
              <q-tooltip>下载日志</q-tooltip>
            </q-btn>
          </div>
        </q-card-actions>
      </q-card>
    </q-dialog>
    
    <q-dialog v-model="showConfirmDialog" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="warning" text-color="white" />
          <span class="q-ml-sm">缺少基础模型</span>
        </q-card-section>

        <q-card-section>
          您尚未安装所有必要的基础模型，这可能导致ComfyUI无法正常生成图像。是否继续启动？
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="去安装模型" color="primary" @click="goToModels" />
          <q-btn flat label="仍然启动" color="negative" @click="confirmStartComfyUI" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
import { modelsApi, Model } from '../api';
import api from '../api';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';

// 定义模型接口
interface EssentialModel {
  name: string;
  type: string;
  size?: number;
  url?: string;
}

interface InstalledModel {
  name: string;
  type: string;
  installed: boolean;
  path?: string;
  size?: number | string;
}

export default defineComponent({
  name: 'ComfyUIStatus',
  
  setup() {
    const $q = useQuasar();
    const router = useRouter();
    const isConnected = ref(false);
    const models = ref<Model[]>([]);
    const isStarting = ref(false);
    const isStopping = ref(false);
    const essentialModels = ref<EssentialModel[]>([]);
    const installedModels = ref<InstalledModel[]>([]);
    
    // 添加对话框控制变量
    const showConfirmDialog = ref(false);
    
    // 添加日志相关变量
    const showLogs = ref(false);
    const logsExpanded = ref(true);
    const logs = ref<string[]>([]);
    
    const checkConnection = async () => {
      try {
        // 检查 ComfyUI 连接状态
        const response = await api.getStatus();
        isConnected.value = response.status === 200 && response.body.running;
        
        if (isConnected.value) {
          // 如果连接正常，获取模型列表
          models.value = await modelsApi.getModels('local');
        }
      } catch (error) {
        isConnected.value = false;
        console.error('连接 ComfyUI 失败:', error);
      }
    };
    
    // 获取ComfyUI日志
    const fetchLogs = async () => {
      try {
        const response = await api.getLogs();
        if (response && response.body && response.body.logs) {
          logs.value = response.body.logs;
        } else {
          logs.value = ['无法获取日志数据'];
        }
      } catch (error) {
        console.error('获取日志失败:', error);
        logs.value = ['获取日志失败，请稍后重试'];
      }
    };
    
    // 检查基础模型是否已安装
    const checkEssentialModels = async () => {
      try {
        // 获取必要基础模型列表
        const essentialResponse = await api.getEssentialModels();
        if (essentialResponse && essentialResponse.body) {
          essentialModels.value = Array.isArray(essentialResponse.body) ? essentialResponse.body : [];
        }
        
        // 获取已安装模型列表
        const installedResponse = await api.getModels();
        if (installedResponse && installedResponse.body) {
          installedModels.value = Array.isArray(installedResponse.body) 
            ? installedResponse.body.filter((model: InstalledModel) => model.installed) 
            : [];
        }
        
        // 检查是否所有基础模型都已安装
        return essentialModels.value.every(essModel => 
          installedModels.value.some(insModel => insModel.name === essModel.name)
        );
      } catch (error) {
        console.error('检查基础模型失败:', error);
        return false;
      }
    };
    
    // 修改检查基础模型并启动ComfyUI的方法
    const checkAndStartComfyUI = async () => {
      const allEssentialModelsInstalled = await checkEssentialModels();
      
      if (!allEssentialModelsInstalled) {
        // 显示自定义对话框
        showConfirmDialog.value = true;
      } else {
        // 所有基础模型已安装，直接启动
        startComfyUI();
      }
    };
    
    // 确认启动ComfyUI
    const confirmStartComfyUI = () => {
      showConfirmDialog.value = false;
      startComfyUI();
    };
    
    // 前往模型页面
    const goToModels = () => {
      showConfirmDialog.value = false;
      router.push('/models');
    };
    
    // 启动 ComfyUI
    const startComfyUI = async () => {
      try {
        isStarting.value = true;
        showLogs.value = false; // 重置日志显示状态
        
        const response = await api.startComfyUI();
        
        // 检查服务器返回的响应状态和结构
        console.log('ComfyUI启动响应:', response);
        
        if (response && response.body && response.body.success) {
          $q.notify({
            type: 'positive',
            message: 'ComfyUI 正在启动，请稍候...'
          });
          
          // 等待启动完成
          setTimeout(async () => {
            await checkConnection();
            isStarting.value = false;
          }, 5000);
        } else {
          isStarting.value = false;
          
          // 启动失败时显示错误通知
          $q.notify({
            type: 'negative',
            message: response?.body?.message || '启动 ComfyUI 失败'
          });
          
          // 确保无论如何都能显示日志区域
          if (response?.body?.logs && response.body.logs.length > 0) {
            console.log('收到日志数据，长度:', response.body.logs.length);
            logs.value = response.body.logs;
            showLogs.value = true;
            logsExpanded.value = true; // 确保日志区域展开
          } else {
            // 否则尝试获取日志
            await fetchLogs();
            showLogs.value = true;
            logsExpanded.value = true; // 确保日志区域展开
          }
        }
      } catch (error) {
        isStarting.value = false;
        $q.notify({
          type: 'negative',
          message: '启动 ComfyUI 失败'
        });
        console.error('启动 ComfyUI 失败:', error);
        
        // 启动异常时尝试获取日志
        await fetchLogs();
        showLogs.value = true;
        logsExpanded.value = true; // 确保日志区域展开
      }
    };
    
    // 停止 ComfyUI
    const stopComfyUI = async () => {
      try {
        isStopping.value = true;
        await api.stopComfyUI();
        $q.notify({
          type: 'info',
          message: 'ComfyUI 已停止'
        });
        isConnected.value = false;
        isStopping.value = false;
      } catch (error) {
        isStopping.value = false;
        $q.notify({
          type: 'negative',
          message: '停止 ComfyUI 失败'
        });
        console.error('停止 ComfyUI 失败:', error);
      }
    };
    
    // 计算已安装模型数量
    const installedModelsCount = computed(() => {
      return models.value.filter(model => model.installed).length;
    });
    
    // 计算可用模型总数
    const availableModelsCount = computed(() => {
      return models.value.length;
    });
    
    // 定期检查连接状态
    let intervalId: number | null = null;
    onMounted(() => {
      checkConnection();
      intervalId = window.setInterval(checkConnection, 30000); // 每30秒检查一次
    });
    
    onUnmounted(() => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    });
    
    // 添加新的方法
    const showLogView = async () => {
      await fetchLogs();
      showLogs.value = true;
      logsExpanded.value = true;
    };
    
    // 添加重置ComfyUI方法
    const resetComfyUI = () => {
      router.push('/reset');
      // 如果没有专门的重置页面，可以改为通过API调用重置功能
      // api.resetComfyUI().then(() => { 
      //   $q.notify({ type: 'positive', message: 'ComfyUI已重置' });
      // });
    };
    
    // 添加下载日志方法
    const downloadLogs = () => {
      if (logs.value.length === 0) {
        $q.notify({
          type: 'warning',
          message: '没有可下载的日志'
        });
        return;
      }
      
      const logText = logs.value.join('\n');
      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/:/g, '-').substring(0, 19);
      a.href = url;
      a.download = `comfyui-log-${timestamp}.txt`;
      document.body.appendChild(a);
      a.click();
      
      // 清理
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    };
    
    return {
      isConnected,
      installedModelsCount,
      availableModelsCount,
      startComfyUI,
      stopComfyUI,
      checkAndStartComfyUI,
      isStarting,
      isStopping,
      showConfirmDialog,
      confirmStartComfyUI,
      goToModels,
      // 添加日志相关的返回值
      showLogs,
      logsExpanded,
      logs,
      fetchLogs,
      // 添加新方法到返回值
      showLogView,
      resetComfyUI,
      // 添加新方法到返回值
      downloadLogs
    };
  }
});
</script>

<style scoped>
/* 卡片整体样式 */
.custom-card {
  border-radius: 12px !important;
  overflow: hidden !important;
  box-shadow: none !important;
  background-color: white !important;
  border: none !important;
}

.comfyui-card {
  width: 100%;
  padding: 0;
  margin-bottom: 15px;
}

/* 整个容器布局 */
.comfyui-container {
  display: flex;
  align-items: stretch;
  background-color: white;
}

/* Logo容器 */
.logo-container {
  width: 80px;
  height: 80px;
  background-color: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 15px;
  border-radius: 8px;
}

.app-logo {
  width: 65px;
  height: 65px;
  object-fit: contain;
}

/* 内容容器 */
.content-container {
  flex: 1;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

/* 头部行 - 标题和菜单按钮 */
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comfyui-title {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-important);
}

.creator-chip {
  height: 18px !important;
  background-color: rgba(255, 193, 7, 0.1) !important;
  padding: 0 8px !important;
}

.creator-text {
  color: #ffc107;
  font-size: 12px;
  font-weight: 500;
}

/* 版本信息行 */
.version-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}

.version-chip {
  background-color: #f5f5f5 !important;
  color: #757575 !important;
  height: 20px !important;
  padding: 0 10px !important;
}

.version-text {
  font-size: 12px;
  color: var(--text-normal);
}

/* 按钮行 */
.action-row {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-end;
}

/* 新的启动按钮样式 */
.start-btn {
  background-color: var(--normal-button-bg-color) !important;
  color: var(--select-button-text-color) !important;
  border-radius: var(--border-radius-md) !important;
  padding: 0px 24px !important;
  height: 28px !important;
  font-weight: normal !important;
}

.start-btn-text {
  font-size: 13px;
  margin-left: 4px;
}

.menu-btn {
  padding: 8px !important;
  min-height: auto !important;
}

/* 隐藏日志相关样式但保留 */
.log-container {
  border-left: 4px solid #f44336;
  margin-top: 15px;
}

.log-content {
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
}

.log-error {
  color: #f44336;
  font-weight: bold;
}

/* 日志对话框样式 */
.log-dialog {
  /* 添加日志对话框的样式代码 */
}

.log-dialog-card {
  width: 80vw;
  max-width: 900px;
  max-height: 90vh;
}

.log-dialog-header {
  padding: 12px 16px;
  background-color: #f5f5f5;
}

.log-content-section {
  padding: 0;
}

.log-scroll-area {
  background-color: white;
}

.log-content {
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
  font-size: 12px;
}

.log-error {
  color: #f44336;
  font-weight: bold;
}

.log-dialog-actions {
  padding: 8px 16px;
  background-color: #f5f5f5;
}
</style>