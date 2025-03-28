<template>
  <custom-dialog
    ref="customRef"
    :size="Size.SMALL"
    :title="t('dialog.essential_models_missing')"
    @onSubmit="goToModels"
    @onCancel="onStart"
    :cancel="t('dialog.start_anyway')"
    :ok="t('dialog.download_models')"
  >
    <div class="column text-body2 text-ink-2">
      {{t('dialog.essential_models_missing_desc')}}
    </div>
  </custom-dialog>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import CustomDialog from 'components/base/dialog/CustomDialog.vue';
import RouteEnums from 'src/router/routeEnums';
import { Size } from 'components/base/dialog/type';
import { useMenuStore } from 'stores/menu';

const customRef = ref();
const menuStore = useMenuStore();
const { t } = useI18n();

const goToModels = () => {
  menuStore.setCurrentMenu(RouteEnums.NAMES.MODELS);
  customRef.value.onDialogOK()
};

const onStart = () => {
  customRef.value.onDialogCancel()
}
</script>

<style scoped lang="scss">
</style>
