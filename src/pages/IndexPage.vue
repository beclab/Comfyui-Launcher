<template>
  <q-page class="my-page-container">
    <comfy-u-i-status/>
    <network-environment-panel/>
    <folder-access-panel />
    <package-install-panel />
    <SupportLinks />
  </q-page>
</template>

<script lang="ts" setup>
import ComfyUIStatus from '../components/ComfyUIStatus.vue';
import SupportLinks from '../components/SupportLinks.vue';
import FolderAccessPanel from 'components/folder/FolderAccessPanel.vue';
import PackageInstallPanel from 'components/package/PackageInstallPanel.vue';
import NetworkEnvironmentPanel from '../components/network/NetworkEnvironmentPanel.vue';

</script>

<style scoped></style>
