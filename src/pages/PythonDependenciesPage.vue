<template>
  <q-page class="my-page-container">
    <title-view :title="t('menu.environment_management')" :line="true" />

    <!-- 错误信息展示区域 -->
    <q-card v-if="errorMessage" class="q-mb-md bg-red-1">
      <q-card-section>
        <div class="text-h6 text-negative">安装错误</div>
        <pre class="error-message">{{ errorMessage }}</pre>
        <div
          v-if="errorMessage.includes('Internal Server Error')"
          class="q-mt-md"
        >
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
pip install --user 包名</pre
          >
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          color="negative"
          icon="close"
          label="关闭"
          @click="errorMessage = ''"
        />
      </q-card-actions>
    </q-card>

    <table-page :tab-array="tabArray" v-model="activeTab">
      <template v-slot:header-end></template>

      <template v-slot:page-1>
        <!-- 源地址配置 -->
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6">依赖库源配置</div>
            <div class="q-gutter-md">
              <q-input
                v-model="pipSource"
                label="PIP源地址"
                outlined
                :loading="sourceSaving"
              >
                <template v-slot:append>
                  <q-btn
                    round
                    dense
                    flat
                    icon="save"
                    @click="savePipSource"
                    :loading="sourceSaving"
                  />
                  <q-btn
                    round
                    dense
                    flat
                    icon="refresh"
                    @click="resetToDefaultSource"
                    :loading="sourceSaving"
                  />
                </template>
              </q-input>
              <div class="text-caption">
                常用源：
                <a
                  href="#"
                  @click.prevent="selectSource('https://pypi.org/simple')"
                  >官方源</a
                >
                |
                <a
                  href="#"
                  @click.prevent="
                    selectSource('https://pypi.tuna.tsinghua.edu.cn/simple')
                  "
                  >清华源</a
                >
                |
                <a
                  href="#"
                  @click.prevent="
                    selectSource('https://mirrors.aliyun.com/pypi/simple')
                  "
                  >阿里源</a
                >
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- 已安装的依赖库 -->
        <q-card>
          <q-card-section>
            <div class="text-h6">已安装的依赖库</div>
            <div class="q-gutter-sm q-mb-md">
              <q-input
                v-model="searchPackage"
                outlined
                dense
                label="搜索库"
                class="q-mr-sm"
                style="max-width: 300px"
              >
                <template v-slot:append>
                  <q-icon name="search" />
                </template>
              </q-input>
              <q-btn
                color="primary"
                icon="refresh"
                label="刷新"
                @click="loadInstalledPackages"
                :loading="loading"
              />
            </div>

            <q-table
              :rows="filteredPackages"
              :columns="packagesColumns"
              row-key="name"
              :loading="loading"
              :pagination="{ rowsPerPage: 15 }"
            >
              <template v-slot:top-right>
                <q-btn
                  color="primary"
                  icon="add"
                  label="安装新库"
                  @click="showInstallDialog = true"
                />
              </template>
              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
                  <q-btn
                    flat
                    round
                    dense
                    icon="delete"
                    color="negative"
                    @click="confirmUninstall(props.row)"
                  />
                  <q-btn
                    flat
                    round
                    dense
                    icon="upgrade"
                    color="primary"
                    @click="upgradePackage(props.row)"
                  />
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </template>

      <template v-slot:page-2>
        <q-card>
          <q-card-section>
            <div class="text-h6">插件依赖分析</div>
            <q-btn
              color="primary"
              icon="refresh"
              label="分析插件依赖"
              @click="analyzePluginDependencies"
              :loading="analyzingDeps"
              class="q-mb-md"
            />

            <div class="q-pa-none">
              <q-list bordered separator class="rounded-borders">
                <q-expansion-item
                  v-for="plugin in pluginDependencies"
                  :key="plugin.plugin"
                  expand-separator
                  :icon="
                    plugin.missingDeps.length ? 'error_outline' : 'check_circle'
                  "
                  :label="plugin.plugin"
                  :caption="plugin.missingDeps.length ? '缺少依赖' : '依赖满足'"
                  :header-class="
                    plugin.missingDeps.length ? 'bg-red-1' : 'bg-green-1'
                  "
                >
                  <template v-slot:header-right>
                    <q-chip
                      :color="
                        plugin.missingDeps.length ? 'negative' : 'positive'
                      "
                      text-color="white"
                      :label="
                        plugin.missingDeps.length ? '缺少依赖' : '依赖满足'
                      "
                      class="q-mr-md"
                    />
                  </template>

                  <q-card>
                    <q-card-section>
                      <div class="row items-center q-mb-md">
                        <div class="text-subtitle1 col">依赖库列表</div>
                        <div class="col-auto" v-if="plugin.missingDeps.length">
                          <q-btn
                            color="primary"
                            label="一键修复所有依赖"
                            icon="build"
                            @click="fixDependencies(plugin)"
                            :loading="fixingDeps[plugin.plugin]"
                          />
                        </div>
                      </div>
                      <q-list separator>
                        <q-item
                          v-for="dep in plugin.dependencies"
                          :key="dep.name"
                          class="q-py-md"
                        >
                          <q-item-section avatar>
                            <q-icon
                              :name="
                                dep.missing
                                  ? 'error'
                                  : dep.versionMismatch
                                  ? 'warning'
                                  : 'check_circle'
                              "
                              :color="
                                dep.missing
                                  ? 'negative'
                                  : dep.versionMismatch
                                  ? 'warning'
                                  : 'positive'
                              "
                              size="md"
                            />
                          </q-item-section>
                          <q-item-section>
                            <q-item-label class="text-weight-bold text-body1"
                              >{{ dep.name }}
                            </q-item-label>
                            <q-item-label caption v-if="dep.version">
                              <span class="text-body2"
                                >版本要求: {{ dep.version }}</span
                              >
                            </q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-badge
                              :color="
                                dep.missing
                                  ? 'negative'
                                  : dep.versionMismatch
                                  ? 'warning'
                                  : 'positive'
                              "
                              :label="
                                dep.missing
                                  ? '缺失'
                                  : dep.versionMismatch
                                  ? '版本不匹配'
                                  : '已安装'
                              "
                              class="q-px-sm q-py-xs text-body2"
                            />
                          </q-item-section>
                          <q-item-section side v-if="dep.missing">
                            <q-btn
                              color="primary"
                              label="安装"
                              size="sm"
                              @click.stop="
                                installMissingDependency(
                                  plugin.plugin,
                                  dep.name,
                                  dep.version
                                )
                              "
                              :loading="installingDep[dep.name]"
                            />
                          </q-item-section>
                        </q-item>
                      </q-list>
                    </q-card-section>
                  </q-card>
                </q-expansion-item>
              </q-list>
            </div>
          </q-card-section>
        </q-card>
      </template>
    </table-page>

    <!-- 安装库对话框 -->
    <q-dialog v-model="showInstallDialog">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">安装新库</div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="packageToInstall"
            label="库名称"
            outlined
            autofocus
          />
          <q-input
            v-model="packageVersion"
            label="版本 (可选)"
            outlined
            class="q-mt-sm"
            hint="例如: ==1.0.0, >=2.0.0, 留空安装最新版本"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="取消" color="primary" v-close-popup />
          <q-btn
            label="安装"
            color="primary"
            @click="installPackage"
            :loading="installing"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- 确认卸载对话框 -->
    <q-dialog v-model="showUninstallDialog">
      <q-card>
        <q-card-section>
          <div class="text-h6">确认卸载</div>
        </q-card-section>

        <q-card-section>
          确定要卸载
          <strong>{{ packageToUninstall.name }}</strong>
          吗？这可能会影响依赖该库的插件。
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="取消" color="primary" v-close-popup />
          <q-btn
            flat
            label="卸载"
            color="negative"
            @click="uninstallPackage"
            :loading="uninstalling"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
