<template>
  <div class="q-mb-md">
    <q-card class="package-container" bordered>
      <!-- 标题区域 -->
      <div class="q-px-md q-pt-md q-pb-xs">
        <div class="text-subtitle1">资源包安装</div>
        <q-separator class="q-my-sm" />
      </div>
      
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
                <div class="text-weight-medium">基础模型包</div>
                <q-chip dense size="xs" color="blue" text-color="white" class="q-ml-sm">热门</q-chip>
                <q-chip dense size="xs" color="pink" text-color="white" class="q-ml-xs">绝版</q-chip>
              </div>
              <div class="text-caption text-grey-7">包含ComfyUI能工作所需的基础模型</div>
            </div>
            
            <q-btn outline rounded color="primary" label="下载" class="download-btn q-ml-sm">
              <q-menu>
                <q-list style="min-width: 100px">
                  <q-item clickable v-close-popup @click="downloadOption('基础模型包', '模型')">
                    <q-item-section>模型</q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="downloadOption('基础模型包', '扩展')">
                    <q-item-section>扩展</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
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
                <div class="text-weight-medium">ControlNet模型包</div>
                <q-chip dense size="xs" color="pink" text-color="white" class="q-ml-sm">绝版</q-chip>
              </div>
              <div class="text-caption text-grey-7">包含ControlNet所需全部模型</div>
            </div>
            
            <q-btn outline rounded color="primary" label="下载" class="download-btn q-ml-sm" @click="downloadPackage('ControlNet模型包')" />
          </div>
        </div>
      </div>
    </q-card>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

// 定义资源包接口，避免使用 any 类型
interface Package {
  name: string;
  description: string;
  hasMenu: boolean;
  menuOptions?: string[];
}

export default defineComponent({
  name: 'PackageInstall',
  data() {
    return {
      packages: [
        { 
          name: '最低模型包', 
          description: 'SD1.5 4G SDXL base-model...等', 
          hasMenu: true,
          menuOptions: ['模型', '扩展']
        },
        { 
          name: 'ControlNet模型包', 
          description: 'controllllnet-models', 
          hasMenu: false
        }
      ] as Package[]
    }
  },
  methods: {
    downloadPackage(packageName: string) {
      console.log('Downloading package:', packageName);
      // Implement download logic
    },
    downloadOption(packageName: string, option: string) {
      console.log('Downloading option:', packageName, option);
      // Implement option download logic
    }
  }
});
</script>

<style scoped>
.package-container {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.download-btn {
  min-width: 72px;
  font-size: 0.9rem;
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
</style> 