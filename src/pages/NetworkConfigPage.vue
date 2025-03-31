<template>
  <q-page class="my-page-container">
    <title-view :title="t('menu.network_configuration')" />

    <div v-if="networkStore.loading" class="text-center q-pa-lg">
      <q-spinner size="3em" color="primary" />
      <div class="q-mt-md">加载配置中...</div>
    </div>

    <template v-else>
      <network-config-item
        :config="networkStore.getNetworkConfig(NetworkType.GITHUB)"
        :array="[
          { label: '官方源', value: 'http://github.com/' },
          { label: '代理源', value: 'http://gh.proxy.com/' },
        ]"
      />

      <network-config-item
        :config="networkStore.getNetworkConfig(NetworkType.PYPI)"
        :array="[
          {
            label: '官方源',
            value: 'https://pypi.org/simple',
          },
          {
            label: '清华源',
            value: 'https://pypi.tuna.tsinghua.edu.cn',
          },
          {
            label: '阿里源',
            value: 'https://mirrors.aliyun.com/pypi/simple',
          },
          {
            label: 'Olares源',
            value: 'https://pypi.joinolares.cn/root/olares3/+simple/',
          },
        ]"
      />
      <network-config-item
        :config="networkStore.getNetworkConfig(NetworkType.HUGGING_FACE)"
        :array="[
          {
            label: '官方源',
            value: 'https://huggingface.co/',
          },
          {
            label: '中国镜像源',
            value: 'https://hf-mirror.com/',
          },
        ]"
      />
    </template>
  </q-page>
</template>

<script setup>
import { useNetworkStore } from 'stores/network';
import { NetworkType } from 'src/types/contants';
import NetworkConfigItem from 'components/network/NetworkConfigItem.vue';
import TitleView from 'components/base/TitleView.vue';
import { useI18n } from 'vue-i18n';

const networkStore = useNetworkStore();
const { t } = useI18n();
</script>

<style scoped></style>
