import { Context } from 'koa';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { PluginsController } from './plugins.controller';
import { pythonPath } from '../config';
import { execPromise } from '../utils/execPromise';

// 配置文件路径
const PIP_CONFIG_FILE = path.join(process.cwd(), 'pip.conf');

// 创建一个 PluginsController 实例来访问其方法
const pluginsController = new PluginsController();

/**
 * 获取PIP源地址
 */
export const getPipSource = async (ctx: Context) => {
  try {
    if (!fs.existsSync(PIP_CONFIG_FILE)) {
      return ctx.body = 'https://pypi.org/simple'; // 默认源
    }
    
    const content = fs.readFileSync(PIP_CONFIG_FILE, 'utf-8');
    const match = content.match(/index-url\s*=\s*(.+)/);
    if (match && match[1]) {
      return ctx.body = match[1].trim();
    }
    
    return ctx.body = 'https://pypi.org/simple'; // 默认源
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: `获取PIP源失败: ${error.message}` };
  }
};

/**
 * 设置PIP源地址
 */
export const setPipSource = async (ctx: any) => {
  try {
    // 添加类型断言
    const { source } = ctx.request.body as { source: string };
    if (!source) {
      ctx.status = 400;
      return ctx.body = { error: '源地址不能为空' };
    }
    
    const configContent = `[global]\nindex-url = ${source}\n`;
    fs.writeFileSync(PIP_CONFIG_FILE, configContent, 'utf-8');
    
    return ctx.body = { success: true, message: 'PIP源已更新' };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: `设置PIP源失败: ${error.message}` };
  }
};

/**
 * 运行Python命令并获取输出
 */
const runPythonCommand = (args: string[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 使用正确的Python路径，移除重复的python3参数
    const pythonExecutable = pythonPath || 'python3';
    const process = spawn(pythonExecutable, args);
    let output = '';
    let errorOutput = '';
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(errorOutput || `命令执行失败，退出码: ${code}`));
      }
    });
  });
};

/**
 * 获取已安装的包列表
 */
export const getInstalledPackages = async (ctx: Context) => {
  try {
    // 移除重复的python3前缀，因为spawn已经使用了pythonPath
    const output = await runPythonCommand(['-m', 'pip', 'list', '--format=json']);
    const packages = JSON.parse(output);
    return ctx.body = packages;
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: `获取已安装包列表失败: ${error.message}` };
  }
};

/**
 * 安装包
 */
export const installPackage = async (ctx: any) => {
  try {
    // 添加类型断言
    const { package: packageSpec } = ctx.request.body as { package: string };
    if (!packageSpec) {
      ctx.status = 400;
      return ctx.body = { error: '包名不能为空' };
    }
    
    // 拆分包规格为数组
    const parts = packageSpec.split(' ');
    const args = ['-m', 'pip', 'install', ...parts];
    
    const output = await runPythonCommand(args);
    return ctx.body = { success: true, message: '安装成功', output };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: `安装失败: ${error.message}` };
  }
};

/**
 * 卸载包
 */
export const uninstallPackage = async (ctx: any) => {
  try {
    // 添加类型断言
    const { package: packageName } = ctx.request.body as { package: string };
    if (!packageName) {
      ctx.status = 400;
      return ctx.body = { error: '包名不能为空' };
    }
    
    const output = await runPythonCommand(['-m', 'pip', 'uninstall', '-y', packageName]);
    return ctx.body = { success: true, message: '卸载成功', output };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: `卸载失败: ${error.message}` };
  }
};

/**
 * 解析插件依赖
 */
const parsePluginDependencies = (requirementsContent: string): Array<{name: string; version: string; missing?: boolean; versionMismatch?: boolean}> => {
  // 分割行并去除注释和空行
  const lines = requirementsContent
    .split('\n')
    .map(line => line.split('#')[0].trim())
    .filter(line => line.length > 0);
  
  const dependencies: Array<{name: string; version: string; missing?: boolean; versionMismatch?: boolean}> = [];
  
  for (const line of lines) {
    // 解析包名和版本要求
    const match = line.match(/^([a-zA-Z0-9_\-]+)([<>=!~].+)?$/);
    if (match) {
      dependencies.push({
        name: match[1],
        version: match[2] || ''
      });
    }
  }
  
  return dependencies;
};

