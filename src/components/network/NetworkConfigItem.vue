<template>
  <card-container
    icon="sym_r_schedule"
    :label="t('base.test')"
    @on-icon-click="networkStore.checkNetworkStatus([config.type])"
  >
    <template v-slot:header-start>
      <div class="row justify-start items-center">
        <div style="position: relative">
          <q-img class="network-img" :src="getRequireImage(config.icon)">
            <!--        TODO -->
            <template v-slot:loading></template>
          </q-img>
          <div :class="statusColor" class="network-indicator q-mr-xs" />
        </div>
        <div class="column justify-center q-ml-sm">
          <div class="text-body1 text-ink-1">{{ config.type }}</div>
          <div class="text-body3" :class="textColor">{{ statusText }}</div>
        </div>
      </div>
    </template>
    <template v-slot:default>
      <bt-selector v-model="networkUrl" :options="array" />
    </template>
  </card-container>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import CardContainer from 'components/base/CardContainer.vue';
import {
  NetworkConfig,
  NetworkStatus,
  SelectorProps,
} from 'src/types/contants';
import { getRequireImage } from 'src/utils/imageUtils';
import { computed, onMounted, PropType, ref } from 'vue';
import { useNetworkStore } from 'stores/network';
import BtSelector from 'components/base/BtSelector.vue';

const props = defineProps({
  config: {
    type: Object as PropType<NetworkConfig>,
    required: true,
  },
  array: {
    type: Object as PropType<SelectorProps[]>,
    default: [] as string[],
  },
});

const { t } = useI18n();
const networkUrl = ref();
const networkStore = useNetworkStore();

onMounted(() => {
  networkUrl.value = props.config?.url;
});

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

const textColor = computed(() => {
  switch (props.config?.status) {
    case NetworkStatus.WORKING:
      return 'text-green-default';
    case NetworkStatus.TIMEOUT:
      return 'text-red-default';
    default:
      return 'text-ink-3';
  }
});
</script>

<style lang="scss" scoped>
.network-img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.network-indicator {
  right: 0;
  bottom: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  position: absolute;
  border: 1px solid white;
}
</style>
