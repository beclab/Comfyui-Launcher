<template>
  <div class="support-container row justify-between items-center">
    <div class="text-body2 text-ink-3">@2024 BEC LAB</div>
    <div class="row justify-center items-center">
      <support-icon-with-label :data="comfyUIIcon" />
      <support-icon-with-label :data="discordIcon" />
    </div>
    <div class="link-container">
      <support-icon :data="olaresIcon" />
      <support-icon :data="githubIcon" />
      <support-icon :data="mediumIcon" />
      <support-icon-with-q-r :data="weChatIcon" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  comfyUIIcon,
  githubIcon,
  mediumIcon,
  olaresIcon,
  weChatIcon,
  discordIcon,
} from './link';
import SupportIcon from 'components/support/SupportIcon.vue';
import SupportIconWithQR from 'components/support/SupportIconWithQR.vue';
import SupportIconWithLabel from 'components/support/SupportIconWithLabel.vue';
</script>

<style scoped>
.support-container {
  height: 48px;
  width: 100%;

  .link-container {
    display: flex;
    gap: 12px;
  }
}
</style>