/**
 * 分析插件依赖
 */
export const analyzePluginDependencies = async (ctx: any) => {
  try {
    // 使用 pluginsController 提供的方法
    const plugins = await pluginsController.getInstalledPluginsForPython();
    
    // 获取实际安装的Python包列表
    const installedPackages = await getInstalledPackagesData();
    
    const result = [];
    
    for (const plugin of plugins) {
      const pluginPath = pluginsController.getPluginPath(plugin.id);
      const requirementsPath = path.join(pluginPath, 'requirements.txt');
      
      let dependencies: Array<{name: string; version: string; missing?: boolean; versionMismatch?: boolean}> = [];
      let missingDeps: string[] = [];
      
      // 如果存在requirements.txt文件
      if (fs.existsSync(requirementsPath)) {
        const content = fs.readFileSync(requirementsPath, 'utf-8');
        dependencies = parsePluginDependencies(content);
        
        // 检查每个依赖是否已安装
        for (const dep of dependencies) {
          // 标准化包名：转换为小写并处理连字符和下划线
          const normalizedDepName = dep.name.toLowerCase();
          
          
          // 寻找匹配的已安装包，考虑连字符和下划线的互换
          const installed = installedPackages.find((pkg: {name: string; version: string}) => {
            const pkgName = pkg.name.toLowerCase();
            return pkgName === normalizedDepName || 
                   pkgName === normalizedDepName.replace(/-/g, '_') ||
                   pkgName === normalizedDepName.replace(/_/g, '-');
          });
          
          if (!installed) {
            dep.missing = true;
            missingDeps.push(dep.name);
          } else if (dep.version && !checkVersionCompatibility(installed.version, dep.version)) {
            dep.versionMismatch = true;
            missingDeps.push(dep.name);
          }
        }
      }
      
      result.push({
        plugin: plugin.id,
        dependencies,
        missingDeps
      });
    }
    
    return ctx.body = result;
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: `分析插件依赖失败: ${error.message}` };
  }
};

/**
 * 简单检查版本兼容性
 */
const checkVersionCompatibility = (installedVersion: string, requiredVersion: string): boolean => {
  // 这是一个简单版本，实际上需要更复杂的版本比较逻辑
  if (requiredVersion.startsWith('==')) {
    return installedVersion === requiredVersion.substring(2);
  }
  // 其他比较操作符需要更复杂的逻辑
  return true;
};

/**
 * 修复插件依赖
 */
export const fixPluginDependencies = async (ctx: any) => {
  try {
    // 添加类型断言
    const { plugin: pluginName } = ctx.request.body as { plugin: string };
    if (!pluginName) {
      ctx.status = 400;
      return ctx.body = { error: '插件名不能为空' };
    }
    
    const pluginPath = pluginsController.getPluginPath(pluginName);
    const requirementsPath = path.join(pluginPath, 'requirements.txt');
    
    if (!fs.existsSync(requirementsPath)) {
      ctx.status = 404;
      return ctx.body = { error: '未找到插件的requirements.txt文件' };
    }
    
    // 使用pip安装requirements.txt
    const output = await runPythonCommand(['-m', 'pip', 'install', '-r', requirementsPath]);
    
    return ctx.body = {
      success: true,
      message: '依赖修复成功',
      output
    };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: `修复依赖失败: ${error.message}` };
  }
};

// 在 python.controller.ts 中添加获取已安装Python包的方法
export const getInstalledPackagesData = async (): Promise<any[]> => {
  try {
    // 获取已安装的Python包列表
    const command = `${pythonPath || 'python3'} -m pip list --format=json`;
    const { stdout } = await execPromise(command);
    return JSON.parse(stdout);
  } catch (error) {
    console.error('[API] 获取已安装Python包列表失败:', error);
    return [];
  }
}; 