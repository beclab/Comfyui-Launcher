<template>
  <q-scroll-area class="my-page-scroll">
    <div class="column my-page-content">
      <comfy-u-i-status />
      <network-environment-panel />
      <folder-access-panel />
      <package-install-panel />
      <support-links/>
    </div>
  </q-scroll-area>
</template>

<script lang="ts" setup>
import ComfyUIStatus from '../components/ComfyUIStatus.vue';
import SupportLinks from 'components/support/SupportLinks.vue';
import FolderAccessPanel from 'components/folder/FolderAccessPanel.vue';
import PackageInstallPanel from 'components/package/PackageInstallPanel.vue';
import NetworkEnvironmentPanel from '../components/network/NetworkEnvironmentPanel.vue';
</script>

<style scoped></style>
