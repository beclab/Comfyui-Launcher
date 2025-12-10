<template>
  <div>
    <q-card class="comfyui-card custom-card">
      <div class="comfyui-container">
        <!-- 左侧放logo -->
        <div class="logo-container">
          <img src="~assets/icon2.png" alt="ComfyUI" class="app-logo" />
        </div>

        <!-- 右侧放标题和版本信息 -->
        <div class="content-container">
          <div class="header-row">
            <div class="title-section">
              <div class="comfyui-title">{{ $t('comfyuiStatus.title') }}</div>

              <!-- 添加状态指示器 -->
              <q-chip
                size="sm"
                :class="[
                  'status-chip',
                  isConnected ? 'status-running' : 'status-stopped'
                ]"
              >
                <q-icon
                  :name="isConnected ? 'play_circle' : 'stop_circle'"
                  size="xs"
                  class="q-mr-xs status-icon"
                  :class="isConnected ? 'running-icon' : 'stopped-icon'"
                />
                <span class="status-text">{{ isConnected ? $t('comfyuiStatus.running') : $t('comfyuiStatus.stopped') }}</span>
              </q-chip>
            </div>
          </div>

          <div class="version-row">
            <q-chip dense size="sm" class="version-chip">
              <span class="version-text">{{ $t('comfyuiStatus.version.comfyui') }} {{ versions.comfyui }}</span>
            </q-chip>
            <q-chip dense size="sm" class="version-chip">
              <span class="version-text">{{ $t('comfyuiStatus.version.frontend') }} {{ versions.frontend }}</span>
            </q-chip>
            <q-chip dense size="sm" class="version-chip">
              <span class="version-text">{{ $t('comfyuiStatus.version.launcher') }} {{ versions.app }}</span>
            </q-chip>
            <q-chip dense size="sm" class="version-chip">
              <span class="version-text">{{ $t('comfyuiStatus.version.gpu') }}: {{ $t(`comfyuiStatus.gpuMode.${gpuMode}`) }}</span>
            </q-chip>
          </div>


        </div>

        <div class="action-row">
          <!-- 根据状态显示不同的按钮 -->
          <template v-if="isConnected">
            <!-- ComfyUI运行中 - 显示打开和停止按钮 -->
            <q-btn
              flat
              rounded
              icon="open_in_new"
              class="open-btn"
              @click="openComfyUI"
            >
              <span class="btn-text">{{ $t('comfyuiStatus.buttons.open') }}</span>
            </q-btn>

            <q-btn
              flat
              rounded
              icon="stop_circle"
              class="stop-btn"
              @click="stopComfyUI"
              :loading="isStopping"
            >
              <span class="btn-text">{{ $t('comfyuiStatus.buttons.stop') }}</span>
            </q-btn>
          </template>

          <template v-else>
            <!-- ComfyUI已停止 - 只显示启动按钮 -->
            <q-btn
              flat
              rounded
              icon="play_circle_outline"
              class="start-btn"
              @click="checkAndStartComfyUI"
              :loading="isStarting"
            >
              <span class="start-btn-text">{{ $t('comfyuiStatus.buttons.start') }}</span>
            </q-btn>
          </template>

          <q-btn
            round
            flat
            color="grey-7"
            icon="more_vert"
            size="sm"
            class="menu-btn"
            style="background-color: #f5f5f5; border-radius: var(--border-radius-md);"
          >
            <q-menu >
              <q-list >
                <q-item clickable v-close-popup @click="showLogView" style="border-radius: var(--border-radius-md); min-height: 24px!important; color: var(--text-normal)!important; margin: 6px; padding-right: 6px; padding-left: 6px;">
                  <q-item-section avatar style="width: 24px; height: 24px; margin-left: 6px; padding-right: 0px; padding-left: 0px;">
                    <q-icon name="visibility" style="width: 24px; height: 24px; padding-right: 0px; padding-left: 0px;"/>
                  </q-item-section>
                  <q-item-section style="margin-left: 4px; margin-right: 6px;">{{ $t('comfyuiStatus.menu.viewLogs') }}</q-item-section>
                </q-item>

                <q-item clickable v-close-popup @click="showResetLog" style="border-radius: var(--border-radius-md); min-height: 24px!important; color: var(--text-normal)!important; margin: 6px; padding-right: 6px; padding-left: 6px;">
                  <q-item-section avatar style="width: 24px!important; height: 24px; margin-left: 6px; padding-right: 0px;">
                    <q-icon name="history" style="width: 24px; height: 24px; padding-right: 0px; padding-left: 0px !important;"/>
                  </q-item-section>
                  <q-item-section style="margin-left: 4px; margin-right: 6px;">{{ $t('comfyuiStatus.menu.viewResetLogs') }}</q-item-section>
                </q-item>

                <q-item clickable v-close-popup @click="resetComfyUI" style="border-radius: var(--border-radius-md); min-height: 24px!important; color: var(--text-normal)!important; margin: 6px; padding-right: 6px; padding-left: 6px;">
                  <div class="row">
                    <q-item-section avatar style="width: 24px; height: 24px; margin-left: 6px; padding-right: 0px; padding-left: 0px;">
                      <q-icon name="refresh" style="width: 24px; height: 24px; padding-right: 0px; padding-left: 0px;"/>
                    </q-item-section>
                    <q-item-section style="margin-left: 4px; margin-right: 6px;">{{ $t('comfyuiStatus.menu.reset') }}</q-item-section>
                  </div>

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
            <div class="text-h6">{{ $t('comfyuiStatus.logs.title') }}</div>
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
                {{ $t('comfyuiStatus.logs.loading') }}
              </div>
            </div>
          </q-scroll-area>
        </q-card-section>

        <q-card-actions align="right" class="log-dialog-actions">
          <div class="row items-center full-width justify-end q-gutter-md">
            <q-btn flat round color="primary" icon="refresh" @click="fetchLogs">
              <q-tooltip>{{ $t('comfyuiStatus.logs.refresh') }}</q-tooltip>
            </q-btn>
            <q-btn flat round color="primary" icon="file_download" @click="downloadLogs">
              <q-tooltip>{{ $t('comfyuiStatus.logs.download') }}</q-tooltip>
            </q-btn>
          </div>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showConfirmDialog" persistent>
      <q-card>
        <!-- 删除左上角图标 -->
        <q-card-section class="row items-center">
          <!-- <q-avatar icon="warning" color="warning" text-color="white" /> -->
          <span class="q-ml-sm" style="color: var(--text-important); font-weight: bold;">{{ $t('comfyuiStatus.dialog.missingModelsTitle') }}</span>
          <!-- 右上角增加 ❌ 关闭按钮 -->
          <q-btn flat round dense icon="close" @click="showConfirmDialog = false" style="margin-left: auto;" />
        </q-card-section>
        <q-card-section style="color: var(--text-normal); padding-top: 8px; padding-bottom: 8px; padding-left: 24px;">
          {{ $t('comfyuiStatus.dialog.missingModelsMessage') }}
        </q-card-section>
        <!-- 提示文案下方增加单选框"记住我的选择, 下次无需弹窗确认" -->
        <q-card-section style="color: var(--text-normal)">
          <q-checkbox v-model="rememberChoice" :label="$t('comfyuiStatus.dialog.rememberChoice')" />
        </q-card-section>
        <q-card-actions align="right" style="margin-right: 10px; margin-bottom: 10px;">
          <!-- 下方按钮 去安装模型 和 仍然启动 对调位置 -->
          <q-btn flat :label="$t('comfyuiStatus.dialog.confirmStart')" style="color: var(--text-normal); border: 1px solid var(--text-normal); border-radius: var(--border-radius-md);" @click="confirmStartComfyUI" />
          <q-btn :label="$t('comfyuiStatus.dialog.installModels')" color="primary" @click="goToModels" style="box-shadow: none; border-radius: var(--border-radius-md);" />


        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- 添加重置日志对话框组件 -->
    <ResetLogDialog ref="resetLogDialog" />

    <!-- 添加重置弹窗组件 -->
    <ResetDialogs ref="resetDialogs" />

    <!-- 修改资源包安装对话框 -->
    <ResourcePackDialog
      ref="resourcePackDialog"
      v-model:visible="showResourcePackDialog"
      :pack-id="selectedPackId"
      @installation-complete="handleResourcePackInstallComplete"
      @update:visible="(val) => !val && handleResourcePackDialogClose()"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { modelsApi, Model } from '../api';
