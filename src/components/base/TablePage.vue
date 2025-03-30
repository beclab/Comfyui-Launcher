<template>
  <div class="my-page-scroll">
    <div class="tab-parent row justify-between items-center">
      <q-tabs
        dense
        align="left"
        outside-arrows
        class="my-page-tabs"
        active-color="primary"
        indicator-color="transparent"
        :narrow-indicator="false"
        :model-value="modelValue"
        @update:modelValue="updateSelectedTab"
      >
        <template v-for="item in tabArray" :key="item.key">
          <q-tab style="padding: 0" :name="item.key">
            <template v-slot:default>
              <bt-tab-item
                :selected="item.key === modelValue"
                :label="item.label"
                @click="emit('onTabClick', item)"
              />
            </template>
          </q-tab>
        </template>
      </q-tabs>

      <div class="row justify-end items-center">
        <slot name="header-end" />
      </div>
    </div>

    <q-tab-panels
      :model-value="modelValue"
      @update:modelValue="updateSelectedTab"
      class="my-page-panels"
      animated
      keep-alive
    >
      <template v-for="(item, index) in tabArray" :key="item.key">
        <q-tab-panel :name="item.key" class="my-page-panel">
          <slot :name="'page-' + (index + 1)" :item="item" />
        </q-tab-panel>
      </template>
    </q-tab-panels>
  </div>
</template>

<script lang="ts" setup>
import BtTabItem from 'components/base/BtTabItem.vue';
import { TabProps } from 'src/types/contants';
import { onMounted, PropType } from 'vue';

defineProps({
  tabArray: {
    type: Object as PropType<TabProps[]>,
    required: true,
  },
  modelValue: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['onTabClick', 'init', 'update:modelValue']);

const updateSelectedTab = (value: string | number) => {
  emit('update:modelValue', value);
};

onMounted(() => {
  emit('init');
});
</script>

<style scoped lang="scss">
.my-page-scroll {
  width: 100%;
  height: 100%;

  .tab-parent {
    width: 100%;
    height: 80px;

    .column-line {
      height: 20px;
      width: 1px;
      margin-left: 12px;
      margin-right: 12px;
    }
  }

  .my-page-tabs {
    border-radius: 8px;
    border: 1px solid $separator;
  }

  .my-page-panels {
    width: 100%;
    height: calc(100vh - 56px - 84px - 52px);

    .my-page-panel {
      width: 100%;
      height: 100%;
      padding: 0;
    }
  }
}

.q-tabs--dense .q-tab {
  min-height: 32px;
}
</style>
