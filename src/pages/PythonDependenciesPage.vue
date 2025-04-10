<template>
  <q-page padding>
    <div class="q-pa-md">
      <h4 class="q-mb-md text-bold" style="font-size: 1.2rem">环境管理</h4>
      <q-separator class="q-mb-md" />
      
      <!-- 选项卡 -->
      <div class="q-mb-md">
        <q-btn-toggle
          v-model="activeTab"
          :options="[
            { label: 'Python依赖库', value: 'deps' },
            { label: '依赖分析', value: 'plugins' }
          ]"
          class="q-mb-md rounded-borders"
          text-color="grey-8"
          toggle-text-color="primary"
          toggle-color="light-blue-1"
          unelevated
          style="border: 1px solid #e0e0e0; border-radius: 8px;"
          
        />
      </div>

      <!-- 错误信息展示区域 -->
      <q-card v-if="errorMessage" class="q-mb-md bg-red-1">
        <q-card-section style="padding-left: 0; padding-right: 0;">
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
        <q-card class="q-mb-md" flat style="border-radius: 16px; border: 1px solid #e0e0e0; overflow: hidden; padding-left: 0; padding-right: 0; padding-bottom: 0;">
          <q-card-section style="padding-left: 0; padding-right: 0; padding-bottom: 0;">
            <div class="row items-center justify-between q-mb-md"
            style="margin:16px;"
            >
              <div>
                <div class="text-h6">已安装Python库</div>
                <div class="text-caption">本地Python环境已安装的Python库</div>
              </div>
              <div class="row items-center">
                <q-input 
                  v-model="searchPackage" 
                  outlined 
                  dense 
                  placeholder="搜索Python库" 
                  class="col-grow" 
                  style="max-width: 300px; margin-left: auto;" 
                >
                  <template v-slot:prepend>
                    <q-icon name="search" />
                  </template>
                </q-input>
                <q-btn 
                  flat
                  label="安装新库" 
                  icon="add" 
                  class="q-ml-sm" 
                  @click="showInstallDialog = true" 
                  style="background-color: white; color: #333; border: 1px solid #ccc; border-radius: 8px; padding: 8px 12px;" 
                />
                <q-btn 
                  flat 
                  icon="refresh" 
                  label="刷新"
                  class="q-ml-sm" 
                  @click="loadInstalledPackages" 
                  :loading="loading" 
                  style="background-color: white; color: #333; border: 1px solid #ccc; border-radius: 8px; padding: 8px 12px;" 
                />
              </div>
            </div>
            <q-table
              :rows="filteredPackages"
              style="margin-left: 0; margin-right: 0; margin-bottom: 0; box-shadow: none;"
              :columns="packagesColumns"
              row-key="name"
              :loading="loading"
              :pagination="{ rowsPerPage: 10 }"
              class="q-mt-md"
              flat
              bordered
            >
              <template v-slot:body-cell-version="props">
                <q-td :props="props">
                  {{ props.row.version }}
                </q-td>
              </template>
              <template v-slot:body-cell-actions="props">
                <q-td :props="props" class="q-gutter-xs">
                  <q-btn flat round dense size="sm" icon="arrow_upward" color="primary" @click="upgradePackage(props.row)" />
                  <q-btn flat round dense size="sm" icon="delete" color="negative" @click="confirmUninstall(props.row)" />
                </q-td>
              </template>
              <template v-slot:bottom="scope">
                <div class="row items-center justify-end full-width">
                  <div class="col-auto">
                    Records per page: 
                    <q-select 
                      v-model="scope.pagination.rowsPerPage" 
                      :options="[10, 20, 50]" 
                      dense 
                      borderless 
                      emit-value 
                      map-options 
                      style="min-width: 50px"
                    />
                  </div>
                  <div class="q-px-md">
                    {{ scope.pagination.rowsStart }}-{{ scope.pagination.rowsEnd }} of {{ scope.pagination.rowsNumber }}
                  </div>
                  <q-btn 
                    icon="chevron_left" 
                    color="primary" 
                    round 
                    dense 
                    flat 
                    :disable="scope.isFirstPage" 
                    @click="scope.prevPage"
                  />
                  <q-btn 
                    icon="chevron_right" 
                    color="primary" 
                    round 
                    dense 
                    flat 
                    :disable="scope.isLastPage" 
                    @click="scope.nextPage"
                  />
                </div>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>
      
      <div v-if="activeTab === 'plugins'">
        <!-- 插件依赖分析 -->
        <q-card>
          <q-card-section style="padding-left: 0; padding-right: 0;">
            <div class="text-h6">插件依赖分析</div>
            <div class="text-caption">自动分析已安装插件所需的Python库是否安装</div>
            
            <div class="row items-center q-mt-md">
              <q-btn color="primary" icon="refresh" label="立即分析" @click="analyzePluginDependencies" :loading="analyzingDeps" />
            </div>
            
            <div class="q-mt-md">
              <div class="row items-center justify-between q-mb-sm">
                <div class="text-subtitle1">依赖库列表</div>
                <q-btn-toggle
                  v-model="filterStatus"
                  flat
                  toggle-color="light-blue-1"
                  toggle-text-color="primary"
                  :options="[
                    { label: '全部显示', value: 'all' },
                    { label: '仅显示缺失', value: 'missing' }
                  ]"
                  class="q-ml-sm"
                />
              </div>
              
              <q-list bordered separator class="rounded-borders">
                <q-item
                  v-for="dep in filteredDependencies"
                  :key="dep.name"
                  :class="dep.missing ? 'bg-red-1' : ''"
                >
                  <q-item-section avatar>
                    <q-icon :name="dep.missing ? 'error_outline' : 'check_circle'" 
                            :color="dep.missing ? 'negative' : 'positive'" />
                  </q-item-section>
                  
                  <q-item-section>
                    <q-item-label>{{ dep.name }}</q-item-label>
                    <q-item-label caption v-if="dep.version">
                      版本要求: {{ dep.version }}
                    </q-item-label>
                    <q-item-label caption v-if="dep.plugins && dep.plugins.length">
                      <span class="text-caption">被以下插件使用: {{ dep.plugins.join(', ') }}</span>
                    </q-item-label>
                  </q-item-section>
                  
                  <q-item-section side v-if="dep.missing">
                    <q-btn 
                      color="primary" 
                      label="安装" 
                      size="sm" 
                      @click="installMissingDependency(null, dep.name, dep.version)"
                      :loading="installingDep[dep.name]"
                    />
                  </q-item-section>
                  <q-item-section side v-else>
                    <q-badge color="positive" label="已安装" />
                  </q-item-section>
                </q-item>
              </q-list>
              
              <div v-if="filteredDependencies.length === 0" class="q-pa-md text-center">
                <q-icon name="info" size="2rem" color="grey-7" />
                <p class="text-grey-7 q-mt-sm">{{ analyzingDeps ? '正在分析依赖...' : '没有找到依赖库' }}</p>
              </div>
              
              <div class="q-mt-md text-right">
                <q-pagination
                  v-model="currentPage"
                  :max="Math.ceil(filteredDependencies.length / pageSize)"
                  :max-pages="6"
                  boundary-numbers
                  direction-links
                  v-if="filteredDependencies.length > pageSize"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      
      <!-- 安装库对话框 -->
      <q-dialog v-model="showInstallDialog">
        <q-card style="min-width: 400px">
          <q-card-section style="padding-left: 0; padding-right: 0;">
            <div class="text-h6">安装新库</div>
          </q-card-section>
          
          <q-card-section style="padding-left: 0; padding-right: 0;">
            <q-input v-model="packageToInstall" label="库名称" outlined autofocus />
            <q-input v-model="packageVersion" label="版本 (可选)" outlined class="q-mt-sm" hint="例如: ==1.0.0, >=2.0.0, 留空安装最新版本" />
          </q-card-section>
          
          <q-card-actions align="right">
            <q-btn flat label="取消" color="primary" v-close-popup />
            <q-btn label="安装" color="primary" @click="installPackage" :loading="installing" />
          </q-card-actions>
        </q-card>
      </q-dialog>
      
      <!-- 确认卸载对话框 -->
      <q-dialog v-model="showUninstallDialog">
        <q-card>
          <q-card-section style="padding-left: 0; padding-right: 0;">
            <div class="text-h6">确认卸载</div>
          </q-card-section>
          
          <q-card-section style="padding-left: 0; padding-right: 0;">
            确定要卸载 <strong>{{ packageToUninstall.name }}</strong> 吗？这可能会影响依赖该库的插件。
          </q-card-section>
          
          <q-card-actions align="right">
            <q-btn flat label="取消" color="primary" v-close-popup />
            <q-btn flat label="卸载" color="negative" @click="uninstallPackage" :loading="uninstalling" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref, computed, onMounted, reactive } from 'vue';
