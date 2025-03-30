<template>
  <q-page class="my-page-container">
    <title-view :title="t('menu.model_management')" :line="true" />

    <table-page v-model="activeTab" :tab-array="tabArray">
      <template v-slot:header-end></template>

      <template v-slot:page-1>
        <essential-models-card />
        <optional-models-card />
        <installed-models-card />
      </template>

      <template v-slot:page-2>
        <download-history-card />
      </template>
    </table-page>
  </q-page>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import EssentialModelsCard from '../components/models/EssentialModelsCard.vue';
import OptionalModelsCard from '../components/models/OptionalModelsCard.vue';
import InstalledModelsCard from '../components/models/InstalledModelsCard.vue';
import DownloadHistoryCard from '../components/models/DownloadHistoryCard.vue';
import TablePage from 'components/base/TablePage.vue';
import TitleView from 'components/base/TitleView.vue';
import { TabProps } from 'src/types/contants';
import { useI18n } from 'vue-i18n';

const activeTab = ref('models');
const { t } = useI18n();

const tabArray = ref<TabProps[]>([
  { key: 'models', label: '模型管理' },
  { key: 'history', label: '下载历史' },
]);
</script>
