import { defineStore } from 'pinia';
import api from 'src/api';
import { NetworkConfig, NetworkStatus, NetworkType } from 'src/types/contants';

interface NetworkState {
  configMap: Map<NetworkType, NetworkConfig>;
  loading: boolean;
}

export const useNetworkStore = defineStore('network', {
  state: () => {
    return {
      configMap: new Map<NetworkType, NetworkConfig>(),
      loading: true,
    } as NetworkState;
  },
  getters: {
    configArray(): NetworkConfig[] {
      return Array.from(this.configMap.values());
    },
    configTypes(): NetworkType[] {
      return Array.from(this.configMap.keys());
    },
  },
  actions: {
    async init(){
      this.getNetworkConfig(NetworkType.GITHUB);
      this.getNetworkConfig(NetworkType.PYPI);
      this.getNetworkConfig(NetworkType.HUGGING_FACE);

      this.fetchNetworkConfig();
    },
    getNetworkConfig(type: NetworkType) {
      const config = this.configMap.get(type);
      if (config) {
        return config;
      } else {
        let config;
        switch (type) {
          case NetworkType.GITHUB:
            config = {
              url: '',
              icon: 'network/github.png',
              type: NetworkType.GITHUB,
              status: NetworkStatus.SAVING,
              apiEndpoint: 'system/github-proxy',
              savingKey: 'github',
            };
            break;
          case NetworkType.PYPI:
            config = {
              url: '',
              icon: 'network/python.png',
              type: NetworkType.PYPI,
              status: NetworkStatus.SAVING,
              apiEndpoint: 'system/pip-source',
              savingKey: 'pip',
            };
            break;
          case NetworkType.HUGGING_FACE:
            config = {
              url: '',
              icon: 'network/huggingface.png',
              type: NetworkType.HUGGING_FACE,
              status: NetworkStatus.SAVING,
              apiEndpoint: 'system/huggingface-endpoint',
              savingKey: 'huggingface',
            };
            break;
        }
        this.configMap.set(type, config);
        return config;
      }
    },
    setNetworkConfigStatus(type: NetworkType, available: boolean | null) {
      const config = this.getNetworkConfig(type);
      if (available == null) {
        config.status = NetworkStatus.REQUESTING;
        return;
      }
      config.status = available ? NetworkStatus.WORKING : NetworkStatus.TIMEOUT;
    },
    async fetchNetworkConfig() {

      try {
        this.loading = true;
        const response = await api.get('system/network-config');

        if (response.data.code === 200) {
          const config = response.data.data;
          for (const [_, value] of this.configMap.entries()) {
            value.url = config[value.savingKey].url;
            value.status = config[value.savingKey].accessible
              ? NetworkStatus.WORKING
              : NetworkStatus.TIMEOUT;
          }
        }
      } catch (error) {
        console.error('获取网络配置失败:', error);
        for (const [_, value] of this.configMap.entries()) {
          value.status = NetworkStatus.TIMEOUT;
        }
      } finally {
        this.loading = false;
      }
      console.log(this.configMap);
    },
    async checkNetworkStatus(types: NetworkType[]) {
      try {
        types.forEach((type) => {
          this.setNetworkConfigStatus(type, null);
        });

        const response = await api.get('system/network-status');

        if (response.data.code === 200) {
          const config = response.data.data;

          types.forEach((type) => {
            switch (type) {
              case NetworkType.GITHUB:
                this.setNetworkConfigStatus(type, config.github.accessible);
                break;
              case NetworkType.PYPI:
                this.setNetworkConfigStatus(type, config.pip.accessible);
                break;
              case NetworkType.HUGGING_FACE:
                this.setNetworkConfigStatus(
                  type,
                  config.huggingface.accessible
                );
                break;
              default:
                console.warn(`未知的网络类型: ${type}`);
            }
          });
        } else {
          types.forEach((type) => {
            this.setNetworkConfigStatus(type, false);
          });
        }
      } catch (error) {
        console.error('检查网络状态失败:', error);

        types.forEach((type) => {
          this.setNetworkConfigStatus(type, false);
        });
      }
    },
    async saveConfig(config: NetworkConfig, url: string) {
      try {
        config.status = NetworkStatus.SAVING;

        const response = await api.post(config.apiEndpoint, {
          url,
        });

        if (response.data.code === 200) {
          console.log(`${config.type} 配置已成功保存`);
          await this.checkNetworkStatus([config.type]);
        } else {
          console.error(
            `${config.type} 配置保存失败，响应码: ${response.data.code}`
          );
        }
      } catch (error) {
        console.error(`${config.type} 配置保存失败:`, error);
      }
    },
  },
});