<script lang="ts" setup>
import { ref, computed, onMounted, reactive } from 'vue';
import { useQuasar } from 'quasar';
import {
  getPipSource,
  setPipSource,
  getInstalledPackages,
  installPackage as apiInstallPackage,
  uninstallPackage as apiUninstallPackage,
  analyzePluginDependencies as apiAnalyzeDeps,
  fixPluginDependencies,
} from 'src/api';
import TablePage from 'components/base/TablePage.vue';
import { TabProps } from 'src/types/contants';
import TitleView from 'components/base/TitleView.vue';
import { useI18n } from 'vue-i18n';

const $q = useQuasar();
const { t } = useI18n();

// 选项卡
const activeTab = ref('deps');
const tabArray = ref<TabProps[]>([
  { key: 'deps', label: '依赖库管理' },
  { key: 'plugins', label: '插件依赖分析' },
]);

// 源地址配置
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

// 安装单个依赖相关
const installingDep = reactive({});

// 错误信息
const errorMessage = ref('');

// 表格列定义
const packagesColumns = [
  {
    name: 'name',
    label: '库名称',
    field: 'name',
    align: 'left',
    sortable: true,
  },
  {
    name: 'version',
    label: '版本',
    field: 'version',
    align: 'left',
    sortable: true,
  },
  { name: 'actions', label: '操作', field: 'actions', align: 'center' },
];

