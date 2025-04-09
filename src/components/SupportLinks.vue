<template>
  <div class="footer-container row justify-between items-center">
    <!-- 左侧版权信息 -->
    <div class="copyright">
      ©2025 Bytetrade, Inc
    </div>
    
    <!-- 中间链接 -->
    <div class="center-links row items-center">
      <a href="#" target="_blank" class="footer-link row items-center q-mx-sm">
        <img src="~assets/icon-comfyorg.png" style="height: 20px" class="q-mr-xs">
        ComfyOrg
      </a>
      <a href="#" target="_blank" class="footer-link row items-center q-mx-sm">
        <img src="~assets/icon-discord.png" style="height: 20px" class="q-mr-xs">
        Discord
      </a>
    </div>
    
    <!-- 右侧图标 -->
    <div class="right-icons row items-center">
      <q-btn flat round size="sm" class="icon-btn">
        <img src="~assets/icon-m.png" style="height: 18px">
      </q-btn>
      <q-btn flat round size="sm" class="icon-btn">
        <img src="~assets/icon-github.png" style="height: 18px">
      </q-btn>
      <q-btn flat round size="sm" class="icon-btn">
        <img src="~assets/icon-weichat.png" style="height: 18px">
      </q-btn>
      <q-btn flat round size="sm" class="icon-btn">
        <img src="~assets/icon-olares.png" style="height: 18px">
      </q-btn>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'SupportLinks'
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
</style> 