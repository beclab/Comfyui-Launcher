<template>
  <q-page padding>
    <div class="q-pa-md">
      <div class="text-h5 q-mb-md">{{ $t('python.environmentManagement') }}</div>
      <q-separator class="q-mb-md" />
      
      <!-- 选项卡 -->
      <div class="q-mb-md">
        <TabToggle
          v-model="activeTab"
          :options="[
            { label: $t('python.tabs.dependencies'), value: 'deps' },
            { label: $t('python.tabs.analysis'), value: 'plugins' }
          ]"
        />
      </div>

      <!-- 错误信息展示区域 -->
      <q-card v-if="errorMessage" class="q-mb-md bg-red-1">
        <q-card-section >
          <div class="text-h6 text-negative">{{ $t('python.errors.installationError') }}</div>
          <pre class="error-message">{{ errorMessage }}</pre>
          <div v-if="errorMessage.includes('Internal Server Error')" class="q-mt-md">
            <p class="text-negative">{{ $t('python.errors.serverErrorCauses') }}</p>
            <ul class="q-ml-md">
              <li>{{ $t('python.errors.envConfigProblem') }}</li>
              <li>{{ $t('python.errors.permissionProblem') }}</li>
              <li>{{ $t('python.errors.networkProblem') }}</li>
              <li>{{ $t('python.errors.dependencyConflict') }}</li>
            </ul>
            <p>{{ $t('python.errors.installTips') }}</p>
            <pre class="suggestion-code">
# {{ $t('python.errors.useVirtualEnv') }}:
python -m venv myenv
source myenv/bin/activate  # Windows上使用: myenv\Scripts\activate
pip install 包名

# {{ $t('python.errors.useUserInstall') }}:
pip install --user 包名</pre>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="negative" icon="close" :label="$t('common.cancel')" @click="errorMessage = ''" />
        </q-card-actions>
      </q-card>
      
      <div v-if="activeTab === 'deps'">
        <!-- 已安装的依赖库 -->
        <InstalledPackagesCard @error="handleError" />
      </div>
      
      <div v-if="activeTab === 'plugins'">
        <!-- 插件依赖分析 -->
        <PluginDependenciesCard @error="handleError" />
      </div>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref } from 'vue';
import TabToggle from 'src/components/common/TabToggle.vue';
import InstalledPackagesCard from 'src/components/python/InstalledPackagesCard.vue';
import PluginDependenciesCard from 'src/components/python/PluginDependenciesCard.vue';

export default defineComponent({
  name: 'PythonDependenciesPage',
  components: {
    TabToggle,
    InstalledPackagesCard,
    PluginDependenciesCard
  },
  
  setup() {
    // 选项卡
    const activeTab = ref('deps');
    
    // 错误信息
    const errorMessage = ref('');
    
    // 处理子组件的错误
    const handleError = (message) => {
      errorMessage.value = message;
    };
    
    return {
      // 选项卡
      activeTab,
      
      // 错误信息
      errorMessage,
      handleError
    };
  }
});
</script>

<style scoped>
.error-message {
  white-space: pre-wrap;
  font-family: monospace;
  background-color: #ffebee;
  padding: 16px;
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
  font-size: 12px;
  line-height: 1.5;
}

.suggestion-code {
  background-color: #e3f2fd;
  border-left: 4px solid #2196f3;
  padding: 12px;
  font-family: monospace;
  margin: 10px 0;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  border-radius: 4px;
}

.text-h5 {
  color: var(--text-important);
  font-size: 40px;
  font-weight: bold;
}
</style>