<template>
  <card-container grid :label="t('base.network')">
    <div v-for="service in networkService" :key="service.name" class="col-auto">
      <network-environment-item
        :name="service.name"
        :icon="service.icon"
        :available="service.available"
      />
    </div>
  </card-container>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import CardContainer from 'components/base/CardContainer.vue';
import NetworkEnvironmentItem from 'components/network/NetworkEnvironmentItem.vue';

const { t } = useI18n();
const networkService = [
  { name: 'Github', icon: 'network/github.png', available: true },
  { name: 'PyPI', icon: 'network/python.png', available: true },
  { name: 'HuggingFace', icon: 'network/huggingface.png', available: false },
];
</script>

<style scoped lang="scss"></style>
