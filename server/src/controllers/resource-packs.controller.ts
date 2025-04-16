/**
 * 资源包管理控制器
 * 用于管理和安装包含多种资源类型的资源包
 */
import * as Koa from 'koa';
import * as path from 'path';
import * as fs from 'fs';
import { DownloadController } from './download.controller';
import { ModelsController } from './models.controller';
import { PluginsController } from './plugins.controller';
import { EssentialModel, DownloadProgress } from '../types/models.types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { downloadFile } from '../utils/download.utils';

// 资源类型枚举
export enum ResourceType {
  MODEL = 'model',
  PLUGIN = 'plugin',
  WORKFLOW = 'workflow',
  CUSTOM = 'custom'
}

// 资源包安装状态
export enum InstallStatus {
  PENDING = 'pending',
  DOWNLOADING = 'downloading',
  INSTALLING = 'installing',
  COMPLETED = 'completed',
  ERROR = 'error',
  SKIPPED = 'skipped',
  CANCELED = 'canceled'
}

// 基础资源接口
export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  description?: string;
  optional?: boolean; // 是否可选安装
}

// 模型资源接口
export interface ModelResource extends Resource {
  type: ResourceType.MODEL;
  url: string | { mirror: string; hf: string };
  dir: string; // 相对于ComfyUI模型目录的路径
  out: string; // 输出文件名
  essential?: boolean;
}

// 插件资源接口
export interface PluginResource extends Resource {
  type: ResourceType.PLUGIN;
  github: string;
  branch?: string;
}

// 工作流资源接口
export interface WorkflowResource extends Resource {
  type: ResourceType.WORKFLOW;
  url: string;
  filename: string; // 保存的文件名
}

// 自定义资源接口
export interface CustomResource extends Resource {
  type: ResourceType.CUSTOM;
  url: string;
  destination: string; // 目标保存路径
}

// 资源包接口
export interface ResourcePack {
  id: string;
  name: string;
  description?: string;
  author?: string;
  version?: string;
  tags?: string[];
  resources: (ModelResource | PluginResource | WorkflowResource | CustomResource)[];
}

// 资源安装状态
export interface ResourceInstallStatus {
  resourceId: string;
  resourceName: string;
  resourceType: ResourceType;
  status: InstallStatus;
  progress: number;
  error?: string;
  startTime?: number;
  endTime?: number;
}

// 资源包安装进度
export interface ResourcePackInstallProgress {
  packId: string;
  packName: string;
  taskId: string;
  status: InstallStatus;
  currentResourceIndex: number;
  totalResources: number;
  progress: number; // 0-100总体进度
  startTime: number;
  endTime?: number;
  resourceStatuses: ResourceInstallStatus[];
  error?: string;
  canceled?: boolean;
}

// 在类中添加这个接口
interface CustomDownloadOptions {
  abortController: AbortController;
  onProgress: (progress: number, downloadedBytes: number, totalBytes: number) => void;
}

/**
 * 资源包管理控制器类
 */
export class ResourcePacksController extends DownloadController {
  private resourcePacks: ResourcePack[] = [];
  private packInstallProgress = new Map<string, ResourcePackInstallProgress>();
  private comfyuiPath: string;
  private modelsController: ModelsController;
  private pluginsController: PluginsController;
  
  constructor() {
    super();
    
    // 初始化其他控制器
    this.modelsController = new ModelsController();
    this.pluginsController = new PluginsController();
    
    // 获取ComfyUI路径
    const { config } = require('../config');
    this.comfyuiPath = config.comfyui.path || process.env.COMFYUI_PATH || path.join(process.cwd(), 'comfyui');
    
    // 加载资源包
    this.loadResourcePacks();
  }
  
