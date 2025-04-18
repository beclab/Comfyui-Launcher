<template>
  <div class="footer-container row justify-between items-center">
    <!-- 左侧版权信息 -->
    <div class="copyright">
      ©2025 Bytetrade, Inc
    </div>
    
    <!-- 中间链接 -->
    <div class="center-links row items-center">
      <a href="https://www.comfy.org/" target="_blank" class="footer-link row items-center q-mx-sm">
        <img src="~assets/icon-comfyorg.png" style="height: 20px" class="q-mr-xs">
        ComfyOrg
      </a>
      <a href="https://discord.com/invite/comfyorg" target="_blank" class="footer-link row items-center q-mx-sm">
        <img src="~assets/icon-discord.png" style="height: 20px" class="q-mr-xs">
        Discord
      </a>
    </div>
    
    <!-- 右侧图标 -->
    <div class="right-icons row items-center">
      <q-btn href="https://olares.medium.com/" target="_blank" flat round size="sm" class="icon-btn">
        <img src="~assets/icon-m.png" style="height: 18px">
      </q-btn>
      <q-btn href="https://github.com/beclab/Olares" target="_blank" flat round size="sm" class="icon-btn">
        <img src="~assets/icon-github.png" style="height: 18px">
      </q-btn>
      <q-btn 
        flat 
        round 
        size="sm" 
        class="icon-btn"
        @mouseover="showWeichatQR = true"
        @mouseleave="showWeichatQR = false"
      >
        <div v-if="showWeichatQR" class="custom-tooltip">
          <img src="~assets/olares-weichat-link.jpeg" alt="olares-weichat-link" style="max-width: 200px; max-height: 200px; display: block;" />
        </div>
        <img src="~assets/icon-weichat.png" style="height: 18px">
      </q-btn>
      <q-btn href="https://olares.cn/" target="_blank" flat round size="sm" class="icon-btn">
        <img src="~assets/icon-olares.png" style="height: 18px">
      </q-btn>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'SupportLinks',
  setup() {
    const showWeichatQR = ref(false);
    return {
      showWeichatQR
    };
  }
});
</script>

<style scoped>
.footer-container {
  padding: 12px 16px;
  width: 100%;
  color: #666;
  font-size: 14px;
}

.footer-link {
  text-decoration: none;
  color: #666;
  font-size: 14px;
  display: flex;
  align-items: center;
}

.copyright {
  opacity: 0.7;
}

.right-icons .q-btn {
  margin: 0 2px;
  padding: 4px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}

.custom-tooltip {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 5px;
  z-index: 9999;
  background: white;
  border-radius: 4px;
  box-shadow: 0 1px 5px rgba(0,0,0,0.2);
  padding: 5px;
}
</style>