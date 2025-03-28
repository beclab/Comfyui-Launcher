<template>
  <custom-dialog
    ref="customRef"
    :size="Size.SMALL"
    @onSubmit="goToModels"
    @onCancel="onStart"
    :title="t('dialog.irreversible_warning_title')"
    :cancel="t('base.cancel')"
    :ok="t('dialog.erase_and_restore_confirm')"
  >
    <div class="column text-body2 text-ink-2">
      {{ t('dialog.erase_and_restore_desc') }}
    </div>
    <ul class="text-body2 text-ink-2" style="margin: 0; padding-left: 20px">
      <li>
        {{ t('dialog.erase_and_restore_point1') }}
      </li>
      <li>
        {{ t('dialog.erase_and_restore_point2') }}
      </li>
      <li>
        {{ t('dialog.erase_and_restore_point3') }}
      </li>
      <li>
        {{ t('dialog.erase_and_restore_point4') }}
      </li>
    </ul>
  </custom-dialog>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import CustomDialog from 'components/base/dialog/CustomDialog.vue';
import { Size } from 'components/base/dialog/type';

const customRef = ref();
const { t } = useI18n();

const goToModels = () => {
  customRef.value.onDialogOK();
};

const onStart = () => {
  customRef.value.onDialogCancel();
};
</script>

<style scoped lang="scss"></style>
