import { RouteRecordRaw } from 'vue-router';
import RouteEnums from './routeEnums';

const routes: RouteRecordRaw[] = [
  {
    path: RouteEnums.PATHS.HOME,
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: RouteEnums.NAMES.HOME,
        component: () => import('pages/IndexPage.vue')
      },
      {
        path: RouteEnums.PATHS.ABOUT,
        name: RouteEnums.NAMES.ABOUT,
        component: () => import('pages/AboutPage.vue')
      },
      {
        path: RouteEnums.PATHS.MODELS,
        name: RouteEnums.NAMES.MODELS,
        component: () => import('pages/ModelsPage.vue')
      },
      {
        path: RouteEnums.PATHS.PLUGINS,
        name: RouteEnums.NAMES.PLUGINS,
        component: () => import('pages/PluginsPage.vue')
      },
      {
        path: RouteEnums.PATHS.RESET,
        name: RouteEnums.NAMES.RESET,
        component: () => import('pages/ResetPage.vue')
      },
      {
        path: RouteEnums.PATHS.PYTHON_DEPENDENCIES,
        name: RouteEnums.NAMES.PYTHON_DEPENDENCIES,
        component: () => import('pages/PythonDependenciesPage.vue')
      },
      {
        path: RouteEnums.PATHS.DISCOVERY,
        name: RouteEnums.NAMES.DISCOVERY,
        component: () => import('pages/DiscoveryPage.vue')
      },
      {
        path: RouteEnums.PATHS.NETWORK_CONFIG,
        name: RouteEnums.NAMES.NETWORK_CONFIG,
        component: () => import('pages/NetworkConfigPage.vue')
      }
    ]
  }
];

export default routes;
