<template>
  <card-container
    grid
    :columns="2"
    :column-gap="32"
    :label="t('base.package_install')"
  >
    <div v-for="pkg in packages" :key="pkg.name" class="col-12 col-md-6">
      <package-install-item
        :name="pkg.name"
        :description="pkg.description"
        :has-menu="pkg.hasMenu"
        :menu-options="pkg.menuOptions"
        @on-download-click="downloadPackage"
        @on-menu-click="downloadOption"
      />
    </div>
  </card-container>
</template>

<script lang="ts" setup>
import PackageInstallItem from 'components/package/PackageInstallItem.vue';
import CardContainer from 'components/base/CardContainer.vue';
import { useI18n } from 'vue-i18n';

interface Package {
  name: string;
  description: string;
  hasMenu: boolean;
  menuOptions?: string[];
}

const { t } = useI18n();
const packages = [
  {
    name: '最低模型包',
    description: 'SD1.5 4G SDXL base-model...等',
    hasMenu: true,
    menuOptions: ['模型', '扩展'],
  },
  {
    name: 'ControlNet模型包',
    description: 'controllllnet-models',
    hasMenu: false,
  },
] as Package[];

function downloadPackage(pkg: Package) {
  if (!pkg.hasMenu) {
    console.log('下载包:', pkg.name);
    // 实现下载逻辑
  }
}

function downloadOption(pkg: Package, option: string) {
  console.log('下载选项:', pkg.name, option);
  // 实现选项下载逻辑
}
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
