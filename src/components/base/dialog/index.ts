import { App } from 'vue';

import CustomDialog from './CustomDialog.vue';

export default (app: App, options: CustomDialogOptions = {}) => {
  const { defaultOkClass = 'default-ok-button' } = options;
  app.provide('defaultOkClass', defaultOkClass);
  app.component(CustomDialog.name, CustomDialog);
};

export interface CustomDialogOptions {
  defaultOkClass?: string;
}
