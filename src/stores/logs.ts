import { defineStore } from 'pinia';
import api from 'src/api';

interface LogsState {
  logs: string[];
  showLogs: boolean;
}

export const useLogStore = defineStore('log', {
  state: () => {
    return {
      logs: [],
      showLogs: false
    } as LogsState;
  },

  actions: {
    async fetchLogs() {
      try {
        const response = await api.getLogs();
        if (response && response.body && response.body.logs) {
          this.logs = response.body.logs;
        } else {
          this.logs = ['无法获取日志数据'];
        }
      } catch (error) {
        console.error('获取日志失败:', error);
        this.logs = ['获取日志失败，请稍后重试'];
      }
    },
  },
});
