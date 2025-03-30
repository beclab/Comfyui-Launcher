// 模型接口
export interface Model {
  name: string;
  type: string;
  description?: string;
  installed?: boolean;
  url?: string;
  save_path?: string;
  filename?: string;
}

// 必要模型接口
export interface EssentialModel {
  id: string;
  name: string;
  type: string;
  url: {
    hf: string;
    mirror: string;
  };
  dir: string;
  out: string;
  description?: string;
  size?: string;
  essential: boolean;
}

// 修改 ModelInfo 接口，使其与 EssentialModel 兼容
export interface ModelInfo extends EssentialModel {
  // 已经继承了 EssentialModel 的所有属性
  [key: string]: unknown; // 使用 unknown 替代 any
}

export interface DownloadProgress {
  currentModel: EssentialModel | null; // 改用 EssentialModel
  currentModelIndex: number;
  overallProgress: number;
  completed: boolean;
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  status: 'downloading' | 'completed' | 'error';
  error: string | null;
  currentModelProgress: number;
}

// 添加模型下载进度映射类型
export interface ModelDownloadProgress {
  [key: string]: DownloadProgress;
}

// 移除未使用的类型
// export type ModelDownloadProgress = DownloadProgress;

// 使用 eslint-disable 注释来禁用未使用变量的警告
/*
 * 暂未使用，保留以备后续扩展
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface DownloadLog {
  status: string;
  message: string;
  time: string;
}

// 当前下载状态接口
export interface CurrentDownloadState {
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  status: 'downloading' | 'completed' | 'error';
  error: string | null;
  overallProgress: number;
  currentModelIndex: number;
  currentModelProgress: number;
  currentModel: EssentialModel | null;
  completed: boolean;
  modelType?: string;
}

// 下载日志项
export interface DownloadLogItem {
  time: string;
  message: string;
  status: string;
}

// 定义API响应类型
export interface ApiResponse {
  data?: unknown;
  body?: unknown;
}

// 提取API响应数据函数
export const extractResponseData = async <T>(
  response: ApiResponse | Response | undefined
): Promise<T | null> => {
  if (!response) return null;

  if (typeof response === 'object') {
    if ('data' in response && response.data !== undefined)
      return response.data as T;
    if ('body' in response && response.body !== undefined) {
      return response.body as T;
    }

    if (response instanceof Response) {
      try {
        return (await response.json()) as T;
      } catch (error) {
        console.error('解析响应JSON失败:', error);
      }
    }
  }

  return null;
};

// 使用具体类型替代any[]
export interface InstalledModel {
  name: string;
  type: string;
  installed: boolean;
  path?: string;
  size?: string | number;

  [key: string]: unknown;
}
