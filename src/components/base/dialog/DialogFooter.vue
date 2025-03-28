<template>
  <div
    v-if="platform === 'mobile'"
    class="card-action row justify-between items-center"
  >
    <slot name="footerMore" />
    <q-btn
      class="but-mobile-cancel"
      v-if="cancel"
      no-caps
      flat
      :style="{ width: cancel ? '48%' : '100%' }"
      @click="onCancel"
    >
      {{ cancel === true ? 'Cancel' : cancel }}
    </q-btn>

    <q-btn
      v-if="ok && loading"
      class="but-mobile-confirm"
      :class="okButtonClass"
      no-caps
      flat
      :style="{ width: cancel ? '48%' : '100%', ...okStyle }"
    >
      {{ loading === true ? 'Loading' : loading }}
    </q-btn>
    <q-btn
      v-if="ok && !loading"
      class="but-mobile-confirm"
      :class="okButtonClass"
      no-caps
      flat
      :style="{ width: cancel ? '48%' : '100%', ...okStyle }"
      @click="onSubmit"
    >
      {{ ok === true ? 'Confirm' : ok }}
    </q-btn>
  </div>

  <q-card-actions
    v-else
    class="row justify-end items-center"
    style="padding: 0"
  >
    <q-item
      v-if="skip"
      clickable
      dense
      class="but-skip row justify-center items-center"
      @click="onSkip"
    >
      {{ skip === true ? 'Skip' : skip }}
    </q-item>

    <slot name="footerMore" />

    <div class="row justify-center items-center">
      <q-item
        v-if="cancel"
        clickable
        dense
        class="but-cancel row justify-center items-center"
        @click="onCancel"
      >
        {{ cancel === true ? 'Cancel' : cancel }}
      </q-item>
      <q-item
        v-if="ok && loading"
        dense
        class="but-create row justify-center items-center"
        :style="okStyle"
        :class="[okDisabled ? 'ok-disabled' : '', okButtonClass]"
      >
        {{ loading === true ? 'Loading' : loading }}
      </q-item>
      <q-item
        v-if="ok && !loading"
        clickable
        dense
        class="but-create row justify-center items-center"
        :class="[okDisabled ? 'ok-disabled' : '', okButtonClass]"
        @click="onSubmit"
        :style="okStyle"
      >
        {{ ok === true ? 'Confirm' : ok }}
      </q-item>
    </div>
  </q-card-actions>
</template>

<script lang="ts" setup>
import { computed, inject } from 'vue';

const props = defineProps({
  platform: {
    type: String,
    default: 'web',
    required: false,
  },
  ok: {
    type: [String, Boolean],
    default: true,
    required: false,
  },
  okStyle: {
    type: Object as () => any,
    required: false,
  },
  okClass: {
    type: String,
    required: false,
  },
  cancel: {
    type: [String, Boolean],
    default: false,
    required: false,
  },
  loading: {
    type: [String, Boolean],
    default: false,
    required: false,
  },
  skip: {
    type: [String, Boolean],
    default: false,
    required: false,
  },
  okDisabled: {
    type: Boolean,
    default: false,
    required: false,
  },
});

const defaultOkClass = inject<string>('defaultOkClass');

const okButtonClass = computed(() => {
  return props.okClass || defaultOkClass;
});

const emit = defineEmits(['onCancel', 'onSubmit', 'onSkip']);

const onCancel = () => {
  emit('onCancel');
};

const onSubmit = (e: any) => {
  if (props.okDisabled) return;
  emit('onSubmit', e);
};

const onSkip = () => {
  emit('onSkip');
};
</script>

<style scoped lang="scss">
.but-create {
  min-width: 100px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 16px;
  padding: 8px;
  line-height: 24px;
  margin-left: 12px;

  &.ok-disabled {
    opacity: 0.5;
  }
}

.but-cancel {
  min-width: 100px;
  border-radius: 8px;
  font-weight: 500;
  border: 1px solid $btn-stroke;
  color: $ink-2;
  font-size: 16px;
  padding: 7px 8px;
  line-height: 24px;
}

.but-skip {
  min-width: 100px;
  position: absolute;
  left: 20px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 16px;
  border: 1px solid $btn-stroke;
  color: $ink-2;
  padding: 7px 8px;
  line-height: 24px;
}

.card-action {
  .cancel-button {
    width: 48%;
  }
}

.but-mobile-cancel {
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
  border: 1px solid $btn-stroke;
  color: $ink-2;
}

.but-mobile-confirm {
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
}
</style>
