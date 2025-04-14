export default {
  common: {
    title: 'ComfyUI Manager',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    remove: 'Remove',
    back: 'Back',
    next: 'Next',
    settings: 'Settings',
    language: 'Language'
  },
  folderAccess: {
    fileType: 'File Type',
    rootDir: 'Root Directory',
    pluginDir: 'Plugin Directory',
    modelDir: 'Model Directory',
    outputDir: 'Output Directory',
    inputDir: 'Input Directory',
    installed: 'Installed',
    available: 'Available',
    open: 'Open'
  },
  menu: {
    navigation: 'Navigation Menu',
    home: 'Home',
    modelManagement: 'Model Management',
    pluginManagement: 'Plugin Management',
    pythonDependencies: 'Python Dependencies',
    networkConfig: 'Network Config',
    discovery: 'Discovery'
  },
  models: {
    essentialModels: 'Essential Models',
    downloadModels: 'Download Models',
    localModels: 'Local Models',
    modelName: 'Model Name',
    modelSize: 'Size',
    modelType: 'Type',
    modelAction: 'Action',
    modelDetails: {
      name: 'Name',
      type: 'Type',
      size: 'Size',
      baseModel: 'Base Model',
      source: 'Source',
      description: 'Description',
      noDescription: 'No description'
    },
    pagination: {
      rowsPerPage: 'Rows per page',
      pageInfo: '{{from}}-{{to}} of {{total}}'
    }
  },
  network: {
    config: 'Network Configuration',
    proxy: 'Proxy Settings',
    useProxy: 'Use Proxy',
    github: {
      title: 'GitHub',
      accessible: 'Accessible',
      inaccessible: 'Inaccessible',
      selectUrl: 'Select URL to access'
    },
    environment: 'Network Environment',
    pypi: {
      title: 'PyPI',
      accessible: 'Accessible',
      inaccessible: 'Inaccessible',
      selectUrl: 'Select URL to access'
    },
    huggingface: {
      title: 'HuggingFace',
      accessible: 'Accessible',
      inaccessible: 'Inaccessible',
      selectUrl: 'Select URL to access'
    },
    checkNetwork: 'Check',
    loading: 'Loading configuration...',
    networkTest: 'Network Test Result',
    canAccess: 'can be accessed',
    cannotAccess: 'cannot be accessed',
    saveSuccess: 'Configuration saved successfully',
    saveError: 'Failed to save configuration'
  },
  python: {
    dependencies: 'Python Dependencies',
    installPackage: 'Install Package',
    packageName: 'Package Name',
    version: 'Version',
    status: 'Status',
    action: 'Action'
  },
  comfyuiStatus: {
    title: 'ComfyUI',
    running: 'Running',
    stopped: 'Stopped',
    version: {
      comfyui: 'comfyui',
      frontend: 'frontend',
      launcher: 'launcher',
      gpu: 'GPU'
    },
    buttons: {
      open: 'Open',
      stop: 'Stop',
      start: 'Start'
    },
    menu: {
      viewLogs: 'View Logs',
      reset: 'Wipe and Restore'
    },
    logs: {
      title: 'ComfyUI Logs',
      loading: 'Loading logs...',
      refresh: 'Refresh Logs',
      download: 'Download Logs'
    },
    dialog: {
      missingModelsTitle: 'Missing Essential Models',
      missingModelsMessage: 'You have not installed all the necessary essential models. This may cause ComfyUI to fail to generate images properly. Do you want to continue starting?',
      rememberChoice: 'Remember my choice, no need to confirm next time',
      confirmStart: 'Still Start',
      installModels: 'Install Models'
    }
  },
  modelsPage: {
    title: 'Model Management',
    modelLibrary: 'Model Library',
    operationHistory: 'Operation History',
    openModelDir: 'Open Model Directory'
  },
  packageInstall: {
    title: 'Package Installation',
    essentialPackage: 'Essential Model Package',
    popular: 'Popular',
    outOfPrint: 'Out of Print',
    essentialModelsDesc: 'Contains the basic models required for ComfyUI to work',
    download: 'Download',
    controlNetPackage: 'ControlNet Model Package',
    controlNetModelsDesc: 'Contains all models required for ControlNet'
  },
  installedModelsCard: {
    installedModels: 'Installed Models',
    installedCount: 'Installed { installedModelsCount } models',
    storageUsed: 'Storage used: { totalStorageUsed }',
    searchPlaceholder: 'Search models...',
    scanModels: 'Scan Models',
    refresh: 'Refresh',
    confirmDelete: 'Confirm Delete Model',
    deleteMessage: 'Are you sure you want to delete the model "{ selectedModel?.name }"? This operation is irreversible.',
    modelInfo: 'Model Details',
    unknown: 'Unknown'
  },
  optionalModels: {
    title: 'Available Models',
    subtitle: 'Browse available models on HuggingFace',
    searchPlaceholder: 'Search models...',
    databaseSource: 'Data Source',
    refresh: 'Refresh',
    dataSource: {
      cache: 'Cache (1 day)',
      local: 'Local',
      remote: 'Remote'
    },
    tabs: {
      all: 'All',
      sd: 'SD Models',
      lora: 'LORA',
      controlnet: 'CONTROLNET',
      vae: 'VAE',
      upscaler: 'Upscalers'
    },
    columns: {
      name: 'Name',
      type: 'Type',
      size: 'Size',
      baseModel: 'Base Model',
      source: 'Source',
      description: 'Description',
      actions: 'Actions'
    },
    modelTypes: {
      checkpoint: 'SD Model',
      vae: 'VAE',
      vae_approx: 'Preview Decoder',
      lora: 'LoRA',
      controlnet: 'ControlNet',
      upscaler: 'Upscaler',
      embedding: 'Embedding',
      ipadapter: 'IP-Adapter',
      motion: 'Motion Model',
      facerestore: 'Face Restore',
      detector: 'Detector',
      segmentation: 'Segmentation',
      other: 'Other'
    },
    noModelsFound: 'No matching models found',
    loadingModels: 'Loading models...',
    download: {
      source: {
        title: 'Download Source',
        mirror: 'HuggingFace China Mirror',
        official: 'HuggingFace Official'
      },
      progress: '{percentage}% | {speed}',
      installComplete: 'Model {model} installation completed',
      installFailed: 'Model download failed: {error}',
      startInstall: 'Starting to install model: {model}',
      refreshing: 'Refreshing model list...'
    },
    actions: {
      viewDetails: 'View Details',
      install: 'Install',
      installed: 'Installed'
    },
    dialog: {
      confirmTitle: 'Confirm Installation',
      confirmMessage: 'Are you sure you want to install model "{model}"?',
      cancel: 'Cancel',
      confirm: 'Confirm',
      modelDetails: 'Model Details',
      close: 'Close'
    },
    pagination: {
      rowsPerPage: 'Rows per page',
      of: '{from}-{to} of {total}'
    }
  }
};