<template>
   <card-container>
    <template v-slot:header>
      <div class="text-h6">{{ t('base.network')}}</div>
    </template>

    <template v-slot:default>
      <div class="grid-container card-content-y">
        <div v-for="status in networkStatuses" :key="status.name" class="col-auto">
          <q-btn class="network-btn" flat align="left">
            <q-avatar size="md" class="q-mr-sm">
              <img :src="`~assets/${status.name.toLowerCase()}-logo.png`" :alt="status.name">
            </q-avatar>
            <div>
              <div>{{ status.name }}</div>
              <div class="text-caption">{{ status.available ? '可访问' : '不可访问' }}</div>
            </div>
          </q-btn>
        </div>
      </div>
    </template>
   </card-container>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import CardContainer from 'components/base/CardContainer.vue';

const { t } = useI18n();
const networkStatuses = [
  { name: 'Github', available: true },
  { name: 'PyPI', available: true },
  { name: 'HuggingFace', available: true }
]
</script>

<style scoped lang="scss">
.grid-container {
  display: grid;
  box-sizing: border-box;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px 44px;
}
</style>
