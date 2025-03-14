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