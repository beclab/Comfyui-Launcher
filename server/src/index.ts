import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import { ComfyUIController, createComfyUIProxy } from './controllers/comfyui.controller';
import { ModelsController } from './controllers/models.controller';
import { PluginsController } from './controllers/plugins.controller';
import { SystemController } from './controllers/system.controller';
import { EssentialModelsController } from './controllers/essential-models.controller';
import { config } from './config';
import {
  getPipSource,
  setPipSource,
  getInstalledPackages,
  installPackage,
  uninstallPackage,
  analyzePluginDependencies,
  fixPluginDependencies
} from './controllers/python.controller';
import civitaiController from './controllers/civitai.controller';
// 导入增强的日志记录工具
import logger, { i18nLogger } from './utils/logger';

// 设置日志语言
i18nLogger.setLocale('en'); // 修改默认语言为英文

const app = new Koa();
const router = new Router();

// 使用中间件
app.use(bodyParser());
app.use(cors());

// 控制器实例
const comfyuiController = new ComfyUIController();
const modelsController = new ModelsController();
const pluginsController = new PluginsController();
const systemController = new SystemController();
const essentialModelsController = new EssentialModelsController();

// ComfyUI状态管理路由
router.get('/api/status', (ctx) => comfyuiController.getStatus(ctx));
router.post('/api/start', (ctx) => comfyuiController.startComfyUI(ctx));
router.post('/api/stop', (ctx) => comfyuiController.stopComfyUI(ctx));
router.get('/api/comfyui/logs', (ctx) => comfyuiController.getLogs(ctx));
router.post('/api/comfyui/reset', (ctx) => comfyuiController.resetComfyUI(ctx));
router.get('/api/comfyui/reset-logs', (ctx) => comfyuiController.getResetLogs(ctx));

// 模型管理路由
router.get('/api/models', modelsController.getModels.bind(modelsController));
// router.post('/api/models/download', modelsController.downloadModel.bind(modelsController));
// router.get('/api/models/downloadByName/:modelName', modelsController.downloadModelByNameApi.bind(modelsController));
router.post('/api/models/delete', modelsController.deleteModel.bind(modelsController));
router.get('/api/models/installed', modelsController.getInstalledModels.bind(modelsController));
router.post('/api/models/scan', modelsController.scanModels.bind(modelsController));

router.post('/api/models/cancel-download', modelsController.cancelDownload.bind(modelsController));
// 模型管理路由 v2
router.post('/api/models/install/:modelName', modelsController.installModel.bind(modelsController));
router.get('/api/models/progress/:id', modelsController.getModelProgress.bind(modelsController));
// 下载历史
router.get('/api/models/download-history', modelsController.getDownloadHistory.bind(modelsController));
router.post('/api/models/download-history/clear', modelsController.clearDownloadHistory.bind(modelsController));
router.post('/api/models/download-history/delete', modelsController.deleteDownloadHistoryItem.bind(modelsController)); 

// 基础模型管理路由
router.get('/api/models/essential', essentialModelsController.getEssentialModels.bind(essentialModelsController));
router.post('/api/models/download-essential', essentialModelsController.downloadEssentialModels.bind(essentialModelsController));
router.get('/api/models/essential-status', essentialModelsController.getEssentialModelsStatus.bind(essentialModelsController));
router.get('/api/models/essential-progress/:id', essentialModelsController.getProgress.bind(essentialModelsController));
router.post('/api/models/cancel-essential', essentialModelsController.cancelDownload.bind(essentialModelsController));

// 插件管理路由
router.get('/api/plugins', (ctx) => pluginsController.getAllPlugins(ctx));
router.post('/api/plugins/install', (ctx) => pluginsController.installPlugin(ctx));
router.post('/api/plugins/uninstall', (ctx) => pluginsController.uninstallPlugin(ctx));
router.get('/api/plugins/progress/:taskId', (ctx) => pluginsController.getPluginProgress(ctx));
// 新增的插件启用/禁用路由
router.post('/api/plugins/disable', (ctx) => pluginsController.disablePlugin(ctx));
router.post('/api/plugins/enable', (ctx) => pluginsController.enablePlugin(ctx));
router.get('/api/plugins/refresh', (ctx) => pluginsController.refreshInstalledPlugins(ctx));

// 插件历史记录相关路由
router.get('/api/plugins/history', pluginsController.getPluginHistory.bind(pluginsController));
router.get('/api/plugins/logs/:taskId', pluginsController.getOperationLogs.bind(pluginsController));
router.post('/api/plugins/history/clear', pluginsController.clearPluginHistory.bind(pluginsController));
router.post('/api/plugins/history/delete', pluginsController.deletePluginHistoryItem.bind(pluginsController));

// Python依赖管理路由
router.get('/api/python/pip-source', (ctx) => getPipSource(ctx));
router.post('/api/python/pip-source', (ctx) => setPipSource(ctx));
router.get('/api/python/packages', (ctx) => getInstalledPackages(ctx));
router.post('/api/python/packages/install', (ctx) => installPackage(ctx));
router.post('/api/python/packages/uninstall', (ctx) => uninstallPackage(ctx));
router.get('/api/python/plugins/dependencies', (ctx) => analyzePluginDependencies(ctx));
router.post('/api/python/plugins/fix-dependencies', (ctx) => fixPluginDependencies(ctx));

// Civitai API 路由 - 注意路由顺序很重要!
// 特定路径的路由应该放在更通用的路由之前
router.get('/api/civitai/models/by-url', (ctx) => civitaiController.getLatestModelsByUrl(ctx));
router.get('/api/civitai/models/latest', (ctx) => civitaiController.getLatestModels(ctx));
router.get('/api/civitai/models/hot', (ctx) => civitaiController.getHotModels(ctx));
router.get('/api/civitai/models/:id', (ctx) => civitaiController.getModelDetails(ctx));
router.get('/api/civitai/download/models/:versionId', (ctx) => civitaiController.downloadModel(ctx));
router.get('/api/civitai/latest-workflows', (ctx) => civitaiController.getLatestWorkflows(ctx));
router.get('/api/civitai/hot-workflows', (ctx) => civitaiController.getHotWorkflows(ctx));

// 系统相关路由
router.get('/api/system/open-path', systemController.openPath.bind(systemController));
// 新增的网络状态检查和代理配置路由
router.get('/api/system/network-status', systemController.checkNetworkStatus.bind(systemController));
router.get('/api/system/network-config', systemController.getNetworkConfig.bind(systemController));
router.post('/api/system/pip-source', systemController.configurePipSource.bind(systemController));
router.post('/api/system/huggingface-endpoint', systemController.configureHuggingFaceEndpoint.bind(systemController));
router.post('/api/system/github-proxy', systemController.configureGithubProxy.bind(systemController));

// 使用路由
app.use(router.routes());
app.use(router.allowedMethods());

// 启动服务器
const PORT = process.env.PORT || 3000;
logger.t('server.start', { port: PORT }); // 使用翻译版本记录日志
app.listen(PORT, () => {
  logger.t('server.start', { port: PORT }); // 使用翻译版本记录日志
});

// 在适当的位置添加以下代码，例如在主应用程序启动后
const comfyUIProxyServer = createComfyUIProxy();
comfyUIProxyServer.listen(config.comfyui.proxyPort, () => {
  logger.t('server.proxy_start', { port: config.comfyui.proxyPort });
}); 