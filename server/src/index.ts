import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import { ComfyUIController } from './controllers/comfyui.controller';
import { ModelsController } from './controllers/models.controller';
import { PluginsController } from './controllers/plugins.controller';
import { SystemController } from './controllers/system.controller';

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

// ComfyUI状态管理路由
router.get('/api/status', (ctx) => comfyuiController.getStatus(ctx));
router.post('/api/start', (ctx) => comfyuiController.startComfyUI(ctx));
router.post('/api/stop', (ctx) => comfyuiController.stopComfyUI(ctx));

// 模型管理路由
router.get('/api/models', modelsController.getAllModels);
router.post('/api/models/download', modelsController.downloadModel);
router.post('/api/models/download-all', modelsController.downloadAllModels);
router.get('/api/models/progress/:taskId', modelsController.getModelProgress);

// 插件管理路由
router.get('/api/plugins', pluginsController.getAllPlugins);
router.post('/api/plugins/install', pluginsController.installPlugin);
router.post('/api/plugins/uninstall', pluginsController.uninstallPlugin);
router.get('/api/plugins/progress/:taskId', pluginsController.getPluginProgress);

// 系统管理路由
router.post('/api/reset', systemController.resetSystem);
router.get('/api/reset/progress/:taskId', systemController.getResetProgress);
router.post('/api/restart', systemController.restartApp);

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