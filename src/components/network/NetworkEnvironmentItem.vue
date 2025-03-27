<template>
  <div class="network-item row justify-between items-center full-width">
    <div class="row justify-start items-center">
      <q-avatar size="md" class="q-mr-sm">
        <q-img class="network-img" :src="getRequireImage(icon)" :alt="name">
          <!--        TODO -->
          <template v-slot:loading></template>
        </q-img>
      </q-avatar>
      <div class="text-body1 text-ink-1">{{ name }}</div>
    </div>
    <div class="row justify-end items-center">
      <div class="row items-center q-pa-xs">
        <div
          :class="available ? 'bg-green-default' : 'bg-yellow-default'"
          class="network-indicator q-mr-xs"
        />
      </div>
      <div class="text-body2 text-ink-2">
        {{ available ? t('base.accessible') : t('base.inaccessible') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getRequireImage } from 'src/utils/imageUtils';
import { useI18n } from 'vue-i18n';

defineProps({
  name: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    default: '',
  },
  available: {
    type: Boolean,
    default: false,
  },
});

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.network-item {
  padding: 16px 0;

  .network-img {
    width: 40px;
    height: 40px;
  }

  .network-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
}
</style>
