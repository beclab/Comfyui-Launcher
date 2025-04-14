<template>
  <q-page padding>
    <div class="q-pa-md">
      <div class="text-h5 q-mb-md">环境管理</div>
      <q-separator class="q-mb-md" />
      
      <!-- 选项卡 -->
      <div class="q-mb-md">
        <TabToggle
          v-model="activeTab"
          :options="[
            { label: 'Python依赖库', value: 'deps' },
            { label: '依赖分析', value: 'plugins' }
          ]"
        />
      </div>

      <!-- 错误信息展示区域 -->
      <q-card v-if="errorMessage" class="q-mb-md bg-red-1">
        <q-card-section >
          <div class="text-h6 text-negative">安装错误</div>
          <pre class="error-message">{{ errorMessage }}</pre>
          <div v-if="errorMessage.includes('Internal Server Error')" class="q-mt-md">
            <p class="text-negative">服务器内部错误可能是由以下原因导致：</p>
            <ul class="q-ml-md">
              <li>Python环境配置问题 - 可能是虚拟环境或系统环境配置有误</li>
              <li>权限问题 - 当前用户可能没有安装包的权限</li>
              <li>网络问题 - 无法连接到PyPI源</li>
              <li>依赖冲突 - 可能与已安装的其他包存在版本冲突</li>
            </ul>
            <p>如需安装Python包：</p>
            <pre class="suggestion-code">
# 使用虚拟环境：
python -m venv myenv
source myenv/bin/activate  # Windows上使用: myenv\Scripts\activate
pip install 包名

# 使用用户级安装：
pip install --user 包名</pre>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="negative" icon="close" label="关闭" @click="errorMessage = ''" />
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