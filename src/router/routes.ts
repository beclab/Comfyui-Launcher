import { RouteRecordRaw } from 'vue-router';

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

export default routes;
