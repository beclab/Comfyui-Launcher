// 模型类型定义
export interface Model {
  id: string;
  name: string;
  type: string;
  description?: string;
  // 其他必要字段
}

// 基础模型接口
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

// 更新类型定义，添加 "canceled" 为合法状态
export type DownloadStatus = 'downloading' | 'completed' | 'error' | 'canceled';

// 下载进度接口
export interface DownloadProgress {
  currentModel: EssentialModel | null;
  currentModelIndex: number;
  overallProgress: number;
  currentModelProgress: number;
  completed: boolean;
  error: string | null;
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  status: DownloadStatus;
  startTime?: number;
  lastUpdateTime?: number;
  lastBytes?: number;
  abortController?: AbortController;
  canceled?: boolean;
  cancelTime?: number;
  startBytes?: number;
  lastLogTime?: number;
}

// 添加 ModelInfo 和 DownloadOptions 接口定义
export interface ModelInfo {
  id: string;
  name: string;
  type: string;
  essential?: boolean;
  url: {
    mirror?: string;
    hf?: string;
  };
  dir: string;
  out: string;
  description?: string;
}

export interface DownloadOptions {
  abortController: AbortController;
  onProgress: (progress: DownloadProgress) => void;
  source?: string;
  basePath?: string;
} 