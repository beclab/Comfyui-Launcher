import { defineStore } from 'pinia';
import RouteEnums from 'src/router/routeEnums';

interface MenuState {
  currentMenu: string;
}

export const useMenuStore = defineStore('menu', {
  state: () => {
    return {
      currentMenu: RouteEnums.NAMES.HOME,
    } as MenuState;
  },

  actions: {
    setCurrentMenu(menu: string) {
      this.currentMenu = menu;
    },
  },
});
