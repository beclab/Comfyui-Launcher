<template>
  <q-page padding>
    <div class="text-h4 q-mb-lg">网络配置</div>

    <div v-if="loading" class="text-center q-pa-lg">
      <q-spinner size="3em" color="primary" />
      <div class="q-mt-md">加载配置中...</div>
    </div>

    <template v-else>
      <div class="config-card q-mb-md">
        <div class="row items-center">
          <q-avatar size="40px" class="q-mr-md">
            <img src="https://github.githubassets.com/assets/github-mark-9be88460eaa6.svg" />
          </q-avatar>
          <div>
            <div class="text-subtitle1">Github</div>
            <div class="text-caption">代理</div>
          </div>
          <q-space />
          <q-chip v-if="networkStatus.github" dense color="positive" text-color="white" class="q-mr-md">
            可访问
          </q-chip>
          <q-chip v-else dense color="negative" text-color="white" class="q-mr-md">
            不可访问
          </q-chip>
          <q-btn flat round icon="refresh" size="sm" @click="checkNetworkStatus('github')">
            <q-tooltip>检测可用性</q-tooltip>
          </q-btn>
        </div>
        <div class="q-mt-sm">
          <div class="text-caption q-mb-xs">选择访问GitHub的基本URL</div>
          <q-input 
            outlined 
            dense 
            v-model="githubUrl" 
            placeholder="http://gh.proxy.com/"
          >
            <template v-slot:append>
              <q-btn 
                flat 
                round 
                icon="check" 
                size="sm"
                @click="saveGithubConfig" 
                :disable="isSaving.github"
              >
                <q-tooltip>保存</q-tooltip>
              </q-btn>
            </template>
          </q-input>
        </div>
      </div>

      <div class="config-card q-mb-md">
        <div class="row items-center">
          <q-avatar size="40px" class="q-mr-md">
            <img src="https://pypi.org/static/images/logo-small.svg" />
          </q-avatar>
          <div>
            <div class="text-subtitle1">PyPI</div>
            <div class="text-caption">代理</div>
          </div>
          <q-space />
          <q-chip v-if="networkStatus.pip" dense color="positive" text-color="white" class="q-mr-md">
            可访问
          </q-chip>
          <q-chip v-else dense color="negative" text-color="white" class="q-mr-md">
            不可访问
          </q-chip>
          <q-btn flat round icon="refresh" size="sm" @click="checkNetworkStatus('pip')">
            <q-tooltip>检测可用性</q-tooltip>
          </q-btn>
        </div>
        <div class="q-mt-sm">
          <div class="text-caption q-mb-xs">选择访问PyPI的基本URL</div>
          <q-input 
            outlined 
            dense 
            v-model="pypiUrl" 
            placeholder="https://pypi.tuna.tsinghua.edu.cn"
          >
            <template v-slot:append>
              <q-btn 
                flat 
                round 
                icon="check" 
                size="sm"
                @click="savePipConfig" 
                :disable="isSaving.pip"
              >
                <q-tooltip>保存</q-tooltip>
              </q-btn>
            </template>
          </q-input>
        </div>
      </div>

      <div class="config-card q-mb-md">
        <div class="row items-center">
          <q-avatar size="40px" class="q-mr-md">
            <img src="https://huggingface.co/front/assets/huggingface_logo-noborder.svg" />
          </q-avatar>
          <div>
            <div class="text-subtitle1">HuggingFace</div>
            <div class="text-caption">代理</div>
          </div>
          <q-space />
          <q-chip v-if="networkStatus.huggingface" dense color="positive" text-color="white" class="q-mr-md">
            可访问
          </q-chip>
          <q-chip v-else dense color="negative" text-color="white" class="q-mr-md">
            不可访问
          </q-chip>
          <q-btn flat round icon="refresh" size="sm" @click="checkNetworkStatus('huggingface')">
            <q-tooltip>检测可用性</q-tooltip>
          </q-btn>
        </div>
        <div class="q-mt-sm">
          <div class="text-caption q-mb-xs">选择访问Hugging Face的基本URL</div>
          <q-input 
            outlined 
            dense 
            v-model="huggingfaceUrl" 
            placeholder="https://huggingface.co/"
          >
            <template v-slot:append>
              <q-btn 
                flat 
                round 
                icon="check" 
                size="sm"
                @click="saveHuggingFaceConfig" 
                :disable="isSaving.huggingface"
              >
                <q-tooltip>保存</q-tooltip>
              </q-btn>
            </template>
          </q-input>
        </div>
      </div>
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
    console.error('获取网络配置失败:', error);
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
          `${serviceNames[service]}${isAccessible ? '可以访问' : '无法访问'}`, 
          isAccessible ? 'positive' : 'warning'
        );
      }
    }
  } catch (error) {
    console.error('检查网络状态失败:', error);
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
      showNotify('成功', 'GitHub代理配置已保存', 'positive');
      // 更新网络状态
      checkNetworkStatus();
    }
  } catch (error) {
    console.error('保存GitHub代理配置失败:', error);
    showNotify('错误', '保存GitHub代理配置失败', 'negative');
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
      showNotify('成功', 'PIP源配置已保存', 'positive');
      // 更新网络状态
      checkNetworkStatus();
    }
  } catch (error) {
    console.error('保存PIP源配置失败:', error);
    showNotify('错误', '保存PIP源配置失败', 'negative');
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
      showNotify('成功', 'Hugging Face端点配置已保存', 'positive');
      // 更新网络状态
      checkNetworkStatus();
    }
  } catch (error) {
    console.error('保存Hugging Face端点配置失败:', error);
    showNotify('错误', '保存Hugging Face端点配置失败', 'negative');
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
.config-card {
  background-color: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.05);
}
</style> 