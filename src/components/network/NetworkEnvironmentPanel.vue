<template>
  <card-container
    grid
    :title="t('base.network')"
    icon="sym_r_network_check"
    @on-icon-click="networkStore.checkNetworkStatus(networkStore.configTypes)"
  >
    <div
      v-for="config in networkStore.configArray"
      :key="config.type"
      class="col-auto"
    >
      <network-environment-item :config="config" />
    </div>
  </card-container>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useNetworkStore } from 'stores/network';
import CardContainer from 'components/base/CardContainer.vue';
import NetworkEnvironmentItem from 'components/network/NetworkEnvironmentItem.vue';

const { t } = useI18n();
const networkStore = useNetworkStore();
</script>

<style scoped lang="scss"></style>
