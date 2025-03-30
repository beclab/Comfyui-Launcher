export interface PackageInstall {
  name: string;
  icon: string;
  description: string;
  installed: boolean;
  menuOptions?: string[];
}

export interface NetworkConfig {
  url: string;
  icon: string;
  type: NetworkType;
  status: NetworkStatus;
  apiEndpoint: string;
  savingKey: string;
}

export enum NetworkType {
  GITHUB = 'GitHub',
  PYPI = 'PyPI',
  HUGGING_FACE = 'HuggingFace',
}

export enum NetworkStatus {
  WORKING = 'working',
  TIMEOUT = 'timeout',
  SAVING = 'saving',
  REQUESTING = 'requesting',
}

export interface TabProps {
  key: string;
  label: string;
}

export interface FolderProps {
  name: string;
  path: string;
  used: string | null;
  available: string | null;
}
