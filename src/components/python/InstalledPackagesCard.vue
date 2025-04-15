<template>
  <q-card class="q-mb-md" flat style="border-radius: 16px; border: 1px solid #e0e0e0; overflow: hidden; padding-left: 0; padding-right: 0; padding-bottom: 0;">
    <q-card-section style="padding-left: 0; padding-right: 0; padding-bottom: 0;">
      <div class="row items-center justify-between q-mb-md"
      style="margin:16px;"
      >
        <div>
          <div class="text-h6">{{ $t('python.installedPackages.title') }}</div>
          <div class="text-caption">{{ $t('python.installedPackages.subtitle') }}</div>
        </div>
        <div class="row items-center">
          <q-input 
            v-model="searchPackage" 
            outlined 
            dense 
            :placeholder="$t('python.installedPackages.search')" 
            class="col-grow" 
            style="max-width: 300px; margin-left: auto;" 
          >
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>
          <q-btn 
            flat
            :label="$t('python.installedPackages.install')" 
            icon="add" 
            class="q-ml-sm" 
            @click="showInstallDialog = true" 
            style="background-color: white; color: #333; border: 1px solid #ccc; border-radius: 8px; padding: 8px 12px;" 
          />
          <q-btn 
            flat 
            icon="refresh" 
            :label="$t('python.installedPackages.refresh')"
            class="q-ml-sm" 
            @click="loadInstalledPackages" 
            :loading="loading" 
            style="background-color: white; color: #333; border: 1px solid #ccc; border-radius: 8px; padding: 8px 12px;" 
          />
        </div>
      </div>
      <q-separator class="q-mb-md" style="margin-top: 30px;"/>
      <q-table
        :rows="filteredPackages"
        style="margin-left: 0; margin-right: 0; margin-bottom: 0; box-shadow: none;"
        :columns="packagesColumns"
        row-key="name"
        :loading="loading"
        :pagination="{ rowsPerPage: 10 }"
        class="q-mt-md"
      >
        <template v-slot:body-cell-version="props">
          <q-td :props="props">
            {{ props.row.version }}
          </q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn flat round dense size="sm" icon="arrow_upward" color="grey-7" @click="upgradePackage(props.row)" />
            <q-btn flat round dense size="sm" icon="delete_outline" color="grey-7" @click="confirmUninstall(props.row)" />
          </q-td>
        </template>
        <template v-slot:bottom="scope">
          <div class="row items-center justify-end full-width">
            <div class="col-auto">
              {{ $t('python.installedPackages.pagination.rowsPerPage') }}: 
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
              {{ $t('python.installedPackages.pagination.range', { start: scope.pagination.rowsStart, end: scope.pagination.rowsEnd, total: scope.pagination.rowsNumber }) }}
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

  <!-- 安装库对话框 -->
  <q-dialog v-model="showInstallDialog">
    <q-card style="min-width: 400px">
      <q-card-section>
        <div class="text-h6">{{ $t('python.installedPackages.dialog.install.title') }}</div>
      </q-card-section>
      
      <q-card-section>
        <q-input v-model="packageToInstall" :label="$t('python.installedPackages.dialog.install.packageName')" outlined autofocus />
        <q-input v-model="packageVersion" :label="$t('python.installedPackages.dialog.install.version')" outlined class="q-mt-sm" :hint="$t('python.installedPackages.dialog.install.versionHint')" />
      </q-card-section>
      
      <q-card-actions align="right" style="margin-right: 8px; margin-bottom: 8px;">
        <q-btn outline style="border-radius: var(--border-radius-md);" :label="$t('python.installedPackages.dialog.install.cancel')" color="grey-7" v-close-popup />
        <q-btn :label="$t('python.installedPackages.dialog.install.confirmInstall')" color="primary" style="border-radius: var(--border-radius-md);" @click="installPackage" :loading="installing" />
      </q-card-actions>
    </q-card>
  </q-dialog>
  
  <!-- 确认卸载对话框 -->
  <q-dialog v-model="showUninstallDialog">
    <q-card>
      <q-card-section>
        <div class="text-h6">{{ $t('python.installedPackages.dialog.uninstall.title') }}</div>
      </q-card-section>
      
      <q-card-section>
        {{ $t('python.installedPackages.dialog.uninstall.message', { name: packageToUninstall.name }) }}
      </q-card-section>
      
      <q-card-actions align="right">
        <q-btn outline :label="$t('python.installedPackages.dialog.uninstall.cancel')" color="grey-7" v-close-popup style="border-radius: var(--border-radius-md);"/>
        <q-btn :label="$t('python.installedPackages.dialog.uninstall.confirmUninstall')" color="negative" @click="uninstallPackage" :loading="uninstalling" style="border-radius: var(--border-radius-md);"/>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { getInstalledPackages, installPackage as apiInstallPackage, 
         uninstallPackage as apiUninstallPackage } from 'src/api';

