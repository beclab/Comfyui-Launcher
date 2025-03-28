<template>
  <q-page padding>
    <div class="text-h4 q-mb-lg">网络配置</div>

    <div v-if="networkStore.loading" class="text-center q-pa-lg">
      <q-spinner size="3em" color="primary" />
      <div class="q-mt-md">加载配置中...</div>
    </div>

    <template v-else>
      <network-config-item
        :config="networkStore.getNetworkConfig(NetworkType.GITHUB)"
        :array="['http://gh.proxy.com/']"
      />

      <network-config-item
        :config="networkStore.getNetworkConfig(NetworkType.PYPI)"
        :array="['https://pypi.tuna.tsinghua.edu.cn']"
      />
      <network-config-item
        :config="networkStore.getNetworkConfig(NetworkType.HUGGING_FACE)"
        :array="['https://huggingface.co/']"
      />
    </template>
  </q-page>
</template>

<script setup>
import { useNetworkStore } from 'stores/network';
import { NetworkType } from 'src/types/contants';
import NetworkConfigItem from 'components/network/NetworkConfigItem.vue';

const networkStore = useNetworkStore();

</script>

<style scoped></style>
