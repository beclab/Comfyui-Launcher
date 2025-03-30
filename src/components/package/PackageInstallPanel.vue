<template>
  <card-container
    grid
    :columns="2"
    :column-gap="32"
    :title="t('base.resource_pack')"
  >
    <div v-for="pkg in packages" :key="pkg.name" class="col-12 col-md-6">
      <package-install-item
        :package="pkg"
        @on-download-click="downloadPackage"
        @on-menu-click="downloadOption"
      />
    </div>
  </card-container>
</template>

<script lang="ts" setup>
import PackageInstallItem from 'components/package/PackageInstallItem.vue';
import CardContainer from 'components/base/CardContainer.vue';
import { useEssentialModelStore } from 'stores/essentialModel';
import { PackageInstall } from 'src/types/contants';
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';

const { t } = useI18n();
const essentialModelStore = useEssentialModelStore();
const packages = computed(() => {
  return [
    {
      icon: 'essential_model.png',
      name: t('package.essential_models_pack'),
      description: t('package.essential_models_pack_desc'),
      menuOptions: [t('package.essential')],
      installed: essentialModelStore.allEssentialModelsInstalled,
    },
    {
      icon: 'control_net_model.png',
      name: t('package.controlNet_models_pack'),
      description: t('package.controlNet_models_pack_desc'),
      menuOptions: [],
      installed: true,
    },
  ];
});

function downloadPackage(pkg: PackageInstall) {
  if (!pkg.installed) {
    console.log('下载包:', pkg.name);
    // 实现下载逻辑
  }
}

function downloadOption(pkg: PackageInstall, option: string) {
  console.log('下载选项:', pkg.name, option);
  // 实现选项下载逻辑
}
</script>

<style scoped></style>
