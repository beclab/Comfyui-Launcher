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
router.get('/api/plugins/history', pluginsController.getOperationHistory.bind(pluginsController));
router.get('/api/plugins/logs/:taskId', pluginsController.getOperationLogs.bind(pluginsController));
router.post('/api/plugins/history/clear', pluginsController.clearOperationHistory.bind(pluginsController));

// 系统管理路由
router.post('/api/reset', systemController.resetSystem);
router.get('/api/reset/progress/:taskId', systemController.getResetProgress);
router.post('/api/restart', systemController.restartApp);

// Python依赖管理路由
router.get('/api/python/pip-source', (ctx) => getPipSource(ctx));
router.post('/api/python/pip-source', (ctx) => setPipSource(ctx));
router.get('/api/python/packages', (ctx) => getInstalledPackages(ctx));
router.post('/api/python/packages/install', (ctx) => installPackage(ctx));
router.post('/api/python/packages/uninstall', (ctx) => uninstallPackage(ctx));
router.get('/api/python/plugins/dependencies', (ctx) => analyzePluginDependencies(ctx));
router.post('/api/python/plugins/fix-dependencies', (ctx) => fixPluginDependencies(ctx));

// 使用路由
app.use(router.routes());
app.use(router.allowedMethods());

// 启动服务器
const PORT = process.env.PORT || 3000;
console.log('======= 后端服务器正在启动 =======');
app.listen(PORT, () => {
  console.log('\n');
  console.log('==================================');
  console.log(`ComfyUI管理器服务器已启动，监听端口 ${PORT}`);
  console.log('==================================');
  console.log('\n');
});

// 在适当的位置添加以下代码，例如在主应用程序启动后
const comfyUIProxyServer = createComfyUIProxy();
comfyUIProxyServer.listen(config.comfyui.proxyPort, () => {
  console.log(`ComfyUI代理服务器运行在端口 ${config.comfyui.proxyPort}`);
}); 