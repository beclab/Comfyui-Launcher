<template>
  <q-page class="about-page q-pa-md">
    <div class="container q-mx-auto q-my-lg">
      <div class="text-center q-mb-xl">
        <h1 class="text-h3 q-mb-md text-weight-bold text-primary">关于 ComfyUI 管理器</h1>
        <q-separator class="q-mx-auto" style="max-width: 100px" />
      </div>

      <div class="row q-col-gutter-lg">
        <div class="col-12 col-md-6">
          <q-card flat bordered class="q-pa-md">
            <q-card-section>
              <div class="text-h5 q-mb-md text-weight-bold">项目介绍</div>
              <p>ComfyUI 管理器是一个强大的工具，旨在简化 ComfyUI 的使用和管理体验。通过提供一个直观的界面，用户可以轻松启动、停止和监控 ComfyUI 服务，无需编写复杂的命令行指令。</p>
              <p>我们的代理功能确保您可以实时查看 ComfyUI 的运行状态，并在发生任何问题时及时得到反馈。无论您是 AI 图像生成的新手还是专业人士，ComfyUI 管理器都能让您的工作流程更加流畅。</p>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-md-6">
          <q-card flat bordered class="q-pa-md">
            <q-card-section>
              <div class="text-h5 q-mb-md text-weight-bold">主要功能</div>
              <q-list dense>
                <q-item>
                  <q-item-section avatar>
                    <q-icon color="primary" name="play_circle" />
                  </q-item-section>
                  <q-item-section>一键启动/停止 ComfyUI 服务</q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar>
                    <q-icon color="primary" name="monitor" />
                  </q-item-section>
                  <q-item-section>实时状态监控与代理服务</q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar>
                    <q-icon color="primary" name="cloud_download" />
                  </q-item-section>
                  <q-item-section>模型和插件管理</q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar>
                    <q-icon color="primary" name="settings" />
                  </q-item-section>
                  <q-item-section>系统配置与优化</q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 q-mt-lg">
          <q-card flat bordered class="q-pa-md">
            <q-card-section>
              <div class="text-h5 q-mb-md text-weight-bold">常用目录</div>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-6 col-lg-3">
                  <q-btn 
                    class="full-width" 
                    color="primary" 
                    icon="folder"
                    label="ComfyUI 目录" 
                    @click="openDirectory('comfyui')"
                  />
                </div>
                <div class="col-12 col-md-6 col-lg-3">
                  <q-btn 
                    class="full-width" 
                    color="secondary" 
                    icon="folder"
                    label="模型目录" 
                    @click="openDirectory('models')"
                  />
                </div>
                <div class="col-12 col-md-6 col-lg-3">
                  <q-btn 
                    class="full-width" 
                    color="accent" 
                    icon="folder"
                    label="输出目录" 
                    @click="openDirectory('output')"
                  />
                </div>
                <div class="col-12 col-md-6 col-lg-3">
                  <q-btn 
                    class="full-width" 
                    color="deep-purple" 
                    icon="folder"
                    label="插件目录" 
                    @click="openDirectory('custom_nodes')"
                  />
                </div>
                <div class="col-12 q-mt-md">
                  <q-separator />
                  <div class="text-subtitle1 q-my-sm text-weight-medium">自定义路径</div>
                </div>
                <div class="col-12">
                  <div class="row q-col-gutter-sm">
                    <div class="col-12 col-md-9">
                      <q-input 
                        v-model="customPath" 
                        outlined 
                        dense
                        label="输入路径" 
                        placeholder="例如: /home/user/projects"
                        clearable
                        class="full-width"
                      />
                    </div>
                    <div class="col-12 col-md-3">
                      <q-btn 
                        class="full-width" 
                        color="teal" 
                        icon="open_in_new" 
                        label="打开" 
                        :disable="!customPath"
                        @click="openCustomPath"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 q-mt-lg">
          <q-card flat bordered class="q-pa-md">
            <q-card-section>
              <div class="text-h5 q-mb-md text-weight-bold">技术栈</div>
              <div class="row q-col-gutter-md">
                <div class="col-6 col-md-3 text-center">
                  <q-icon name="mdi-vuejs" size="3rem" color="green" />
                  <div class="q-mt-sm">Vue.js</div>
                </div>
                <div class="col-6 col-md-3 text-center">
                  <q-icon name="mdi-language-typescript" size="3rem" color="blue" />
                  <div class="q-mt-sm">TypeScript</div>
                </div>
                <div class="col-6 col-md-3 text-center">
                  <q-icon name="mdi-nodejs" size="3rem" color="green-7" />
                  <div class="q-mt-sm">Node.js</div>
                </div>
                <div class="col-6 col-md-3 text-center">
                  <q-icon name="mdi-docker" size="3rem" color="blue-7" />
                  <div class="q-mt-sm">Docker</div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="text-center q-mt-xl">
        <p class="text-caption q-mb-xs">版本: v1.0.0</p>
        <p class="text-caption q-mb-xs">© 2023-{{ new Date().getFullYear() }} ComfyUI 管理器团队</p>
        <p class="text-caption">
          <q-icon name="favorite" size="xs" color="red" />
          用❤️打造
        </p>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import api from '../api';
import { ref } from 'vue';

const q = useQuasar();
const customPath = ref('');

// 定义目录路径映射
const directoryPaths = {
  comfyui: process.env.COMFYUI_PATH || './comfyui',
  models: process.env.MODELS_PATH || './comfyui/models',
  output: process.env.OUTPUT_PATH || './comfyui/output',
  custom_nodes: process.env.CUSTOM_NODES_PATH || './comfyui/custom_nodes'
};

/**
 * 打开指定的目录
 * @param dirKey 目录的键名
 */
const openDirectory = async (dirKey: string) => {
  try {
    const path = directoryPaths[dirKey as keyof typeof directoryPaths];
    if (!path) {
      throw new Error('未找到指定目录');
    }
    
    await api.openPath(path);
    
    q.notify({
      type: 'positive',
      message: `正在打开 ${dirKey} 目录`,
      position: 'top',
      timeout: 2000
    });
  } catch (error) {
    console.error('打开目录失败:', error);
    q.notify({
      type: 'negative',
      message: '打开目录失败，请检查系统设置',
      position: 'top'
    });
  }
};

/**
 * 打开自定义路径
 */
const openCustomPath = async () => {
  if (!customPath.value) return;
  
  try {
    await api.openPath(customPath.value);
    
    q.notify({
      type: 'positive',
      message: `正在打开自定义路径: ${customPath.value}`,
      position: 'top',
      timeout: 2000
    });
  } catch (error) {
    console.error('打开目录失败:', error);
    q.notify({
      type: 'negative',
      message: '打开目录失败，请检查路径是否正确',
      position: 'top'
    });
  }
};
</script>

<style scoped>
.about-page {
  background-color: #f5f5f5;
}

.container {
  max-width: 1200px;
}

h1 {
  background: linear-gradient(45deg, #3498db, #9b59b6);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
</style> 