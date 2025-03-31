<template>
  <span
    class="wechat-popup"
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
    <div class="qr-container">
      <div class="qr-wrapper">
        <q-img class="qr-img" :src="getRequireImage(data.qrIcon)" alt="" />
      </div>
    </div>
  </span>
</template>

<script lang="ts" setup>
import { PropType, ref } from 'vue';
import { getRequireImage } from 'src/utils/imageUtils';
import { SupportIconWithQRProps } from 'components/support/link';

const props = defineProps({
  data: {
    type: Object as PropType<SupportIconWithQRProps>,
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
.wechat-popup {
  position: relative;

  .foot-icon {
    width: 24px;
    height: 24px;
  }

  .qr-container {
    display: none;
    padding-bottom: 8px;
    position: absolute;
    top: 0;
    left: 50%;
    transform: translate(-50%, -100%);

    .qr-wrapper {
      padding: 12px;
      border-radius: 12px;
      background: #fff;

      .qr-img {
        width: 96px;
        height: 96px;
      }
    }
  }
}

.wechat-popup:hover .qr-container {
  display: block;
}
</style>
