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
      pageInfo: '{from}-{to} of {total}'
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
    action: 'Action',
    environmentManagement: 'Environment Management',
    tabs: {
      dependencies: 'Python Dependencies',
      analysis: 'Dependency Analysis'
    },
    errors: {
      installationError: 'Installation Error',
      serverErrorCauses: 'Internal server errors may be caused by:',
      envConfigProblem: 'Python environment configuration issues - may be virtual or system environment issues',
      permissionProblem: 'Permission problems - current user may not have permissions to install packages',
      networkProblem: 'Network issues - unable to connect to PyPI source',
      dependencyConflict: 'Dependency conflicts - may conflict with other installed packages',
      installTips: 'To install Python packages:',
      useVirtualEnv: 'Using virtual environment',
      useUserInstall: 'Using user-level installation'
    },
    installedPackages: {
      title: 'Installed Python Packages',
      subtitle: 'Python packages installed in local Python environment',
      search: 'Search Python packages',
      install: 'Install New Package',
      refresh: 'Refresh',
      tableCols: {
        name: 'Package Name',
        version: 'Version',
        actions: 'Actions'
      },
      pagination: {
        rowsPerPage: 'Records per page',
        range: '{start}-{end} of {total}'
      },
      dialog: {
        install: {
          title: 'Install New Package',
          packageName: 'Package Name',
          version: 'Version (optional)',
          versionHint: 'Example: ==1.0.0, >=2.0.0, leave blank for latest version',
          cancel: 'Cancel',
          confirmInstall: 'Install'
        },
        uninstall: {
          title: 'Confirm Uninstall',
          message: 'Are you sure you want to uninstall {name}? This may affect plugins that depend on this package.',
          cancel: 'Cancel',
          confirmUninstall: 'Uninstall'
        }
      },
      notifications: {
        loadFailed: 'Failed to load installed packages: {message}',
        installSuccess: '{name} installed successfully',
        installFailed: 'Installation failed: {message}',
        uninstallSuccess: '{name} has been uninstalled',
        uninstallFailed: 'Uninstall failed: {message}',
        upgradeSuccess: '{name} has been upgraded',
        upgradeFailed: 'Upgrade failed: {message}'
      }
    },
    pluginDependencies: {
      title: 'Plugin Dependencies Analysis',
      subtitle: 'Automatically analyze whether Python libraries required by installed plugins are correctly installed',
      analyze: 'Analyze Now',
      pluginsColumn: 'Plugins',
      dependenciesColumn: 'Dependencies List',
      fixAll: 'Fix All',
      versionRequired: 'Version required:',
      install: 'Install',
      installed: 'Installed',
      analyzing: 'Analyzing dependencies...',
      noDependenciesFound: 'No dependencies found'
    }
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
      viewResetLogs: 'View Reset Logs',
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
      title: 'Operation History',
      clearHistory: 'Clear History',
      refresh: 'Refresh',
      pluginId: 'Plugin ID',
      operationType: 'Operation Type',
      startTime: 'Start Time',
      endTime: 'End Time',
      duration: 'Duration',
      time: 'Time',
      status: 'Status',
      actions: 'Actions',
      viewLogs: 'View Logs',
      deleteRecord: 'Delete Record',
      retry: 'Retry',
      logs: 'Operation Logs',
      noHistory: 'No operation history records',
      running: 'Running',
      success: 'Success',
      failed: 'Failed',
      milliseconds: 'ms',
      seconds: '{count} seconds',
      minutes: '{minutes} min {seconds} sec'
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
    },
    operations: {
      install: 'Install',
      uninstall: 'Uninstall',
      disable: 'Disable',
      enable: 'Enable',
      unknown: 'Unknown'
    },
    pluginStatus: {
      unknown: 'Unknown'
    }
  },
  discovery: {
    title: 'Discovery',
    inspireFrom: 'Find More Inspiration on Civitai.com',
    tabs: {
      latestModels: 'Latest Models',
      hotModels: 'Hot Models',
      latestWorkflows: 'Latest Workflows',
      hotWorkflows: 'Hot Workflows'
    },
    loading: 'Loading',
    loadMore: 'Pull up to load more',
    noMoreData: 'No more data',
    retry: 'Retry',
    invalidData: 'Invalid data format returned',
    tryingDirectAccess: 'Trying to access Civitai directly...',
    switchedToDirectMode: 'Switched to direct Civitai access mode',
    fetchError: 'Failed to fetch model list, please check your network connection and try again',
    viewingModel: 'Viewing model ID: {modelId}',
    noVersionsAvailable: 'No available model versions',
    startDownloading: 'Started downloading model: {model}',
    unknownDate: 'Unknown date',
    invalidDate: 'Invalid date format',
    noDescription: 'No description',
    unknownAuthor: 'Unknown author',
    pagination: {
      page: 'page: {current}/{total}'
    }
  },
  reset: {
    dialog1: {
      title: 'Confirm Wipe and Restore',
      message: 'Do you really want to restore ComfyUI? This operation will:',
      effects: {
        settings: 'Erase all user configurations',
        plugins: 'Remove all installed plugins',
        workflows: 'Reset all workflows and projects',
        models: 'Downloaded models will still be preserved'
      },
      confirmButton: 'Wipe and Restore'
    },
    dialog2: {
      warning: 'This operation is irreversible, please proceed with caution',
      restartTip: 'If you are experiencing temporary issues, you can try restarting ComfyUI instead of completely resetting it.',
      confirmInput: 'Please type \'CONFIRM\' to proceed with this operation'
    },
    progress: {
      title: 'Restoring...',
      starting: 'Starting reset operation, please wait...',
      failed: 'Reset operation failed',
      error: 'Reset operation error',
      unknownError: 'Unknown error'
    },
    complete: {
      title: 'Restore operation completed!',
      message: 'ComfyUI has been successfully restored to its initial state.',
      restartTip: 'It is recommended to restart the application to ensure all changes take effect.',
      backButton: 'Back to Home',
      restartButton: 'Restart Application'
    },
    logs: {
      title: 'Last Reset Operation Logs',
      noLogs: 'No reset logs found'
    }
  }
};