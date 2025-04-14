<template>
  <q-page padding>
    <div class="text-h4 q-mb-lg">{{ $t('network.config') }}</div>

    <div v-if="loading" class="text-center q-pa-lg">
      <q-spinner size="3em" color="primary" />
      <div class="q-mt-md">{{ $t('network.loading') }}</div>
    </div>

    <template v-else>
      <!-- Github 配置卡片 -->
      <q-card class="q-mb-md" flat bordered style="border-radius: var(--border-radius-xl);">
        <q-card-section class="relative-position">
          <div class="absolute-top-right q-pa-sm">
            <q-btn outline color="grey-7" style="border-radius: var(--border-radius-md); margin-right: 8px; margin-top: 16px;" @click="checkNetworkStatus('github')">
              <q-icon :name="networkStatus.github ? 'wifi' : 'wifi_off'" style="margin-right: 12px;"/>
              {{ $t('network.checkNetwork') }}
            </q-btn>
          </div>
          <div class="row items-center">
            <q-avatar size="40px" class="q-mr-md">
              <q-img src="../assets/github-logo.png" />
            </q-avatar>
            <div>
              <div class="text-subtitle1">{{ $t('network.github.title') }}</div>
              <div class="text-caption" :class="networkStatus.github ? 'text-positive' : 'text-negative'">
                {{ networkStatus.github ? $t('network.github.accessible') : $t('network.github.inaccessible') }}
              </div>
            </div>
            <q-space />
          </div>
        </q-card-section>
        
        <q-separator />
        
        <q-card-section>
          <div class="text-caption q-mb-xs">{{ $t('network.github.selectUrl') }}</div>
          <q-select
            outlined
            dense
            v-model="githubUrl"
            :options="['https://github.com/','http://gh-proxy.com/', 'https://hub.fastgit.xyz/', 'https://github.com.cnpmjs.org/']"
            placeholder="http://gh-proxy.com/"
            dropdown-icon="expand_more"
            @update:model-value="saveGithubConfig"
          />
        </q-card-section>
      </q-card>

      <!-- PyPI 配置卡片 -->
      <q-card class="q-mb-md" flat bordered style="border-radius: var(--border-radius-xl);">
        <q-card-section class="relative-position">
          <div class="absolute-top-right q-pa-sm">
            <q-btn outline color="grey-7" style="border-radius: var(--border-radius-md); margin-right: 8px; margin-top: 16px;" @click="checkNetworkStatus('pip')">
              <q-icon :name="networkStatus.pip ? 'wifi' : 'wifi_off'" style="margin-right: 12px;" />
              {{ $t('network.checkNetwork') }}
            </q-btn>
          </div>
          <div class="row items-center">
            <q-avatar size="40px" class="q-mr-md">
              <q-img src="../assets/pypi-logo.png" />
            </q-avatar>
            <div>
              <div class="text-subtitle1">{{ $t('network.pypi.title') }}</div>
              <div class="text-caption" :class="networkStatus.pip ? 'text-positive' : 'text-negative'">
                {{ networkStatus.pip ? $t('network.pypi.accessible') : $t('network.pypi.inaccessible') }}
              </div>
            </div>
            <q-space />
          </div>
        </q-card-section>
        
        <q-separator />
        
        <q-card-section>
          <div class="text-caption q-mb-xs">{{ $t('network.pypi.selectUrl') }}</div>
          <q-select
            outlined
            dense
            v-model="pypiUrl"
            :options="['https://pypi.joinolares.cn/root/olares3/+simple/', 'https://pypi.tuna.tsinghua.edu.cn', 'https://mirrors.aliyun.com/pypi/simple/', 'https://pypi.org/simple/']"
            placeholder="https://pypi.joinolares.cn/root/olares3/+simple/"
            dropdown-icon="expand_more"
            @update:model-value="savePipConfig"
          />
        </q-card-section>
      </q-card>

      <!-- HuggingFace 配置卡片 -->
      <q-card class="q-mb-md" flat bordered style="border-radius: var(--border-radius-xl);">
        <q-card-section class="relative-position">
          <div class="absolute-top-right q-pa-sm">
            <q-btn outline color="grey-7" style="border-radius: var(--border-radius-md); margin-right: 8px; margin-top: 16px;" @click="checkNetworkStatus('huggingface')">
              <q-icon :name="networkStatus.huggingface ? 'wifi' : 'wifi_off'" style="margin-right: 12px;" />
              {{ $t('network.checkNetwork') }}
            </q-btn>
          </div>
          <div class="row items-center">
            <q-avatar size="40px" class="q-mr-md">
              <q-img src="../assets/huggingface-logo.png" />
            </q-avatar>
            <div>
              <div class="text-subtitle1">{{ $t('network.huggingface.title') }}</div>
              <div class="text-caption" :class="networkStatus.huggingface ? 'text-positive' : 'text-negative'">
                {{ networkStatus.huggingface ? $t('network.huggingface.accessible') : $t('network.huggingface.inaccessible') }}
              </div>
            </div>
            <q-space />
          </div>
        </q-card-section>
        
        <q-separator />
        
        <q-card-section>
          <div class="text-caption q-mb-xs">{{ $t('network.huggingface.selectUrl') }}</div>
          <q-select
            outlined
            dense
            v-model="huggingfaceUrl"
            :options="['https://huggingface.co/', 'https://hf-mirror.com/']"
            placeholder="https://huggingface.co/"
            dropdown-icon="expand_more"
            @update:model-value="saveHuggingFaceConfig"
          />
        </q-card-section>
      </q-card>
    </template>

    <q-dialog v-model="notifyDialog.show">
      <q-card>
        <q-card-section :class="`bg-${notifyDialog.color} text-white`">
          <div class="text-h6">{{ notifyDialog.title }}</div>
        </q-card-section>
        <q-card-section>
          {{ notifyDialog.message }}
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="确定" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from 'src/api';