export default defineComponent({
  name: 'InstalledPackagesCard',
  
  emits: ['error'],
  
  setup(props, { emit }) {
    const $q = useQuasar();
    const { t } = useI18n();
    
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
    
    // 表格列定义
    const packagesColumns = computed(() => [
      { name: 'name', label: t('python.installedPackages.tableCols.name'), field: 'name', align: 'left', sortable: true },
      { name: 'version', label: t('python.installedPackages.tableCols.version'), field: 'version', align: 'left', sortable: true },
      { name: 'actions', label: t('python.installedPackages.tableCols.actions'), field: 'actions', align: 'center' }
    ]);
    
    // 已安装库相关
    const filteredPackages = computed(() => {
      if (!searchPackage.value) return installedPackages.value;
      const query = searchPackage.value.toLowerCase();
      return installedPackages.value.filter(pkg => 
        pkg.name.toLowerCase().includes(query)
      );
    });
    
    // 加载已安装的包
    const loadInstalledPackages = async () => {
      loading.value = true;
      try {
        installedPackages.value = await getInstalledPackages();
      } catch (error) {
        $q.notify({
          color: 'negative',
          message: t('python.installedPackages.notifications.loadFailed', { message: error.message }),
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
          message: t('python.packageName') + ' ' + t('common.required'),
          icon: 'warning'
        });
        return;
      }
      
      installing.value = true;
      
      try {
        const packageSpec = packageToInstall.value + (packageVersion.value ? packageVersion.value : '');
        await apiInstallPackage(packageSpec);
        
        $q.notify({
          color: 'positive',
          message: t('python.installedPackages.notifications.installSuccess', { name: packageToInstall.value }),
          icon: 'check'
        });
        
        showInstallDialog.value = false;
        packageToInstall.value = '';
        packageVersion.value = '';
        
        // 重新加载已安装的包
        await loadInstalledPackages();
      } catch (error) {
        // 增强错误处理，优先获取error字段
        let errorMsg = '';
        if (error.response) {
          // 有响应但状态码不是2xx
          if (error.response.status === 500) {
            errorMsg = `${t('python.errors.serverErrorCauses')}\n\n${error.response?.body?.error || error.response?.data?.message || t('python.errors.serverUnknown')}`;
          } else {
            errorMsg = error.response?.body?.error || error.response?.data?.message || `${t('network.requestError')} (${error.response.status})`;
          }
        } else if (error.request) {
          // 请求已发送但未收到响应
          errorMsg = t('network.noResponse');
        } else {
          // 其他错误
          errorMsg = error.message || t('common.unknownError');
        }
        
        // 发送错误到父组件
        emit('error', errorMsg);
        
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
          message: t('python.installedPackages.notifications.uninstallSuccess', { name: packageToUninstall.value.name }),
          icon: 'check'
        });
        
        showUninstallDialog.value = false;
        
        // 重新加载已安装的包
        await loadInstalledPackages();
      } catch (error) {
        $q.notify({
          color: 'negative',
          message: t('python.installedPackages.notifications.uninstallFailed', { message: error.message }),
          icon: 'error'
        });
      } finally {
        uninstalling.value = false;
      }
    };
    
    // 升级包
    const upgradePackage = async (pkg) => {
      installing.value = true;
      
      try {
        await apiInstallPackage(pkg.name + ' --upgrade');
        
        $q.notify({
          color: 'positive',
          message: t('python.installedPackages.notifications.upgradeSuccess', { name: pkg.name }),
          icon: 'check'
        });
        
        // 重新加载已安装的包
        await loadInstalledPackages();
      } catch (error) {
        // 增强错误处理，优先获取error字段
        let errorMsg = '';
        if (error.response) {
          // 有响应但状态码不是2xx
          if (error.response.status === 500) {
            errorMsg = `${t('python.installedPackages.notifications.upgradeFailed', { message: t('python.errors.serverErrorCauses') })}\n\n${error.response?.body?.error || error.response?.data?.message || t('python.errors.serverUnknown')}`;
          } else {
            errorMsg = error.response?.body?.error || error.response?.data?.message || `${t('network.requestError')} (${error.response.status})`;
          }
        } else if (error.request) {
          // 请求已发送但未收到响应
          errorMsg = t('network.noResponse');
        } else {
          // 其他错误
          errorMsg = error.message || t('common.unknownError');
        }
        
        // 发送错误到父组件
        emit('error', errorMsg);
        
        // 添加控制台日志以便调试
        console.error('Upgrade error details:', error.response?.data);
      } finally {
        installing.value = false;
      }
    };
    
    onMounted(async () => {
      await loadInstalledPackages();
    });
    
    return {
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
      upgradePackage
    };
  }
});
</script> 