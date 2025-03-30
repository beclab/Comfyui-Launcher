<template>
  <div class="column justify-start full-width">
    <div class="q-mb-lg text-h3 text-ink-1">{{ title }}</div>
    <q-separator v-if="line" class="q-mb-lg bg-separator full-width" />
  </div>
</template>

<script setup lang="ts">
defineProps({
  title: {
    type: String,
    required: true,
  },
  line: {
    type: Boolean,
    default: false,
  },
});
</script>
<style scoped lang="scss"></style>
