<template>
  <custom-dialog
    ref="customRef"
    :size="Size.MEDIUM"
    :title="t('dialog.irreversible_warning_title')"
    @onSubmit="onOK"
    @onCancel="onCancel"
    :cancel="t('base.cancel')"
    :okDisabled="okDisabled"
    :ok="t('base.confirm')"
  >
    <div class="row justify-start full-width">
      <q-img
        class="restore-warning-img"
        :src="getRequireImage('warning.png')"
      />
      <div class="q-ml-md text-body2 text-ink-2" style="width: calc(100% - 52px)">
        {{ t('dialog.irreversible_warning_desc') }}
      </div>
    </div>

    <div class="q-mt-lg text-body1 text-ink-3">
      {{ t('dialog.confirm_placeholder') }}
    </div>
    <q-input
      dense
      borderless
      v-model="inputText"
      class="prompt-input text-body3 q-mt-xs"
      input-class="text-ink-2 text-body3"
      input-style="height: 32px"
      placeholder="CONFIRM"
    />
  </custom-dialog>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import CustomDialog from 'components/base/dialog/CustomDialog.vue';
import { Size } from 'components/base/dialog/type';
import { getRequireImage } from 'src/utils/imageUtils';

const customRef = ref();
const { t } = useI18n();
const inputText = ref('');
const okDisabled = computed(() => {
  return inputText.value !== 'CONFIRM';
});

const onOK = () => {
  if (inputText.value === 'CONFIRM') {
    customRef.value.onDialogOK();
  }
};

const onCancel = () => {
  customRef.value.onDialogCancel();
};
</script>

<style scoped lang="scss">
.restore-warning-img {
  width: 40px;
  height: 40px;
}

.prompt-input {
  padding-left: 7px;
  padding-right: 7px;
  height: 32px;
  border: 1px solid $input-stroke;
  border-radius: 8px;
  color: $ink-3;
}

</style>
