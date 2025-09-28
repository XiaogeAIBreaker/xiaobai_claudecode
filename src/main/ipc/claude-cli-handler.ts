/**
 * Claude CLI API IPC处理器实现
 * 处理Claude CLI相关的IPC请求
 */

import { IpcMainInvokeEvent } from 'electron';
import { spawn } from 'child_process';
import { ipcRegistry, IpcHandler, createSuccessResponse, createErrorResponse } from '../ipc-handlers';

/**
 * Claude CLI安装状态接口
 */
interface ClaudeCliStatus {
  installed: boolean;
  version?: string;
  path?: string;
  compatible: boolean;
  recommendedAction: 'none' | 'install' | 'update';
  issues?: string[];
  metadata?: {
    globalInstall?: boolean;
    npmPackage?: string;
    configPath?: string;
    apiConfigured?: boolean;
  };
}

/**
 * Claude CLI安装请求接口
 */
interface InstallClaudeCliRequest {
  method?: 'npm' | 'auto';
  global?: boolean;
  force?: boolean;
}

interface InstallClaudeCliResponse {
  success: boolean;
  installedVersion?: string;
  installPath?: string;
  error?: string;
  warnings?: string[];
}

/**
 * Claude CLI配置请求接口
 */
interface ConfigureClaudeCliRequest {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  skipValidation?: boolean;
}

interface ConfigureClaudeCliResponse {
  success: boolean;
  configured: boolean;
  error?: string;
  validation?: {
    apiKeyValid: boolean;
    connectionTest: boolean;
  };
}

/**
 * Claude CLI管理器
 */
class ClaudeCliManager {
  private readonly packageName = '@anthropic-ai/claude-cli';
  private readonly minVersion = '1.0.0';
  private cachedStatus: ClaudeCliStatus | null = null;
  private cacheTimestamp = 0;
  private readonly cacheTimeout = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 检查Claude CLI安装状态
   */
  async checkInstallation(useCache = true): Promise<ClaudeCliStatus> {
    console.log('检查Claude CLI安装状态');

    // 检查缓存
    if (useCache && this.cachedStatus && Date.now() - this.cacheTimestamp < this.cacheTimeout) {
      console.log('使用缓存的Claude CLI状态');
      return this.cachedStatus;
    }

    try {
      const status = await this.performClaudeCliCheck();

      // 更新缓存
      this.cachedStatus = status;
      this.cacheTimestamp = Date.now();

      console.log('Claude CLI检查完成:', status);
      return status;

    } catch (error) {
      console.error('Claude CLI检查失败:', error);

      const errorStatus: ClaudeCliStatus = {
        installed: false,
        compatible: false,
        recommendedAction: 'install',
        issues: [error instanceof Error ? error.message : String(error)]
      };

      return errorStatus;
    }
  }

  /**
   * 执行实际的Claude CLI检查
   */
  private async performClaudeCliCheck(): Promise<ClaudeCliStatus> {
    // 检查Claude CLI是否已安装
    const claudeResult = await this.runCommand('claude', ['--version']);
    if (!claudeResult.success) {
      return {
        installed: false,
        compatible: false,
        recommendedAction: 'install',
        issues: ['Claude CLI未安装或不在PATH中'],
        metadata: {
          npmPackage: this.packageName
        }
      };
    }

    const versionOutput = claudeResult.stdout.trim();
    const version = this.extractVersion(versionOutput);
    const claudePath = await this.getClaudePath();

    // 检查版本兼容性
    const compatible = this.isVersionCompatible(version);

    // 检查是否通过npm全局安装
    const npmListResult = await this.runCommand('npm', ['list', '-g', '--depth=0', this.packageName]);
    const globalInstall = npmListResult.success && npmListResult.stdout.includes(this.packageName);

    // 检查API配置
    const configResult = await this.runCommand('claude', ['config', 'show']);
    const apiConfigured = configResult.success && !configResult.stdout.includes('No API key configured');

    // 确定推荐操作
    let recommendedAction: ClaudeCliStatus['recommendedAction'] = 'none';
    const issues: string[] = [];

    if (!compatible) {
      recommendedAction = 'update';
      issues.push(`Claude CLI版本过低 (${version})，建议更新到最新版本`);
    }

    if (!apiConfigured) {
      issues.push('Claude CLI API未配置，需要设置API密钥');
    }

    return {
      installed: true,
      version,
      path: claudePath,
      compatible,
      recommendedAction,
      issues: issues.length > 0 ? issues : undefined,
      metadata: {
        globalInstall,
        npmPackage: this.packageName,
        configPath: await this.getConfigPath(),
        apiConfigured
      }
    };
  }

