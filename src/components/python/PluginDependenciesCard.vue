<template>
  <q-card flat style="border-radius: 16px; border: 1px solid #e0e0e0; overflow: hidden; padding-left: 0; padding-right: 0; padding-bottom: 0;">

    <q-card-section style="padding-left: 0px; padding-right: 0px; padding-bottom: 0px;">
        
      <div class="row items-center justify-between" style="margin-left: 16px; margin-right: 16px;">
        <div>
          <div class="text-h6">{{ $t('python.pluginDependencies.title') }}</div>
          <div class="text-caption">{{ $t('python.pluginDependencies.subtitle') }}</div>
        </div>

        
        <div class="row items-center justify-end q-mt-md">
          <q-btn color="grey-7" style="border-radius: var(--border-radius-md);" outline icon="refresh" :label="$t('python.pluginDependencies.analyze')" @click="analyzePluginDependencies" :loading="analyzingDeps" />
        </div>
      </div>

      <q-separator class="q-mt-md" style="height: 1px;"/>
    

      
      <div class="row q-mt-md" style="margin-top: 0px; margin-bottom: 0px;">
        <div class="col-3" style="position: relative;">
          <div class="text-subtitle1" style="margin-left: 16px; margin-top: 22px; margin-bottom: 16px;">{{ $t('python.pluginDependencies.pluginsColumn') }}</div>
          <div class="plugin-list-container" style="height: 400px; overflow-y: auto;">
            <q-list class="rounded-borders">
              <q-item
                v-for="plugin in pluginList"
                :key="plugin.name"
                clickable
                :active="selectedPlugin === plugin.name"
                @click="selectedPlugin = plugin.name"
                :class="{ 'bg-red-1': hasPluginMissingDeps(plugin.name) }"
              >
                <q-item-section avatar>
                  <q-icon :name="hasPluginMissingDeps(plugin.name) ? 'error_outline' : 'check_circle'" 
                          :color="hasPluginMissingDeps(plugin.name) ? 'negative' : 'positive'" />
                </q-item-section>
                
                <q-item-section>
                  <q-item-label>{{ plugin.name }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
          <q-separator vertical style="position: absolute; right: 0; top: 0; height: 100%;" />
        </div>
        
        <div class="col-9 q-pl-md" style="padding-left: 0px;">
          <div class="row items-center justify-between" style="padding-top: 16px;">
            <div class="text-subtitle1" style="margin-left: 16px;">{{ $t('python.pluginDependencies.dependenciesColumn') }}</div>
            <q-btn color="grey-7" style="margin-right: 16px; border-radius: var(--border-radius-md);" outline icon="build" :label="$t('python.pluginDependencies.fixAll')" @click="installAllMissingDependencies" :loading="installingAll" />
          </div>
          
          <div class="dependency-list-container" style="height: 400px; overflow-y: auto;">
            <q-list separator class="rounded-borders q-mt-sm">
              <q-item
                v-for="dep in filteredDependenciesByPlugin"
                :key="dep.name"
              >
                <q-item-section avatar>
                  <q-icon :name="dep.missing ? 'error_outline' : 'check_circle'" 
                          :color="dep.missing ? 'negative' : 'positive'" />
                </q-item-section>
                
                <q-item-section>
                  <q-item-label>{{ dep.name }}</q-item-label>
                  <q-item-label caption v-if="dep.version">
                    {{ $t('python.pluginDependencies.versionRequired') }} {{ dep.version }}
                  </q-item-label>
                </q-item-section>
                
                <q-item-section side v-if="dep.missing">
                  <q-btn 
                    color="primary" 
                    :label="$t('python.pluginDependencies.install')" 
                    size="sm" 
                    @click="installMissingDependency(null, dep.name, dep.version)"
                    :loading="installingDep[dep.name]"
                  />
                </q-item-section>
                <q-item-section side v-else>
                  <q-badge color="positive" :label="$t('python.pluginDependencies.installed')" />
                </q-item-section>
              </q-item>
            </q-list>
            
            <div v-if="filteredDependenciesByPlugin.length === 0" class="q-pa-md text-center">
              <q-icon name="info" size="2rem" color="grey-7" />
              <p class="text-grey-7 q-mt-sm">{{ analyzingDeps ? $t('python.pluginDependencies.analyzing') : $t('python.pluginDependencies.noDependenciesFound') }}</p>
            </div>
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script>
import { defineComponent, ref, computed, onMounted, reactive } from 'vue';
import { useQuasar } from 'quasar';
import { analyzePluginDependencies as apiAnalyzeDeps, installPackage as apiInstallPackage } from 'src/api';

export default defineComponent({
  name: 'PluginDependenciesCard',
  
  emits: ['error'],
  
  setup(props, { emit }) {
    const $q = useQuasar();
    
    // Plugin dependencies analysis related
    const pluginDependencies = ref([]);
    const analyzingDeps = ref(false);
    const selectedPlugin = ref(null);
    const installingAll = ref(false);
    
    // Installing single dependency related
    const installingDep = reactive({});
    
    // Get plugin list
    const pluginList = computed(() => {
      return pluginDependencies.value.map(plugin => ({
        name: plugin.plugin,
        dependencies: plugin.dependencies
      }));
    });
    
    // Check if plugin has missing dependencies
    const hasPluginMissingDeps = (pluginName) => {
      const plugin = pluginDependencies.value.find(p => p.plugin === pluginName);
      if (!plugin) return false;
      return plugin.dependencies.some(dep => dep.missing);
    };
    
    // Filter dependencies by selected plugin
    const filteredDependenciesByPlugin = computed(() => {
      if (!selectedPlugin.value) {
        return [];
      }
      
      const plugin = pluginDependencies.value.find(p => p.plugin === selectedPlugin.value);
      if (!plugin) return [];
      
      return plugin.dependencies;
    });
    
    // Analyze plugin dependencies
    const analyzePluginDependencies = async () => {
      analyzingDeps.value = true;
      try {
        pluginDependencies.value = await apiAnalyzeDeps();
        // If no plugin is selected or the selected plugin is not in the list, select the first one
        if (!selectedPlugin.value || !pluginDependencies.value.some(p => p.plugin === selectedPlugin.value)) {
          selectedPlugin.value = pluginDependencies.value.length > 0 ? pluginDependencies.value[0].plugin : null;
        }
      } catch (error) {
        $q.notify({
          color: 'negative',
          message: '分析插件依赖失败: ' + error.message,
          icon: 'error'
        });
      } finally {
        analyzingDeps.value = false;
      }
    };
    
    // Install single dependency
    const installMissingDependency = async (pluginName, depName, depVersion) => {
      installingDep[depName] = true;
      
      try {
        const packageSpec = depName + (depVersion ? depVersion : '');
        await apiInstallPackage(packageSpec);
        
        $q.notify({
          color: 'positive',
          message: `依赖库 ${depName} 安装成功`,
          icon: 'check'
        });
        
        // Reload dependency analysis
        await analyzePluginDependencies();
      } catch (error) {
        // Enhanced error handling, prioritize error field
        let errorMsg = '';
        if (error.response) {
          // Response but status code is not 2xx
          if (error.response.status === 500) {
            errorMsg = `安装依赖库 ${depName} 失败：服务器内部错误。\n\n${error.response?.body?.error || error.response?.data?.message || '服务器未提供详细错误信息。'}`;
          } else {
            errorMsg = error.response?.body?.error || error.response?.data?.message || `请求错误 (${error.response.status})`;
          }
        } else if (error.request) {
          // Request sent but no response received
          errorMsg = '未收到服务器响应，请检查网络连接或服务器状态。';
        } else {
          // Other errors
          errorMsg = error.message || '未知错误';
        }
        
        // Send error to parent component
        emit('error', errorMsg);
        
        // Add console log for debugging
        console.error('Install dependency error details:', error.response?.data);
      } finally {
        installingDep[depName] = false;
      }
    };
    
    // Install all missing dependencies
    const installAllMissingDependencies = async () => {
      installingAll.value = true;
      
      try {
        // Get all missing dependencies
        const missingDeps = [];
        pluginDependencies.value.forEach(plugin => {
          plugin.dependencies.forEach(dep => {
            if (dep.missing && !missingDeps.some(d => d.name === dep.name)) {
              missingDeps.push(dep);
            }
          });
        });
        
        if (missingDeps.length === 0) {
          $q.notify({
            color: 'positive',
            message: '没有缺失的依赖需要安装',
            icon: 'check'
          });
          return;
        }
        
        // Install missing dependencies one by one
        for (const dep of missingDeps) {
          await installMissingDependency(null, dep.name, dep.version);
        }
        
        $q.notify({
          color: 'positive',
          message: '所有缺失的依赖已安装完成',
          icon: 'check'
        });
      } catch (error) {
        $q.notify({
          color: 'negative',
          message: '安装依赖失败: ' + error.message,
          icon: 'error'
        });
      } finally {
        installingAll.value = false;
      }
    };
    
    onMounted(async () => {
      await analyzePluginDependencies();
    });
    
    return {
      // Plugin dependencies analysis related
      pluginDependencies,
      analyzingDeps,
      analyzePluginDependencies,
      selectedPlugin,
      pluginList,
      filteredDependenciesByPlugin,
      hasPluginMissingDeps,
      
      // Install dependencies related
      installingDep,
      installMissingDependency,
      installingAll,
      installAllMissingDependencies
    };
  }
});
</script>
<style scoped>
.text-subtitle1 {
  color: var(--text-important);
  font-size: 18px;
}
</style>