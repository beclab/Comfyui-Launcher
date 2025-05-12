<template>
  <q-layout view="hHh lpR fFf">
    <!--
    <q-header class="bg-white text-black" v-if="!isInIframe">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="sym_o_menu"
          aria-label="菜单"
          color="black"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title class="text-black">
          {{ $t('common.title') }}
        </q-toolbar-title>

      </q-toolbar>
      <q-separator />
    </q-header>
    -->

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      behavior="desktop"
      :breakpoint="0"
      :offset="isInIframe ? 0 : undefined"
    >
      <q-list class="custom-menu">
        <q-item-label header>{{ $t('menu.navigation') }}</q-item-label>

        <q-item clickable to="/" exact>
          <q-item-section avatar>
            <q-icon name="sym_o_home" />
          </q-item-section>
          <q-item-section>{{ $t('menu.home') }}</q-item-section>
        </q-item>

        <q-item clickable to="/models">
          <q-item-section avatar>
            
            <q-icon name="sym_o_deployed_code" />
          </q-item-section>
          <q-item-section>{{ $t('menu.modelManagement') }}</q-item-section>
        </q-item>

        <q-item clickable to="/plugins">
          <q-item-section avatar>
            <q-icon name="sym_o_extension" />
          </q-item-section>
          <q-item-section>{{ $t('menu.pluginManagement') }}</q-item-section>
        </q-item>

        <q-item clickable to="/python-dependencies">
          <q-item-section avatar>
            <q-icon name="sym_o_rule_settings" />
          </q-item-section>
          <q-item-section>{{ $t('menu.pythonDependencies') }}</q-item-section>
        </q-item>
        
        <q-item 
          to="/network-config" 
          exact 
          clickable 
          v-ripple
          active-class="active-menu-link"
        >
          <q-item-section avatar>
            <q-icon name="sym_o_network_check" />
          </q-item-section>
          <q-item-section>{{ $t('menu.networkConfig') }}</q-item-section>
        </q-item>

        <q-item clickable to="/discovery">
          <q-item-section avatar>
            <q-icon name="sym_o_preview" />
          </q-item-section>
          <q-item-section>{{ $t('menu.discovery') }}</q-item-section>
        </q-item>
        
        <!-- <q-item clickable to="/reset">
          <q-item-section avatar>
            <q-icon name="sym_o_restart_alt" />
          </q-item-section>
          <q-item-section>还原初始状态</q-item-section>
        </q-item>

        <q-item clickable to="/about">
          <q-item-section avatar>
            <q-icon name="sym_o_info" />
          </q-item-section>
          <q-item-section>关于</q-item-section>
        </q-item> -->


      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view style="padding: 40px;"/>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

defineOptions({
  name: 'MainLayout'
})

const leftDrawerOpen = ref(false)
const isInIframe = ref(false)

//function toggleLeftDrawer() {
//  leftDrawerOpen.value = !leftDrawerOpen.value
//}

onMounted(() => {
  // 检测当前页面是否在iframe中
  try {
    isInIframe.value = window.self !== window.top
  } catch (e) {
    // 如果出现跨域问题，默认认为在iframe中
    isInIframe.value = true
  }
  
  // 如果在iframe中，默认打开侧边栏
  if (isInIframe.value) {
    leftDrawerOpen.value = true
  }
})
</script>

<style>
.custom-menu .q-item__section--avatar {
  padding-right: 8px;  /* 减少右侧内边距 */
  min-width: 36px;    /* 减小图标区域的最小宽度 */
}

.custom-menu .q-item__section--side {
  padding-right: 8px;  /* 如果有侧边区域也减少内边距 */
}

/* 减少菜单项之间的间距 */
.custom-menu .q-item {
  min-height: 40px;     /* 减小每个项目的最小高度 */
  padding: 4px 16px;    /* 减少上下内边距 */
}

/* 减少标题的下方间距 */
.custom-menu .q-item-label.q-item-label--header {
  padding: 8px 16px 4px;  /* 减少下方内边距 */
  min-height: auto;
}

/* 让文字垂直居中对齐 */
.custom-menu .q-item__section--main {
  padding: 4px 0;  /* 减少内边距 */
}
</style>