import api from '../api';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
// import { useRouter } from 'vue-router';
// 引入重置弹窗组件类型
import ResetDialogs from '../components/reset/ResetDialogs.vue';
// 引入重置日志对话框组件
import ResetLogDialog from '../components/reset/ResetLogDialog.vue';
// 引入资源包对话框组件
import ResourcePackDialog from '../components/resources/ResourcePackDialog.vue';

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

// 定义 ResetDialogs 组件实例类型
interface ResetDialogsInstance {
  openResetDialog: (language?: string) => void;
}

// 定义 ResetLogDialog 组件实例类型
interface ResetLogDialogInstance {
  openDialog: (language?: string) => void;
}

// 定义版本信息接口
interface VersionInfo {
  comfyui: string;
  frontend: string;
  app: string;
}

export default defineComponent({
  name: 'ComfyUIStatus',
  // 注册组件
  components: {
    ResetDialogs,
    ResetLogDialog,
    ResourcePackDialog
  },

  setup() {
    const $q = useQuasar();
    const { t } = useI18n();
    // const router = useRouter();
    const isConnected = ref(false);
    const models = ref<Model[]>([]);
    const isStarting = ref(false);
    const isStopping = ref(false);
    const essentialModels = ref<EssentialModel[]>([]);
    const installedModels = ref<InstalledModel[]>([]);
    const rememberChoice = ref(false);
    // const handleRememberChoiceChange = (value: boolean) => {
    //   console.log('rememberChoice changed:', value);
    //   try {
    //     rememberChoice.value = value;
    //     localStorage.setItem('rememberComfyUIStartChoice', String(rememberChoice.value));
    //   } catch (error) {
    //     console.error('写入localStorage失败:', error);
    //   }
    // };

    watch(() => rememberChoice.value, () => {
      console.log('rememberChoice 变化:', rememberChoice.value);
    });

    // 添加版本信息和GPU模式
    const versions = ref<VersionInfo>({
      comfyui: 'unknown',
      frontend: 'unknown',
      app: 'unknown'
    });
    const gpuMode = ref('未知');

    // 添加对话框控制变量
    const showConfirmDialog = ref(false);

    // 添加日志相关变量
    const showLogs = ref(false);
    const logsExpanded = ref(true);
    const logs = ref<string[]>([]);

    // 添加对重置弹窗组件的引用，并指定类型
    const resetDialogs = ref<ResetDialogsInstance | null>(null);

    // 添加对重置日志对话框组件的引用
    const resetLogDialog = ref<ResetLogDialogInstance | null>(null);

    // 添加资源包对话框相关变量
    const showResourcePackDialog = ref(false);
    const selectedPackId = ref('');

    // 在setup函数内部添加对话框组件的引用
    const resourcePackDialog = ref<InstanceType<typeof ResourcePackDialog> | null>(null);

    const checkConnection = async () => {
      try {
        // 检查 ComfyUI 连接状态
        const response = await api.getStatus();
        isConnected.value = response.status === 200 && response.body.running;
        // isConnected.value = true

        // 更新版本信息和GPU模式
        if (response.body.versions) {
          versions.value = response.body.versions;
        }

        if (response.body.gpuMode) {
          gpuMode.value = response.body.gpuMode;
        }

        if (isConnected.value) {
          // 如果连接正常，获取模型列表
          models.value = await modelsApi.getModels('local');
        }
      } catch (error) {
        isConnected.value = false;
        console.error('连接 ComfyUI 失败:', error);
      }
    };

    // 修改获取ComfyUI日志的方法，添加语言参数
    const fetchLogs = async () => {
      try {
        // 修正：确保获取简短的语言代码
        let currentLang = $q.lang.getLocale();
        // 如果语言代码包含短横线，只取第一部分
        if (currentLang && currentLang.includes('-')) {
          currentLang = currentLang.split('-')[0];
        }
        // 如果没有获取到语言，回退到浏览器语言或默认语言
        currentLang = currentLang || (navigator.language ? navigator.language.split('-')[0] : 'en');

        console.log(`Using language for logs: ${currentLang}`);

        // 将语言参数传递给后端
        const response = await api.getLogs(currentLang);
        if (response && response.body && response.body.logs) {
          logs.value = response.body.logs;
        } else {
          logs.value = [t('comfyuiStatus.messages.logsUnavailable')];
        }
      } catch (error) {
        console.error('获取日志失败:', error);
        logs.value = [t('comfyuiStatus.messages.logsFailed')];
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

        if (rememberChoice.value) {
          $q.notify({
            type: 'warning',
            message: t('comfyuiStatus.messages.missingModelsWarning')
          });
          startComfyUI();
          return;
        } else {
          // 显示自定义对话框
          showConfirmDialog.value = true;
        }

      } else {
        startComfyUI();
      }
    };

    // 确认启动ComfyUI
    const confirmStartComfyUI = () => {
      showConfirmDialog.value = false;
      startComfyUI();
    };

    // 修改前往模型页面方法，改为打开基础资源包安装弹窗
    const goToModels = () => {
      showConfirmDialog.value = false;
      selectedPackId.value = 'essential-models-pack';
      showResourcePackDialog.value = true;
    };

    // 添加处理资源包安装完成的方法
    const handleResourcePackInstallComplete = (result: { success: boolean, error?: string, packId?: string }) => {
      if (result.success) {
        $q.notify({
          color: 'positive',
          icon: 'check_circle',
          message: t('comfyuiStatus.messages.resourcePackInstalled', { name: result.packId || t('comfyuiStatus.messages.resourcePack') }),
          timeout: 3000
        });
      } else {
        $q.notify({
          color: 'negative',
          icon: 'error',
          message: t('comfyuiStatus.messages.resourcePackFailed', { error: result.error || t('comfyuiStatus.messages.unknownError') }),
          timeout: 5000
        });
      }
    };

    // 启动 ComfyUI
    const startComfyUI = async () => {
      localStorage.setItem('rememberComfyUIStartChoice', String(rememberChoice.value));
      try {
        isStarting.value = true;
        showLogs.value = false; // 重置日志显示状态

        // Get current language for API call
        let currentLang = $q.lang.getLocale();
        if (currentLang && currentLang.includes('-')) {
          currentLang = currentLang.split('-')[0];
        }
        currentLang = currentLang || (navigator.language ? navigator.language.split('-')[0] : 'en');

        const response = await api.startComfyUI(currentLang);

        // 检查服务器返回的响应状态和结构
        console.log('ComfyUI启动响应:', response);

        if (response && response.body && response.body.success) {
          $q.notify({
            type: 'positive',
            message: t('comfyuiStatus.messages.starting')
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
            message: response?.body?.message || t('comfyuiStatus.messages.startFailed')
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
          message: t('comfyuiStatus.messages.startFailed')
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

        // Get current language for API call
        let currentLang = $q.lang.getLocale();
        if (currentLang && currentLang.includes('-')) {
          currentLang = currentLang.split('-')[0];
        }
        currentLang = currentLang || (navigator.language ? navigator.language.split('-')[0] : 'en');

        await api.stopComfyUI(currentLang);
        $q.notify({
          type: 'info',
          message: t('comfyuiStatus.messages.stopped')
        });
        isConnected.value = false;
        isStopping.value = false;
      } catch (error) {
        isStopping.value = false;
        $q.notify({
          type: 'negative',
          message: t('comfyuiStatus.messages.stopFailed')
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

    // 修改重置ComfyUI方法，改为打开重置弹窗
    const resetComfyUI = () => {
      // 调用重置弹窗组件的方法
      if (resetDialogs.value) {
        resetDialogs.value.openResetDialog('zh');
      }
    };

    // 添加下载日志方法
    const downloadLogs = () => {
      if (logs.value.length === 0) {
        $q.notify({
          type: 'warning',
          message: t('comfyuiStatus.messages.noLogsToDownload')
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

    // 打开ComfyUI界面
    const openComfyUI = () => {
      const url = new URL(window.location.href);
      const domainParts = url.hostname.split('.');
      domainParts[0] = '806ba3e40';
      url.hostname = domainParts.join('.');
      url.pathname = '/';
      window.open(url.toString(), '_blank');
    };

    // 添加打开重置日志对话框的方法
    const showResetLog = () => {
      if (resetLogDialog.value) {
        resetLogDialog.value.openDialog('zh');
      }
    };

    // 在处理ResourcePackDialog关闭的地方添加重置状态
    const handleResourcePackDialogClose = () => {
      showResourcePackDialog.value = false;
      // 如果有引用，调用重置方法
      if (resourcePackDialog.value) {
        resourcePackDialog.value.resetState();
      }
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
      downloadLogs,
      // 添加版本信息和GPU模式
      versions,
      gpuMode,
      // 添加打开ComfyUI方法
      openComfyUI,
      rememberChoice,
      resetDialogs,
      resetLogDialog,
      showResetLog,
      // 添加新的返回值
      showResourcePackDialog,
      selectedPackId,
      handleResourcePackInstallComplete,
      resourcePackDialog, // 添加组件引用
      handleResourcePackDialogClose, // 添加处理方法
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

  border-radius: 8px;

}

.app-logo {
  width: 80px;
  height: 80px;
  object-fit: contain;
  border-radius: 8px;
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

/* 状态指示器样式 */
.status-chip {
  height: 18px !important;
  padding: 0 8px !important;
  display: flex;
  align-items: center;
}

.status-running {
  background-color: var(--positive-bg-color) !important;
}

.status-stopped {
  background-color: var(--warning-bg-color) !important;
}

/* 图标颜色样式 */
.status-icon {
  font-size: 14px;
}

.running-icon {
  color: var(--positive-text-color) !important;
}

.stopped-icon {
  color: var(--warning-text-color) !important;
}

.status-text {
  font-size: 12px;
  font-weight: 500;
}

.status-running .status-text {
  color: var(--positive-text-color);
}

.status-stopped .status-text {
  color: var(--warning-text-color);
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

/* 按钮通用样式 */
.start-btn, .open-btn, .stop-btn {
  border-radius: var(--border-radius-md) !important;
  padding: 6px 24px !important;
  /* height: 28px !important; */
  font-weight: normal !important;
}

/* 启动按钮样式 */
.start-btn, .open-btn{
  background-color: var(--normal-button-bg-color) !important;
  color: var(--select-button-text-color) !important;
}


/* 停止按钮样式 */
.stop-btn {
  background-color: var(--negative-bg-color) !important;
  color: var(--negative-text-color) !important;
}

.start-btn-text, .btn-text {
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
.q-card-section.q-ml-sm {
  margin-left: 0; /* 调整提示文案的左侧边距，使其与title对齐 */
  align-self: center; /* 垂直居中对齐 */
}

.q-item__section--avatar {
  width: 32px!important;
  min-width: 32px!important;
}
</style>
