<template>
  <q-layout view="hHh lpR fFf" class="main-layout">
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      :width="240"
      behavior="desktop"
      :breakpoint="0"
      :offset="isInIframe ? 0 : undefined"
    >
      <custom-menu
        active-class="my-active-link"
        class="full-height"
        :model-value="menuStore.currentMenu"
        @update:modelValue="menuStore.setCurrentMenu"
        :items="menuItems"
        :show-theme-toggle="false"
        @select="onMenuChange"
      />
      <!--      <q-list class="custom-menu">-->
      <!--        <q-item-label header>导航菜单</q-item-label>-->

      <!--        <q-item clickable to="/" exact>-->
      <!--          <q-item-section avatar>-->
      <!--            <q-icon name="sym_o_home" />-->
      <!--          </q-item-section>-->
      <!--          <q-item-section>首页</q-item-section>-->
      <!--        </q-item>-->

      <!--        <q-item clickable to="/discovery">-->
      <!--          <q-item-section avatar>-->
      <!--            <q-icon name="sym_o_explore" />-->
      <!--          </q-item-section>-->
      <!--          <q-item-section>探索发现</q-item-section>-->
      <!--        </q-item>-->

      <!--        <q-item clickable to="/models">-->
      <!--          <q-item-section avatar>-->
      <!--            <q-icon name="sym_o_database" />-->
      <!--          </q-item-section>-->
      <!--          <q-item-section>模型管理</q-item-section>-->
      <!--        </q-item>-->

      <!--        <q-item clickable to="/plugins">-->
      <!--          <q-item-section avatar>-->
      <!--            <q-icon name="sym_o_extension" />-->
      <!--          </q-item-section>-->
      <!--          <q-item-section>插件管理</q-item-section>-->
      <!--        </q-item>-->

      <!--        <q-item clickable to="/python-dependencies">-->
      <!--          <q-item-section avatar>-->
      <!--            <q-icon name="sym_o_code" />-->
      <!--          </q-item-section>-->
      <!--          <q-item-section>python依赖管理</q-item-section>-->
      <!--        </q-item>-->

      <!--        <q-item clickable to="/reset">-->
      <!--          <q-item-section avatar>-->
      <!--            <q-icon name="sym_o_restart_alt" />-->
      <!--          </q-item-section>-->
      <!--          <q-item-section>还原初始状态</q-item-section>-->
      <!--        </q-item>-->

      <!--        <q-item clickable to="/about">-->
      <!--          <q-item-section avatar>-->
      <!--            <q-icon name="sym_o_info" />-->
      <!--          </q-item-section>-->
      <!--          <q-item-section>关于</q-item-section>-->
      <!--        </q-item>-->

      <!--        <q-item-->
      <!--          to="/network-config"-->
      <!--          exact-->
      <!--          clickable-->
      <!--          v-ripple-->
      <!--          active-class="active-menu-link"-->
      <!--        >-->
      <!--          <q-item-section avatar>-->
      <!--            <q-icon name="settings_ethernet" />-->
      <!--          </q-item-section>-->
      <!--          <q-item-section>网络配置</q-item-section>-->
      <!--        </q-item>-->
      <!--      </q-list>-->
    </q-drawer>

    <q-page-container>
      <router-view style="padding: 56px 44px 0 44px" />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import CustomMenu from 'components/base/Menu/CustomMenu.vue';
import { useMenuStore } from 'stores/menu';
import { useI18n } from 'vue-i18n';
import RouteEnums from 'src/router/routeEnums';
import { useRouter } from 'vue-router';

const menuStore = useMenuStore();
const leftDrawerOpen = ref(false);
const isInIframe = ref(false);
const router = useRouter();
const { t } = useI18n();

// function toggleLeftDrawer() {
//   leftDrawerOpen.value = !leftDrawerOpen.value;
// }

const menuItems = [
  {
    label: t('menu.navigation_menu'),
    key: 'Navigation',
    children: [
      {
        label: t('menu.home'),
        key: RouteEnums.NAMES.HOME,
        icon: 'sym_r_home',
      },
      {
        label: t('menu.model_management'),
        key: RouteEnums.NAMES.MODELS,
        icon: 'sym_r_deployed_code',
      },
      {
        label: t('menu.environment_management'),
        key: RouteEnums.NAMES.PYTHON_DEPENDENCIES,
        icon: 'sym_r_rule_settings',
      },
      {
        label: t('menu.plugin_management'),
        key: RouteEnums.NAMES.PLUGINS,
        icon: 'sym_r_extension',
      },
      {
        label: t('menu.network_configuration'),
        key: RouteEnums.NAMES.NETWORK_CONFIG,
        icon: 'sym_r_network_check',
      },
      {
        label: t('menu.inspiration_discovery'),
        key: RouteEnums.NAMES.DISCOVERY,
        icon: 'sym_r_preview',
      },
    ],
  },
];

function onMenuChange(data: { key: string }) {
  const { key } = data;
  router.push({ name: key });
}

onMounted(() => {
  // 检测当前页面是否在iframe中
  try {
    isInIframe.value = window.self !== window.top;
  } catch (e) {
    // 如果出现跨域问题，默认认为在iframe中
    isInIframe.value = true;
  }

  // 如果在iframe中，默认打开侧边栏
  if (isInIframe.value) {
    leftDrawerOpen.value = true;
  }
});

watch(
  () => menuStore.currentMenu,
  () => {
    router.push({ name: menuStore.currentMenu });
  }
);
</script>

<style lang="scss" scoped>
.main-layout ::v-deep(.my-active-link) {
  color: $blue-default !important;
  background-color: $blue-soft !important;
}
</style>