import { useQuasar } from 'quasar';
import { getPipSource, setPipSource, getInstalledPackages, installPackage as apiInstallPackage, 
         uninstallPackage as apiUninstallPackage, analyzePluginDependencies as apiAnalyzeDeps,
         fixPluginDependencies } from 'src/api';

export default defineComponent({
  name: 'PythonDependenciesPage',
  
  setup() {
    const $q = useQuasar();
    
    // 选项卡
    const activeTab = ref('deps');
    
    // 源地址配置 (隐藏但保留功能)
    const pipSource = ref('');
    const sourceSaving = ref(false);
    
    // 已安装库相关
    const installedPackages = ref([]);
    const loading = ref(false);
    const searchPackage = ref('');
    
    // 安装库相关
    const showInstallDialog = ref(false);
    const packageToInstall = ref('');
    const packageVersion = ref('');
    const installing = ref(false);
    
    // 卸载库相关
    const showUninstallDialog = ref(false);
    const packageToUninstall = ref({});
    const uninstalling = ref(false);
    
    // 插件依赖分析相关
    const pluginDependencies = ref([]);
    const analyzingDeps = ref(false);
    const fixingDeps = reactive({});
    const filterStatus = ref('all');
    const currentPage = ref(1);
    const pageSize = ref(10);
    
    // 安装单个依赖相关
    const installingDep = reactive({});
    
    // 错误信息
    const errorMessage = ref('');
    
    // 表格列定义
    const packagesColumns = [
      { name: 'name', label: '库名称', field: 'name', align: 'left', sortable: true },
      { name: 'version', label: '版本', field: 'version', align: 'left', sortable: true },
      { name: 'actions', label: '操作', field: 'actions', align: 'center' }
    ];
    
    // 已安装库相关
    const filteredPackages = computed(() => {
      if (!searchPackage.value) return installedPackages.value;
      const query = searchPackage.value.toLowerCase();
      return installedPackages.value.filter(pkg => 
        pkg.name.toLowerCase().includes(query)
      );
    });
    
    // 将插件依赖数据转换为扁平化的依赖列表
    const flattenedDependencies = computed(() => {
      const depMap = new Map();
      
      pluginDependencies.value.forEach(plugin => {
        plugin.dependencies.forEach(dep => {
          if (!depMap.has(dep.name)) {
            depMap.set(dep.name, {
              name: dep.name,
              version: dep.version,
              missing: dep.missing,
              versionMismatch: dep.versionMismatch,
              plugins: [plugin.plugin]
            });
          } else {
            const existingDep = depMap.get(dep.name);
            if (!existingDep.plugins.includes(plugin.plugin)) {
              existingDep.plugins.push(plugin.plugin);
            }
            // 如果有任何一个插件需要的依赖缺失，则标记为缺失
            if (dep.missing) {
              existingDep.missing = true;
            }
          }
        });
      });
      
      return Array.from(depMap.values());
    });
    
    // 过滤后的依赖列表
    const filteredDependencies = computed(() => {
      let deps = flattenedDependencies.value;
      
      if (filterStatus.value === 'missing') {
        deps = deps.filter(dep => dep.missing);
      }
      
      // 分页
      const start = (currentPage.value - 1) * pageSize.value;
      const end = start + pageSize.value;
      
      return deps.slice(start, end);
    });
    
    // 加载PIP源
    const loadPipSource = async () => {
      try {
        const source = await getPipSource();
        pipSource.value = source;
      } catch (error) {
        console.error('Loading PIP source failed:', error);
      }
    };
    
    // 保存PIP源
    const savePipSource = async () => {
      sourceSaving.value = true;
      try {
        await setPipSource(pipSource.value);
        $q.notify({
          color: 'positive',
          message: 'PIP源地址已更新',
          icon: 'check'
        });
      } catch (error) {
        $q.notify({
          color: 'negative',
          message: '保存PIP源地址失败: ' + error.message,
          icon: 'error'
        });
      } finally {
        sourceSaving.value = false;
      }
    };
    
    // 重置为默认源
    const resetToDefaultSource = () => {
      pipSource.value = 'https://pypi.org/simple';
      savePipSource();
    };
    
    // 选择预设源
    const selectSource = (source) => {
      pipSource.value = source;
    };
    
    // 加载已安装的包
    const loadInstalledPackages = async () => {
      loading.value = true;
      try {
        installedPackages.value = await getInstalledPackages();
      } catch (error) {
        $q.notify({
          color: 'negative',
          message: '加载已安装库失败: ' + error.message,
          icon: 'error'
        });
      } finally {
        loading.value = false;
      }
    };
    
    // 安装包
    const installPackage = async () => {
      if (!packageToInstall.value.trim()) {
        $q.notify({
          color: 'warning',
          message: '请输入库名称',
          icon: 'warning'
        });
        return;
      }
      
      installing.value = true;
      errorMessage.value = ''; // 清除之前的错误信息
      
      try {
        const packageSpec = packageToInstall.value + (packageVersion.value ? packageVersion.value : '');
        await apiInstallPackage(packageSpec);
        
        $q.notify({
          color: 'positive',
          message: `${packageToInstall.value} 安装成功`,
          icon: 'check'
        });
        
        showInstallDialog.value = false;
        packageToInstall.value = '';
        packageVersion.value = '';
        
        // 重新加载已安装的包
        await loadInstalledPackages();
      } catch (error) {
        // 增强错误处理，优先获取error字段
        if (error.response) {
          // 有响应但状态码不是2xx
          if (error.response.status === 500) {
            errorMessage.value = `服务器内部错误。\n\n${error.response?.body?.error || error.response?.data?.message || '服务器未提供详细错误信息。'}`;
          } else {
            errorMessage.value = error.response?.body?.error || error.response?.data?.message || `请求错误 (${error.response.status})`;
          }
        } else if (error.request) {
          // 请求已发送但未收到响应
          errorMessage.value = '未收到服务器响应，请检查网络连接或服务器状态。';
        } else {
          // 其他错误
          errorMessage.value = error.message || '未知错误';
        }
        
        // 添加控制台日志以便调试
        console.error('Installation error details:', error.response?.data);
      } finally {
        installing.value = false;
      }
    };
    
    // 确认卸载对话框
    const confirmUninstall = (pkg) => {
      packageToUninstall.value = pkg;
      showUninstallDialog.value = true;
    };
    
    // 卸载包
    const uninstallPackage = async () => {
      uninstalling.value = true;
      try {
        await apiUninstallPackage(packageToUninstall.value.name);
        
        $q.notify({
          color: 'positive',
          message: `${packageToUninstall.value.name} 已卸载`,
          icon: 'check'
        });
        
        showUninstallDialog.value = false;
        
        // 重新加载已安装的包
        await loadInstalledPackages();
      } catch (error) {
        $q.notify({
          color: 'negative',
          message: '卸载失败: ' + error.message,
          icon: 'error'
        });
      } finally {
        uninstalling.value = false;
      }
    };
    
    // 升级包
    const upgradePackage = async (pkg) => {
      installing.value = true;
      errorMessage.value = ''; // 清除之前的错误信息
      
      try {
        await apiInstallPackage(pkg.name + ' --upgrade');
        
        $q.notify({
          color: 'positive',
          message: `${pkg.name} 已升级`,
          icon: 'check'
        });
        
        // 重新加载已安装的包
        await loadInstalledPackages();
      } catch (error) {
        // 增强错误处理，优先获取error字段
        if (error.response) {
          // 有响应但状态码不是2xx
          if (error.response.status === 500) {
            errorMessage.value = `升级 ${pkg.name} 失败：服务器内部错误。\n\n${error.response?.body?.error || error.response?.data?.message || '服务器未提供详细错误信息。'}`;
          } else {
            errorMessage.value = error.response?.body?.error || error.response?.data?.message || `请求错误 (${error.response.status})`;
          }
        } else if (error.request) {
          // 请求已发送但未收到响应
          errorMessage.value = '未收到服务器响应，请检查网络连接或服务器状态。';
        } else {
          // 其他错误
          errorMessage.value = error.message || '未知错误';
        }
        
        // 添加控制台日志以便调试
        console.error('Upgrade error details:', error.response?.data);
      } finally {
        installing.value = false;
      }
    };
    
    // 分析插件依赖
    const analyzePluginDependencies = async () => {
      analyzingDeps.value = true;
      try {
        pluginDependencies.value = await apiAnalyzeDeps();
        currentPage.value = 1; // 重置到第一页
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
    
    // 修复依赖
    const fixDependencies = async (plugin) => {
      fixingDeps[plugin.plugin] = true;
      errorMessage.value = ''; // 清除之前的错误信息
      
      try {
        await fixPluginDependencies(plugin.plugin);
        
        $q.notify({
          color: 'positive',
          message: `${plugin.plugin} 的依赖已修复`,
          icon: 'check'
        });
        
        // 重新加载已安装的包和分析依赖
        await Promise.all([
          loadInstalledPackages(),
          analyzePluginDependencies()
        ]);
      } catch (error) {
        // 增强错误处理，优先获取error字段
        if (error.response) {
          // 有响应但状态码不是2xx
          if (error.response.status === 500) {
            errorMessage.value = `修复 ${plugin.plugin} 依赖失败：服务器内部错误。\n\n${error.response?.body?.error || error.response?.data?.message || '服务器未提供详细错误信息。'}`;
          } else {
            errorMessage.value = error.response?.body?.error || error.response?.data?.message || `请求错误 (${error.response.status})`;
          }
        } else if (error.request) {
          // 请求已发送但未收到响应
          errorMessage.value = '未收到服务器响应，请检查网络连接或服务器状态。';
        } else {
          // 其他错误
          errorMessage.value = error.message || '未知错误';
        }
        
        // 添加控制台日志以便调试
        console.error('Fix dependencies error details:', error.response?.data);
      } finally {
        fixingDeps[plugin.plugin] = false;
      }
    };
    
    // 安装单个依赖
    const installMissingDependency = async (pluginName, depName, depVersion) => {
      installingDep[depName] = true;
      errorMessage.value = ''; // 清除之前的错误信息
      
      try {
        const packageSpec = depName + (depVersion ? depVersion : '');
        await apiInstallPackage(packageSpec);
        
        $q.notify({
          color: 'positive',
          message: `依赖库 ${depName} 安装成功`,
          icon: 'check'
        });
        
        // 重新加载依赖分析
        await analyzePluginDependencies();
        // 更新已安装的包列表
        await loadInstalledPackages();
      } catch (error) {
        // 增强错误处理，优先获取error字段
        if (error.response) {
          // 有响应但状态码不是2xx
          if (error.response.status === 500) {
            errorMessage.value = `安装依赖库 ${depName} 失败：服务器内部错误。\n\n${error.response?.body?.error || error.response?.data?.message || '服务器未提供详细错误信息。'}`;
          } else {
            errorMessage.value = error.response?.body?.error || error.response?.data?.message || `请求错误 (${error.response.status})`;
          }
        } else if (error.request) {
          // 请求已发送但未收到响应
          errorMessage.value = '未收到服务器响应，请检查网络连接或服务器状态。';
        } else {
          // 其他错误
          errorMessage.value = error.message || '未知错误';
        }
        
        // 添加控制台日志以便调试
        console.error('Install dependency error details:', error.response?.data);
      } finally {
        installingDep[depName] = false;
      }
    };
    
    onMounted(async () => {
      await Promise.all([
        loadPipSource(), // 仍然加载源配置，但不显示
        loadInstalledPackages(),
        analyzePluginDependencies()
      ]);
    });
    
    return {
      // 选项卡
      activeTab,
      
      // 源地址相关 (保留但隐藏)
      pipSource,
      sourceSaving,
      savePipSource,
      resetToDefaultSource,
      selectSource,
      
      // 已安装包相关
      installedPackages,
      packagesColumns,
      loading,
      searchPackage,
      filteredPackages,
      loadInstalledPackages,
      
      // 安装包相关
      showInstallDialog,
      packageToInstall,
      packageVersion,
      installing,
      installPackage,
      
      // 卸载包相关
      showUninstallDialog,
      packageToUninstall,
      uninstalling,
      confirmUninstall,
      uninstallPackage,
      upgradePackage,
      
      // 插件依赖分析相关
      pluginDependencies,
      analyzingDeps,
      fixingDeps,
      analyzePluginDependencies,
      fixDependencies,
      filterStatus,
      currentPage,
      pageSize,
      filteredDependencies,
      
      // 安装单个依赖相关
      installingDep,
      installMissingDependency,
      
      // 错误信息
      errorMessage
    };
  }
});
</script>

<style scoped>
/* 覆盖选中按钮样式 */
::v-deep .q-btn-toggle {
  .q-btn-item {
    &.active {
      background: #4dabf7 !important;
      border-color: #4dabf7 !important;
      color: white !important;
    }
    
    &:not(.active) {
      background: #f8f9fa;
      color: #6c757d;
    }
  }
}

.error-dialog {
  max-width: 90vw !important;
  min-width: 50vw;
}

.error-dialog .q-dialog__message {
  max-height: 70vh;
  overflow-y: auto;
  white-space: pre-wrap;
  font-family: monospace;
  background-color: #ffebee;
  padding: 16px;
  border-radius: 4px;
}

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

.q-btn-toggle.active-tab {
  background: var(--q-primary);
  color: white;
}
</style>