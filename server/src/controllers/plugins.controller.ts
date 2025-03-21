import { Context } from 'koa';
import { v4 as uuidv4 } from 'uuid';
import superagent from 'superagent';
import * as fs from 'fs';
import * as path from 'path';
import { exec, execSync } from 'child_process';
import * as util from 'util';

// 将exec转换为Promise
const execPromise = util.promisify(exec);

// 确定环境和路径
const isDev = process.env.NODE_ENV !== 'production';

// 在开发环境中使用当前目录，生产环境使用配置路径
const COMFYUI_PATH = process.env.COMFYUI_PATH || 
  (isDev ? path.join(process.cwd(), 'comfyui') : '/root/ComfyUI');

console.log(`[配置] ComfyUI 路径: ${COMFYUI_PATH}`);

const CUSTOM_NODES_PATH = path.join(COMFYUI_PATH, 'custom_nodes');

// 确保有一个 .disabled 目录用于存放禁用的插件
const DISABLED_PLUGINS_PATH = path.join(CUSTOM_NODES_PATH, '.disabled');

// 添加 GitHub API 配置
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''; // 建议配置 GitHub Token 避免 API 速率限制

// 任务进度映射
const taskProgressMap: Record<string, { 
  progress: number, 
  completed: boolean,
  pluginId: string,
  type: 'install' | 'uninstall' | 'disable' | 'enable',
  message?: string,
  githubProxy?: string
}> = {};

