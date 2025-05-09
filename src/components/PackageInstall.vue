<template>
  <div class="q-mb-md">
    <q-card class="package-container" bordered>
      <!-- 标题区域 -->
      <div class="q-px-md q-pt-md q-pb-xs">
        <div class="text-subtitle1">{{ $t('packageInstall.title') }}</div>
        
      </div>
      <q-separator class="q-my-sm" />
      <!-- 包内容区域 -->
      <div class="row q-px-md q-py-sm">
        <!-- 基础模型包 -->
        <div class="col-12 col-md-6 q-pr-md-md q-pb-sm">
          <div class="row items-center no-wrap">
            <q-avatar size="46px" class="q-mr-sm" color="blue-1">
              <img src="~assets/icon-package-base.png" />
            </q-avatar>
            
            <div class="col">
              <div class="row items-center">
                <div class="text-weight-medium">{{ $t('packageInstall.essentialPackage') }}</div>
                <!-- <q-chip dense size="xs" color="blue" text-color="white" class="q-ml-sm">{{ $t('packageInstall.popular') }}</q-chip>
                <q-chip dense size="xs" color="pink" text-color="white" class="q-ml-xs">{{ $t('packageInstall.outOfPrint') }}</q-chip> -->
              </div>
              <div class="text-caption text-grey-7">{{ $t('packageInstall.essentialModelsDesc') }}</div>
            </div>
            
            <q-btn outline rounded label="" class="download-btn q-ml-sm" @click="openEssentialModelsResourcePack" >
              {{ $t('packageInstall.download') }}
            </q-btn>
          </div>
        </div>
        
        <!-- 分割线 (仅在移动视图时显示) -->
        <div class="col-12 q-my-xs visible-xs">
          <q-separator />
        </div>
        
        <!-- ControlNet模型包 -->
        <div class="col-12 col-md-6 q-pl-md-md q-pb-sm">
          <div class="row items-center no-wrap">
            <q-avatar size="46px" class="q-mr-sm" color="blue-1">
              <img src="~assets/icon-package-controlnet.png" />
            </q-avatar>
            
            <div class="col">
              <div class="row items-center">
                <div class="text-weight-medium">{{ $t('packageInstall.controlNetPackage') }}</div>
                <!-- <q-chip dense size="xs" color="pink" text-color="white" class="q-ml-sm">{{ $t('packageInstall.outOfPrint') }}</q-chip> -->
              </div>
              <div class="text-caption text-grey-7">{{ $t('packageInstall.controlNetModelsDesc') }}</div>
            </div>
            
            <q-btn outline rounded class="download-btn q-ml-sm" @click="openControlNetResourcePack" >
              {{ $t('packageInstall.download') }}
            </q-btn>
          </div>
        </div>
        
        <!-- 分割线 -->
        <div class="col-12 q-my-md">
          <q-separator />
        </div>
        
        <!-- FramePack视频生成模型包 -->
        <div class="col-12 col-md-6 q-pr-md-md q-pb-sm">
          <div class="row items-center no-wrap">
            <q-avatar size="46px" class="q-mr-sm" color="blue-1">
              <img src="~assets/icon-package-controlnet.png" />
            </q-avatar>
            
            <div class="col">
              <div class="row items-center">
                <div class="text-weight-medium">{{ $t('packageInstall.framePackPackage') }}</div>
                <q-chip dense size="xs" color="blue" text-color="white" class="q-ml-sm">{{ $t('packageInstall.popular') }}</q-chip>
              </div>
              <div class="text-caption text-grey-7">{{ $t('packageInstall.framePackModelsDesc') }}</div>
            </div>
            
            <q-btn outline rounded class="download-btn q-ml-sm" @click="openFramePackResourcePack">
              {{ $t('packageInstall.download') }}
            </q-btn>
          </div>
        </div>
      </div>
    </q-card>
    
    <!-- 基础模型安装对话框 -->
    <EssentialModelsDialog 
      v-model="showEssentialModelsDialog"
      @installation-complete="handleInstallationComplete"
    />
    
    <!-- 资源包安装对话框 -->
    <ResourcePackDialog
      ref="resourcePackDialog"
      v-model:visible="showResourcePackDialog"
      :pack-id="selectedPackId"
      @installation-complete="handleResourcePackInstallComplete"
      @update:visible="(val) => !val && handleResourcePackDialogClose()"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import EssentialModelsDialog from './models/EssentialModelsDialog.vue';