  /**
   * 安装Claude CLI
   */
  async installCli(request: InstallClaudeCliRequest = {}): Promise<InstallClaudeCliResponse> {
    console.log('开始安装Claude CLI:', request);

    try {
      const method = request.method || 'npm';
      const global = request.global !== false; // 默认全局安装
      const force = request.force || false;

      // 检查是否已安装
      if (!force) {
        const status = await this.checkInstallation(false);
        if (status.installed && status.compatible) {
          return {
            success: true,
            installedVersion: status.version,
            installPath: status.path,
            warnings: ['Claude CLI已安装且版本兼容']
          };
        }
      }

      let installResult;
      if (method === 'npm') {
        installResult = await this.installViaNpm(global, force);
      } else {
        // 自动安装，优先npm
        installResult = await this.installViaNpm(global, force);
      }

      if (!installResult.success) {
        return {
          success: false,
          error: installResult.error
        };
      }

      // 验证安装
      const verifyResult = await this.runCommand('claude', ['--version']);
      if (!verifyResult.success) {
        return {
          success: false,
          error: '安装似乎成功了，但无法验证Claude CLI'
        };
      }

      const installedVersion = this.extractVersion(verifyResult.stdout.trim());
      const installPath = await this.getClaudePath();

      console.log(`Claude CLI安装成功: ${installedVersion}`);

      return {
        success: true,
        installedVersion,
        installPath
      };

    } catch (error) {
      console.error('安装Claude CLI失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 通过npm安装Claude CLI
   */
  private async installViaNpm(global: boolean, force: boolean): Promise<{ success: boolean; error?: string }> {
    const args = ['install'];

    if (global) {
      args.push('-g');
    }

    if (force) {
      args.push('--force');
    }

    args.push(this.packageName);

    console.log(`通过npm安装Claude CLI: npm ${args.join(' ')}`);

    const result = await this.runCommand('npm', args);

    if (!result.success) {
      return {
        success: false,
        error: `npm安装失败: ${result.stderr}`
      };
    }

    return { success: true };
  }

  /**
   * 配置Claude CLI
   */
  async configureCli(request: ConfigureClaudeCliRequest): Promise<ConfigureClaudeCliResponse> {
    console.log('配置Claude CLI:', { ...request, apiKey: request.apiKey ? '[HIDDEN]' : undefined });

    try {
      const response: ConfigureClaudeCliResponse = {
        success: false,
        configured: false
      };

      // 检查Claude CLI是否已安装
      const status = await this.checkInstallation();
      if (!status.installed) {
        return {
          ...response,
          error: 'Claude CLI未安装，请先安装'
        };
      }

      // 配置API密钥
      if (request.apiKey) {
        const configResult = await this.runCommand('claude', ['config', 'set', 'api-key', request.apiKey]);
        if (!configResult.success) {
          return {
            ...response,
            error: `设置API密钥失败: ${configResult.stderr}`
          };
        }
      }

      // 配置基础URL
      if (request.baseUrl) {
        const configResult = await this.runCommand('claude', ['config', 'set', 'base-url', request.baseUrl]);
        if (!configResult.success) {
          return {
            ...response,
            error: `设置基础URL失败: ${configResult.stderr}`
          };
        }
      }

      // 配置超时时间
      if (request.timeout) {
        const configResult = await this.runCommand('claude', ['config', 'set', 'timeout', request.timeout.toString()]);
        if (!configResult.success) {
          return {
            ...response,
            error: `设置超时时间失败: ${configResult.stderr}`
          };
        }
      }

      response.success = true;
      response.configured = true;

      // 验证配置
      if (!request.skipValidation) {
        try {
          // 测试API连接
          const testResult = await this.runCommand('claude', ['auth', 'test'], 10000); // 10秒超时
          const connectionTest = testResult.success;
          const apiKeyValid = connectionTest && !testResult.stdout.includes('unauthorized');

          response.validation = {
            apiKeyValid,
            connectionTest
          };

          if (!connectionTest) {
            response.configured = false;
            console.warn('Claude CLI配置完成但连接测试失败');
          }

        } catch (error) {
          console.warn('Claude CLI配置验证失败:', error);
          response.validation = {
            apiKeyValid: false,
            connectionTest: false
          };
        }
      }

      console.log(`Claude CLI配置${response.configured ? '成功' : '完成但可能有问题'}`);
      return response;

    } catch (error) {
      console.error('配置Claude CLI失败:', error);
      return {
        success: false,
        configured: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 卸载Claude CLI
   */
  async uninstallCli(): Promise<{ success: boolean; error?: string }> {
    console.log('卸载Claude CLI');

    try {
      // 检查是否通过npm全局安装
      const npmListResult = await this.runCommand('npm', ['list', '-g', '--depth=0', this.packageName]);
      const globalInstall = npmListResult.success && npmListResult.stdout.includes(this.packageName);

      if (globalInstall) {
        const uninstallResult = await this.runCommand('npm', ['uninstall', '-g', this.packageName]);
        if (!uninstallResult.success) {
          return {
            success: false,
            error: `npm卸载失败: ${uninstallResult.stderr}`
          };
        }
      }

      // 验证卸载
      const verifyResult = await this.runCommand('claude', ['--version']);
      if (verifyResult.success) {
        return {
          success: false,
          error: 'Claude CLI卸载失败，仍然可以访问'
        };
      }

      console.log('Claude CLI卸载成功');
      this.clearCache();

      return { success: true };

    } catch (error) {
      console.error('卸载Claude CLI失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 获取Claude CLI路径
   */
  private async getClaudePath(): Promise<string | undefined> {
    try {
      const result = await this.runCommand('which', ['claude']);
      return result.success ? result.stdout.trim() : undefined;
    } catch {
      try {
        // Windows系统使用where命令
        const result = await this.runCommand('where', ['claude']);
        return result.success ? result.stdout.split('\n')[0].trim() : undefined;
      } catch {
        return undefined;
      }
    }
  }

  /**
   * 获取配置路径
   */
  private async getConfigPath(): Promise<string | undefined> {
    try {
      const result = await this.runCommand('claude', ['config', 'path']);
      return result.success ? result.stdout.trim() : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 提取版本号
   */
  private extractVersion(versionOutput: string): string {
    const match = versionOutput.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : versionOutput;
  }

  /**
   * 检查版本兼容性
   */
  private isVersionCompatible(version: string): boolean {
    // 简单的版本比较，实际应该使用semver库
    const [major, minor, patch] = version.split('.').map(Number);
    const [minMajor, minMinor, minPatch] = this.minVersion.split('.').map(Number);

    if (major > minMajor) return true;
    if (major < minMajor) return false;
    if (minor > minMinor) return true;
    if (minor < minMinor) return false;
    return patch >= minPatch;
  }

  /**
   * 运行命令
   */
  private runCommand(command: string, args: string[] = [], timeout = 30000): Promise<{
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
      }, timeout);
    });
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cachedStatus = null;
    this.cacheTimestamp = 0;
    console.log('Claude CLI状态缓存已清除');
  }

  /**
   * 获取缓存状态
   */
  getCachedStatus(): ClaudeCliStatus | null {
    if (this.cachedStatus && Date.now() - this.cacheTimestamp < this.cacheTimeout) {
      return this.cachedStatus;
    }
    return null;
  }
}

/**
 * 全局Claude CLI管理器实例
 */
const claudeCliManager = new ClaudeCliManager();

/**
 * 处理检查Claude CLI安装状态的请求
 */
async function handleCheckInstallation(event: IpcMainInvokeEvent, useCache = true): Promise<any> {
  console.log('处理检查Claude CLI安装状态请求');

  try {
    const status = await claudeCliManager.checkInstallation(useCache);
    return createSuccessResponse(status);

  } catch (error) {
    console.error('处理检查Claude CLI安装状态请求失败:', error);
    return createErrorResponse(
      'CLAUDE_CLI_CHECK_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 处理安装Claude CLI的请求
 */
async function handleInstallCli(
  event: IpcMainInvokeEvent,
  request: InstallClaudeCliRequest = {}
): Promise<any> {
  console.log('处理安装Claude CLI请求:', request);

  try {
    const result = await claudeCliManager.installCli(request);
    return createSuccessResponse(result);

  } catch (error) {
    console.error('处理安装Claude CLI请求失败:', error);
    return createErrorResponse(
      'INSTALL_CLAUDE_CLI_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 处理配置Claude CLI的请求
 */
async function handleConfigureCli(
  event: IpcMainInvokeEvent,
  request: ConfigureClaudeCliRequest
): Promise<any> {
  console.log('处理配置Claude CLI请求');

  try {
    const result = await claudeCliManager.configureCli(request);
    return createSuccessResponse(result);

  } catch (error) {
    console.error('处理配置Claude CLI请求失败:', error);
    return createErrorResponse(
      'CONFIGURE_CLAUDE_CLI_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 处理卸载Claude CLI的请求
 */
async function handleUninstallCli(event: IpcMainInvokeEvent): Promise<any> {
  console.log('处理卸载Claude CLI请求');

  try {
    const result = await claudeCliManager.uninstallCli();
    return createSuccessResponse(result);

  } catch (error) {
    console.error('处理卸载Claude CLI请求失败:', error);
    return createErrorResponse(
      'UNINSTALL_CLAUDE_CLI_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 清除Claude CLI状态缓存
 */
async function handleClearCache(event: IpcMainInvokeEvent): Promise<any> {
  try {
    claudeCliManager.clearCache();
    return createSuccessResponse({ cleared: true });

  } catch (error) {
    console.error('清除Claude CLI状态缓存失败:', error);
    return createErrorResponse(
      'CLEAR_CACHE_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 获取缓存的Claude CLI状态
 */
async function handleGetCachedStatus(event: IpcMainInvokeEvent): Promise<any> {
  try {
    const status = claudeCliManager.getCachedStatus();
    return createSuccessResponse(status);

  } catch (error) {
    console.error('获取缓存的Claude CLI状态失败:', error);
    return createErrorResponse(
      'GET_CACHED_STATUS_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Claude CLI API IPC处理器定义
 */
const claudeCliHandlers: IpcHandler[] = [
  {
    channel: 'installer:claude-cli:check-installation',
    handler: handleCheckInstallation
  },
  {
    channel: 'installer:claude-cli:install',
    handler: handleInstallCli
  },
  {
    channel: 'installer:claude-cli:configure',
    handler: handleConfigureCli
  },
  {
    channel: 'installer:claude-cli:uninstall',
    handler: handleUninstallCli
  },
  {
    channel: 'installer:claude-cli:clear-cache',
    handler: handleClearCache
  },
  {
    channel: 'installer:claude-cli:get-cached-status',
    handler: handleGetCachedStatus
  }
];

/**
 * 注册Claude CLI API处理器
 */
export function registerClaudeCliHandlers(): void {
  console.log('注册Claude CLI API处理器...');

  claudeCliHandlers.forEach(handler => {
    try {
      ipcRegistry.register(handler);
    } catch (error) {
      console.error(`注册Claude CLI API处理器失败 [${handler.channel}]:`, error);
    }
  });

  console.log('Claude CLI API处理器注册完成');
}

/**
 * 注销Claude CLI API处理器
 */
export function unregisterClaudeCliHandlers(): void {
  console.log('注销Claude CLI API处理器...');

  claudeCliHandlers.forEach(handler => {
    try {
      ipcRegistry.unregister(handler.channel);
    } catch (error) {
      console.error(`注销Claude CLI API处理器失败 [${handler.channel}]:`, error);
    }
  });

  console.log('Claude CLI API处理器注销完成');
}

/**
 * 获取Claude CLI管理器实例（用于其他模块）
 */
export function getClaudeCliManager(): ClaudeCliManager {
  return claudeCliManager;
}

/**
 * 导出类型定义
 */
export type {
  ClaudeCliStatus,
  InstallClaudeCliRequest,
  InstallClaudeCliResponse,
  ConfigureClaudeCliRequest,
  ConfigureClaudeCliResponse
};