// 输入框绑定的URL值
const githubUrl = ref('');
const pypiUrl = ref('');
const huggingfaceUrl = ref('');

// 页面状态
const loading = ref(true);
const networkStatus = ref({
  github: false,
  pip: false,
  huggingface: false
});

// 保存状态
const isSaving = ref({
  github: false,
  pip: false,
  huggingface: false
});

// 通知对话框
const notifyDialog = ref({
  show: false,
  title: '',
  message: '',
  color: 'primary'
});

// 显示通知
const showNotify = (title, message, color = 'primary') => {
  notifyDialog.value.title = title;
  notifyDialog.value.message = message;
  notifyDialog.value.color = color;
  notifyDialog.value.show = true;
};

// 获取当前配置
const fetchNetworkConfig = async () => {
  try {
    loading.value = true;
    const response = await api.get('system/network-config');
    
    if (response.data.code === 200) {
      const config = response.data.data;
      githubUrl.value = config.github.url || '';
      pypiUrl.value = config.pip.url || '';
      huggingfaceUrl.value = config.huggingface.url || '';
      
      // 同时更新网络状态
      networkStatus.value.github = config.github.accessible;
      networkStatus.value.pip = config.pip.accessible;
      networkStatus.value.huggingface = config.huggingface.accessible;
    }
  } catch (error) {
    console.error('Failed to fetch network config:', error);
    showNotify('错误', '获取网络配置失败', 'negative');
  } finally {
    loading.value = false;
  }
};

// 检查网络状态
const checkNetworkStatus = async (service = null) => {
  try {
    const response = await api.get('system/network-status');
    
    if (response.data.code === 200) {
      const result = response.data.data;
      networkStatus.value.github = result.github.accessible;
      networkStatus.value.pip = result.pip.accessible;
      networkStatus.value.huggingface = result.huggingface.accessible;
      
      if (service) {
        const serviceNames = {
          github: 'GitHub',
          pip: 'PIP源',
          huggingface: 'Hugging Face'
        };
        
        const isAccessible = networkStatus.value[service];
        showNotify(
          '网络检测结果', 
          `${serviceNames[service]}${isAccessible ? $t('network.canAccess') : $t('network.cannotAccess')}`, 
          isAccessible ? 'positive' : 'warning'
        );
      }
    }
  } catch (error) {
    console.error('Failed to check network status:', error);
    showNotify('错误', '检查网络状态失败', 'negative');
  }
};

// 保存GitHub配置
const saveGithubConfig = async () => {
  if (!githubUrl.value.trim()) {
    showNotify('警告', 'GitHub代理URL不能为空', 'warning');
    return;
  }
  
  try {
    isSaving.value.github = true;
    const response = await api.post('system/github-proxy', {
      githubProxy: githubUrl.value.trim()
    });
    
    if (response.data.code === 200) {
      showNotify('成功', $t('network.saveSuccess'), 'positive');
      // 更新网络状态
      checkNetworkStatus();
    }
  } catch (error) {
    console.error('Failed to save GitHub proxy config:', error);
    showNotify('错误', $t('network.saveError'), 'negative');
  } finally {
    isSaving.value.github = false;
  }
};

// 保存PIP配置
const savePipConfig = async () => {
  if (!pypiUrl.value.trim()) {
    showNotify('警告', 'PIP源URL不能为空', 'warning');
    return;
  }
  
  try {
    isSaving.value.pip = true;
    const response = await api.post('system/pip-source', {
      pipUrl: pypiUrl.value.trim()
    });
    
    if (response.data.code === 200) {
      showNotify('成功', $t('network.saveSuccess'), 'positive');
      // 更新网络状态
      checkNetworkStatus();
    }
  } catch (error) {
    console.error('Failed to save PIP source config:', error);
    showNotify('错误', $t('network.saveError'), 'negative');
  } finally {
    isSaving.value.pip = false;
  }
};

// 保存HuggingFace配置
const saveHuggingFaceConfig = async () => {
  if (!huggingfaceUrl.value.trim()) {
    showNotify('警告', 'Hugging Face端点URL不能为空', 'warning');
    return;
  }
  
  try {
    isSaving.value.huggingface = true;
    const response = await api.post('system/huggingface-endpoint', {
      hfEndpoint: huggingfaceUrl.value.trim()
    });
    
    if (response.data.code === 200) {
      showNotify('成功', $t('network.saveSuccess'), 'positive');
      // 更新网络状态
      checkNetworkStatus();
    }
  } catch (error) {
    console.error('Failed to save Hugging Face endpoint config:', error);
    showNotify('错误', $t('network.saveError'), 'negative');
  } finally {
    isSaving.value.huggingface = false;
  }
};

// 组件挂载时获取配置
onMounted(() => {
  fetchNetworkConfig();
});
</script>

<style scoped>
.q-card {
  border-radius: 8px;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.05);
}
</style> 