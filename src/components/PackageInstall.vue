<template>
  <div class="q-mb-lg">
    <div class="text-subtitle1 q-mb-sm">资源包安装</div>
    <div class="row q-col-gutter-md">
      <div v-for="pkg in packages" :key="pkg.name" class="col-12 col-md-6">
        <q-card flat bordered class="package-card">
          <q-card-section class="row items-center no-wrap">
            <div>
              <div class="text-weight-medium">{{ pkg.name }}</div>
              <div class="text-caption text-grey">
                {{ pkg.description }}
              </div>
            </div>
            <q-space />
            <q-btn label="下载" color="primary" flat @click="downloadPackage(pkg)">
              <q-menu v-if="pkg.hasMenu">
                <q-list style="min-width: 100px">
                  <q-item v-for="option in pkg.menuOptions" :key="option" clickable v-close-popup @click="downloadOption(pkg, option)">
                    <q-item-section>{{ option }}</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </q-card-section>
        </q-card>
      </div>
    </div>
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
    downloadPackage(pkg: Package) {
      if (!pkg.hasMenu) {
        console.log('下载包:', pkg.name);
        // 实现下载逻辑
      }
    },
    downloadOption(pkg: Package, option: string) {
      console.log('下载选项:', pkg.name, option);
      // 实现选项下载逻辑
    }
  }
});
</script>

<style scoped>
.package-card {
  border-radius: 8px;
  transition: all 0.2s ease;
}

.package-card:hover {
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
}
</style> 