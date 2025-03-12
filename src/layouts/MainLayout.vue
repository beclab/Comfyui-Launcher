<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="菜单"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title>
          ComfyUI 管理器
        </q-toolbar-title>

        <div>Quasar v{{ $q.version }}</div>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
    >
      <q-list>
        <q-item-label header>导航菜单</q-item-label>

        <q-item clickable to="/" exact>
          <q-item-section avatar>
            <q-icon name="home" />
          </q-item-section>
          <q-item-section>首页</q-item-section>
        </q-item>

        <q-item clickable to="/models">
          <q-item-section avatar>
            <q-icon name="storage" />
          </q-item-section>
          <q-item-section>模型管理</q-item-section>
        </q-item>

        <q-item clickable to="/plugins">
          <q-item-section avatar>
            <q-icon name="extension" />
          </q-item-section>
          <q-item-section>插件管理</q-item-section>
        </q-item>

        <q-item clickable to="/reset">
          <q-item-section avatar>
            <q-icon name="restore" />
          </q-item-section>
          <q-item-section>还原初始状态</q-item-section>
        </q-item>

        <q-item clickable to="/about">
          <q-item-section avatar>
            <q-icon name="info" />
          </q-item-section>
          <q-item-section>关于</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineOptions({
  name: 'MainLayout'
})

const leftDrawerOpen = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}
</script>
