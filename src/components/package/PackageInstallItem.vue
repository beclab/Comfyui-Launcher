<template>
  <div class="package-install-item row justify-between items-center">
    <div class="package-install-content row">
      <q-img class="package-install-img" :src="getRequireImage(package.icon)" />
      <div class="package-install-text column justify-start q-px-md">
        <div class="row justify-start">
          <div class="text-body2 text-ink-1">{{ package.name }}</div>
          <div
            v-for="(menu, index) in package.menuOptions"
            :key="index"
            class="package-install-menu q-ml-xs text-overline text-info"
            @click="emit('onMenuClick', props, menu)"
          >
            {{ menu }}
          </div>

          <div
            class="package-install-menu q-ml-xs text-overline"
            :class="
              package.installed
                ? 'bg-green-alpha text-positive'
                : 'bg-red-alpha text-negative'
            "
          >
            {{ package.installed ? t('base.intact') : t('base.missing') }}
          </div>
        </div>

        <div class="text-body2 text-ink-3 package-install-desc">
          {{ package.description }}
        </div>
      </div>
    </div>

    <q-btn
      :class="package.installed ? 'text-positive' : 'text-light-blue-default'"
      :label="package.installed ? t('base.installed') : t('base.download')"
      :loading="package.loading"
      :disabled="package.disabled"
      class="btn-size-md text-body1"
      outline
      no-caps
      @click="emit('onDownloadClick')"
    />
  </div>
</template>

<script setup lang="ts">
import { PropType } from 'vue';
import { PackageInstall } from 'src/types/contants';
import { getRequireImage } from 'src/utils/imageUtils';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  package: {
    type: Object as PropType<PackageInstall>,
    required: true,
  },
});

const { t } = useI18n();
const emit = defineEmits(['onDownloadClick', 'onMenuClick']);
</script>

<style scoped lang="scss">
.package-install-item {
  width: 100%;
  padding-top: 6px;
  padding-bottom: 6px;

  .package-install-content {
    width: calc(100% - 112px);

    .package-install-img {
      width: 40px;
      height: 40px;
    }

    .package-install-text {
      width: calc(100% - 40px);

      .package-install-menu {
        border-radius: 999px;
        background: $blue-alpha;
        padding: 4px 8px;
      }

      .package-install-desc {
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
      }
    }
  }
}
</style>
