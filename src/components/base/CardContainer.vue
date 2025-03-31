<template>
  <div class="card-container full-width q-mb-lg">
    <div class="card-header full-width q-px-xl q-py-lg">
      <slot name="header">
        <div class="row justify-between">
          <slot name="header-start">
            <div class="text-h6">{{ title }}</div>
          </slot>
          <slot name="header-end">
            <q-btn
              outline
              :icon="icon"
              :label="label"
              v-if="label || icon"
              class="btn-size-sm text-grey-8"
              :class="label ? '' : 'btn-no-text'"
              @click="emit('onIconClick')"
            />
          </slot>
        </div>
      </slot>
    </div>

    <div
      :class="[
        borderLess ? 'card-content-border-less' : 'card-content',
        grid ? 'card-grid-container' : '',
      ]"
      :style="{
        '--columns': columns,
        '--rowGap': rowGap + 'px',
        '--columnGap': columnGap + 'px',
      }"
      class="full-width"
    >
      <slot>
        <p></p>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  title: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    required: false,
  },
  label: {
    type: String,
    required: false,
  },
  borderLess: {
    type: Boolean,
    default: false,
  },
  grid: {
    type: Boolean,
    default: false,
  },
  columns: {
    type: Number,
    default: 3,
  },
  rowGap: {
    type: Number,
    default: 12,
  },
  columnGap: {
    type: Number,
    default: 44,
  },
});

const emit = defineEmits(['onIconClick']);
</script>

<style scoped lang="scss">
.card-container {
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid $separator;
  background: $background-1;
}

.card-header {
  border-bottom: 1px solid $separator;
}

.card-content {
  padding: 12px 32px 20px;
}

.card-content-border-less {
  padding: 0;
}

.card-grid-container {
  display: grid;
  box-sizing: border-box;
  grid-template-columns: repeat(var(--columns), 1fr);
  gap: var(--rowGap) var(--columnGap);
}
</style>
