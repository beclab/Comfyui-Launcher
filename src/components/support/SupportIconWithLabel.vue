<template>
  <a
    :href="data ? data.link : ''"
    target="_blank"
    class="support-icon-with-label"
    rel="noopener noreferrer"
  >
    <div class="row justify-center items-center">
      <q-img class="foot-icon" :src="getRequireImage(data?.icon)" />
      <span class="q-ml-sm text-body2 text-ink-2">{{ data.label }}</span>
    </div>
  </a>
</template>

<script lang="ts" setup>
import { PropType } from 'vue';
import { getRequireImage } from 'src/utils/imageUtils';
import { SupportIconWithLabel } from 'components/support/link';

defineProps({
  data: {
    type: Object as PropType<SupportIconWithLabel>,
    require: true,
  },
});
</script>

<style scoped lang="scss">
.support-icon-with-label {
  padding: 16px 8px;

  .foot-icon {
    width: 16px;
    height: 16px;
  }
}
</style>
