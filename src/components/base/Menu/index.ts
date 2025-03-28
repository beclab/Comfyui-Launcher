import { App } from 'vue';

import CustomMenu from './CustomMenu.vue';

export default (app: App) => {
  app.component(CustomMenu.name, CustomMenu);
};
