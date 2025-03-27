<template>
  <div class="card-container full-width q-mb-lg">
    <div class="card-header full-width q-px-xl q-py-lg">
      <slot name="header">
        <h3>默认头部标题</h3>
      </slot>
    </div>

    <div
      :class="borderLess ? 'card-content-border-less' : 'card-content'"
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
  borderLess: {
    type: Boolean,
    default: false,
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
</style>
