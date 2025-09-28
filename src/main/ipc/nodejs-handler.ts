/**
 * Node.js API IPC处理器实现
 * 处理Node.js相关的IPC请求
 */

import { IpcMainInvokeEvent } from 'electron';
import { spawn } from 'child_process';
import { ipcRegistry, IpcHandler, createSuccessResponse, createErrorResponse } from '../ipc-handlers';

/**
 * Node.js安装状态接口
 */
interface NodeInstallationStatus {
  installed: boolean;
  version?: string;
  path?: string;
  npmVersion?: string;
  compatible: boolean;
  recommendedAction: 'none' | 'install' | 'update';
  issues?: string[];
  metadata?: {
    architecture?: string;
    platform?: string;
    globalPath?: string;
    registry?: string;
  };
}

/**
 * npm镜像源设置请求接口
 */
interface SetRegistryRequest {
  registry: string;
  scope?: string;
}

interface SetRegistryResponse {
  success: boolean;
  previousRegistry?: string;
  error?: string;
}

/**
 * Node.js管理器
 */
class NodeJsManager {
  private readonly minNodeVersion = 18; // 最低Node.js版本要求
  private cachedStatus: NodeInstallationStatus | null = null;
  private cacheTimestamp = 0;
  private readonly cacheTimeout = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 检查Node.js安装状态
   */
  async checkInstallation(useCache = true): Promise<NodeInstallationStatus> {
    console.log('检查Node.js安装状态');

    // 检查缓存
    if (useCache && this.cachedStatus && Date.now() - this.cacheTimestamp < this.cacheTimeout) {
      console.log('使用缓存的Node.js状态');
      return this.cachedStatus;
    }

    try {
      const status = await this.performNodeCheck();

      // 更新缓存
      this.cachedStatus = status;
      this.cacheTimestamp = Date.now();

      console.log('Node.js检查完成:', status);
      return status;

    } catch (error) {
      console.error('Node.js检查失败:', error);

      const errorStatus: NodeInstallationStatus = {
        installed: false,
        compatible: false,
        recommendedAction: 'install',
        issues: [error instanceof Error ? error.message : String(error)]
      };

      return errorStatus;
    }
  }

  /**
   * 执行实际的Node.js检查
   */
  private async performNodeCheck(): Promise<NodeInstallationStatus> {
    // 检查Node.js
    const nodeResult = await this.runCommand('node', ['--version']);
    if (!nodeResult.success) {
      return {
        installed: false,
        compatible: false,
        recommendedAction: 'install',
        issues: ['Node.js未安装或不在PATH中']
      };
    }

    const nodeVersion = nodeResult.stdout.trim();
    const nodePath = await this.getNodePath();

    // 检查npm
    const npmResult = await this.runCommand('npm', ['--version']);
    const npmVersion = npmResult.success ? npmResult.stdout.trim() : undefined;

    // 检查版本兼容性
    const majorVersion = this.extractMajorVersion(nodeVersion);
    const compatible = majorVersion >= this.minNodeVersion;

    // 获取npm配置
    const registry = await this.getNpmRegistry();
    const globalPath = await this.getNpmGlobalPath();

    // 确定推荐操作
    let recommendedAction: NodeInstallationStatus['recommendedAction'] = 'none';
    const issues: string[] = [];

    if (!compatible) {
      recommendedAction = 'update';
      issues.push(`Node.js版本过低 (${nodeVersion})，需要${this.minNodeVersion}或更高版本`);
    }

    if (!npmVersion) {
      issues.push('npm未安装或不可用');
      if (recommendedAction === 'none') {
        recommendedAction = 'install';
      }
    }

    return {
      installed: true,
      version: nodeVersion,
      path: nodePath,
      npmVersion,
      compatible,
      recommendedAction,
      issues: issues.length > 0 ? issues : undefined,
      metadata: {
        architecture: process.arch,
        platform: process.platform,
        globalPath,
        registry
      }
    };
  }

