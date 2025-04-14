export default {
  common: {
    title: 'ComfyUI 管理器',
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
      pageInfo: '第{{from}}到{{to}}条，共{{total}}条'
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
    action: '操作'
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
    installedCount: '已安装 {{ installedModelsCount }} 个模型',
    storageUsed: '占用存储空间: {{ totalStorageUsed }}',
    searchPlaceholder: '搜索模型...',
    scanModels: '扫描模型',
    refresh: '刷新',
    confirmDelete: '确认删除模型',
    deleteMessage: '您确定要删除模型 "{{ selectedModel?.name }}" 吗？此操作不可撤销。',
    modelInfo: '模型详情',
    unknown: '未知'
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
      pageInfo: '第{{currentPage}}页 / 共{{totalPages}}页 (共{{total}}个插件)'
    },
    status: {
      installed: '已安装',
      notInstalled: '未安装',
      disabled: '已禁用',
      enabled: '已启用',
      all: '全部'
    },
    history: {
      pluginId: '插件ID',
      operationType: '操作类型',
      time: '时间',
      status: '状态',
      actions: '操作',
      viewLogs: '查看日志',
      retry: '重试',
      logs: '操作日志'
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
    }
  }
};