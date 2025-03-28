<template>
  <q-item
    dense
    clickable
    @mouseenter="hover = true"
    @mouseleave="hover = false"
    :active="hover"
    active-class="orange-soft"
    class="bt-menu-item full-width row justify-start items-center cursor-pointer"
    @click="emit('onItemClick')"
  >
    <div class="full-width row justify-between items-center">
      <div class="row justify-start items-center text-ink-2">
        <q-icon v-if="icon" class="q-mr-sm" size="20px" :name="icon" />
        <div class="text-body3">
          {{ title }}
        </div>
        <slot name="after" :hover="hover" />
      </div>
      <q-icon
        v-if="selected && selectedIcon"
        class="text-ink-2"
        size="16px"
        name="sym_r_check_circle"
      />
    </div>
  </q-item>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

defineProps({
  title: {
    type: String,
    require: true,
  },
  icon: {
    type: String,
    default: '',
  },
  selected: {
    type: Boolean,
    default: false,
  },
  selectedIcon: {
    type: Boolean,
    default: true,
  },
});

const hover = ref();
const emit = defineEmits(['onItemClick']);
</script>

<style lang="scss" scoped>
.q-list--dense > .q-item,
.q-item--dense {
  min-height: 36px;
  padding: 8px !important;
}

.q-item--active {
  color: transparent !important;
}

.q-item {
  padding: 8px !important;
}

.bt-menu-item {
  border-radius: 4px;

  &:hover {
    background: $btn-bg-hover;
  }
}
</style>
