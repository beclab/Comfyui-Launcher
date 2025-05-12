<template>
  <div class="custom-tabs-container">
    <div class="custom-tab-toggle">
      <button
        v-for="(option, index) in options"
        :key="getKey(option, index)"
        class="tab-button"
        :class="{ 'tab-button-active': modelValue === option.value }"
        @click="$emit('update:modelValue', option.value)"
      >
        <q-icon v-if="option.icon" :name="option.icon" class="q-mr-xs" />
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// TabToggle.vue - 自定义实现的标签切换组件
interface TabOption {
  label?: string;
  icon?: string;
  value: string | number | boolean;
  [key: string]: unknown;
}

defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    required: true
  },
  options: {
    type: Array as () => TabOption[],
    required: true
  }
});

defineEmits(['update:modelValue']);

// 生成有效的 key
function getKey(option: TabOption, index: number): string | number {
  // 如果 value 是字符串或数字，直接使用
  if (typeof option.value === 'string' || typeof option.value === 'number') {
    return option.value;
  }
  // 如果是布尔值，转换为字符串
  if (typeof option.value === 'boolean') {
    return option.value ? 'true' : 'false';
  }
  // 如果都不是，使用索引作为 key
  return index;
}
</script>

<style>
.custom-tabs-container {
  margin-bottom: 16px;
  min-width: 200px;
  max-width: 800px;
}

.custom-tab-toggle {
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.tab-button {
  flex: 1;
  padding: 8px 16px;
  border: none;
  background-color: #f5f5f5;
  color: #1D1D1D;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap; /* 添加这行，防止文本换行 */
}

.tab-button:not(:last-child) {
  border-right: 1px solid rgba(0, 0, 0, 0.05);
}

.tab-button-active {
  background-color: rgba(81, 174, 255, 0.1); /* button-bg */
  color: #3377FF; /* select-button-text */
  font-weight: 500;
}

.tab-button:hover:not(.tab-button-active) {
  background-color: #e0e0e0;
}

.tab-button:first-child {
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
}

.tab-button:last-child {
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}
</style>