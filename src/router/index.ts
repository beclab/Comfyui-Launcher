import { route } from 'quasar/wrappers';
import {
  createRouter,
  createWebHistory
} from 'vue-router';
import routes from './routes';

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



export default route(function (/* { store, ssrContext } */) {

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createWebHistory(process.env.VUE_ROUTER_BASE),
  });

  return Router;
});