const pluginDepsColumns = [
  {
    name: 'plugin',
    label: '插件名称',
    field: 'plugin',
    align: 'left',
    sortable: true,
  },
  { name: 'status', label: '状态', field: 'status', align: 'center' },
  {
    name: 'dependencies',
    label: '依赖库',
    field: 'dependencies',
    align: 'left',
  },
  { name: 'actions', label: '操作', field: 'actions', align: 'center' },
];

// 过滤后的包列表
const filteredPackages = computed(() => {
  if (!searchPackage.value) return installedPackages.value;
  const query = searchPackage.value.toLowerCase();
  return installedPackages.value.filter((pkg) =>
    pkg.name.toLowerCase().includes(query)
  );
});

// 加载PIP源
const loadPipSource = async () => {
  try {
    const source = await getPipSource();
    pipSource.value = source;
  } catch (error: any) {
    $q.notify({
      color: 'negative',
      message: '加载PIP源地址失败: ' + error.message,
      icon: 'error',
    });
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
      icon: 'check',
    });
  } catch (error: any) {
    $q.notify({
      color: 'negative',
      message: '保存PIP源地址失败: ' + error.message,
      icon: 'error',
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
const selectSource = (source: any) => {
  pipSource.value = source;
};

// 加载已安装的包
const loadInstalledPackages = async () => {
  loading.value = true;
  try {
    installedPackages.value = await getInstalledPackages();
  } catch (error: any) {
    $q.notify({
      color: 'negative',
      message: '加载已安装库失败: ' + error.message,
      icon: 'error',
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
      icon: 'warning',
    });
    return;
  }

  installing.value = true;
  errorMessage.value = ''; // 清除之前的错误信息

  try {
    const packageSpec =
      packageToInstall.value +
      (packageVersion.value ? packageVersion.value : '');
    await apiInstallPackage(packageSpec);

    $q.notify({
      color: 'positive',
      message: `${packageToInstall.value} 安装成功`,
      icon: 'check',
    });

    showInstallDialog.value = false;
    packageToInstall.value = '';
    packageVersion.value = '';

    // 重新加载已安装的包
    await loadInstalledPackages();
  } catch (error: any) {
    // 增强错误处理，优先获取error字段
    if (error.response) {
      // 有响应但状态码不是2xx
      if (error.response.status === 500) {
        errorMessage.value = `服务器内部错误。\n\n${
          error.response?.body?.error ||
          error.response?.data?.message ||
          '服务器未提供详细错误信息。'
        }`;
      } else {
        errorMessage.value =
          error.response?.body?.error ||
          error.response?.data?.message ||
          `请求错误 (${error.response.status})`;
      }
    } else if (error.request) {
      // 请求已发送但未收到响应
      errorMessage.value = '未收到服务器响应，请检查网络连接或服务器状态。';
    } else {
      // 其他错误
      errorMessage.value = error.message || '未知错误';
    }

    // 添加控制台日志以便调试
    console.error('安装包错误详情:', error.response?.data);
  } finally {
    installing.value = false;
  }
};

// 确认卸载对话框
const confirmUninstall = (pkg: any) => {
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
      icon: 'check',
    });

    showUninstallDialog.value = false;

    // 重新加载已安装的包
    await loadInstalledPackages();
  } catch (error: any) {
    $q.notify({
      color: 'negative',
      message: '卸载失败: ' + error.message,
      icon: 'error',
    });
  } finally {
    uninstalling.value = false;
  }
};

