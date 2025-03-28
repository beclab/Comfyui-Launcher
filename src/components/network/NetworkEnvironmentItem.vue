<template>
  <div class="network-item row justify-between items-center full-width">
    <div class="row justify-start items-center">
      <q-img class="network-img" :src="getRequireImage(config.icon)">
        <!--        TODO -->
        <template v-slot:loading></template>
      </q-img>
      <div class="text-body1 text-ink-1 q-ml-sm">{{ config.type }}</div>
    </div>
    <div class="row justify-end items-center">
      <div class="row items-center q-pa-xs">
        <div :class="statusColor" class="network-indicator q-mr-xs" />
      </div>
      <div class="text-body2 text-ink-2">
        {{ statusText }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getRequireImage } from 'src/utils/imageUtils';
import { NetworkConfig, NetworkStatus } from 'src/types/contants';
import { useI18n } from 'vue-i18n';
import { computed, PropType } from 'vue';

const props = defineProps({
  config: {
    type: Object as PropType<NetworkConfig>,
    required: true,
  },
});

const { t } = useI18n();

const statusText = computed(() => {
  switch (props.config?.status) {
    case NetworkStatus.WORKING:
      return t('network.working');
    case NetworkStatus.TIMEOUT:
      return t('network.timeout');
    case NetworkStatus.REQUESTING:
      return t('network.testing');
    default:
      return t('base.unknown');
  }
});

const statusColor = computed(() => {
  switch (props.config?.status) {
    case NetworkStatus.WORKING:
      return 'bg-green-default';
    case NetworkStatus.TIMEOUT:
      return 'bg-red-default';
    default:
      return 'bg-ink-3';
  }
});
</script>

<style lang="scss" scoped>
.network-item {
  padding: 16px 0;

  .network-img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }

  .network-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
}
</style>