import ResourcePackDialog from './resources/ResourcePackDialog.vue';
import { useQuasar } from 'quasar';

// 定义资源包接口，避免使用 any 类型
interface Package {
  id: string;
  name: string;
  description: string;
  hasMenu: boolean;
  menuOptions?: string[];
}

export default defineComponent({
  name: 'PackageInstall',
  components: {
    EssentialModelsDialog,
    ResourcePackDialog
  },
  setup() {
    const $q = useQuasar();
    const showEssentialModelsDialog = ref(false);
    const showResourcePackDialog = ref(false);
    const selectedPackId = ref('');
    
    const packages = ref<Package[]>([
      { 
        id: 'essential-models',
        name: '最低模型包', 
        description: 'SD1.5 4G SDXL base-model...等', 
        hasMenu: true,
        menuOptions: ['模型', '扩展']
      },
      { 
        id: 'controlnet-models',
        name: 'ControlNet模型包', 
        description: 'controllllnet-models', 
        hasMenu: false
      },
      { 
        id: 'framepack-models-pack',
        name: 'FramePack视频生成模型包', 
        description: '包含FramePack视频生成所需的核心模型', 
        hasMenu: false
      }
    ]);
    
    const downloadOption = ref('all');
    
    // 添加资源包对话框组件的引用
    const resourcePackDialog = ref<InstanceType<typeof ResourcePackDialog> | null>(null);
    
    const openControlNetResourcePack = () => {
      selectedPackId.value = 'controlnet-models';
      showResourcePackDialog.value = true;
    };
    
    const openEssentialModelsResourcePack = () => {
      selectedPackId.value = 'essential-models-pack';
      showResourcePackDialog.value = true;
    };
    
    const openFramePackResourcePack = () => {
      selectedPackId.value = 'framepack-models-pack';
      showResourcePackDialog.value = true;
    };
    
    const handleResourcePackInstallComplete = (result: { success: boolean, error?: string, packId?: string }) => {
      if (result.success) {
        $q.notify({
          color: 'positive',
          icon: 'check_circle',
          message: `${result.packId || '资源包'}安装完成！`,
          timeout: 3000
        });
      } else {
        $q.notify({
          color: 'negative',
          icon: 'error',
          message: `安装失败: ${result.error || '未知错误'}`,
          timeout: 5000
        });
      }
    };
    
    const handleInstallationComplete = () => {
      $q.notify({
        color: 'positive',
        icon: 'check_circle',
        message: '基础模型安装完成！',
        timeout: 3000
      });
    };
    
    // 添加处理资源包对话框关闭的方法
    const handleResourcePackDialogClose = () => {
      showResourcePackDialog.value = false;
      // 如果有引用，调用重置方法
      if (resourcePackDialog.value) {
        resourcePackDialog.value.resetState();
      }
    };
    
    return {
      packages,
      showEssentialModelsDialog,
      downloadOption,
      handleInstallationComplete,
      showResourcePackDialog,
      selectedPackId,
      openControlNetResourcePack,
      openEssentialModelsResourcePack,
      openFramePackResourcePack,
      handleResourcePackInstallComplete,
      resourcePackDialog,
      handleResourcePackDialogClose
    };
  }
});
</script>

<style scoped>
.package-container {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: var(--border-radius-xl);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.download-btn {
  min-width: 72px;
  font-size: 0.9rem;
  border-radius: var(--border-radius-md);
  color: var(--button-text-color);
  border-color: var(--button-text-color);
}

/* 处理两列布局时的间距 */
@media (min-width: 1024px) {
  .q-pr-md-md {
    padding-right: 12px;
  }
  
  .q-pl-md-md {
    padding-left: 12px;
  }
}

/* 在移动视图下的分割线类 */
@media (max-width: 1023px) {
  .visible-xs {
    display: block;
  }
}

@media (min-width: 1024px) {
  .visible-xs {
    display: none;
  }
}

.text-subtitle1 {
  color: var(--text-important);
}
.text-weight-medium {
  color: var(--text-important);
  font-weight: normal;
}
</style>