<template>
  <div
    class="selected-root row justify-center items-center"
    :style="{ '--selectedWidth': width }"
  >
    <div v-if="selected" class="selected-title">
      {{ selected.showLabel ? selected.label : selected.value }}
    </div>
    <q-btn-dropdown
      class="selected-arrow"
      ref="dropdown"
      dropdown-icon="img:./arrow.svg"
      size="10px"
      flat
      :menu-offset="[15, 10]"
      dense
    >
      <div class="select-card" :style="{ '--selectedWidth': width }">
        <template v-for="(item, index) in options" :key="item">
          <div
            class="text-body2"
            :class="
              !item.disable
                ? item.value === selected.value
                  ? 'select-item-selected'
                  : 'select-item-normal'
                : 'select-item-disable'
            "
            v-close-popup
            :style="{ marginTop: `${index === 0 ? '0' : '4px'}` }"
            @click="onItemClick(item)"
          >
            {{ selected.showLabel ? selected.label : selected.value }}
          </div>
        </template>
      </div>
    </q-btn-dropdown>
  </div>
</template>

<script lang="ts" setup>
import { inject, onMounted, PropType, ref } from 'vue';
import { SelectorProps } from 'src/types/contants';

const props = defineProps({
  modelValue: {
    type: String,
    require: true,
  },
  options: {
    type: Object as PropType<SelectorProps[]>,
    require: true,
  },
  width: {
    type: String,
    default: '100%',
  },
});

const selected = ref<SelectorProps>();
const dropdown = ref();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setFocused = inject('setFocused') as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setBlured = inject('setBlured') as any;

onMounted(() => {
  if (props.options && props.options.length > 0) {
    selected.value = props.options[0];
  }
  if (setFocused) {
    setFocused(true);
  }
  if (setBlured) {
    setBlured(true);
  }
});

const emit = defineEmits(['update:modelValue']);

const onItemClick = (item: SelectorProps) => {
  if (!item.disable) {
    selected.value = item;
    emit('update:modelValue', item.value);
  }
};
</script>

<style scoped lang="scss">
.selected-root {
  border: 1px solid #e4e4e7;
  border-radius: 8px;
  padding: 8px 12px;
  height: 36px;
  width: var(--selectedWidth);
  color: #000000;

  .selected-title {
    width: calc(var(--selectedWidth) - 54px);
    margin-right: 8px;
    overflow: hidden;
    color: #000;
    text-overflow: ellipsis;
    font-family: 'Nunito Sans';
    font-size: 14px;
    font-style: normal;
    font-weight: 400;
    line-height: 20px;
  }

  .selected-arrow {
    width: 20px;
    height: 20px;
  }
}

.select-card {
  width: var(--selectedWidth);
  display: flex;
  padding: 12px;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  background: #fff;
  color: #000;

  .select-item-title {
    width: 100%;
    height: 34px;
    padding: 8px 0;
    border-radius: 4px;
    text-align: left;
    color: #18181b;
    font-family: 'Nunito Sans';
    font-size: 16px;
    font-style: normal;
    font-weight: 600;
    line-height: 16px;
  }

  .select-item-normal {
    @extend .select-item-title;
    cursor: pointer;
    text-decoration: none;

    &:hover {
      background: #f5f5f5 !important;
    }
  }

  .select-item-disable {
    background: darkgray;
    color: grey;
    @extend .select-item-title;
  }

  .select-item-selected {
    @extend .select-item-title;
    cursor: pointer;
    text-decoration: none;

    &:hover {
      background: #f5f5f5 !important;
    }
  }
}
</style>
