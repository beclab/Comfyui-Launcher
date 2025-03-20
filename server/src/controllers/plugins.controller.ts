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

// 任务进度映射
const taskProgressMap: Record<string, { 
  progress: number, 
  completed: boolean,
  pluginId: string,
  type: 'install' | 'uninstall',
  message?: string
}> = {};

// 缓存插件列表
let cachedPlugins: any[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 3600000; // 1小时缓存

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
      
      // 从 ComfyUI-Manager 获取插件列表
      const pluginsData = await this.fetchComfyUIManagerPlugins();
      
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
  private async fetchComfyUIManagerPlugins(): Promise<any[]> {
    try {
      // ComfyUI-Manager 插件列表URL
      const url = 'https://raw.githubusercontent.com/ltdrdata/ComfyUI-Manager/main/custom-node-list.json';
      
      console.log('[API] 从ComfyUI-Manager获取插件列表');
      const response = await superagent.get(url);
      const managerData = JSON.parse(response.text);
      
      // 创建custom_nodes目录（如果不存在）
      if (!fs.existsSync(CUSTOM_NODES_PATH)) {
        fs.mkdirSync(CUSTOM_NODES_PATH, { recursive: true });
      }
      
      // 获取已安装插件列表
      const installedPlugins = this.getInstalledPlugins();
      
      // 正确解析custom_nodes数组
      const plugins = managerData.custom_nodes.map((info: any) => {
        // 检查插件是否已安装
        const installed = installedPlugins.some(plugin => 
          plugin.id === info.id || 
          plugin.name === info.title ||
          (info.reference && plugin.github === info.reference)
        );
        
        // 如果已安装，获取安装日期（如有）
        const installedPlugin = installedPlugins.find(plugin => 
          plugin.id === info.id || 
          plugin.name === info.title ||
          (info.reference && plugin.github === info.reference)
        );
        const installedDate = installedPlugin?.installedOn;
        
        return {
          id: info.id || `plugin-${Math.random().toString(36).substring(2, 9)}`,
          name: info.title || info.id || '未命名插件',
          description: info.description || '没有描述',
          version: info.version || '1.0.0',
          author: info.author || '未知作者',
          github: info.reference || '',
          stars: info.stars || 0,
          tags: info.tags || [],
          install_type: info.install_type || 'git_clone',
          files: info.files || [],
          require_restart: info.require_restart || false,
          installed,
          installedOn: installedDate,
          disabled: installedPlugin?.disabled || false
        };
      });
      
      // 找出在本地已安装但不在官方列表中的插件
      const officialIds = new Set(plugins.map((p: { id: string }) => p.id));
      const localOnlyPlugins = installedPlugins.filter(plugin => !officialIds.has(plugin.id));
      
      // 合并两个列表
      const allPlugins = [...plugins, ...localOnlyPlugins];
      
      console.log(`[API] 已获取 ${allPlugins.length} 个插件，其中本地独有 ${localOnlyPlugins.length} 个`);
      return allPlugins;
    } catch (error) {
      console.error('[API] 获取ComfyUI-Manager插件列表失败:', error);
      // 加载失败时返回默认/模拟数据
      return this.getInstalledPlugins();
    }
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
      
      // 读取所有插件目录
      const directories = fs.readdirSync(CUSTOM_NODES_PATH, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      for (const dir of directories) {
        // 跳过特殊目录
        if (dir.startsWith('.')) continue;
        
        const pluginPath = path.join(CUSTOM_NODES_PATH, dir);
        
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
        
        // 添加到已安装插件列表
        installedPlugins.push({
          id: dir,
          name: metadata.name || dir,
          description: metadata.description || `安装在 ${dir} 目录中的插件`,
          version: metadata.version || '1.0.0',
          author: metadata.author || '未知作者',
          github: repoUrl,
          installed: true,
          installedOn,
          disabled: false // TODO: 实现插件禁用状态检测
        });
      }
      
      return installedPlugins;
    } catch (error) {
      console.error(`[API] 获取已安装插件列表失败: ${error}`);
      return [];
    }
  }

  // 安装插件
  async installPlugin(ctx: Context): Promise<void> {
    const { pluginId } = ctx.request.body as { pluginId: string };
    console.log(`[API] 请求安装插件: ${pluginId}`);
    
    const taskId = uuidv4();
    
    // 创建任务并初始化进度
    taskProgressMap[taskId] = {
      progress: 0,
      completed: false,
      pluginId,
      type: 'install'
    };
    
    // 实际安装插件任务
    this.installPluginTask(taskId, pluginId);
    
    ctx.body = {
      success: true,
      message: '开始安装插件',
      taskId
    };
  }

  // 实际安装插件任务
  private async installPluginTask(taskId: string, pluginId: string): Promise<void> {
    try {
      // 更新进度
      taskProgressMap[taskId].progress = 10;
      taskProgressMap[taskId].message = '正在查找插件信息...';
      
      // 获取插件信息
      const url = 'https://raw.githubusercontent.com/ltdrdata/ComfyUI-Manager/main/custom-node-list.json';
      const response = await superagent.get(url);
      const managerData = JSON.parse(response.text);
      
      // 查找插件
      const pluginInfo = managerData.custom_nodes.find((info: any) => info.id === pluginId);
      if (!pluginInfo) {
        throw new Error(`未找到插件: ${pluginId}`);
      }
      
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
      if (installType === 'git-clone' && pluginInfo.reference) {
        // 使用git clone安装
        try {
          await execPromise(`git clone "${pluginInfo.reference}" "${targetDir}"`);
        } catch (cloneError) {
          console.error(`[API] Git克隆失败: ${cloneError}`);
          
          // 尝试使用HTTPS替代可能的SSH或HTTP2
          const convertedUrl = pluginInfo.reference
            .replace('git@github.com:', 'https://github.com/')
            .replace(/\.git$/, '');
          
          taskProgressMap[taskId].message = '尝试备用方式下载...';
          
          try {
            await execPromise(`git clone "${convertedUrl}" "${targetDir}"`);
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
        await execPromise(`cd "${targetDir}" && python "${installScriptPath}"`);
      }
      
      // 完成安装
      taskProgressMap[taskId].progress = 100;
      taskProgressMap[taskId].completed = true;
      taskProgressMap[taskId].message = '安装完成！';
      
      // 记录安装时间
      const now = new Date();
      taskProgressMap[taskId].message = `安装完成于 ${now.toLocaleString()}`;
      
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
} 