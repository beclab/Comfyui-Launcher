import api from './index';

interface Model {
  id: string;
  name: string;
  description: string;
  type: string;
  size: string;
  path?: string;
  installed: boolean;
  installedDate?: string;
  essential?: boolean;
  fileStatus?: 'complete' | 'incomplete' | 'corrupted';
  fileSize?: number;
  save_path?: string;
  mode?: string;
  source?: string;
}

class DataCenter {
  private modelCache: { [key: string]: Model[] } = {};

  async getInstalledModels(forceUpdate = false): Promise<Model[]> {
    if (!forceUpdate && this.modelCache['installedModels']) {
      return this.modelCache['installedModels'];
    }
    try {
      const response = await api.get('models');
      const data = await extractResponseData<Model[]>(response);
      if (data && Array.isArray(data)) {
        const installedModels = data.filter(model => model.installed);
        this.modelCache['installedModels'] = installedModels;
        return installedModels;
      } else {
        console.error('获取已安装模型列表失败: 响应格式不正确', response);
        throw new Error('获取已安装模型列表失败');
      }
    } catch (error) {
      console.error('获取已安装模型列表失败:', error);
      throw error;
    }
  }

  async getInstalledModelsCount(forceUpdate = false): Promise<number> {
    const installedModels = await this.getInstalledModels(forceUpdate);
    return installedModels.length;
  }

  async getOptionalModels(forceUpdate = false): Promise<Model[]> {
    if (!forceUpdate && this.modelCache['optionalModels']) {
      return this.modelCache['optionalModels'];
    }
    try {
      const response = await api.get('models?mode=cache');
      const data = await extractResponseData<Model[]>(response);
      if (data && Array.isArray(data)) {
        this.modelCache['optionalModels'] = data;
        return data;
      } else {
        console.error('获取可选模型列表失败: 响应格式不正确', response);
        throw new Error('获取可选模型列表失败');
      }
    } catch (error) {
      console.error('获取可选模型列表失败:', error);
      throw error;
    }
  }

  async getOptionalModelsCount(forceUpdate = false): Promise<number> {
    const optionalModels = await this.getOptionalModels(forceUpdate);
    return optionalModels.length;
  }
}

interface ApiResponse {
  data?: unknown;
  body?: unknown;
}

const extractResponseData = async <T>(response: (ApiResponse | Response) | undefined): Promise<T | null> => {
  if (!response) return null;
  if (typeof response === 'object') {
    if ('data' in response && response.data !== undefined) return response.data as T;
    if ('body' in response && response.body !== undefined) {
      return response.body as T;
    }
    if (response instanceof Response) {
      try {
        return await response.json() as T;
      } catch (error) {
        console.error('解析响应JSON失败:', error);
      }
    }
  }
  return null;
};

export default new DataCenter();