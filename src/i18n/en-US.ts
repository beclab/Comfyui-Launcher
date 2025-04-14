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
  },
  downloadHistory: {
    title: 'Model Download History',
    clearHistory: 'Clear History',
    refresh: 'Refresh',
    loading: 'Loading history...',
    noHistory: 'No download history',
    columns: {
      modelName: 'Name',
      startTime: 'Time',
      source: 'Source',
      fileSize: 'Size',
      duration: 'Duration',
      speed: 'Average Speed',
      status: 'Status',
      actions: 'Actions'
    },
    actions: {
      deleteRecord: 'Delete this record'
    },
    dialog: {
      confirmClear: {
        title: 'Confirm Clear',
        message: 'Are you sure you want to clear all download history? This action cannot be undone.'
      },
      confirmDelete: {
        title: 'Confirm Delete',
        message: 'Are you sure you want to delete the download record for "{modelName}"?'
      },
      success: {
        cleared: 'History cleared',
        deleted: 'Record deleted'
      },
      error: {
        clearFailed: 'Failed to clear history',
        deleteFailed: 'Failed to delete record'
      }
    },
    status: {
      success: 'Success',
      failed: 'Failed',
      canceled: 'Canceled',
      downloading: 'Downloading',
      unknown: 'Unknown'
    },
    time: {
      unknown: 'Unknown time',
      seconds: '{count} sec',
      minutes: '{minutes} min {seconds} sec',
      hours: '{hours} hr {minutes} min'
    },
    size: {
      unknown: 'Unknown size'
    },
    speed: {
      unknown: 'Unknown speed'
    }
  },
  plugins: {
    title: 'Plugin Management',
    tabs: {
      pluginLibrary: 'Plugin Library',
      operationHistory: 'Operation History'
    },
    actions: {
      updateAll: 'Update All Plugins',
      openDirectory: 'Open Plugin Directory',
      install: 'Install',
      uninstall: 'Uninstall',
      enable: 'Enable',
      disable: 'Disable',
      showInfo: 'Details',
      refresh: 'Refresh',
      clearFilters: 'Clear Filters',
      loadMore: 'Load More',
      search: 'Search',
      retryInstall: 'Retry Installation'
    },
    loadingPlugins: 'Loading plugins list...',
    noPluginsFound: 'No matching plugins found',
    availablePlugins: 'Available Plugins',
    registeredPlugins: 'Available plugins registered in ComfyUI Manager',
    searchPlaceholder: 'Search plugins...',
    refreshTooltip: 'Refresh plugin list',
    columns: {
      id: 'ID',
      name: 'Name',
      version: 'Version',
      status: 'Status',
      author: 'Author',
      description: 'Description',
      actions: 'Actions',
      tags: 'Tags'
    },
    pagination: {
      rowsPerPage: 'Rows per page',
      pageInfo: 'Page {currentPage} / {totalPages} ({total} plugins total)'
    },
    status: {
      installed: 'Installed',
      notInstalled: 'Not Installed',
      disabled: 'Disabled',
      enabled: 'Enabled',
      all: 'All'
    },
    history: {
      pluginId: 'Plugin ID',
      operationType: 'Operation Type',
      time: 'Time',
      status: 'Status',
      actions: 'Actions',
      viewLogs: 'View Logs',
      retry: 'Retry',
      logs: 'Operation Logs'
    },
    notifications: {
      installSuccess: 'Installed {name} successfully!',
      installFail: 'Failed to install {name}: {message}',
      uninstallSuccess: 'Uninstalled {name} successfully!',
      uninstallFail: 'Failed to uninstall {name}: {message}',
      enableSuccess: 'Enabled {name} successfully!',
      enableFail: 'Failed to enable {name}: {message}',
      disableSuccess: 'Disabled {name} successfully!',
      disableFail: 'Failed to disable {name}: {message}',
      updateAllStart: 'Checking for updates...',
      updateAllSuccess: 'Updated {count} plugins',
      updateAllNoPlugins: 'No installed plugins to update',
      updateAllFail: 'Failed to update plugins, please try again later',
      fetchFail: 'Failed to fetch plugin list, please try again later',
      progressRequestFail: 'Progress request failed: {message}',
      folderOpenFail: 'Failed to open plugin directory'
    },
    dialog: {
      operationLogs: 'Operation Logs',
      pluginInfo: 'Plugin Information',
      logsFetchFail: 'Failed to fetch log details',
      details: {
        name: 'Name',
        description: 'Description',
        author: 'Author',
        version: 'Version',
        github: 'GitHub',
        installed: 'Installation Status',
        installedOn: 'Installed On',
        status: 'Status',
        tags: 'Tags'
      }
    },
    progress: {
      preparing: 'Preparing to install {name}...',
      installing: 'Installing...',
      uninstalling: 'Uninstalling {name}...',
      enabling: 'Enabling...',
      disabling: 'Disabling...'
    }
  }
};