export default {
  common: {
    title: 'ComfyUI Launcher',
    cancel: '取消',
    confirm: '确认',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    remove: '移除',
    back: '返回',
    next: '下一步',
    settings: '设置',
    language: '语言'
  },
  menu: {
    navigation: '导航菜单',
    home: '首页',
    modelManagement: '模型管理',
    pluginManagement: '插件管理',
    pythonDependencies: 'python依赖管理',
    networkConfig: '网络配置',
    discovery: '探索发现'
  },
  models: {
    essentialModels: '基础模型',
    downloadModels: '下载模型',
    localModels: '本地模型',
    modelName: '模型名称',
    modelSize: '大小',
    modelType: '类型',
    modelAction: '操作',
    modelDetails: {
      name: '名称',
      type: '类型',
      size: '大小',
      baseModel: '底模',
      source: '来源',
      description: '说明',
      noDescription: '无描述'
    },
    pagination: {
      rowsPerPage: '每页记录数',
      pageInfo: '第{from}到{to}条，共{total}条'
    }
  },
  network: {
    config: '网络配置',
    proxy: '代理设置',
    useProxy: '使用代理',
    github: {
      title: 'GitHub',
      accessible: '可访问',
      inaccessible: '访问超时',
      selectUrl: '选择访问的 URL 地址'
    },
    pypi: {
      title: 'PyPI',
      accessible: '可访问',
      inaccessible: '访问超时',
      selectUrl: '选择访问的 URL 地址'
    },
    huggingface: {
      title: 'HuggingFace',
      accessible: '可访问',
      inaccessible: '检测中',
      selectUrl: '选择访问的 URL 地址'
    },
    environment: '网络环境',
    checkNetwork: '检测',
    loading: '加载配置中...',
    networkTest: '网络检测结果',
    canAccess: '可以访问',
    cannotAccess: '无法访问',
    saveSuccess: '配置已保存',
    saveError: '保存配置失败'
  },
  python: {
    dependencies: 'Python依赖',
    installPackage: '安装包',
    packageName: '包名',
    version: '版本',
    status: '状态',
    action: '操作',
    environmentManagement: '环境管理',
    tabs: {
      dependencies: 'Python依赖库',
      analysis: '依赖分析'
    },
    errors: {
      installationError: '安装错误',
      serverErrorCauses: '服务器内部错误可能是由以下原因导致：',
      envConfigProblem: 'Python环境配置问题 - 可能是虚拟环境或系统环境配置有误',
      permissionProblem: '权限问题 - 当前用户可能没有安装包的权限',
      networkProblem: '网络问题 - 无法连接到PyPI源',
      dependencyConflict: '依赖冲突 - 可能与已安装的其他包存在版本冲突',
      installTips: '如需安装Python包：',
      useVirtualEnv: '使用虚拟环境',
      useUserInstall: '使用用户级安装'
    },
    installedPackages: {
      title: '已安装Python库',
      subtitle: '本地Python环境已安装的Python库',
      search: '搜索Python库',
      install: '安装新库',
      refresh: '刷新',
      tableCols: {
        name: '库名称',
        version: '版本',
        actions: '操作'
      },
      pagination: {
        rowsPerPage: '每页记录数',
        range: '第{start}-{end}条，共{total}条'
      },
      dialog: {
        install: {
          title: '安装新库',
          packageName: '库名称',
          version: '版本 (可选)',
          versionHint: '例如: ==1.0.0, >=2.0.0, 留空安装最新版本',
          cancel: '取消',
          confirmInstall: '安装'
        },
        uninstall: {
          title: '确认卸载',
          message: '确定要卸载 {name} 吗？这可能会影响依赖该库的插件。',
          cancel: '取消',
          confirmUninstall: '卸载'
        }
      },
      notifications: {
        loadFailed: '加载已安装库失败: {message}',
        installSuccess: '{name} 安装成功',
        installFailed: '安装失败: {message}',
        uninstallSuccess: '{name} 已卸载',
        uninstallFailed: '卸载失败: {message}',
        upgradeSuccess: '{name} 已升级',
        upgradeFailed: '升级失败: {message}'
      }
    },
    pluginDependencies: {
      title: '插件依赖分析',
      subtitle: '自动分析已安装插件依赖的Python库是否安装正确',
      analyze: '立即分析',
      pluginsColumn: '插件',
      dependenciesColumn: '依赖库列表',
      fixAll: '一键修复',
      versionRequired: '版本要求:',
      install: '安装',
      installed: '已安装',
      analyzing: '正在分析依赖...',
      noDependenciesFound: '没有找到依赖库'
    }
  },
  comfyuiStatus: {
    title: 'ComfyUI',
    running: '运行中',
    stopped: '已停止',
    version: {
      comfyui: 'comfyui',
      frontend: '前端',
      launcher: '启动器',
      gpu: 'GPU'
    },
    buttons: {
      open: '打开',
      stop: '停止',
      start: '启动'
    },
    menu: {
      viewLogs: '查看日志',
      viewResetLogs: '查看重置日志',
      reset: '抹掉并还原'
    },
    logs: {
      title: 'ComfyUI 日志',
      loading: '正在加载日志...',
    refresh: '刷新日志',
    download: '下载日志'
    },
    dialog: {
      missingModelsTitle: '缺少基础模型',
      missingModelsMessage: '您尚未安装所有必要的基础模型，这可能导致ComfyUI无法正常生成图像。是否继续启动？',
      rememberChoice: '记住我的选择，下次无需弹窗确认',
      confirmStart: '仍然启动',
      installModels: '安装模型'
    }
  },
  folderAccess: {
    fileType: '文件类',
    rootDir: '根目录',
    pluginDir: '插件目录',
    modelDir: '模型目录',
    outputDir: '输出目录',
    inputDir: '输入目录',
// 下面是将 'rootDirHint' 的值从英文翻译为中文后的代码
    rootDirHint: 'ComfyUI的根目录',
    outputDirHint: 'ComfyUI的输出目录',
    inputDirHint: 'ComfyUI的输入目录',
    installed: '已安装',
    available: '可用',
    open: '打开'
  },
  modelsPage: {
    title: '模型管理',
    modelLibrary: '模型库',
    operationHistory: '操作历史',
    openModelDir: '打开模型目录'
  },
  packageInstall: {
    title: '资源包安装',
    essentialPackage: '基础模型包',
    popular: '热门',
    outOfPrint: '绝版',
    essentialModelsDesc: '包含ComfyUI能工作所需的基础模型',
    download: '下载',
    controlNetPackage: 'ControlNet模型包',
    controlNetModelsDesc: '包含ControlNet所需全部模型'
  },
  installedModelsCard: {
    installedModels: '已安装模型',
    installedCount: '已安装 { installedModelsCount } 个模型',
    storageUsed: '占用存储空间: { totalStorageUsed }',
    searchPlaceholder: '搜索模型...',
    scanModels: '扫描模型',
    refresh: '刷新',
    confirmDelete: '确认删除模型',
    deleteMessage: '您确定要删除模型 "{ selectedModel?.name }" 吗？此操作不可撤销。',
    modelInfo: '模型详情',
    unknown: '未知',
    viewDetails: '查看详情',
    deleteModel: '删除模型',
    modelName: '名称',
    modelType: '类型',
    modelSize: '大小',
    installedDate: '安装日期',
    path: '路径'
  },
  optionalModels: {
    title: '可用模型',
    subtitle: '查看HuggingFace上的可用模型',
    searchPlaceholder: '搜索模型...',
    databaseSource: '存储数据源',
    refresh: '刷新',
    dataSource: {
      cache: '通道 (1天缓存)',
      local: '本地',
      remote: '远程'
    },
    tabs: {
      all: '全部',
      sd: 'SD 模型',
      lora: 'LORA',
      controlnet: 'CONTROLNET',
      vae: 'VAE',
      upscaler: '超分辨率'
    },
    columns: {
      name: '名称',
      type: '类型',
      size: '大小',
      baseModel: '底模',
      source: '来源',
      description: '说明',
      actions: '操作'
    },
    modelTypes: {
      checkpoint: 'SD模型',
      vae: 'VAE',
      vae_approx: '预览解码器',
      lora: 'LoRA',
      controlnet: 'ControlNet',
      upscaler: '超分模型',
      embedding: '词嵌入',
      ipadapter: 'IP-Adapter',
      motion: '动画模型',
      facerestore: '人脸修复',
      detector: '检测器',
      segmentation: '分割模型',
      other: '其他'
    },
    noModelsFound: '没有找到匹配的模型',
    loadingModels: '加载模型中...',
    download: {
      source: {
        title: '下载源',
        mirror: 'HuggingFace中国镜像站',
        official: 'HuggingFace官方'
      },
      progress: '{percentage}% | {speed}',
      installComplete: '模型 {model} 安装完成',
      installFailed: '模型下载失败: {error}',
      startInstall: '开始安装模型: {model}',
      refreshing: '正在刷新模型列表...'
    },
    actions: {
      viewDetails: '查看详情',
      install: '安装',
      installed: '已安装'
    },
    dialog: {
      confirmTitle: '确认安装',
      confirmMessage: '您确定要安装模型"{model}"吗？',
      cancel: '取消',
      confirm: '确定',
      modelDetails: '模型详情',
      close: '关闭'
    },
    pagination: {
      rowsPerPage: '每页记录数',
      of: '第{from}-{to}条，共{total}条'
    }
  },
  downloadHistory: {
    title: '模型下载记录',
    clearHistory: '清空历史记录',
    refresh: '刷新',
    loading: '加载历史记录...',
    noHistory: '暂无下载历史记录',
    columns: {
      modelName: '名称',
      startTime: '时间',
      source: '来源',
      fileSize: '大小',
      duration: '耗时',
      speed: '平均速度',
      status: '状态',
      actions: '操作'
    },
    actions: {
      deleteRecord: '删除此记录'
    },
    dialog: {
      confirmClear: {
        title: '确认清空',
        message: '确定要清空所有下载历史记录吗？此操作不可恢复。'
      },
      confirmDelete: {
        title: '确认删除',
        message: '确定要删除"{modelName}"的下载记录吗？'
      },
      success: {
        cleared: '历史记录已清空',
        deleted: '记录已删除'
      },
      error: {
        clearFailed: '清空历史记录失败',
        deleteFailed: '删除记录失败'
      }
    },
    status: {
      success: '成功',
      failed: '失败',
      canceled: '已取消',
      downloading: '下载中',
      unknown: '未知'
    },
    time: {
      unknown: '未知时间',
      seconds: '{count}秒',
      minutes: '{minutes}分{seconds}秒',
      hours: '{hours}小时{minutes}分'
    },
    size: {
      unknown: '未知大小'
    },
    speed: {
      unknown: '未知速度'
    }
  },
  plugins: {
    title: '插件管理',
    tabs: {
      pluginLibrary: '插件库',
      operationHistory: '操作历史'
    },
    actions: {
      updateAll: '更新全部插件',
      openDirectory: '打开插件目录',
      install: '安装',
      uninstall: '卸载',
      enable: '启用',
      disable: '禁用',
      showInfo: '详细信息',
      refresh: '刷新',
      clearFilters: '清除筛选',
      loadMore: '加载更多',
      search: '搜索',
      retryInstall: '重试安装'
    },
    loadingPlugins: '加载插件列表...',
    noPluginsFound: '未找到匹配的插件',
    availablePlugins: '可用插件',
    registeredPlugins: '来自ComfyUI Manager上注册的可用插件',
    searchPlaceholder: '搜索插件...',
    refreshTooltip: '刷新插件列表',
    columns: {
      id: 'ID',
      name: '名称',
      version: '版本',
      status: '状态',
      author: '作者',
      description: '描述',
      actions: '操作',
      tags: '标签'
    },
    pagination: {
      rowsPerPage: '每页显示',
      pageInfo: '第{currentPage}页 / 共{totalPages}页 (共{total}个插件)'
    },
    status: {
      installed: '已安装',
      notInstalled: '未安装',
      disabled: '已禁用',
      enabled: '已启用',
      all: '全部'
    },
    history: {
      title: '操作历史',
      clearHistory: '清除历史',
      refresh: '刷新',
      pluginId: '插件ID',
      operationType: '操作类型',
      startTime: '开始时间',
      endTime: '结束时间',
      duration: '耗时',
      time: '时间',
      status: '状态',
      actions: '操作',
      viewLogs: '查看日志',
      deleteRecord: '删除记录',
      retry: '重试',
      logs: '操作日志',
      noHistory: '暂无操作历史记录',
      running: '进行中',
      success: '成功',
      failed: '失败',
      milliseconds: '毫秒',
      seconds: '{count}秒',
      minutes: '{minutes}分{seconds}秒'
    },
    notifications: {
      installSuccess: '安装 {name} 成功!',
      installFail: '安装 {name} 失败: {message}',
      uninstallSuccess: '卸载 {name} 成功!',
      uninstallFail: '卸载 {name} 失败: {message}',
      enableSuccess: '启用 {name} 成功!',
      enableFail: '启用 {name} 失败: {message}',
      disableSuccess: '禁用 {name} 成功!',
      disableFail: '禁用 {name} 失败: {message}',
      updateAllStart: '正在检查更新...',
      updateAllSuccess: '已更新 {count} 个插件',
      updateAllNoPlugins: '没有已安装的插件可更新',
      updateAllFail: '更新插件失败，请稍后重试',
      fetchFail: '获取插件列表失败，请稍后重试',
      progressRequestFail: '进度请求失败: {message}',
      folderOpenFail: '无法打开插件目录'
    },
    dialog: {
      operationLogs: '操作日志',
      pluginInfo: '插件信息',
      logsFetchFail: '无法获取日志详情',
      details: {
        name: '名称',
        description: '描述',
        author: '作者',
        version: '版本',
        github: 'GitHub',
        installed: '安装状态',
        installedOn: '安装时间',
        status: '状态',
        tags: '标签'
      }
    },
    progress: {
      preparing: '正在准备安装 {name}...',
      installing: '安装中...',
      uninstalling: '正在卸载 {name}...',
      enabling: '启用中...',
      disabling: '禁用中...'
    },
    operations: {
      install: '安装',
      uninstall: '卸载',
      disable: '禁用',
      enable: '启用',
      unknown: '未知'
    },
    pluginStatus: {
      unknown: '未知'
    }
  },
  discovery: {
    title: '探索发现',
    inspireFrom: '在Civitai.com上发现更多灵感',
    tabs: {
      latestModels: '最新模型',
      hotModels: '最火模型',
      latestWorkflows: '最新工作流',
      hotWorkflows: '最火工作流'
    },
    loading: '加载中',
    loadMore: '上拉加载更多',
    noMoreData: '没有更多数据了',
    retry: '重试',
    invalidData: '返回数据格式不正确',
    tryingDirectAccess: '正在尝试直接访问Civitai...',
    switchedToDirectMode: '已切换到直接访问Civitai模式',
    fetchError: '获取模型列表失败，请检查网络连接后重试',
    viewingModel: '查看模型 ID: {modelId}',
    noVersionsAvailable: '没有可用的模型版本',
    startDownloading: '开始下载模型: {model}',
    unknownDate: '未知日期',
    invalidDate: '日期格式错误',
    noDescription: '暂无描述',
    unknownAuthor: '未知作者',
    pagination: {
      page: '页码: {current}/{total}'
    }
  },
  reset: {
    dialog1: {
      title: '确认抹掉并还原',
      message: '您真的要还原ComfyUI吗？此操作会：',
      effects: {
        settings: '抹掉所有用户配置',
        plugins: '删除所有已安装插件',
        workflows: '重置所有工作流和项目',
        models: '已下载的模型仍会被保留'
      },
      confirmButton: '抹掉并还原'
    },
    dialog2: {
      warning: '此操作不可逆，请谨慎操作',
      restartTip: '如果您遇到临时问题，可以尝试重启ComfyUI而不是完全重置。',
      confirmInput: '请输入 \'CONFIRM\' 确认此操作'
    },
    progress: {
      title: '正在还原...',
      starting: '开始重置操作，请等待...',
      failed: '重置操作失败',
      error: '重置操作错误',
      unknownError: '未知错误'
    },
    complete: {
      title: '还原操作已完成！',
      message: 'ComfyUI已被成功还原至初始状态。',
      restartTip: '建议重启应用以确保所有更改生效。',
      backButton: '返回主页',
      restartButton: '重启应用'
    },
    logs: {
      title: '上次重置操作日志',
      noLogs: '没有找到重置日志记录'
    }
  },
  resourcePack: {
    loading: '加载中...',
    loadingPackDetails: '正在加载资源包详情...',
    loadError: '加载资源包失败',
    retry: '重试',
    contents: '包内容',
    totalResources: '共 {count} 个资源',
    id: 'ID',
    version: '版本',
    author: '作者',
    website: '网站',
    install: '安装资源包',
    close: '关闭',
    cancel: '取消安装',
    installationProgress: '安装进度',
    overallProgress: '总体进度',
    startTime: '开始时间',
    endTime: '结束时间',
    elapsed: '已用时间',
    completedResources: '已完成资源',
    resourcesStatus: '资源状态',
    resourcesList: '资源列表',
    type: '类型',
    size: '大小'
  },
  resourcePacks: {
    title: '资源包',
    subtitle: '提供一键安装的资源包合集',
    loading: '正在加载资源包列表...',
    noPacks: '没有可用的资源包',
    refresh: '刷新',
    resources: '{count} 个资源',
    author: '作者',
    view: '查看详情'
  }
};