// 升级包
const upgradePackage = async (pkg: any) => {
  installing.value = true;
  errorMessage.value = ''; // 清除之前的错误信息

  try {
    await apiInstallPackage(pkg.name + ' --upgrade');

    $q.notify({
      color: 'positive',
      message: `${pkg.name} 已升级`,
      icon: 'check',
    });

    // 重新加载已安装的包
    await loadInstalledPackages();
  } catch (error: any) {
    // 增强错误处理，优先获取error字段
    if (error.response) {
      // 有响应但状态码不是2xx
      if (error.response.status === 500) {
        errorMessage.value = `升级 ${pkg.name} 失败：服务器内部错误。\n\n${
          error.response?.body?.error ||
          error.response?.data?.message ||
          '服务器未提供详细错误信息。'
        }`;
      } else {
        errorMessage.value =
          error.response?.body?.error ||
          error.response?.data?.message ||
          `请求错误 (${error.response.status})`;
      }
    } else if (error.request) {
      // 请求已发送但未收到响应
      errorMessage.value = '未收到服务器响应，请检查网络连接或服务器状态。';
    } else {
      // 其他错误
      errorMessage.value = error.message || '未知错误';
    }

    // 添加控制台日志以便调试
    console.error('升级包错误详情:', error.response?.data);
  } finally {
    installing.value = false;
  }
};

// 分析插件依赖
const analyzePluginDependencies = async () => {
  analyzingDeps.value = true;
  try {
    pluginDependencies.value = await apiAnalyzeDeps();
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: '分析插件依赖失败: ' + error.message,
      icon: 'error',
    });
  } finally {
    analyzingDeps.value = false;
  }
};

// 修复依赖
const fixDependencies = async (plugin: any) => {
  fixingDeps[plugin.plugin] = true;
  errorMessage.value = ''; // 清除之前的错误信息

  try {
    await fixPluginDependencies(plugin.plugin);

    $q.notify({
      color: 'positive',
      message: `${plugin.plugin} 的依赖已修复`,
      icon: 'check',
    });

    // 重新加载已安装的包和分析依赖
    await Promise.all([loadInstalledPackages(), analyzePluginDependencies()]);
  } catch (error: any) {
    // 增强错误处理，优先获取error字段
    if (error.response) {
      // 有响应但状态码不是2xx
      if (error.response.status === 500) {
        errorMessage.value = `修复 ${
          plugin.plugin
        } 依赖失败：服务器内部错误。\n\n${
          error.response?.body?.error ||
          error.response?.data?.message ||
          '服务器未提供详细错误信息。'
        }`;
      } else {
        errorMessage.value =
          error.response?.body?.error ||
          error.response?.data?.message ||
          `请求错误 (${error.response.status})`;
      }
    } else if (error.request) {
      // 请求已发送但未收到响应
      errorMessage.value = '未收到服务器响应，请检查网络连接或服务器状态。';
    } else {
      // 其他错误
      errorMessage.value = error.message || '未知错误';
    }

    // 添加控制台日志以便调试
    console.error('修复依赖错误详情:', error.response?.data);
  } finally {
    fixingDeps[plugin.plugin] = false;
  }
};

// 安装单个依赖
const installMissingDependency = async (
  pluginName: any,
  depName: any,
  depVersion: any
) => {
  installingDep[depName] = true;
  errorMessage.value = ''; // 清除之前的错误信息

  try {
    const packageSpec = depName + (depVersion ? depVersion : '');
    await apiInstallPackage(packageSpec);

    $q.notify({
      color: 'positive',
      message: `依赖库 ${depName} 安装成功`,
      icon: 'check',
    });

    // 重新加载依赖分析
    await analyzePluginDependencies();
    // 更新已安装的包列表
    await loadInstalledPackages();
  } catch (error: any) {
    // 增强错误处理，优先获取error字段
    if (error.response) {
      // 有响应但状态码不是2xx
      if (error.response.status === 500) {
        errorMessage.value = `安装依赖库 ${depName} 失败：服务器内部错误。\n\n${
          error.response?.body?.error ||
          error.response?.data?.message ||
          '服务器未提供详细错误信息。'
        }`;
      } else {
        errorMessage.value =
          error.response?.body?.error ||
          error.response?.data?.message ||
          `请求错误 (${error.response.status})`;
      }
    } else if (error.request) {
      // 请求已发送但未收到响应
      errorMessage.value = '未收到服务器响应，请检查网络连接或服务器状态。';
    } else {
      // 其他错误
      errorMessage.value = error.message || '未知错误';
    }

    // 添加控制台日志以便调试
    console.error('安装依赖错误详情:', error.response?.data);
  } finally {
    installingDep[depName] = false;
  }
};

onMounted(async () => {
  await Promise.all([
    loadPipSource(),
    loadInstalledPackages(),
    analyzePluginDependencies(),
  ]);
});
</script>

<style>
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
</style>
