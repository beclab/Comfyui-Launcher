<template>
  <a
    :href="data ? data.link : ''"
    target="_blank"
    rel="noopener noreferrer"
    @mouseenter="mouseenterHandler(1)"
    @mouseleave="mouseleaveHandler"
  >
    <q-img
      class="foot-icon ink-2"
      :src="active === 1 ? activeIcon : icon"
      alt=""
    >
      <template v-slot:loading />
    </q-img>
  </a>
</template>

<script lang="ts" setup>
import { PropType, ref } from 'vue';
import { getRequireImage } from 'src/utils/imageUtils';
import { SupportIconProps } from 'components/support/link';

const props = defineProps({
  data: {
    type: Object as PropType<SupportIconProps>,
    require: true,
  },
});

const active = ref(-1);
const mouseenterHandler = (index: number) => {
  active.value = index;
};

const icon = ref(getRequireImage(props.data ? props.data.icon : ''));
const activeIcon = ref(getRequireImage(props.data ? props.data.active : ''));

const mouseleaveHandler = () => {
  active.value = -1;
};
</script>

<style scoped lang="scss">
.foot-icon {
  width: 24px;
  height: 24px;
}
</style>
