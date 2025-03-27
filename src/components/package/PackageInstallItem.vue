<template>
  <q-card flat bordered class="package-card">
    <q-card-section class="row items-center no-wrap">
      <div>
        <div class="text-weight-medium">{{ name }}</div>
        <div class="text-caption text-grey">
          {{ description }}
        </div>
      </div>
      <q-space />
      <q-btn
        label="下载"
        color="primary"
        flat
        @click="emit('onDownloadClick', props)"
      >
        <q-menu v-if="hasMenu">
          <q-list style="min-width: 100px">
            <q-item
              v-for="option in menuOptions"
              :key="option"
              clickable
              v-close-popup
              @click="emit('onMenuClick', props, option)"
            >
              <q-item-section>{{ option }}</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { PropType } from 'vue';

const props = defineProps({
  name: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  hasMenu: {
    type: Boolean,
    default: false,
  },
  menuOptions: {
    type: Object as PropType<string[]>,
    default: [] as string[],
  },
});

const emit = defineEmits(['onDownloadClick', 'onMenuClick']);
</script>

<style scoped lang="scss"></style>