  /**
   * 设置npm镜像源
   */
  async setRegistry(request: SetRegistryRequest): Promise<SetRegistryResponse> {
    console.log('设置npm镜像源:', request);

    try {
      // 获取当前镜像源
      const currentRegistry = await this.getNpmRegistry();

      // 构建npm config命令
      const args = ['config', 'set', 'registry', request.registry];

      // 如果指定了scope，设置scope特定的镜像源
      if (request.scope) {
        args.splice(2, 0, `${request.scope}:registry`);
      }

      const result = await this.runCommand('npm', args);

      if (!result.success) {
        return {
          success: false,
          error: `设置镜像源失败: ${result.stderr}`
        };
      }

      // 验证设置是否成功
      const newRegistry = await this.getNpmRegistry();
      const success = newRegistry === request.registry;

      console.log(`npm镜像源设置${success ? '成功' : '失败'}: ${newRegistry}`);

      return {
        success,
        previousRegistry: currentRegistry,
        error: success ? undefined : '镜像源设置未生效'
      };

    } catch (error) {
      console.error('设置npm镜像源失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 自动配置中国镜像源
   */
  async setupChinaMirrors(): Promise<{ success: boolean; changes: string[]; errors: string[] }> {
    console.log('自动配置中国镜像源');

    const changes: string[] = [];
    const errors: string[] = [];

    try {
      // 设置npm主镜像源
      const npmResult = await this.setRegistry({
        registry: 'https://registry.npmmirror.com/'
      });

      if (npmResult.success) {
        changes.push('npm主镜像源设置为淘宝镜像');
      } else {
        errors.push(`npm镜像源设置失败: ${npmResult.error}`);
      }

      // 设置常用scope的镜像源
      const scopes = [
        { scope: '@anthropic-ai', registry: 'https://registry.npmjs.org/' }, // Anthropic包使用官方源
        { scope: '@types', registry: 'https://registry.npmmirror.com/' },
        { scope: '@babel', registry: 'https://registry.npmmirror.com/' },
        { scope: '@electron', registry: 'https://registry.npmmirror.com/' }
      ];

      for (const scopeConfig of scopes) {
        try {
          const result = await this.runCommand('npm', [
            'config', 'set', `${scopeConfig.scope}:registry`, scopeConfig.registry
          ]);

          if (result.success) {
            changes.push(`${scopeConfig.scope} 镜像源配置完成`);
          } else {
            errors.push(`${scopeConfig.scope} 镜像源配置失败`);
          }
        } catch (error) {
          errors.push(`${scopeConfig.scope} 镜像源配置异常: ${error}`);
        }
      }

      // 设置其他加速配置
      const configs = [
        { key: 'disturl', value: 'https://npmmirror.com/mirrors/node/' },
        { key: 'electron_mirror', value: 'https://npmmirror.com/mirrors/electron/' },
        { key: 'python_mirror', value: 'https://npmmirror.com/mirrors/python/' }
      ];

      for (const config of configs) {
        try {
          const result = await this.runCommand('npm', [
            'config', 'set', config.key, config.value
          ]);

          if (result.success) {
            changes.push(`${config.key} 配置完成`);
          }
        } catch (error) {
          // 这些配置失败不是致命错误
          console.warn(`配置 ${config.key} 失败:`, error);
        }
      }

      console.log(`中国镜像源配置完成: ${changes.length} 项成功, ${errors.length} 项失败`);

      return {
        success: errors.length === 0,
        changes,
        errors
      };

    } catch (error) {
      console.error('配置中国镜像源异常:', error);
      return {
        success: false,
        changes,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 获取Node.js路径
   */
  private async getNodePath(): Promise<string | undefined> {
    try {
      const result = await this.runCommand('which', ['node']);
      return result.success ? result.stdout.trim() : undefined;
    } catch {
      try {
        // Windows系统使用where命令
        const result = await this.runCommand('where', ['node']);
        return result.success ? result.stdout.split('\n')[0].trim() : undefined;
      } catch {
        return undefined;
      }
    }
  }

  /**
   * 获取当前npm镜像源
   */
  private async getNpmRegistry(): Promise<string | undefined> {
    try {
      const result = await this.runCommand('npm', ['config', 'get', 'registry']);
      return result.success ? result.stdout.trim() : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 获取npm全局安装路径
   */
  private async getNpmGlobalPath(): Promise<string | undefined> {
    try {
      const result = await this.runCommand('npm', ['config', 'get', 'prefix']);
      return result.success ? result.stdout.trim() : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 提取主版本号
   */
  private extractMajorVersion(version: string): number {
    const match = version.match(/v?(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * 运行命令
   */
  private runCommand(command: string, args: string[] = []): Promise<{
    success: boolean;
    stdout: string;
    stderr: string;
    code: number | null;
  }> {
    return new Promise((resolve) => {
      console.log(`执行命令: ${command} ${args.join(' ')}`);

      const child = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const success = code === 0;
        console.log(`命令执行${success ? '成功' : '失败'}: ${command} (exit code: ${code})`);

        resolve({
          success,
          stdout,
          stderr,
          code
        });
      });

      child.on('error', (error) => {
        console.error(`命令执行异常: ${command}`, error);
        resolve({
          success: false,
          stdout,
          stderr: error.message,
          code: null
        });
      });

      // 设置超时
      setTimeout(() => {
        if (!child.killed) {
          child.kill();
          resolve({
            success: false,
            stdout,
            stderr: '命令执行超时',
            code: null
          });
        }
      }, 30000); // 30秒超时
    });
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cachedStatus = null;
    this.cacheTimestamp = 0;
    console.log('Node.js状态缓存已清除');
  }

  /**
   * 获取缓存状态
   */
  getCachedStatus(): NodeInstallationStatus | null {
    if (this.cachedStatus && Date.now() - this.cacheTimestamp < this.cacheTimeout) {
      return this.cachedStatus;
    }
    return null;
  }
}

/**
 * 全局Node.js管理器实例
 */
const nodeJsManager = new NodeJsManager();

/**
 * 处理检查Node.js安装状态的请求
 */
async function handleCheckInstallation(event: IpcMainInvokeEvent, useCache = true): Promise<any> {
  console.log('处理检查Node.js安装状态请求');

  try {
    const status = await nodeJsManager.checkInstallation(useCache);
    return createSuccessResponse(status);

  } catch (error) {
    console.error('处理检查Node.js安装状态请求失败:', error);
    return createErrorResponse(
      'NODEJS_CHECK_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 处理设置npm镜像源的请求
 */
async function handleSetRegistry(
  event: IpcMainInvokeEvent,
  request: SetRegistryRequest
): Promise<any> {
  console.log('处理设置npm镜像源请求:', request);

  try {
    // 验证请求参数
    if (!request.registry || typeof request.registry !== 'string') {
      throw new Error('registry 是必需的字符串参数');
    }

    // 验证URL格式
    try {
      new URL(request.registry);
    } catch {
      throw new Error(`无效的镜像源URL: ${request.registry}`);
    }

    const result = await nodeJsManager.setRegistry(request);
    return createSuccessResponse(result);

  } catch (error) {
    console.error('处理设置npm镜像源请求失败:', error);
    return createErrorResponse(
      'SET_REGISTRY_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 自动配置中国镜像源
 */
async function handleSetupChinaMirrors(event: IpcMainInvokeEvent): Promise<any> {
  console.log('处理自动配置中国镜像源请求');

  try {
    const result = await nodeJsManager.setupChinaMirrors();
    return createSuccessResponse(result);

  } catch (error) {
    console.error('处理自动配置中国镜像源请求失败:', error);
    return createErrorResponse(
      'SETUP_CHINA_MIRRORS_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 清除Node.js状态缓存
 */
async function handleClearCache(event: IpcMainInvokeEvent): Promise<any> {
  try {
    nodeJsManager.clearCache();
    return createSuccessResponse({ cleared: true });

  } catch (error) {
    console.error('清除Node.js状态缓存失败:', error);
    return createErrorResponse(
      'CLEAR_CACHE_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 获取缓存的Node.js状态
 */
async function handleGetCachedStatus(event: IpcMainInvokeEvent): Promise<any> {
  try {
    const status = nodeJsManager.getCachedStatus();
    return createSuccessResponse(status);

  } catch (error) {
    console.error('获取缓存的Node.js状态失败:', error);
    return createErrorResponse(
      'GET_CACHED_STATUS_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Node.js API IPC处理器定义
 */
const nodeJsHandlers: IpcHandler[] = [
  {
    channel: 'installer:nodejs:check-installation',
    handler: handleCheckInstallation
  },
  {
    channel: 'installer:nodejs:set-registry',
    handler: handleSetRegistry
  },
  {
    channel: 'installer:nodejs:setup-china-mirrors',
    handler: handleSetupChinaMirrors
  },
  {
    channel: 'installer:nodejs:clear-cache',
    handler: handleClearCache
  },
  {
    channel: 'installer:nodejs:get-cached-status',
    handler: handleGetCachedStatus
  }
];

/**
 * 注册Node.js API处理器
 */
export function registerNodeJsHandlers(): void {
  console.log('注册Node.js API处理器...');

  nodeJsHandlers.forEach(handler => {
    try {
      ipcRegistry.register(handler);
    } catch (error) {
      console.error(`注册Node.js API处理器失败 [${handler.channel}]:`, error);
    }
  });

  console.log('Node.js API处理器注册完成');
}

/**
 * 注销Node.js API处理器
 */
export function unregisterNodeJsHandlers(): void {
  console.log('注销Node.js API处理器...');

  nodeJsHandlers.forEach(handler => {
    try {
      ipcRegistry.unregister(handler.channel);
    } catch (error) {
      console.error(`注销Node.js API处理器失败 [${handler.channel}]:`, error);
    }
  });

  console.log('Node.js API处理器注销完成');
}

/**
 * 获取Node.js管理器实例（用于其他模块）
 */
export function getNodeJsManager(): NodeJsManager {
  return nodeJsManager;
}

/**
 * 导出类型定义
 */
export type {
  NodeInstallationStatus,
  SetRegistryRequest,
  SetRegistryResponse
};