// 缓存插件列表
let cachedPlugins: any[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 3600000; // 1小时缓存

// 缓存 GitHub 统计数据
let githubStatsCache: Record<string, { stars: number, updatedAt: number }> = {};
const GITHUB_STATS_CACHE_DURATION = 86400000; // 24小时缓存 GitHub 统计数据

// 模拟的插件列表
const mockPlugins = [
  {
    id: "comfyui-controlnet",
    name: "ComfyUI ControlNet",
    description: "ControlNet节点集合，帮助您通过预设条件精确控制图像生成",
    version: "1.2.3",
    author: "ComfyUI Team",
    github: "https://github.com/comfyanonymous/ComfyUI",
    stars: 1240,
    tags: ["controlnet", "conditioning"],
    install_type: "git_clone",
    files: ["controlnet.py", "node.py"],
    require_restart: true,
    installed: true,
    installedOn: "2023-10-15T10:30:00Z"
  },
  {
    id: "comfyui-impact-pack",
    name: "ComfyUI Impact Pack",
    description: "增强型节点集合，包含高级采样器、细节提升和特效处理",
    version: "2.0.1",
    author: "ltdrdata",
    github: "https://github.com/ltdrdata/ComfyUI-Impact-Pack",
    installed: true,
    installedOn: "2023-11-20T15:45:00Z"
  },
  {
    id: "comfyui-sd-webui-scripts",
    name: "SD WebUI Scripts",
    description: "从Stable Diffusion WebUI移植的常用脚本和工作流",
    version: "0.9.5",
    author: "SDWebUI Contributors",
    github: "https://github.com/AUTOMATIC1111/stable-diffusion-webui",
    installed: false
  },
  {
    id: "comfyui-advanced-nodes",
    name: "Advanced Nodes",
    description: "提供高级图像处理功能的节点集，包括色彩校正、图层混合等",
    version: "1.3.0",
    author: "ComfyUI Community",
    github: "https://github.com/example/advanced-nodes",
    installed: false
  },
  {
    id: "comfyui-animatediff",
    name: "AnimateDiff Integration",
    description: "将AnimateDiff集成到ComfyUI中，轻松创建动画和视频效果",
    version: "0.8.2",
    author: "guoyww",
    github: "https://github.com/guoyww/AnimateDiff",
    installed: true,
    installedOn: "2023-12-05T08:20:00Z"
  },
  {
    id: "comfyui-upscalers",
    name: "Super Upscalers",
    description: "高级超分辨率节点集，整合多种AI放大算法",
    version: "1.5.1",
    author: "AI Upscale Team",
    github: "https://github.com/example/super-upscalers",
    installed: false
  },
  {
    id: "comfyui-workflow-manager",
    name: "Workflow Manager",
    description: "工作流管理工具，保存、加载和共享您的ComfyUI工作流",
    version: "1.1.0",
    author: "Workflow Developers",
    github: "https://github.com/example/workflow-manager",
    installed: true,
    installedOn: "2024-01-10T14:15:00Z"
  },
  {
    id: "comfyui-prompts-library",
    name: "Prompts Library",
    description: "提示词库和模板集合，帮助用户快速创建高质量提示",
    version: "2.2.0",
    author: "Prompt Engineers",
    github: "https://github.com/example/prompts-library",
    installed: false
  }
];

export class PluginsController {
  constructor() {
    // 初始化 - 启动时预加载插件数据
    this.initPluginsCache();
  }

  // 初始化插件缓存
  private async initPluginsCache() {
    try {
      console.log('[API] 启动时初始化插件缓存');
      setTimeout(async () => {
        try {
          // 初始化时强制从网络获取
          cachedPlugins = await this.fetchComfyUIManagerPlugins(true);
          lastFetchTime = Date.now();
          console.log(`[API] 插件缓存初始化完成，已缓存 ${cachedPlugins.length} 个插件`);
        } catch (error) {
          console.error('[API] 初始化插件缓存失败:', error);
        }
      }, 1000);
    } catch (error) {
      console.error('[API] 初始化插件缓存出错:', error);
    }
  }

  // 获取所有插件
  async getAllPlugins(ctx: Context): Promise<void> {
    try {
      console.log('[API] 获取所有插件');
      
      const forceRefresh = ctx.query.force === 'true';
      const currentTime = Date.now();
      
      // 如果缓存有效且不强制刷新，直接使用
      if (!forceRefresh && cachedPlugins.length > 0 && (currentTime - lastFetchTime) < CACHE_DURATION) {
        console.log('[API] 使用缓存的插件列表');
        ctx.body = cachedPlugins;
        return;
      }
      
      // 从 ComfyUI-Manager 获取插件列表，传入forceRefresh参数
      const pluginsData = await this.fetchComfyUIManagerPlugins(forceRefresh);
      
      // 更新缓存
      cachedPlugins = pluginsData;
      lastFetchTime = currentTime;
      
      ctx.body = pluginsData;
    } catch (error) {
      console.error('[API] 获取插件列表失败:', error);
      ctx.status = 500;
      ctx.body = { error: '获取插件列表失败' };
    }
  }

  // 从 ComfyUI-Manager 获取插件列表
  private async fetchComfyUIManagerPlugins(forceNetworkFetch: boolean = false): Promise<any[]> {
    try {
      console.log(`[API] 获取插件列表 (强制网络获取: ${forceNetworkFetch})`);
      
      // 如果不强制网络获取，且缓存中有数据，则仅更新本地状态
      if (!forceNetworkFetch && cachedPlugins.length > 0) {
        console.log('[API] 使用缓存数据并更新本地状态');
        
        // 获取本地安装的插件信息
        const installedPlugins = this.getInstalledPlugins();
        
        // 更新缓存中插件的安装状态
        this.updatePluginsInstallStatus(cachedPlugins, installedPlugins);
        
        return cachedPlugins;
      }
      
      // 强制网络获取或缓存为空时，从网络获取完整列表
      console.log('[API] 从网络获取完整插件列表');
      
      // ComfyUI-Manager 插件列表URL
      const url = 'https://raw.githubusercontent.com/ltdrdata/ComfyUI-Manager/main/custom-node-list.json';
      
      const response = await superagent.get(url);
      const managerData = JSON.parse(response.text);
      
      // 确保custom_nodes目录存在
      if (!fs.existsSync(CUSTOM_NODES_PATH)) {
        fs.mkdirSync(CUSTOM_NODES_PATH, { recursive: true });
      }
      
      // 获取已安装插件
      const installedPlugins = this.getInstalledPlugins();
      
      // 解析插件数据
      let plugins = managerData.custom_nodes.map((info: any) => {
        // 转换为标准格式
        const plugin = {
          id: info.id || info.title.toLowerCase().replace(/\s+/g, '-'),
          name: info.title,
          description: info.description || '',
          version: info.version || '1.0.0',
          author: info.author || '未知',
          github: info.reference || '',
          install_type: info.install_type || 'git_clone',
          tags: info.tags || [],
          stars: 0,
          installed: false,
          disabled: false
        };
        
        return plugin;
      });
      
      // 更新安装状态
      this.updatePluginsInstallStatus(plugins, installedPlugins);
      
      // // 异步更新GitHub统计信息
      // this.updateGitHubStats(plugins);
      
      return plugins;
    } catch (error) {
      console.error('[API] 获取ComfyUI-Manager插件列表失败:', error);
      
      // 如果从网络获取失败，但有缓存数据，则使用缓存
      if (cachedPlugins.length > 0) {
        console.log('[API] 使用缓存数据作为备选');
        return cachedPlugins;
      }
      
      // 缓存也没有，返回模拟数据
      console.log('[API] 无缓存可用，返回模拟数据');
      return [...mockPlugins];
    }
  }

  // 辅助方法：更新插件的安装状态
  private updatePluginsInstallStatus(plugins: any[], installedPlugins: any[]): void {
    // 创建一个快速查找表
    const installedMap = new Map();
    installedPlugins.forEach(plugin => {
      installedMap.set(plugin.id, {
        installedOn: plugin.installedOn,
        disabled: plugin.disabled
      });
    });
    
    // 更新每个插件的安装状态
    plugins.forEach(plugin => {
      const installedInfo = installedMap.get(plugin.id);
      if (installedInfo) {
        plugin.installed = true;
        plugin.installedOn = installedInfo.installedOn;
        plugin.disabled = installedInfo.disabled;
      } else {
        plugin.installed = false;
        plugin.disabled = false;
      }
    });
    
    // 添加本地安装但不在列表中的插件
    installedPlugins.forEach(plugin => {
      if (!plugins.some(p => p.id === plugin.id)) {
        plugins.push(plugin);
      }
    });
  }

  // 获取已安装的插件列表
  private getInstalledPlugins(): any[] {
    try {
      const installedPlugins: any[] = [];
      
      // 确保目录存在
      if (!fs.existsSync(CUSTOM_NODES_PATH)) {
        console.log(`[API] 创建custom_nodes目录: ${CUSTOM_NODES_PATH}`);
        fs.mkdirSync(CUSTOM_NODES_PATH, { recursive: true });
        return [];
      }
      
      // 确保禁用插件目录存在
      if (!fs.existsSync(DISABLED_PLUGINS_PATH)) {
        console.log(`[API] 创建禁用插件目录: ${DISABLED_PLUGINS_PATH}`);
        fs.mkdirSync(DISABLED_PLUGINS_PATH, { recursive: true });
      }
      
      // 读取所有已启用插件目录
      const directories = fs.readdirSync(CUSTOM_NODES_PATH, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
        .map(dirent => dirent.name);
      
      // 处理已启用的插件
      for (const dir of directories) {
        const pluginInfo = this.getPluginInfo(dir, false);
        if (pluginInfo) {
          installedPlugins.push(pluginInfo);
        }
      }
      
      // 读取所有禁用的插件目录
      if (fs.existsSync(DISABLED_PLUGINS_PATH)) {
        const disabledDirectories = fs.readdirSync(DISABLED_PLUGINS_PATH, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
          .map(dirent => dirent.name);
        
        // 处理禁用的插件
        for (const dir of disabledDirectories) {
          const pluginInfo = this.getPluginInfo(dir, true);
          if (pluginInfo) {
            installedPlugins.push(pluginInfo);
          }
        }
      }
      
      return installedPlugins;
    } catch (error) {
      console.error(`[API] 获取已安装插件列表失败: ${error}`);
      return [];
    }
  }
  
  // 获取单个插件的信息
  private getPluginInfo(dir: string, isDisabled: boolean): any {
    try {
      const pluginPath = isDisabled 
        ? path.join(DISABLED_PLUGINS_PATH, dir)
        : path.join(CUSTOM_NODES_PATH, dir);
      
      // 尝试读取git信息
      let repoUrl = '';
      try {
        const gitConfig = path.join(pluginPath, '.git', 'config');
        if (fs.existsSync(gitConfig)) {
          const configContent = fs.readFileSync(gitConfig, 'utf-8');
          const urlMatch = configContent.match(/url\s*=\s*(.+)/i);
          if (urlMatch && urlMatch[1]) {
            repoUrl = urlMatch[1].trim();
          }
        }
      } catch (e) {
        console.error(`[API] 无法读取git信息: ${e}`);
      }
      
      // 尝试从pyproject.toml获取元数据
      let metadata: any = {};
      try {
        const pyprojectPath = path.join(pluginPath, 'pyproject.toml');
        if (fs.existsSync(pyprojectPath)) {
          const pyprojectContent = fs.readFileSync(pyprojectPath, 'utf-8');
          // 简单解析，实际应使用toml解析器
          const nameMatch = pyprojectContent.match(/name\s*=\s*"([^"]+)"/);
          const versionMatch = pyprojectContent.match(/version\s*=\s*"([^"]+)"/);
          const authorMatch = pyprojectContent.match(/author\s*=\s*"([^"]+)"/);
          const descriptionMatch = pyprojectContent.match(/description\s*=\s*"([^"]+)"/);
          
          if (nameMatch) metadata.name = nameMatch[1];
          if (versionMatch) metadata.version = versionMatch[1];
          if (authorMatch) metadata.author = authorMatch[1];
          if (descriptionMatch) metadata.description = descriptionMatch[1];
        }
      } catch (e) {
        console.error(`[API] 无法读取pyproject.toml: ${e}`);
      }
      
      // 获取安装日期（使用目录创建时间）
      let installedOn;
      try {
        const stats = fs.statSync(pluginPath);
        installedOn = stats.birthtime.toISOString();
      } catch (e) {
        installedOn = new Date().toISOString(); // 默认为当前时间
      }
      
      // 返回插件信息
      return {
        id: dir,
        name: metadata.name || dir,
        description: metadata.description || `安装在 ${dir} 目录中的插件`,
        version: metadata.version || '1.0.0',
        author: metadata.author || '未知作者',
        github: repoUrl,
        installed: true,
        installedOn,
        disabled: isDisabled
      };
    } catch (error) {
      console.error(`[API] 获取插件信息失败: ${error}`);
      return null;
    }
  }

  // 安装插件
  async installPlugin(ctx: Context): Promise<void> {
    const { pluginId } = ctx.request.body as { pluginId: string };
    const { githubProxy } = ctx.request.body as { githubProxy: string };
    console.log(`[API] 请求安装插件: ${pluginId}`);
    
    const taskId = uuidv4();
    
    // 创建任务并初始化进度
    taskProgressMap[taskId] = {
      progress: 0,
      completed: false,
      pluginId,
      type: 'install',
      githubProxy
    };
    
    // 实际安装插件任务
    this.installPluginTask(taskId, pluginId, githubProxy);
    
    ctx.body = {
      success: true,
      message: '开始安装插件',
      taskId
    };
  }

  // 实际安装插件任务
  private async installPluginTask(taskId: string, pluginId: string, githubProxy: string): Promise<void> {
    try {
      // 更新进度
      taskProgressMap[taskId].progress = 10;
      taskProgressMap[taskId].message = '正在查找插件信息...';
      
      // 从缓存中查找插件信息
      let pluginInfo = null;
      
      // 检查缓存是否为空或过期
      if (cachedPlugins.length === 0 || (Date.now() - lastFetchTime) >= CACHE_DURATION) {
        // 缓存为空或已过期，获取最新数据
        console.log('[API] 缓存为空或已过期，获取最新插件数据');
        cachedPlugins = await this.fetchComfyUIManagerPlugins();
        lastFetchTime = Date.now();
      }
      
      // 从缓存中查找插件
      pluginInfo = cachedPlugins.find((info: any) => info.id === pluginId);
      
      // 如果在缓存中找不到，尝试直接从源获取
      if (!pluginInfo) {
        console.log(`[API] 在缓存中未找到插件 ${pluginId}，尝试从源获取`);
        const url = 'https://raw.githubusercontent.com/ltdrdata/ComfyUI-Manager/main/custom-node-list.json';
        const response = await superagent.get(url);
        const managerData = JSON.parse(response.text);
        
        // 查找插件
        pluginInfo = managerData.custom_nodes.find((info: any) => info.id === pluginId);
      }
      
      if (!pluginInfo) {
        throw new Error(`未找到插件: ${pluginId}`);
      }

      console.log(`[API] 找到插件: ${JSON.stringify(pluginInfo)}`);

      
      // 更新进度
      taskProgressMap[taskId].progress = 20;
      taskProgressMap[taskId].message = '准备安装...';
      
      // 确定安装方法
      const installType = pluginInfo.install_type || 'git-clone';
      
      // 确定安装路径
      const targetDir = path.join(CUSTOM_NODES_PATH, pluginId);
      
      // 检查目录是否已存在
      if (fs.existsSync(targetDir)) {
        // 如果存在，备份并删除
        taskProgressMap[taskId].message = '检测到已有安装，正在备份...';
        const backupDir = `${targetDir}_backup_${Date.now()}`;
        fs.renameSync(targetDir, backupDir);
      }
      
      // 更新进度
      taskProgressMap[taskId].progress = 30;
      taskProgressMap[taskId].message = '正在下载插件...';
      
      // 根据安装类型执行安装
      if (installType === 'git-clone' && pluginInfo.github) {
        // 使用git clone安装
        try {
          await execPromise(`git clone "${githubProxy}${pluginInfo.github}" "${targetDir}"`);
        } catch (cloneError) {
          console.error(`[API] Git克隆失败: ${cloneError}`);
          
          // 尝试使用HTTPS替代可能的SSH或HTTP2
          const convertedUrl = pluginInfo.github
            .replace('git@github.com:', 'https://github.com/')
            .replace(/\.git$/, '');
          
          taskProgressMap[taskId].message = '尝试备用方式下载...';
          
          try {
            await execPromise(`git clone "${githubProxy}${convertedUrl}" "${targetDir}"`);
          } catch (retryError) {
            throw new Error(`git克隆失败: ${cloneError instanceof Error ? cloneError.message : String(cloneError)}. 备用方式也失败: ${retryError instanceof Error ? retryError.message : String(retryError)}`);
          }
        }
      } else if (installType === 'copy' && Array.isArray(pluginInfo.files)) {
        // 创建目标目录
        fs.mkdirSync(targetDir, { recursive: true });
        
        // 依次下载文件
        for (const file of pluginInfo.files) {
          const fileName = path.basename(file);
          const response = await superagent.get(file);
          const targetPath = path.join(targetDir, fileName);
          fs.writeFileSync(targetPath, response.text);
        }
      } else {
        throw new Error(`不支持的安装类型: ${installType}`);
      }
      
      // 安装依赖
      taskProgressMap[taskId].progress = 70;
      
      // 在开发环境下跳过依赖安装
      if (isDev) {
        taskProgressMap[taskId].message = '开发环境：跳过依赖安装...';
        console.log('[API] 开发环境：跳过依赖安装');
      } else {
        taskProgressMap[taskId].message = '检查依赖...';
        
        const requirementsPath = path.join(targetDir, 'requirements.txt');
        if (fs.existsSync(requirementsPath)) {
          taskProgressMap[taskId].message = '安装依赖...';
          await execPromise(`pip install -r "${requirementsPath}"`);
        }
        
        // 执行安装脚本
        const installScriptPath = path.join(targetDir, 'install.py');
        if (fs.existsSync(installScriptPath)) {
          taskProgressMap[taskId].message = '执行安装脚本...';
          await execPromise(`cd "${targetDir}" && python3 "${installScriptPath}"`);
        }
      }
      
      // 完成安装
      taskProgressMap[taskId].progress = 100;
      taskProgressMap[taskId].completed = true;
      taskProgressMap[taskId].message = '安装完成！';
      
      // 记录安装时间
      const now = new Date();
      taskProgressMap[taskId].message = `安装完成于 ${now.toLocaleString()}`;
      
      // 安装完成后刷新缓存
      await this.onPluginOperationCompleted(taskId);
      
    } catch (error) {
      console.error(`[API] 安装插件失败: ${error}`);
      taskProgressMap[taskId].progress = 0;
      taskProgressMap[taskId].completed = true;
      taskProgressMap[taskId].message = `安装失败: ${error instanceof Error ? error.message : '未知错误'}`;
      
      // 清理可能部分创建的目录
      const targetDir = path.join(CUSTOM_NODES_PATH, pluginId);
      if (fs.existsSync(targetDir)) {
        try {
          // 重命名为失败目录，而不是直接删除（为了调试）
          const failedDir = `${targetDir}_failed_${Date.now()}`;
          fs.renameSync(targetDir, failedDir);
          console.log(`[API] 已将失败的安装目录重命名为: ${failedDir}`);
        } catch (cleanupError) {
          console.error(`[API] 清理失败的安装目录失败: ${cleanupError}`);
        }
      }
    }
  }

  // 卸载插件
  async uninstallPlugin(ctx: Context): Promise<void> {
    const { pluginId } = ctx.request.body as { pluginId: string };
    console.log(`[API] 请求卸载插件: ${pluginId}`);
    
    const taskId = uuidv4();
    
    // 创建任务并初始化进度
    taskProgressMap[taskId] = {
      progress: 0,
      completed: false,
      pluginId,
      type: 'uninstall'
    };
    
    // 实际卸载插件任务
    this.uninstallPluginTask(taskId, pluginId);
    
    ctx.body = {
      success: true,
      message: '开始卸载插件',
      taskId
    };
  }

  // 实际卸载插件任务
  private async uninstallPluginTask(taskId: string, pluginId: string): Promise<void> {
    try {
      // 更新进度
      taskProgressMap[taskId].progress = 10;
      taskProgressMap[taskId].message = '准备卸载...';
      
      // 确定插件路径
      const pluginPath = path.join(CUSTOM_NODES_PATH, pluginId);
      
      // 检查目录是否存在
      if (!fs.existsSync(pluginPath)) {
        throw new Error(`插件目录不存在: ${pluginPath}`);
      }
      
      // 更新进度
      taskProgressMap[taskId].progress = 30;
      taskProgressMap[taskId].message = '正在卸载插件...';
      
      // 创建备份（仅用于恢复）
      const backupDir = `${pluginPath}_backup_${Date.now()}`;
      fs.renameSync(pluginPath, backupDir);
      
      // 更新进度
      taskProgressMap[taskId].progress = 70;
      taskProgressMap[taskId].message = '清理临时文件...';
      
      // 在生产环境中可能需要延迟删除备份
      // 此处为了简单，暂时保留备份
      
      // 完成卸载
      taskProgressMap[taskId].progress = 100;
      taskProgressMap[taskId].completed = true;
      taskProgressMap[taskId].message = '卸载完成！';
      
      // 卸载完成后刷新缓存
      await this.onPluginOperationCompleted(taskId);
      
    } catch (error) {
      console.error(`[API] 卸载插件失败: ${error}`);
      taskProgressMap[taskId].progress = 0;
      taskProgressMap[taskId].completed = true;
      taskProgressMap[taskId].message = `卸载失败: ${error instanceof Error ? error.message : '未知错误'}`;
    }
  }

  // 获取插件操作进度
  async getPluginProgress(ctx: Context): Promise<void> {
    const { taskId } = ctx.params;
    
    if (!taskProgressMap[taskId]) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '找不到该任务'
      };
      return;
    }
    
    ctx.body = {
      ...taskProgressMap[taskId]
    };
  }

  // 更新 GitHub 统计数据（星数）
  private async updateGitHubStats(plugins: any[]): Promise<void> {
    try {
      // 获取所有需要更新统计的插件
      const pluginsToUpdate = plugins.filter(plugin => 
        plugin.github && 
        (!githubStatsCache[plugin.github] || 
         Date.now() - githubStatsCache[plugin.github].updatedAt > GITHUB_STATS_CACHE_DURATION)
      );
      
      if (pluginsToUpdate.length === 0) {
        console.log('[API] 无需更新 GitHub 统计数据');
        return;
      }
      
      console.log(`[API] 开始更新 ${pluginsToUpdate.length} 个插件的 GitHub 统计数据`);
      
      // 限制并发请求数量，避免 GitHub API 速率限制
      const concurrentLimit = 5;
      const chunks = [];
      for (let i = 0; i < pluginsToUpdate.length; i += concurrentLimit) {
        chunks.push(pluginsToUpdate.slice(i, i + concurrentLimit));
      }
      
      for (const chunk of chunks) {
        await Promise.all(chunk.map(plugin => this.updateSinglePluginStats(plugin)));
        // 添加延迟以避免 GitHub API 速率限制
        await new Promise(resolve => setTimeout(resolve, 1000 * 20));
      }
      
      console.log('[API] GitHub 统计数据更新完成');
    } catch (error) {
      console.error('[API] 更新 GitHub 统计数据失败:', error);
    }
  }
  
  // 更新单个插件的 GitHub 统计数据
  private async updateSinglePluginStats(plugin: any): Promise<void> {
    try {
      if (!plugin.github) return;
      
      // 从 GitHub URL 中提取用户名和仓库名
      const githubUrl = plugin.github.trim();
      let repoPath = '';
      
      if (githubUrl.includes('github.com')) {
        const urlParts = githubUrl
          .replace('https://github.com/', '')
          .replace('http://github.com/', '')
          .replace('git@github.com:', '')
          .replace('.git', '')
          .split('/');
        
        if (urlParts.length >= 2) {
          repoPath = `${urlParts[0]}/${urlParts[1]}`;
        }
      }
      
      if (!repoPath) {
        console.log(`[API] 无法解析 GitHub 仓库路径: ${githubUrl}`);
        return;
      }
      
      // 构建 GitHub API 请求
      const apiUrl = `${GITHUB_API_BASE}/repos/${repoPath}`;
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ComfyUI-Plugin-Manager'
      };
      
      // 如果有 GitHub Token，添加到请求头
      if (GITHUB_TOKEN) {
        headers['Authorization'] = `token ${GITHUB_TOKEN}`;
      }
      
      // 发送请求获取仓库信息
      const response = await superagent.get(apiUrl).set(headers);
      const repoData = response.body;
      
      if (repoData && typeof repoData.stargazers_count === 'number') {
        // 更新插件的 star 数量
        plugin.stars = repoData.stargazers_count;
        
        // 更新缓存
        githubStatsCache[plugin.github] = {
          stars: repoData.stargazers_count,
          updatedAt: Date.now()
        };
        
        console.log(`[API] 更新插件 ${plugin.name} 的 star 数量: ${plugin.stars}`);
      }
    } catch (error) {
      console.error(`[API] 获取插件 ${plugin.name} 的 GitHub 统计数据失败:`, error);
    }
  }

  // 禁用插件
  async disablePlugin(ctx: Context): Promise<void> {
    const { pluginId } = ctx.request.body as { pluginId: string };
    console.log(`[API] 请求禁用插件: ${pluginId}`);
    
    const taskId = uuidv4();
    
    // 创建任务并初始化进度
    taskProgressMap[taskId] = {
      progress: 0,
      completed: false,
      pluginId,
      type: 'disable'
    };
    
    // 实际禁用插件任务
    this.disablePluginTask(taskId, pluginId);
    
    ctx.body = {
      success: true,
      message: '开始禁用插件',
      taskId
    };
  }

  // 实际禁用插件任务
  private async disablePluginTask(taskId: string, pluginId: string): Promise<void> {
    try {
      // 更新进度
      taskProgressMap[taskId].progress = 10;
      taskProgressMap[taskId].message = '准备禁用...';
      
      // 确定插件路径
      const pluginPath = path.join(CUSTOM_NODES_PATH, pluginId);
      const disabledPath = path.join(DISABLED_PLUGINS_PATH, pluginId);
      
      // 检查目录是否存在
      if (!fs.existsSync(pluginPath)) {
        throw new Error(`插件目录不存在: ${pluginPath}`);
      }
      
      // 确保禁用目录存在
      if (!fs.existsSync(DISABLED_PLUGINS_PATH)) {
        fs.mkdirSync(DISABLED_PLUGINS_PATH, { recursive: true });
      }
      
      // 检查禁用目录中是否已存在同名插件
      if (fs.existsSync(disabledPath)) {
        // 如果存在同名禁用插件，先删除它
        taskProgressMap[taskId].message = '删除已存在的禁用版本...';
        await fs.promises.rm(disabledPath, { recursive: true, force: true });
      }
      
      // 更新进度
      taskProgressMap[taskId].progress = 50;
      taskProgressMap[taskId].message = '正在移动插件到禁用目录...';
      
      // 移动插件到禁用目录
      await fs.promises.rename(pluginPath, disabledPath);
      
      // 完成禁用
      taskProgressMap[taskId].progress = 100;
      taskProgressMap[taskId].completed = true;
      taskProgressMap[taskId].message = '禁用完成！';
      
      // 禁用完成后刷新缓存
      await this.onPluginOperationCompleted(taskId);
      
    } catch (error) {
      console.error(`[API] 禁用插件失败: ${error}`);
      taskProgressMap[taskId].progress = 0;
      taskProgressMap[taskId].completed = true;
      taskProgressMap[taskId].message = `禁用失败: ${error instanceof Error ? error.message : '未知错误'}`;
    }
  }

  // 启用插件
  async enablePlugin(ctx: Context): Promise<void> {
    const { pluginId } = ctx.request.body as { pluginId: string };
    console.log(`[API] 请求启用插件: ${pluginId}`);
    
    const taskId = uuidv4();
    
    // 创建任务并初始化进度
    taskProgressMap[taskId] = {
      progress: 0,
      completed: false,
      pluginId,
      type: 'enable'
    };
    
    // 实际启用插件任务
    this.enablePluginTask(taskId, pluginId);
    
    ctx.body = {
      success: true,
      message: '开始启用插件',
      taskId
    };
  }

  // 实际启用插件任务
  private async enablePluginTask(taskId: string, pluginId: string): Promise<void> {
    try {
      // 更新进度
      taskProgressMap[taskId].progress = 10;
      taskProgressMap[taskId].message = '准备启用...';
      
      // 确定插件路径
      const disabledPath = path.join(DISABLED_PLUGINS_PATH, pluginId);
      const enabledPath = path.join(CUSTOM_NODES_PATH, pluginId);
      
      // 检查禁用目录是否存在
      if (!fs.existsSync(disabledPath)) {
        throw new Error(`禁用的插件目录不存在: ${disabledPath}`);
      }
      
      // 检查启用目录中是否已存在同名插件
      if (fs.existsSync(enabledPath)) {
        // 如果存在同名已启用插件，先删除它
        taskProgressMap[taskId].message = '删除已存在的启用版本...';
        await fs.promises.rm(enabledPath, { recursive: true, force: true });
      }
      
      // 更新进度
      taskProgressMap[taskId].progress = 50;
      taskProgressMap[taskId].message = '正在移动插件到启用目录...';
      
      // 移动插件到启用目录
      await fs.promises.rename(disabledPath, enabledPath);
      
      // 完成启用
      taskProgressMap[taskId].progress = 100;
      taskProgressMap[taskId].completed = true;
      taskProgressMap[taskId].message = '启用完成！';
      
      // 启用完成后刷新缓存
      await this.onPluginOperationCompleted(taskId);
      
    } catch (error) {
      console.error(`[API] 启用插件失败: ${error}`);
      taskProgressMap[taskId].progress = 0;
      taskProgressMap[taskId].completed = true;
      taskProgressMap[taskId].message = `启用失败: ${error instanceof Error ? error.message : '未知错误'}`;
    }
  }

  // 刷新插件缓存
  private async refreshPluginsCache() {
    try {
      console.log('[API] 刷新插件缓存');
      // 只更新安装状态，不强制从网络获取
      cachedPlugins = await this.fetchComfyUIManagerPlugins(false);
      lastFetchTime = Date.now();
      console.log(`[API] 插件缓存刷新完成，当前有 ${cachedPlugins.length} 个插件`);
    } catch (error) {
      console.error('[API] 刷新插件缓存失败:', error);
    }
  }

  // 安装插件完成后的回调
  private async onPluginOperationCompleted(taskId: string) {
    const task = taskProgressMap[taskId];
    if (task && task.completed && task.progress === 100) {
      console.log(`[API] 插件${task.type === 'install' ? '安装' : 
                         task.type === 'uninstall' ? '卸载' : 
                         task.type === 'disable' ? '禁用' : '启用'}完成，刷新缓存`);
      
      // 刷新插件缓存
      await this.refreshPluginsCache();
    }
  }

  // 更新本地插件列表
  async refreshInstalledPlugins(ctx: Context): Promise<void> {
    try {
      console.log('[API] 刷新本地插件列表');
      
      // 获取最新的已安装插件列表
      const installedPlugins = this.getInstalledPlugins();
      
      // 如果缓存为空或过期，先获取最新的ComfyUI-Manager插件列表
      if (cachedPlugins.length === 0 || (Date.now() - lastFetchTime) >= CACHE_DURATION) {
        await this.refreshPluginsCache();
      }
      
      // 更新缓存中已安装插件的状态
      if (cachedPlugins.length > 0) {
        // 创建一个映射以快速查找插件
        const installedMap = new Map();
        installedPlugins.forEach(plugin => {
          installedMap.set(plugin.id, {
            installed: true,
            installedOn: plugin.installedOn,
            disabled: plugin.disabled
          });
        });
        
        // 更新缓存中的插件状态
        cachedPlugins = cachedPlugins.map(plugin => {
          const installed = installedMap.get(plugin.id);
          if (installed) {
            return {
              ...plugin,
              installed: true,
              installedOn: installed.installedOn,
              disabled: installed.disabled
            };
          } else {
            return {
              ...plugin,
              installed: false,
              disabled: false
            };
          }
        });
        
        // 也更新本地安装但不在缓存中的插件
        installedPlugins.forEach(plugin => {
          if (!cachedPlugins.some(p => p.id === plugin.id)) {
            cachedPlugins.push(plugin);
          }
        });
      }
      
      ctx.body = {
        success: true,
        message: '已刷新插件列表',
        plugins: installedPlugins
      };
    } catch (error) {
      console.error(`[API] 刷新本地插件列表失败: ${error}`);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `刷新失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }
} 