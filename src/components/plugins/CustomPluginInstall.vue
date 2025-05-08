<template>
  <q-card flat bordered class="custom-plugin-install q-pa-md">
    <q-card-section>
      <div class="text-h6">{{ $t('plugins.customInstall.title') }}</div>
      <div class="text-caption q-mt-sm">{{ $t('plugins.customInstall.subtitle') }}</div>
    </q-card-section>

    <q-card-section>
      <q-form @submit="onSubmit" class="q-gutter-md">
        <!-- GitHub URL 输入框 -->
        <q-input
          v-model="githubUrl"
          :label="$t('plugins.customInstall.githubUrlLabel')"
          :hint="$t('plugins.customInstall.githubUrlHint')"
          outlined
          :rules="[val => !!val || $t('plugins.customInstall.urlRequired')]"
          lazy-rules
        >
          <template v-slot:prepend>
            <q-icon name="fab fa-github" />
          </template>
        </q-input>

        <!-- 分支输入框（可选） -->
        <q-input
          v-model="branch"
          :label="$t('plugins.customInstall.branchLabel')"
          :hint="$t('plugins.customInstall.branchHint')"
          outlined
        >
          <template v-slot:prepend>
            <q-icon name="fork_right" />
          </template>
        </q-input>

        <!-- 安装按钮 -->
        <div class="row justify-end q-mt-md">
          <q-btn
            :label="$t('plugins.customInstall.installButton')"
            type="submit"
            color="primary"
            :loading="installing"
          />
        </div>
      </q-form>
    </q-card-section>

    <!-- 最近安装的插件列表 -->
    <q-card-section v-if="recentInstalls.length > 0">
      <div class="text-subtitle2 q-mb-sm">{{ $t('plugins.customInstall.recentInstalls') }}</div>
      <q-list bordered separator>
        <q-item v-for="install in recentInstalls" :key="install.id">
          <q-item-section>
            <q-item-label>{{ install.pluginName || install.pluginId }}</q-item-label>
            <q-item-label caption>{{ install.url }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge :color="install.status === 'success' ? 'positive' : (install.status === 'failed' ? 'negative' : 'primary')">
              {{ $t(`plugins.history.${install.status}`) }}
            </q-badge>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import api from 'src/api';

const $q = useQuasar();
const { t } = useI18n();

// 定义安装记录的接口
interface InstallRecord {
  id: string;
  pluginId: string;
  pluginName: string;
  url: string;
  status: 'running' | 'success' | 'failed';
}

// 表单数据
const githubUrl = ref('');
const branch = ref('main');
const installing = ref(false);

// 最近安装的插件列表，添加类型定义
const recentInstalls = ref<InstallRecord[]>([]);

// 提交表单
const onSubmit = async () => {
  if (!githubUrl.value) {
    $q.notify({
      color: 'negative',
      message: t('plugins.customInstall.urlRequired'),
      icon: 'error'
    });
    return;
  }

  installing.value = true;
  
  try {
    // 调用API安装插件
    const response = await api.installCustomPlugin(githubUrl.value, branch.value);
    const { success, message, taskId, pluginId } = response.body || {}; // 使用body而不是data
    
    if (success) {
      $q.notify({
        color: 'positive',
        message: t('plugins.customInstall.startedInstall', { url: githubUrl.value }),
        icon: 'check_circle'
      });
      
      // 添加到最近安装列表
      recentInstalls.value.unshift({
        id: taskId,
        pluginId,
        pluginName: pluginId,
        url: githubUrl.value,
        status: 'running'
      });
      
      // 轮询安装进度
      pollInstallProgress(taskId, pluginId);
      
      // 清空表单
      githubUrl.value = '';
    } else {
      $q.notify({
        color: 'negative',
        message: message || t('plugins.customInstall.installFailed'),
        icon: 'error'
      });
    }
  } catch (error) {
    console.error('Failed to install custom plugin:', error);
    $q.notify({
      color: 'negative',
      message: t('plugins.customInstall.installFailed'),
      icon: 'error'
    });
  } finally {
    installing.value = false;
  }
};

// 轮询安装进度，添加参数类型
const pollInstallProgress = (taskId: string, pluginId: string) => {
  const interval = setInterval(async () => {
    try {
      const response = await api.getPluginProgress(taskId);
      const { completed, progress } = response.body;
      
      if (completed) {
        clearInterval(interval);
        
        // 更新安装状态
        const installItem = recentInstalls.value.find(item => item.id === taskId);
        if (installItem) {
          installItem.status = progress === 100 ? 'success' : 'failed';
        }
        
        // 通知用户
        if (progress === 100) {
          $q.notify({
            color: 'positive',
            message: t('plugins.customInstall.installSuccess', { name: pluginId }),
            icon: 'check_circle'
          });
        } else {
          $q.notify({
            color: 'negative',
            message: t('plugins.customInstall.installFailed'),
            icon: 'error'
          });
        }
      }
    } catch (error) {
      console.error('Failed to get plugin progress:', error);
      clearInterval(interval);
    }
  }, 1000);
};
</script>

<style scoped>
.custom-plugin-install {
  max-width: 800px;
  margin: 0 auto;
}
</style> 