  /**
   * 加载资源包列表
   */
  private loadResourcePacks(): void {
    try {
      // 从标准路径加载资源包定义
      const packDefinitionsPath = path.join(__dirname, '../../resource-packs');
      
      // 确保目录存在
      if (!fs.existsSync(packDefinitionsPath)) {
        fs.mkdirSync(packDefinitionsPath, { recursive: true });
        logger.info(`创建资源包目录: ${packDefinitionsPath}`);
      }
      
      // 读取目录下所有JSON文件
      const files = fs.readdirSync(packDefinitionsPath).filter(file => file.endsWith('.json'));
      
      for (const file of files) {
        try {
          const filePath = path.join(packDefinitionsPath, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const pack = JSON.parse(content) as ResourcePack;
          
          // 验证资源包格式
          if (this.validateResourcePack(pack)) {
            this.resourcePacks.push(pack);
            logger.info(`已加载资源包: ${pack.name}`);
          } else {
            logger.warn(`资源包格式无效: ${filePath}`);
          }
        } catch (error) {
          logger.error(`解析资源包文件失败 ${file}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      logger.info(`共加载 ${this.resourcePacks.length} 个资源包`);
    } catch (error) {
      logger.error(`加载资源包失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 验证资源包格式
   */
  private validateResourcePack(pack: any): boolean {
    // 基本属性验证
    if (!pack.id || !pack.name || !Array.isArray(pack.resources)) {
      return false;
    }
    
    // 资源验证
    for (const resource of pack.resources) {
      if (!resource.id || !resource.name || !resource.type) {
        return false;
      }
      
      // 根据类型验证特定属性
      switch (resource.type) {
        case ResourceType.MODEL:
          if ((!resource.url || !resource.dir || !resource.out)) {
            return false;
          }
          break;
        case ResourceType.PLUGIN:
          if (!resource.github) {
            return false;
          }
          break;
        case ResourceType.WORKFLOW:
          if (!resource.url || !resource.filename) {
            return false;
          }
          break;
        case ResourceType.CUSTOM:
          if (!resource.url || !resource.destination) {
            return false;
          }
          break;
        default:
          return false;
      }
    }
    
    return true;
  }
  
  /**
   * 获取资源包列表
   */
  public async getResourcePacks(ctx: Koa.Context): Promise<void> {
    ctx.body = this.resourcePacks;
  }
  
  /**
   * 获取资源包详情
   */
  public async getResourcePackDetail(ctx: Koa.Context): Promise<void> {
    const { id } = ctx.params;
    
    const pack = this.resourcePacks.find(p => p.id === id);
    if (!pack) {
      ctx.status = 404;
      ctx.body = { error: `资源包 ${id} 不存在` };
      return;
    }
    
    ctx.body = pack;
  }
  
  /**
   * 安装资源包
   */
  public async installResourcePack(ctx: Koa.Context): Promise<void> {
    const { packId } = ctx.request.body as { packId: string };
    const { selectedResources } = ctx.request.body as { selectedResources?: string[] };
    const { source = 'hf' } = ctx.request.body as { source?: string };
    
    // 查找资源包
    const pack = this.resourcePacks.find(p => p.id === packId);
    if (!pack) {
      ctx.status = 404;
      ctx.body = { error: `资源包 ${packId} 不存在` };
      return;
    }
    
    // 使用资源包ID作为任务ID
    const taskId = packId;
    
    // 检查是否已有相同的安装任务在进行中
    const existingProgress = this.packInstallProgress.get(taskId);
    if (existingProgress && 
        (existingProgress.status === InstallStatus.PENDING || 
         existingProgress.status === InstallStatus.DOWNLOADING || 
         existingProgress.status === InstallStatus.INSTALLING)) {
      // 已有相同的安装任务在进行中，直接返回任务ID
      ctx.body = { taskId, existing: true };
      return;
    }
    
    // 创建安装进度记录
    const progress: ResourcePackInstallProgress = {
      packId: pack.id,
      packName: pack.name,
      taskId,
      status: InstallStatus.PENDING,
      currentResourceIndex: 0,
      totalResources: pack.resources.length,
      progress: 0,
      startTime: Date.now(),
      resourceStatuses: pack.resources.map(resource => ({
        resourceId: resource.id,
        resourceName: resource.name,
        resourceType: resource.type,
        status: InstallStatus.PENDING,
        progress: 0
      }))
    };
    
    // 保存进度记录
    this.packInstallProgress.set(taskId, progress);
    
    // 启动异步安装任务
    this.startResourcePackInstallation(pack, taskId, source, selectedResources)
      .catch(err => {
        logger.error(`资源包安装失败: ${err.message}`);
        
        // 更新安装状态为错误
        const progress = this.packInstallProgress.get(taskId);
        if (progress) {
          progress.status = InstallStatus.ERROR;
          progress.error = err.message;
          progress.endTime = Date.now();
          this.packInstallProgress.set(taskId, progress);
        }
      });
    
    // 返回任务ID
    ctx.body = { taskId, existing: false };
  }
  
  /**
   * 开始资源包安装
   */
  private async startResourcePackInstallation(
    pack: ResourcePack, 
    taskId: string, 
    source: string = 'hf',
    selectedResources?: string[]
  ): Promise<void> {
    logger.info(`开始安装资源包: ${pack.name}, 任务ID: ${taskId}`);
    
    // 获取进度对象
    const progress = this.packInstallProgress.get(taskId);
    if (!progress) {
      throw new Error(`未找到任务 ${taskId} 的进度信息`);
    }
    
    // 更新状态为下载中
    progress.status = InstallStatus.DOWNLOADING;
    
    // 过滤要安装的资源
    const resourcesToInstall = selectedResources 
      ? pack.resources.filter(r => selectedResources.includes(r.id))
      : pack.resources;
    
    progress.totalResources = resourcesToInstall.length;
    
    // 依次安装每个资源
    for (let i = 0; i < resourcesToInstall.length; i++) {
      // 检查是否已取消
      if (progress.canceled) {
        logger.info(`安装已取消: ${pack.name}`);
        progress.status = InstallStatus.CANCELED;
        progress.endTime = Date.now();
        return;
      }
      
      const resource = resourcesToInstall[i];
      progress.currentResourceIndex = i;
      
      // 更新当前资源状态
      const resourceStatus = progress.resourceStatuses.find(rs => rs.resourceId === resource.id);
      if (resourceStatus) {
        resourceStatus.status = InstallStatus.DOWNLOADING;
        resourceStatus.startTime = Date.now();
      }
      
      try {
        logger.info(`开始安装资源: ${resource.name} (${i + 1}/${resourcesToInstall.length})`);
        
        // 根据资源类型执行不同的安装逻辑
        switch (resource.type) {
          case ResourceType.MODEL:
            await this.installModelResource(resource as ModelResource, taskId, source);
            break;
            
          case ResourceType.PLUGIN:
            await this.installPluginResource(resource as PluginResource, taskId);
            break;
            
          case ResourceType.WORKFLOW:
            await this.installWorkflowResource(resource as WorkflowResource, taskId);
            break;
            
          case ResourceType.CUSTOM:
            await this.installCustomResource(resource as CustomResource, taskId);
            break;
        }
        
        // 更新资源状态为完成
        if (resourceStatus) {
          resourceStatus.status = InstallStatus.COMPLETED;
          resourceStatus.progress = 100;
          resourceStatus.endTime = Date.now();
        }
        
      } catch (error) {
        // 记录错误并继续安装其他资源
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`安装资源 ${resource.name} 失败: ${errorMsg}`);
        
        if (resourceStatus) {
          resourceStatus.status = InstallStatus.ERROR;
          resourceStatus.error = errorMsg;
          resourceStatus.endTime = Date.now();
        }
      }
      
      // 更新总体进度
      progress.progress = Math.floor(((i + 1) / resourcesToInstall.length) * 100);
    }
    
    // 完成安装
    progress.status = InstallStatus.COMPLETED;
    progress.progress = 100;
    progress.endTime = Date.now();
    
    logger.info(`资源包 ${pack.name} 安装完成`);
  }
  
  /**
   * 修复 downloadFile 函数中类型错误的适配器
   * 将 onProgress 回调转换为正确的类型
   */
  private createProgressAdapter(callback: (downloaded: number, total: number) => void): (progress: number, downloadedBytes: number, totalBytes: number) => void {
    return (progress: number, downloadedBytes: number, totalBytes: number) => {
      callback(downloadedBytes, totalBytes);
    };
  }
  
  /**
   * 检查并处理下载文件的后缀
   * 如果文件带有.download后缀，则移除该后缀
   */
  private handleDownloadExtension(filePath: string): string {
    const downloadExt = '.download';
    
    // 检查是否存在带.download后缀的文件
    if (!fs.existsSync(filePath) && fs.existsSync(`${filePath}${downloadExt}`)) {
      try {
        // 重命名文件，移除.download后缀
        fs.renameSync(`${filePath}${downloadExt}`, filePath);
        logger.info(`已将文件 ${filePath}${downloadExt} 重命名为 ${filePath}`);
      } catch (error) {
        logger.error(`重命名文件失败: ${error instanceof Error ? error.message : String(error)}`);
        // 如果重命名失败，返回带后缀的文件路径
        return `${filePath}${downloadExt}`;
      }
    }
    
    return filePath;
  }
  
  /**
   * 安装模型资源（修复类型错误）
   */
  private async installModelResource(resource: ModelResource, taskId: string, source: string): Promise<void> {
    // 获取进度对象
    const progress = this.packInstallProgress.get(taskId);
    if (!progress) {
      throw new Error(`未找到任务 ${taskId} 的进度信息`);
    }
    
    // 获取当前资源状态对象
    const resourceStatus = progress.resourceStatuses.find(rs => rs.resourceId === resource.id);
    if (!resourceStatus) {
      throw new Error(`未找到资源 ${resource.id} 的状态信息`);
    }
    
    // 更新状态为正在下载
    resourceStatus.status = InstallStatus.DOWNLOADING;
    
    // 获取模型目录
    const { config } = require('../config');
    const modelsRootPath = config.modelsDir || path.join(this.comfyuiPath, 'models');
    
    // 确保模型目录存在
    const modelDirPath = path.join(modelsRootPath, resource.dir);
    if (!fs.existsSync(modelDirPath)) {
      logger.info(`创建模型目录: ${modelDirPath}`);
      fs.mkdirSync(modelDirPath, { recursive: true });
    }
    
    // 目标文件路径
    const outputPath = path.join(modelDirPath, resource.out);
    
    // 检查文件是否已存在
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      if (stats.size > 0) {
        logger.info(`模型文件已存在，跳过下载: ${outputPath}`);
        resourceStatus.status = InstallStatus.SKIPPED;
        resourceStatus.progress = 100;
        return;
      } else {
        // 如果文件存在但大小为0，删除它
        logger.info(`发现空文件，将重新下载: ${outputPath}`);
        fs.unlinkSync(outputPath);
      }
    }
    
    // 获取下载URL
    let downloadUrl: string;
    if (typeof resource.url === 'string') {
      downloadUrl = resource.url;
    } else {
      // 根据source参数选择下载源
      downloadUrl = source === 'mirror' ? resource.url.mirror : resource.url.hf;
    }
    
    logger.info(`开始下载模型 ${resource.name} 从 ${downloadUrl} 到 ${outputPath}`);
    
    try {
      // 创建下载进度处理函数
      const onProgress = (downloadedBytes: number, totalBytes: number) => {
        if (abortController.signal.aborted) {
          return false;
        }
        
        // 更新资源下载进度
        const percent = totalBytes > 0 ? Math.floor((downloadedBytes / totalBytes) * 100) : 0;
        resourceStatus.progress = percent;
        
        // 记录进度
        if (percent % 10 === 0) {
          const downloadedMB = (downloadedBytes / (1024 * 1024)).toFixed(2);
          const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
          logger.info(`模型 ${resource.name} 下载进度: ${percent}% (${downloadedMB}MB/${totalMB}MB)`);
        }
        
        return true;
      };
      
      // 配置下载选项
      const abortController = new AbortController();
      
      // 创建适配器转换进度回调的格式
      const progressAdapter = this.createProgressAdapter(onProgress);
      
      // 更新资源状态，保存中止控制器以便可以取消下载
      const downloadOptions: CustomDownloadOptions = {
        abortController,
        onProgress: progressAdapter
      };
      
      // 如果是基础模型，则转换为EssentialModel格式并调用下载工具
      const essentialModel: EssentialModel = {
        id: resource.id,
        name: resource.name,
        type: resource.dir, // 使用目录作为类型
        essential: resource.essential || false,
        url: typeof resource.url === 'string' ? { 
          mirror: resource.url, 
          hf: resource.url 
        } : resource.url,
        dir: resource.dir,
        out: resource.out,
        description: resource.description || ''
      };
      
      // 使用 downloadFile 工具进行下载
      const result = await downloadFile(
        downloadUrl,
        outputPath,
        progressAdapter,
        downloadOptions as any // 使用类型断言绕过类型检查
      );
      
      // 检查下载结果
      if (!result) {
        // 下载被取消，处理这种情况但不抛出错误
        logger.info(`下载已被用户取消: ${taskId}`);
        return;
      }
      
      // 处理可能存在的.download后缀
      const finalPath = this.handleDownloadExtension(outputPath);
      
      // 下载完成后检查文件
      if (fs.existsSync(finalPath)) {
        const stats = fs.statSync(finalPath);
        if (stats.size > 0) {
          logger.info(`模型 ${resource.name} 下载完成，文件大小: ${(stats.size / (1024 * 1024)).toFixed(2)}MB`);
          resourceStatus.status = InstallStatus.COMPLETED;
          resourceStatus.progress = 100;
        } else {
          // 文件大小为0，可能下载失败
          fs.unlinkSync(finalPath);
          throw new Error(`下载的文件大小为0，可能下载失败: ${finalPath}`);
        }
      } else {
        throw new Error(`下载后未找到文件: ${finalPath}`);
      }
    } catch (error) {
      // 处理错误
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // 如果是用户取消，设置状态为已取消
      if (errorMsg.includes('下载已取消') || errorMsg.includes('aborted')) {
        resourceStatus.status = InstallStatus.CANCELED;
        logger.info(`模型 ${resource.name} 下载已取消`);
      } else {
        // 其他错误
        resourceStatus.status = InstallStatus.ERROR;
        resourceStatus.error = errorMsg;
        logger.error(`模型 ${resource.name} 下载失败: ${errorMsg}`);
      }
      
      // 删除不完整的文件
      if (fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
          logger.info(`已删除不完整的下载文件: ${outputPath}`);
        } catch (unlinkError) {
          logger.error(`无法删除不完整的下载文件: ${outputPath}, 错误: ${unlinkError instanceof Error ? unlinkError.message : String(unlinkError)}`);
        }
      }
      
      // 重新抛出错误
      throw error;
    }
  }
  
  /**
   * 安装插件资源
   */
  private async installPluginResource(resource: PluginResource, taskId: string): Promise<void> {
    // 获取进度对象
    const progress = this.packInstallProgress.get(taskId);
    if (!progress) {
      throw new Error(`未找到任务 ${taskId} 的进度信息`);
    }
    
    // 获取当前资源状态对象
    const resourceStatus = progress.resourceStatuses.find(rs => rs.resourceId === resource.id);
    if (!resourceStatus) {
      throw new Error(`未找到资源 ${resource.id} 的状态信息`);
    }
    
    // 更新状态为正在安装
    resourceStatus.status = InstallStatus.INSTALLING;
    
    // 从GitHub URL解析仓库所有者和名称
    const githubUrlParts = resource.github.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!githubUrlParts) {
      throw new Error(`无效的GitHub URL: ${resource.github}`);
    }
    
    const owner = githubUrlParts[1];
    const repo = githubUrlParts[2].replace('.git', '');
    
    // 生成一个唯一的操作ID用于跟踪插件安装进度
    const operationId = uuidv4();
    
    try {
      logger.info(`开始安装插件 ${resource.name} 从 ${resource.github}`);
      
      // 创建进度监听函数
      const progressListener = (installProgress: any) => {
        if (progress.canceled) {
          // 如果任务被取消，停止监听
          return false;
        }
        
        // 更新安装进度
        if (installProgress && typeof installProgress.progress === 'number') {
          resourceStatus.progress = installProgress.progress;
        }
        
        // 检查安装状态
        if (installProgress && installProgress.status) {
          if (installProgress.status === 'completed') {
            resourceStatus.status = InstallStatus.COMPLETED;
            resourceStatus.progress = 100;
          } else if (installProgress.status === 'error') {
            resourceStatus.status = InstallStatus.ERROR;
            resourceStatus.error = installProgress.error || '安装失败';
          }
        }
        
        // 继续监听
        return true;
      };
      
      // 检查插件是否已安装 - 使用公开接口
      // 修复: 通过插件控制器的公共方法获取插件列表
      const installedPlugins = await this.getPluginsList();
      
      const alreadyInstalled = installedPlugins.some(plugin => {
        // 检查是否已存在同名的插件目录
        // 这里采用简单比较，可以根据需要优化匹配逻辑
        return plugin.id.toLowerCase() === repo.toLowerCase() ||
               plugin.id.toLowerCase() === `comfyui-${repo.toLowerCase()}` ||
               plugin.github === resource.github;
      });
      
      if (alreadyInstalled) {
        logger.info(`插件 ${resource.name} 已安装，跳过`);
        resourceStatus.status = InstallStatus.SKIPPED;
        resourceStatus.progress = 100;
        return;
      }
      
      // 修复: 使用正确的方法和参数类型安装插件
      await this.installPluginSafely(resource, progressListener, operationId);
      
      // 安装成功
      logger.info(`插件 ${resource.name} 安装成功`);
      resourceStatus.status = InstallStatus.COMPLETED;
      resourceStatus.progress = 100;
      
    } catch (error) {
      // 处理错误
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // 如果是用户取消，设置状态为已取消
      if (errorMsg.includes('取消') || progress.canceled) {
        resourceStatus.status = InstallStatus.CANCELED;
        logger.info(`插件 ${resource.name} 安装已取消`);
      } else {
        // 其他错误
        resourceStatus.status = InstallStatus.ERROR;
        resourceStatus.error = errorMsg;
        logger.error(`插件 ${resource.name} 安装失败: ${errorMsg}`);
      }
      
      // 重新抛出错误，让上层函数处理
      throw error;
    }
  }
  
  /**
   * 安装插件的安全包装方法，处理类型问题
   */
  private async installPluginSafely(resource: PluginResource, progressCallback: any, operationId: string): Promise<void> {
    // 使用新的公共方法来安装插件
    await this.pluginsController.installPluginFromGitHub(
      resource.github,
      resource.branch || 'main',
      progressCallback,
      operationId
    );
  }
  
  /**
   * 获取已安装插件列表的安全方法
   */
  private async getPluginsList(): Promise<any[]> {
    try {
      // 尝试通过公共方法获取
      if (typeof (this.pluginsController as any).listInstalledPlugins === 'function') {
        return await (this.pluginsController as any).listInstalledPlugins();
      }
      
      // 后备：通过扫描插件目录获取
      const { config } = require('../config');
      const pluginsDir = path.join(this.comfyuiPath, 'custom_nodes');
      
      if (!fs.existsSync(pluginsDir)) {
        return [];
      }
      
      const items = fs.readdirSync(pluginsDir);
      return items
        .filter(item => {
          const itemPath = path.join(pluginsDir, item);
          return fs.statSync(itemPath).isDirectory() && !item.startsWith('.');
        })
        .map(name => ({ id: name }));
    } catch (error) {
      logger.error(`获取插件列表失败: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  /**
   * 安装工作流资源
   */
  private async installWorkflowResource(resource: WorkflowResource, taskId: string): Promise<void> {
    // 获取进度对象
    const progress = this.packInstallProgress.get(taskId);
    if (!progress) {
      throw new Error(`未找到任务 ${taskId} 的进度信息`);
    }
    
    // 获取当前资源状态对象
    const resourceStatus = progress.resourceStatuses.find(rs => rs.resourceId === resource.id);
    if (!resourceStatus) {
      throw new Error(`未找到资源 ${resource.id} 的状态信息`);
    }
    
    // 更新状态为正在下载
    resourceStatus.status = InstallStatus.DOWNLOADING;
    
    // 确保工作流目录存在
    const workflowsDir = path.join(this.comfyuiPath, 'user', 'default', 'workflows');
    if (!fs.existsSync(workflowsDir)) {
      fs.mkdirSync(workflowsDir, { recursive: true });
      logger.info(`创建工作流目录: ${workflowsDir}`);
    }
    
    // 目标文件路径
    const outputPath = path.join(workflowsDir, resource.filename);
    
    // 检查文件是否已存在
    if (fs.existsSync(outputPath)) {
      // 工作流文件已存在，根据需要可以选择覆盖或跳过
      // 这里选择覆盖，因为工作流可能有更新
      logger.info(`工作流文件已存在，将覆盖: ${outputPath}`);
    }
    
    logger.info(`开始下载工作流 ${resource.name} 从 ${resource.url} 到 ${outputPath}`);
    
    try {
      // 创建下载进度处理函数
      const onProgress = (downloadedBytes: number, totalBytes: number) => {
        if (abortController.signal.aborted) {
          return false;
        }
        
        // 更新资源下载进度
        const percent = totalBytes > 0 ? Math.floor((downloadedBytes / totalBytes) * 100) : 0;
        resourceStatus.progress = percent;
        
        // 记录进度
        if (percent % 20 === 0) { // 每20%记录一次
          logger.info(`工作流 ${resource.name} 下载进度: ${percent}%`);
        }
        
        return true;
      };
      
      // 配置下载选项
      const abortController = new AbortController();
      
      // 创建适配器转换进度回调的格式
      const progressAdapter = this.createProgressAdapter(onProgress);
      
      // 更新资源状态，保存中止控制器以便可以取消下载
      const downloadOptions: CustomDownloadOptions = {
        abortController,
        onProgress: progressAdapter
      };
      
      // 使用适配后的进度回调
      const result = await downloadFile(
        resource.url,
        outputPath,
        progressAdapter,
        downloadOptions as any // 使用类型断言绕过类型检查
      );
      
      // 检查下载结果
      if (!result) {
        // 下载被取消，处理这种情况但不抛出错误
        logger.info(`下载已被用户取消: ${taskId}`);
        return;
      }
      
      // 处理可能存在的.download后缀
      const finalPath = this.handleDownloadExtension(outputPath);
      
      // 下载完成后检查文件
      if (fs.existsSync(finalPath)) {
        logger.info(`工作流 ${resource.name} 下载完成`);
        resourceStatus.status = InstallStatus.COMPLETED;
        resourceStatus.progress = 100;
      } else {
        throw new Error(`下载后未找到文件: ${finalPath}`);
      }
    } catch (error) {
      // 处理错误
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // 如果是用户取消，设置状态为已取消
      if (errorMsg.includes('下载已取消') || errorMsg.includes('aborted')) {
        resourceStatus.status = InstallStatus.CANCELED;
        logger.info(`工作流 ${resource.name} 下载已取消`);
      } else {
        // 其他错误
        resourceStatus.status = InstallStatus.ERROR;
        resourceStatus.error = errorMsg;
        logger.error(`工作流 ${resource.name} 下载失败: ${errorMsg}`);
      }
      
      // 删除不完整的文件
      if (fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
          logger.info(`已删除不完整的下载文件: ${outputPath}`);
        } catch (unlinkError) {
          logger.error(`无法删除不完整的下载文件: ${outputPath}, 错误: ${unlinkError instanceof Error ? unlinkError.message : String(unlinkError)}`);
        }
      }
      
      // 重新抛出错误
      throw error;
    }
  }
  
  /**
   * 安装自定义资源
   */
  private async installCustomResource(resource: CustomResource, taskId: string): Promise<void> {
    // 获取进度对象
    const progress = this.packInstallProgress.get(taskId);
    if (!progress) {
      throw new Error(`未找到任务 ${taskId} 的进度信息`);
    }
    
    // 获取当前资源状态对象
    const resourceStatus = progress.resourceStatuses.find(rs => rs.resourceId === resource.id);
    if (!resourceStatus) {
      throw new Error(`未找到资源 ${resource.id} 的状态信息`);
    }
    
    // 更新状态为正在下载
    resourceStatus.status = InstallStatus.DOWNLOADING;
    
    // 处理目标路径
    const destinationPath = resource.destination;
    
    // 确定输出目录和文件名
    let outputDir: string;
    let outputFilename: string;
    
    if (path.isAbsolute(destinationPath)) {
      // 如果是绝对路径，直接使用
      outputDir = path.dirname(destinationPath);
      outputFilename = path.basename(destinationPath);
    } else {
      // 如果是相对路径，相对于ComfyUI目录
      outputDir = path.dirname(path.join(this.comfyuiPath, destinationPath));
      outputFilename = path.basename(destinationPath);
    }
    
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      logger.info(`创建自定义资源目录: ${outputDir}`);
    }
    
    // 完整的输出路径
    const outputPath = path.join(outputDir, outputFilename);
    
    // 检查文件是否已存在
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      if (stats.size > 0) {
        logger.info(`自定义资源文件已存在，跳过下载: ${outputPath}`);
        resourceStatus.status = InstallStatus.SKIPPED;
        resourceStatus.progress = 100;
        return;
      } else {
        // 如果文件存在但大小为0，删除它
        logger.info(`发现空文件，将重新下载: ${outputPath}`);
        fs.unlinkSync(outputPath);
      }
    }
    
    logger.info(`开始下载自定义资源 ${resource.name} 从 ${resource.url} 到 ${outputPath}`);
    
    try {
      // 创建下载进度处理函数
      const onProgress = (downloadedBytes: number, totalBytes: number) => {
        if (abortController.signal.aborted) {
          return false;
        }
        
        // 更新资源下载进度
        const percent = totalBytes > 0 ? Math.floor((downloadedBytes / totalBytes) * 100) : 0;
        resourceStatus.progress = percent;
        
        // 记录进度
        if (percent % 20 === 0) { // 每20%记录一次
          const downloadedMB = (downloadedBytes / (1024 * 1024)).toFixed(2);
          const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
          logger.info(`自定义资源 ${resource.name} 下载进度: ${percent}% (${downloadedMB}MB/${totalMB}MB)`);
        }
        
        return true;
      };
      
      // 配置下载选项
      const abortController = new AbortController();
      
      // 创建适配器转换进度回调的格式
      const progressAdapter = this.createProgressAdapter(onProgress);
      
      // 更新资源状态，保存中止控制器以便可以取消下载
      const downloadOptions: CustomDownloadOptions = {
        abortController,
        onProgress: progressAdapter
      };
      
      // 使用适配后的进度回调
      const result = await downloadFile(
        resource.url,
        outputPath,
        progressAdapter,
        downloadOptions as any // 使用类型断言绕过类型检查
      );
      
      // 检查下载结果
      if (!result) {
        // 下载被取消，处理这种情况但不抛出错误
        logger.info(`下载已被用户取消: ${taskId}`);
        return;
      }
      
      // 处理可能存在的.download后缀
      const finalPath = this.handleDownloadExtension(outputPath);
      
      // 下载完成后检查文件
      if (fs.existsSync(finalPath)) {
        const stats = fs.statSync(finalPath);
        if (stats.size > 0) {
          logger.info(`自定义资源 ${resource.name} 下载完成，文件大小: ${(stats.size / (1024 * 1024)).toFixed(2)}MB`);
          resourceStatus.status = InstallStatus.COMPLETED;
          resourceStatus.progress = 100;
        } else {
          // 文件大小为0，可能下载失败
          fs.unlinkSync(finalPath);
          throw new Error(`下载的文件大小为0，可能下载失败: ${finalPath}`);
        }
      } else {
        throw new Error(`下载后未找到文件: ${finalPath}`);
      }
    } catch (error) {
      // 处理错误
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // 如果是用户取消，设置状态为已取消
      if (errorMsg.includes('下载已取消') || errorMsg.includes('aborted')) {
        resourceStatus.status = InstallStatus.CANCELED;
        logger.info(`自定义资源 ${resource.name} 下载已取消`);
      } else {
        // 其他错误
        resourceStatus.status = InstallStatus.ERROR;
        resourceStatus.error = errorMsg;
        logger.error(`自定义资源 ${resource.name} 下载失败: ${errorMsg}`);
      }
      
      // 删除不完整的文件
      if (fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
          logger.info(`已删除不完整的下载文件: ${outputPath}`);
        } catch (unlinkError) {
          logger.error(`无法删除不完整的下载文件: ${outputPath}, 错误: ${unlinkError instanceof Error ? unlinkError.message : String(unlinkError)}`);
        }
      }
      
      // 重新抛出错误
      throw error;
    }
  }
  
  /**
   * 获取资源包安装进度
   */
  public async getInstallProgress(ctx: Koa.Context): Promise<void> {
    const { taskId } = ctx.params;
    
    const progress = this.packInstallProgress.get(taskId);
    if (!progress) {
      ctx.status = 404;
      ctx.body = { error: `未找到任务 ${taskId} 的进度信息` };
      return;
    }
    
    ctx.body = progress;
  }
  
  /**
   * 取消资源包安装
   */
  public async cancelInstallation(ctx: Koa.Context): Promise<void> {
    const { taskId } = ctx.params;
    
    const progress = this.packInstallProgress.get(taskId);
    if (!progress) {
      ctx.status = 404;
      ctx.body = { error: `未找到任务 ${taskId} 的进度信息` };
      return;
    }
    
    // 标记为已取消
    progress.canceled = true;
    progress.status = InstallStatus.CANCELED;
    progress.endTime = Date.now();
    
    // 使用基类的取消方法
    await this.cancelDownloadTask(taskId);
    
    ctx.body = { success: true, message: '已取消安装任务' };
  }

  /**
   * 实现取消下载任务方法
   */
  async cancelDownloadTask(taskId: string): Promise<boolean> {
    // 获取任务进度
    const progress = this.packInstallProgress.get(taskId);
    if (!progress) {
      return false;
    }
    
    // 标记任务为已取消
    progress.canceled = true;
    progress.status = InstallStatus.CANCELED;
    
    // 更新所有未完成资源的状态
    for (const resourceStatus of progress.resourceStatuses) {
      if (resourceStatus.status !== InstallStatus.COMPLETED && 
          resourceStatus.status !== InstallStatus.ERROR &&
          resourceStatus.status !== InstallStatus.SKIPPED) {
        resourceStatus.status = InstallStatus.CANCELED;
      }
    }
    
    // 调用父类的取消下载方法
    await super.cancelDownload({ request: { body: { taskId } } } as Koa.Context);
    
    logger.info(`成功取消下载任务: ${taskId}`);
    return true;
  }
} 