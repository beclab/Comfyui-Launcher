import { route } from 'quasar/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import { RouteRecordRaw } from 'vue-router';

// import routesConfig from './routes';

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

/*
 * 如果不想使用模式历史（默认hash模式），
 * 您需要将路由base设置为使用createWebHistory()
 *
 * 更多信息参见: https://router.vuejs.org/guide/essentials/history-mode.html#html5-history-mode
 */

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: 'about', component: () => import('pages/AboutPage.vue') },
      { path: 'models', component: () => import('pages/ModelsPage.vue') },
      { path: 'plugins', component: () => import('pages/PluginsPage.vue') },
      { path: 'reset', component: () => import('pages/ResetPage.vue') },
      { 
        path: 'python-dependencies',
        component: () => import('pages/PythonDependenciesPage.vue'),
      },
      { path: 'discovery', component: () => import('pages/DiscoveryPage.vue') },
      { path: 'network-config', component: () => import('pages/NetworkConfigPage.vue') },
    ],
  },
];

export default route(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory);

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  return Router;
});
