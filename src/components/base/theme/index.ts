import { App } from 'vue';

import CustomTheme from './CustomTheme.vue';

export default (app: App) => {
  app.component(CustomTheme.name, CustomTheme);
};
