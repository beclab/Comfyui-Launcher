<template>
  <div>
    <div class="comfyui-container row justify-between items-center">
      <div class="comfyui-content row justify-start items-center">
        <div class="logo-container">
          <img src="~assets/comfyui-logo2.png" alt="ComfyUI" class="app-logo" />
        </div>

        <div class="comfyui-text column justify-center q-ml-md">
          <div class="row justify-start items-center">
            <div class="text-h5 text-ink-1 q-mr-sm">
              {{ t('base.comfyui') }}
            </div>

            <div
              :class="
                isConnected
                  ? 'text-positive bg-green-default'
                  : 'text-warning bg-yellow-alpha'
              "
              class="status-chip"
            >
              <q-icon
                size="16px"
                :name="isConnected ? 'sym_r_play_circle' : 'sym_r_stop_circle'"
              />
              {{ isConnected ? t('base.running') : t('base.stopped') }}
            </div>
          </div>

          <div class="row justify-start items-center q-mt-md">
            <div v-for="menu in confyuiMenus" :key="menu.key">
              <div class="comfyui-menu text-ink-2 text-body3">
                {{ menu.key }} : {{ menu.value }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row justify-end">
        <q-btn
          unelevated
          class="status-panel-btn text-blue-default bg-light-blue-alpha"
          @click="checkAndStartComfyUI"
          :loading="isStarting"
        >
          <q-icon
            v-if="!isConnected"
            size="20px"
            style="margin-right: 2px"
            name="sym_r_play_circle"
          />

          {{ isConnected ? t('base.open') : t('base.start') }}
        </q-btn>
        <q-btn
          v-if="isConnected"
          unelevated
          class="status-panel-btn text-red-default text-ink-2 bg-red-alpha"
          @click="stopComfyUI"
          :loading="isStopping"
        >
          <q-icon
            size="20px"
            style="margin-right: 2px"
            name="sym_r_stop_circle"
          />
          {{ t('base.stop') }}
        </q-btn>

        <q-btn
          unelevated
          class="q-ml-sm btn-size-sm btn-no-text bg-btn-bg-pressed"
          icon="sym_r_more_vert"
          :loading="isStopping"
        >
          <bt-popup style="width: 176px">
            <bt-popup-item
              v-close-popup
              icon="sym_r_visibility"
              :title="t('base.view_log')"
              @on-item-click="openLogDialog"
            />
            <bt-popup-item
              v-close-popup
              icon="sym_r_refresh"
              :title="t('base.erase_and_restore')"
              @on-item-click="resetComfyui"
            />
          </bt-popup>
        </q-btn>
      </div>
    </div>

    <div class="warning-bg row justify-start q-px-md q-py-xs bg-red-soft">
      <q-icon name="sym_r_error" size="16px" color="negative" />
      <div class="text-body3 text-negative q-ml-sm">
        <span>{{ t('base.startup_error') }}</span>
        <span
          style="text-decoration: underline"
          class="cursor-pointer"
          @click="openLogDialog"
        >
          {{ t('base.click_to_view') }}
        </span>
      </div>
    </div>

    <q-separator
      class="bg-separator full-width q-mt-xl"
      style="margin-bottom: 44px"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import BtPopupItem from 'components/base/BtPopupItem.vue';
import ComfyUILogDialog from 'components/dialog/ComfyUILogDialog.vue';
import ModelMissingDialog from 'components/dialog/ModelMissingDialog.vue';
import ConfirmRestoreDialog from 'components/dialog/ConfirmRestoreDialog.vue';
import RestoreWarningDialog from 'components/dialog/RestoreWarningDialog.vue';
import BtPopup from 'components/base/BtPopup.vue';
import { useLogStore } from 'stores/logs';
import { modelsApi, Model } from '../api';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';
import api from '../api';

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

interface ConfyuiMenu {
  key: string;
  value: string;
}

const { t } = useI18n();
const $q = useQuasar();
const isConnected = ref(false);
const models = ref<Model[]>([]);
const isStarting = ref(false);
const isStopping = ref(false);
const confyuiMenus = ref<ConfyuiMenu[]>([
  {
    key: 'comfyUI',
    value: '0.3.26',
  },
  {
    key: 'frontend',
    value: '0.3.26',
  },
  {
    key: 'launcher',
    value: '0.3.26',
  },
  {
    key: 'GPU',
    value: 'shared',
  },
]);
const essentialModels = ref<EssentialModel[]>([]);
const installedModels = ref<InstalledModel[]>([]);

const logStore = useLogStore();
const openLogDialog = () => {
  $q.dialog({
    component: ComfyUILogDialog,
  });
};
const resetComfyui = () => {
  $q.dialog({
    component: RestoreWarningDialog,
  }).onOk(() => {
    $q.dialog({
      component: ConfirmRestoreDialog,
    });
  });
};

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

// 检查基础模型是否已安装
const checkEssentialModels = async () => {
  try {
    // 获取必要基础模型列表
    const essentialResponse = await api.getEssentialModels();
    if (essentialResponse && essentialResponse.body) {
      essentialModels.value = Array.isArray(essentialResponse.body)
        ? essentialResponse.body
        : [];
    }

    // 获取已安装模型列表
    const installedResponse = await api.getModels();
    if (installedResponse && installedResponse.body) {
      installedModels.value = Array.isArray(installedResponse.body)
        ? installedResponse.body.filter(
            (model: InstalledModel) => model.installed
          )
        : [];
    }

    // 检查是否所有基础模型都已安装
    return essentialModels.value.every((essModel) =>
      installedModels.value.some((insModel) => insModel.name === essModel.name)
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
    $q.dialog({
      component: ModelMissingDialog,
    })
      .onOk(() => {
        //Do Nothing
      })
      .onCancel(() => {
        startComfyUI();
      });
  } else {
    // 所有基础模型已安装，直接启动
    startComfyUI();
  }
};

// 启动 ComfyUI
const startComfyUI = async () => {
  try {
    isStarting.value = true;
    logStore.showLogs = false; // 重置日志显示状态

    const response = await api.startComfyUI();

    // 检查服务器返回的响应状态和结构
    console.log('ComfyUI启动响应:', response);

    if (response && response.body && response.body.success) {
      $q.notify({
        type: 'positive',
        message: 'ComfyUI 正在启动，请稍候...',
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
        message: response?.body?.message || '启动 ComfyUI 失败',
      });

      // 确保无论如何都能显示日志区域
      if (response?.body?.logs && response.body.logs.length > 0) {
        console.log('收到日志数据，长度:', response.body.logs.length);
        logStore.logs = response.body.logs;
        logStore.showLogs = true;
      } else {
        // 否则尝试获取日志
        await logStore.fetchLogs();
        logStore.showLogs = true;
      }
    }
  } catch (error) {
    isStarting.value = false;
    $q.notify({
      type: 'negative',
      message: '启动 ComfyUI 失败',
    });
    console.error('启动 ComfyUI 失败:', error);

    // 启动异常时尝试获取日志
    await logStore.fetchLogs();
    logStore.showLogs = true;
  }
};

// 停止 ComfyUI
const stopComfyUI = async () => {
  try {
    isStopping.value = true;
    await api.stopComfyUI();
    $q.notify({
      type: 'info',
      message: 'ComfyUI 已停止',
    });
    isConnected.value = false;
    isStopping.value = false;
  } catch (error) {
    isStopping.value = false;
    $q.notify({
      type: 'negative',
      message: '停止 ComfyUI 失败',
    });
    console.error('停止 ComfyUI 失败:', error);
  }
};

// 计算已安装模型数量
const installedModelsCount = computed(() => {
  return models.value.filter((model) => model.installed).length;
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
</script>

<style scoped lang="scss">
.comfyui-container {
  width: 100%;
  padding: 0;
  margin-bottom: 15px;
  background-color: transparent;

  .comfyui-content {
    display: flex;
    align-items: stretch;
    background-color: transparent;

    .logo-container {
      width: 72px;
      height: 72px;
      background-color: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;

      .app-logo {
        width: 60px;
        height: 60px;
        object-fit: contain;
      }
    }

    .comfyui-text {
      .status-chip {
        border-radius: 999px;
        padding: 4px 8px;
      }

      .comfyui-menu {
        height: 20px;
        border-radius: 4px;
        margin-right: 4px;
        padding: 2px 8px;
        background: $background-hover;
      }
    }
  }

  .status-panel-btn {
    width: 96px;
    height: 32px;
    border-radius: 8px;
    padding: 0 !important;
    text-transform: capitalize;
  }
}

.warning-bg {
  border-radius: 12px;
}
</style>
