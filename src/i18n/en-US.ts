export default {
  common: {
    title: 'ComfyUI Launcher',
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
    rootDir: 'Root',
    pluginDir: 'Plugin',
    modelDir: 'Model',
    outputDir: 'Output',
    inputDir: 'Input',
    rootDirHint: 'Root directory of ComfyUI',
    outputDirHint: 'Output directory of ComfyUI',
    inputDirHint: 'Input directory of ComfyUI',
    installed: 'Installed',
    available: 'Available',
    open: 'Open'
  },
  menu: {
    navigation: 'Navigation',
    home: 'Home',
    modelManagement: 'Model management',
    pluginManagement: 'Plugin management',
    pythonDependencies: 'Python dependencies',
    networkConfig: 'Network Config',
    discovery: 'Discover'
  },
  models: {
    essentialModels: 'Essential models',
    downloadModels: 'Download models',
    localModels: 'Local models',
    modelName: 'Model name',
    modelSize: 'Size',
    modelType: 'Type',
    modelAction: 'Action',
    modelDetails: {
      name: 'Name',
      type: 'Type',
      size: 'Size',
      baseModel: 'Base model',
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
    config: 'Network configuration',
    proxy: 'Proxy settings',
    useProxy: 'Use proxy',
    github: {
      title: 'GitHub',
      accessible: 'Accessible',
      inaccessible: 'Inaccessible',
      selectUrl: 'Select the URL to access',
      urlRequired: 'GitHub proxy URL cannot be empty'
    },
    environment: 'Network environment',
    pipSource: 'PIP Source',
    pypi: {
      title: 'PyPI',
      accessible: 'Accessible',
      inaccessible: 'Inaccessible',
      selectUrl: 'Select the URL to access',
      urlRequired: 'PIP source URL cannot be empty'
    },
    huggingface: {
      title: 'HuggingFace',
      accessible: 'Accessible',
      inaccessible: 'Inaccessible',
      selectUrl: 'Select the URL to access',
      urlRequired: 'Hugging Face endpoint URL cannot be empty'
    },
    checkNetwork: 'Check',
    loading: 'Loading configuration...',
    networkTest: 'Network test result',
    canAccess: 'can access',
    cannotAccess: 'cannot access',
    saveSuccess: 'Configuration saved successfully',
    saveError: 'Failed to save configuration',
    checkingLog: 'Network Check Logs',
    checkStatus: 'Network Status Overview',
    accessible: 'Accessible',
    inaccessible: 'Inaccessible',
    checkLogs: 'Check Logs',
    loadingLogs: 'Loading logs...',
    noLogs: 'No logs available',
    forceCheck: 'Force Re-check',
    error: 'Error',
    warning: 'Warning',
    success: 'Success',
    fetchConfigError: 'Failed to fetch network configuration',
    checkNetworkError: 'Failed to check network status'
  },
  python: {
    dependencies: 'Python dependencies',
    installPackage: 'Install package',
    packageName: 'Package name',
    version: 'Version',
    status: 'Status',
    action: 'Action',
    environmentManagement: 'Python dependency management',
    tabs: {
      dependencies: 'Python dependencies',
      analysis: 'Dependency analysis'
    },
    errors: {
      installationError: 'Installation error',
      serverErrorCauses: 'Internal server errors may be caused by:',
      envConfigProblem: 'Python environment configuration issues - check virtual system or system environment',
      permissionProblem: 'Permission issues - insufficient permissions for current user to install packages',
      networkProblem: 'Network issues - unable to connect to PyPI source',
      dependencyConflict: 'Dependency conflicts - may conflict with other installed packages',
      installTips: 'To install Python packages:',
      useVirtualEnv: 'Using virtual environment',
      useUserInstall: 'Using user-level installation'
    },
    installedPackages: {
      title: 'Installed Python packages',
      subtitle: 'Python packages installed in local environment',
      search: 'Search Python packages',
      install: 'Install new package',
      refresh: 'Refresh',
      tableCols: {
        name: 'Package name',
        version: 'Version',
        actions: 'Actions'
      },
      pagination: {
        rowsPerPage: 'Records per page',
        range: '{start}-{end} of {total}'
      },
      dialog: {
        install: {
          title: 'Install new package',
          packageName: 'Package name',
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
      title: 'Plugin dependency analysis',
      subtitle: 'Automatically check the installation of Python libraries required by installed plugins',
      analyze: 'Analyze now',
      pluginsColumn: 'Plugins',
      dependenciesColumn: 'Dependency list',
      fixAll: 'Fix all',
      fix: 'Fix',
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
      viewLogs: 'View logs',
      viewResetLogs: 'View reset logs',
      reset: 'Wipe and restore'
    },
    logs: {
      title: 'ComfyUI logs',
      loading: 'Loading logs...',
      refresh: 'Refresh logs',
      download: 'Download logs',
      request_start: 'Received request to start ComfyUI',
      already_running: 'ComfyUI is already running',
      attempting_start: 'Attempting to start ComfyUI process...',
      executing_command: 'Executing command: bash /runner-scripts/entrypoint.sh',
      captured_pid: 'Captured real ComfyUI PID: {pid}',
      process_exited: 'Startup script process exited, exit code: {code}, signal: {signal}',
      process_error: 'Startup script process error: {message}',
      waiting_startup: 'Waiting for ComfyUI to start, attempt {retry}/{maxRetries}'
    },
    dialog: {
      missingModelsTitle: 'Missing essential models',
      missingModelsMessage: 'You have not installed all the essential models. This may cause ComfyUI to fail to generate images properly. Do you want to continue starting?',
      rememberChoice: 'Remember my choice',
      confirmStart: 'Start anyway',
      installModels: 'Install models'
    },
    gpuMode: {
      independent: 'Standalone Mode',
      shared: 'Shared Mode'
    }
  },
  modelsPage: {
    title: 'Model management',
    modelLibrary: 'Model library',
    operationHistory: 'Operation history',
    openModelDir: 'Open model directory',
    customDownload: 'Custom Download'
  },
  packageInstall: {
    title: 'Package installation',
    essentialPackage: 'Essential model package',
    popular: 'Popular',
    outOfPrint: 'Out of print',
    essentialModelsDesc: 'Contains the basic models required for ComfyUI to work',
    download: 'View',
    controlNetPackage: 'ControlNet Model Package',
    controlNetModelsDesc: 'Contains all models required for ControlNet',
    framePackPackage: 'FramePack Video Generation Package',
    framePackModelsDesc: 'Contains core models and workflows for video generation'
  },
  installedModelsCard: {
    installedModels: 'Installed models',
    installedCount: 'Installed { installedModelsCount } models',
    storageUsed: 'Storage used: { totalStorageUsed }',
    searchPlaceholder: 'Search models...',
    scanModels: 'Scan models',
    refresh: 'Refresh',
    confirmDelete: 'Confirm model deletion',
    deleteMessage: 'Are you sure you want to delete model "{ selectedModel?.name }"? This operation is irreversible.',
    modelInfo: 'Model details',
    unknown: 'Unknown',
    viewDetails: 'View details',
    deleteModel: 'Delete model',
    modelName: 'Name',
    modelType: 'Type',
    modelSize: 'Size',
    installedDate: 'Installation date',
    path: 'Path',
    columns: {
      name: 'Name',
      type: 'Type',
      size: 'Size',
      mode: 'Base',
      source: 'Source',
      description: 'Description',
      actions: 'Actions'
    }
  },
  optionalModels: {
    title: 'Available models',
    subtitle: 'Browse available models on HuggingFace',
    searchPlaceholder: 'Search models...',
    databaseSource: 'Data source',
    refresh: 'Refresh',
    dataSource: {
      cache: 'Cache (1 day)',
      local: 'Local',
      remote: 'Remote'
    },
    tabs: {
      all: 'All',
      sd: 'SD models',
      lora: 'LoRA',
      controlnet: 'ControlNet',
      vae: 'VAE',
      upscaler: 'Upscalers'
    },
    columns: {
      name: 'Name',
      type: 'Type',
      size: 'Size',
      baseModel: 'Base model',
      source: 'Source',
      description: 'Description',
      actions: 'Actions'
    },
    modelTypes: {
      checkpoint: 'SD model',
      vae: 'VAE',
      vae_approx: 'Preview Decoder',
      lora: 'LoRA',
      controlnet: 'ControlNet',
      upscaler: 'Upscaler',
      embedding: 'Embedding',
      ipadapter: 'IP-Adapter',
      motion: 'Motion model',
      facerestore: 'Face restore',
      detector: 'Detector',
      segmentation: 'Segmentation',
      other: 'Other',
      taesd: 'TAESD Decoder',
      deepbump: 'Normal Map Gen',
      zero123: '3D Recon Model',
      diffusion_model: 'Diffusion Model',
      clip: 'CLIP Model'
    },
    noModelsFound: 'No matching models found',
    loadingModels: 'Loading models...',
    download: {
      source: {
        title: 'Download source',
        mirror: 'HuggingFace China mirror',
        official: 'HuggingFace official'
      },
      progress: '{percentage}% | {speed}',
      installComplete: 'Model {model} installation completed',
      installFailed: 'Model download failed: {error}',
      startInstall: 'Starting to install model: {model}',
      refreshing: 'Refreshing model list...'
    },
    actions: {
      viewDetails: 'View details',
      install: 'Install',
      installed: 'Installed'
    },
    dialog: {
      confirmTitle: 'Confirm installation',
      confirmMessage: 'Are you sure you want to install model "{model}"?',
      cancel: 'Cancel',
      confirm: 'Confirm',
      modelDetails: 'Model details',
      close: 'Close'
    },
    pagination: {
      rowsPerPage: 'Rows per page',
      of: '{from}-{to} of {total}'
    },
    notifications: {
      fetchFailed: 'Failed to fetch model list',
      noTaskId: 'Server did not return a valid task ID',
      unknownError: 'Unknown error',
      downloadFailed: 'Download failed: {error}'
    }
  },
  downloadHistory: {
    title: 'Model download history',
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
      speed: 'Average speed',
      status: 'Status',
      actions: 'Actions'
    },
    actions: {
      deleteRecord: 'Delete this record'
    },
    dialog: {
      confirmClear: {
        title: 'Confirm clearing',
        message: 'Are you sure you want to clear all download history? This action cannot be undone.'
      },
      confirmDelete: {
        title: 'Confirm deleting',
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
    title: 'Plugin management',
    tabs: {
      pluginLibrary: 'Plugin library',
      operationHistory: 'Operation history',
      customInstall: 'Custom Install'
    },
    actions: {
      updateAll: 'Update all plugins',
      openDirectory: 'Open plugin directory',
      install: 'Install',
      uninstall: 'Uninstall',
      enable: 'Enable',
      disable: 'Disable',
      showInfo: 'Details',
      refresh: 'Refresh',
      clearFilters: 'Clear filters',
      loadMore: 'Load More',
      search: 'Search',
      retryInstall: 'Retry installation',
      visitGithub: 'Visit GitHub'
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
      notInstalled: 'Not installed',
      disabled: 'Disabled',
      enabled: 'Enabled',
      all: 'All'
    },
    history: {
      title: 'Operation history',
      clearHistory: 'Clear history',
      refresh: 'Refresh',
      pluginId: 'Plugin ID',
      operationType: 'Operation type',
      startTime: 'Start time',
      endTime: 'End time',
      duration: 'Duration',
      time: 'Time',
      status: 'Status',
      actions: 'Actions',
      viewLogs: 'View logs',
      deleteRecord: 'Delete record',
      retry: 'Retry',
      logs: 'Operation logs',
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
      updateAllFail: 'Failed to update plugins. Please try again',
      fetchFail: 'Failed to fetch plugin list. Please try again later',
      progressRequestFail: 'Progress request failed: {message}',
      folderOpenFail: 'Failed to open plugin directory'
    },
    dialog: {
      operationLogs: 'Operation logs',
      pluginInfo: 'Plugin information',
      logsFetchFail: 'Failed to fetch log details',
      details: {
        name: 'Name',
        description: 'Description',
        author: 'Author',
        version: 'Version',
        github: 'GitHub',
        installed: 'Installation status',
        installedOn: 'Installation date',
        status: 'Status',
        tags: 'Tags'
      },
      operationLogsDialog: {
        title: 'Operation Log Details',
        plugin: 'Plugin',
        operationType: 'Operation Type',
        status: 'Status',
        startTime: 'Start Time',
        endTime: 'End Time',
        detailedLogs: 'Detailed Logs',
        downloadLogs: 'Download Logs',
        noLogs: 'No log information',
        operationResult: 'Operation Result',
        unknown: 'Unknown'
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
    },
    customInstall: {
      title: 'Custom Plugin Installation',
      subtitle: 'Install plugins directly from GitHub repositories',
      githubUrlLabel: 'GitHub URL',
      githubUrlHint: 'URL of the GitHub repository (e.g., https://github.com/username/repo)',
      branchLabel: 'Branch/Tag (Optional)',
      branchHint: 'Leave empty for default branch (usually main or master)',
      urlRequired: 'GitHub URL is required',
      installButton: 'Install Plugin',
      startedInstall: 'Started installing plugin from {url}',
      installSuccess: 'Successfully installed plugin {name}',
      installFailed: 'Failed to install plugin',
      recentInstalls: 'Recent Installations'
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
    loadMore: 'Scroll down to load more',
    noMoreData: 'No more data',
    retry: 'Retry',
    invalidData: 'Invalid data format returned',
    tryingDirectAccess: 'Trying to access Civitai directly...',
    switchedToDirectMode: 'Switched to direct Civitai access mode',
    fetchError: 'Failed to fetch model list. Check your network connection and try again',
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
      title: 'Confirm wipe and restore',
      message: 'Do you really want to restore ComfyUI? This operation will:',
      effects: {
        settings: 'Erase all user configurations',
        plugins: 'Remove all installed plugins',
        workflows: 'Reset all workflows and projects',
        models: 'Downloaded models will be preserved'
      },
      confirmButton: 'Wipe and restore'
    },
    dialog2: {
      warning: 'This operation is irreversible. Please proceed with caution',
      restartTip: 'If you are experiencing temporary issues, you can try restarting ComfyUI instead of completely resetting it.',
      confirmInput: 'Please type \'CONFIRM\' to proceed with this operation'
    },
    progress: {
      title: 'Restoring...',
      starting: 'Starting reset. Please wait...',
      failed: 'Reset failed',
      error: 'Reset error',
      unknownError: 'Unknown error'
    },
    complete: {
      title: 'Restore completed!',
      message: 'ComfyUI has been successfully restored to its initial state.',
      restartTip: 'It is recommended to restart the application to ensure all changes take effect.',
      backButton: 'Back to Home',
      restartButton: 'Restart application'
    },
    logs: {
      title: 'Logs for last reset',
      noLogs: 'No reset logs found'
    },
    hardReset: {
      link: 'Normal restore not working? Try hard reset',
      title: 'Hard Reset ComfyUI',
      message: 'Hard reset will completely reset ComfyUI to its initial state',
      warning: 'Warning: This operation will clear the following content:',
      effects: {
        settings: 'All user settings',
        plugins: 'All custom nodes and plugins',
        workflows: 'All workflows',
        files: 'All files except models'
      },
      preserved: 'Only files in the models, output, and input directories will be preserved',
      cancel: 'Cancel',
      confirm: 'Hard Reset',
      progressTitle: 'Hard Reset Progress',
      completeTitle: 'Hard Reset Completed',
      completeMessage: 'ComfyUI has been completely reset'
    }
  },
  resourcePack: {
    loading: 'Loading...',
    loadingPackDetails: 'Loading resource pack details...',
    loadError: 'Failed to load resource pack',
    retry: 'Retry',
    contents: 'Package Contents',
    totalResources: '{count} resources in total',
    id: 'ID',
    version: 'Version',
    author: 'Author',
    website: 'Website',
    install: 'Install package',
    close: 'Close',
    cancel: 'Cancel installation',
    installationProgress: 'Installation progress',
    overallProgress: 'Overall progress',
    startTime: 'Start time',
    endTime: 'End time',
    elapsed: 'Elapsed time',
    completedResources: 'Completed resources',
    resourcesStatus: 'Resource status',
    resourcesList: 'Resource list',
    type: 'Type',
    size: 'Size'
  },
  resourcePacks: {
    title: 'Resource packages',
    subtitle: 'Install all resource packages in one click',
    loading: 'Loading resource packages...',
    noPacks: 'No resource packages available',
    refresh: 'Refresh',
    resources: '{count} resources',
    author: 'Author',
    view: 'View details'
  },
  customModelDownload: {
    title: 'Custom Model Download',
    subtitle: 'Download custom models from Hugging Face',
    modelUrlLabel: 'Model URL',
    modelUrlHint: 'Enter Hugging Face model URL (e.g.: https://huggingface.co/model-name/blob/main/model.safetensors)',
    urlRequired: 'Please enter model URL',
    modelDirLabel: 'Destination folder',
    modelDirHint: 'Select where to save the model',
    dirRequired: 'Please select destination folder',
    downloadButton: 'Download Model',
    cancelButton: 'Cancel',
    downloadStatus: 'Download Progress',
    speed: 'Download Speed',
    errorOccurred: 'Download Error',
    downloadCompleted: 'Download Completed',
    downloadStarted: 'Starting download...',
    customDir: 'Custom Directory',
    customDirLabel: 'Directory Name',
    customDirHint: 'Enter a custom directory name',
    customDirRequired: 'Please enter a directory name',
    allFieldsRequired: 'Please fill in all required fields'
  }
};
