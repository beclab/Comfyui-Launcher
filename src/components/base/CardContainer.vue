<template>
  <div class="card-container full-width q-mb-lg">
    <div class="card-header full-width q-px-xl q-py-lg">
      <slot name="header">
        <div class="text-h6">{{ label }}</div>
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
        <p>这里是默认内容区域。</p>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  label: {
    type: String,
    default: '',
  },
  borderLess: {
    type: Boolean,
    default: false,
  },
  grid: {
    type: Boolean,
    default: true,
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
