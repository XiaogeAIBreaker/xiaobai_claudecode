/**
 * Node.js管理服务
 * 负责Node.js环境管理，镜像源自动配置
 */

import { getNodeJsManager } from '../main/ipc/nodejs-handler';
import { NodeInstallationStatus } from '../main/ipc/nodejs-handler';

/**
 * Node.js安装选项接口
 */
interface NodeJsInstallOptions {
  version?: string;
  method?: 'nvm' | 'official' | 'auto';
  force?: boolean;
  setupMirrors?: boolean;
}

/**
 * Node.js安装结果接口
 */
interface NodeJsInstallResult {
  success: boolean;
  installedVersion?: string;
  installPath?: string;
  mirrorsConfigured?: boolean;
  warnings?: string[];
  error?: string;
}

/**
 * npm镜像配置接口
 */
interface NpmMirrorConfig {
  registry: string;
  disturl?: string;
  electronMirror?: string;
  pythonMirror?: string;
  scopeRegistries?: Record<string, string>;
}

/**
 * Node.js环境信息接口
 */
interface NodeJsEnvironment {
  node: {
    installed: boolean;
    version?: string;
    path?: string;
    compatible: boolean;
  };
  npm: {
    installed: boolean;
    version?: string;
    registry?: string;
    globalPath?: string;
  };
  environment: {
    pathConfigured: boolean;
    permissionsOk: boolean;
    diskSpace?: number;
  };
  recommendations: string[];
}

/**
 * Node.js管理服务类
 */
export class NodeJsService {
  private nodeJsManager = getNodeJsManager();
  private readonly minNodeVersion = 18;
  private readonly recommendedNodeVersion = '20.x';

  /**
   * 检查Node.js环境
   */
  async checkEnvironment(): Promise<NodeJsEnvironment> {
    console.log('检查Node.js环境');

    try {
      const status = await this.nodeJsManager.checkInstallation(false);

      // 检查PATH配置
      const pathConfigured = await this.checkPathConfiguration();

      // 检查权限
      const permissionsOk = await this.checkPermissions();

      // 检查磁盘空间
      const diskSpace = await this.checkDiskSpace();

      // 生成建议
      const recommendations = this.generateEnvironmentRecommendations(status, pathConfigured, permissionsOk);

      const environment: NodeJsEnvironment = {
        node: {
          installed: status.installed,
          version: status.version,
          path: status.path,
          compatible: status.compatible
        },
        npm: {
          installed: !!status.npmVersion,
          version: status.npmVersion,
          registry: status.metadata?.registry,
          globalPath: status.metadata?.globalPath
        },
        environment: {
          pathConfigured,
          permissionsOk,
          diskSpace
        },
        recommendations
      };

      console.log('Node.js环境检查完成:', {
        nodeInstalled: environment.node.installed,
        npmInstalled: environment.npm.installed,
        compatible: environment.node.compatible
      });

      return environment;

    } catch (error) {
      console.error('Node.js环境检查失败:', error);

      return {
        node: { installed: false, compatible: false },
        npm: { installed: false },
        environment: { pathConfigured: false, permissionsOk: false },
        recommendations: [
          '环境检查失败，建议手动检查Node.js安装',
          error instanceof Error ? error.message : String(error)
        ]
      };
    }
  }

  /**
   * 自动安装Node.js
   */
  async installNodeJs(options: NodeJsInstallOptions = {}): Promise<NodeJsInstallResult> {
    console.log('开始安装Node.js:', options);

    try {
      // 检查是否已安装且兼容
      if (!options.force) {
        const status = await this.nodeJsManager.checkInstallation(false);
        if (status.installed && status.compatible) {
          const result: NodeJsInstallResult = {
            success: true,
            installedVersion: status.version,
            installPath: status.path,
            warnings: ['Node.js已安装且版本兼容']
          };

          // 配置镜像源
          if (options.setupMirrors !== false) {
            const mirrorsResult = await this.setupMirrors();
            result.mirrorsConfigured = mirrorsResult.success;
            if (!mirrorsResult.success) {
              result.warnings = result.warnings || [];
              result.warnings.push('镜像源配置失败');
            }
          }

          return result;
        }
      }

      // 选择安装方法
      const method = options.method || await this.selectBestInstallMethod();
      console.log(`使用安装方法: ${method}`);

      let installResult: NodeJsInstallResult;

      switch (method) {
        case 'nvm':
          installResult = await this.installViaNodeVersionManager(options.version);
          break;
        case 'official':
          installResult = await this.installViaOfficialInstaller(options.version);
          break;
        default:
          installResult = await this.autoInstall(options.version);
      }

      // 配置镜像源
      if (installResult.success && options.setupMirrors !== false) {
        const mirrorsResult = await this.setupMirrors();
        installResult.mirrorsConfigured = mirrorsResult.success;
        if (!mirrorsResult.success) {
          installResult.warnings = installResult.warnings || [];
          installResult.warnings.push('Node.js安装成功但镜像源配置失败');
        }
      }

      // 验证安装
      if (installResult.success) {
        const verification = await this.verifyInstallation();
        if (!verification.success) {
          installResult.success = false;
          installResult.error = '安装验证失败: ' + verification.error;
        }
      }

      console.log(`Node.js安装${installResult.success ? '成功' : '失败'}`);
      return installResult;

    } catch (error) {
      console.error('Node.js安装失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 配置npm镜像源
   */
  async setupMirrors(): Promise<{ success: boolean; changes: string[]; errors: string[] }> {
    console.log('配置npm镜像源');

    try {
      const result = await this.nodeJsManager.setupChinaMirrors();

      console.log(`镜像源配置完成: ${result.changes.length} 项成功, ${result.errors.length} 项失败`);
      return result;

    } catch (error) {
      console.error('配置镜像源失败:', error);
      return {
        success: false,
        changes: [],
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 获取推荐的镜像配置
   */
  getRecommendedMirrorConfig(): NpmMirrorConfig {
    // 检测用户地区
    const isChina = this.detectChinaUser();

    if (isChina) {
      return {
        registry: 'https://registry.npmmirror.com/',
        disturl: 'https://npmmirror.com/mirrors/node/',
        electronMirror: 'https://npmmirror.com/mirrors/electron/',
        pythonMirror: 'https://npmmirror.com/mirrors/python/',
        scopeRegistries: {
          '@anthropic-ai': 'https://registry.npmjs.org/', // Anthropic包使用官方源
          '@types': 'https://registry.npmmirror.com/',
          '@babel': 'https://registry.npmmirror.com/',
          '@electron': 'https://registry.npmmirror.com/'
        }
      };
    } else {
      return {
        registry: 'https://registry.npmjs.org/',
        scopeRegistries: {}
      };
    }
  }

  /**
   * 应用镜像配置
   */
  async applyMirrorConfig(config: NpmMirrorConfig): Promise<{ success: boolean; applied: string[]; errors: string[] }> {
    console.log('应用镜像配置');

    const applied: string[] = [];
    const errors: string[] = [];

    try {
      // 设置主注册表
      const registryResult = await this.nodeJsManager.setRegistry({ registry: config.registry });
      if (registryResult.success) {
        applied.push(`主注册表: ${config.registry}`);
      } else {
        errors.push(`主注册表设置失败: ${registryResult.error}`);
      }

      // 设置scope注册表
      if (config.scopeRegistries) {
        for (const [scope, registry] of Object.entries(config.scopeRegistries)) {
          const scopeResult = await this.nodeJsManager.setRegistry({ registry, scope });
          if (scopeResult.success) {
            applied.push(`${scope}: ${registry}`);
          } else {
            errors.push(`${scope}注册表设置失败`);
          }
        }
      }

      // 设置其他配置
      if (config.disturl) {
        const distResult = await this.runNpmConfig('disturl', config.disturl);
        if (distResult.success) {
          applied.push(`disturl: ${config.disturl}`);
        } else {
          errors.push('disturl设置失败');
        }
      }

      if (config.electronMirror) {
        const electronResult = await this.runNpmConfig('electron_mirror', config.electronMirror);
        if (electronResult.success) {
          applied.push(`electron_mirror: ${config.electronMirror}`);
        } else {
          errors.push('electron_mirror设置失败');
        }
      }

      if (config.pythonMirror) {
        const pythonResult = await this.runNpmConfig('python_mirror', config.pythonMirror);
        if (pythonResult.success) {
          applied.push(`python_mirror: ${config.pythonMirror}`);
        } else {
          errors.push('python_mirror设置失败');
        }
      }

      const success = errors.length === 0;
      console.log(`镜像配置应用完成: ${applied.length} 项成功, ${errors.length} 项失败`);

      return { success, applied, errors };

    } catch (error) {
      console.error('应用镜像配置失败:', error);
      return {
        success: false,
        applied,
        errors: [...errors, error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 更新npm到最新版本
   */
  async updateNpm(): Promise<{ success: boolean; oldVersion?: string; newVersion?: string; error?: string }> {
    console.log('更新npm到最新版本');

    try {
      // 获取当前版本
      const currentStatus = await this.nodeJsManager.checkInstallation(false);
      const oldVersion = currentStatus.npmVersion;

      // 更新npm
      const updateResult = await this.runCommand('npm', ['install', '-g', 'npm@latest']);

      if (!updateResult.success) {
        return {
          success: false,
          oldVersion,
          error: updateResult.stderr
        };
      }

      // 验证新版本
      const newStatus = await this.nodeJsManager.checkInstallation(false);
      const newVersion = newStatus.npmVersion;

      console.log(`npm更新完成: ${oldVersion} → ${newVersion}`);

      return {
        success: true,
        oldVersion,
        newVersion
      };

    } catch (error) {
      console.error('npm更新失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 清理npm缓存
   */
  async cleanCache(): Promise<{ success: boolean; cacheSize?: string; error?: string }> {
    console.log('清理npm缓存');

    try {
      // 获取缓存大小
      const cacheSizeResult = await this.runCommand('npm', ['cache', 'verify']);
      const cacheSize = this.extractCacheSize(cacheSizeResult.stdout);

      // 清理缓存
      const cleanResult = await this.runCommand('npm', ['cache', 'clean', '--force']);

      if (!cleanResult.success) {
        return {
          success: false,
          error: cleanResult.stderr
        };
      }

      console.log(`npm缓存清理完成，释放空间: ${cacheSize}`);

      return {
        success: true,
        cacheSize
      };

    } catch (error) {
      console.error('npm缓存清理失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 选择最佳安装方法
   */
  private async selectBestInstallMethod(): Promise<'nvm' | 'official' | 'auto'> {
    // 检查是否已安装nvm/nvs
    const nvmResult = await this.runCommand('nvm', ['--version']);
    if (nvmResult.success) {
      return 'nvm';
    }

    const nvsResult = await this.runCommand('nvs', ['--version']);
    if (nvsResult.success) {
      return 'nvm'; // nvs也使用相同的逻辑
    }

    // 默认使用官方安装器
    return 'official';
  }

  /**
   * 通过Node版本管理器安装
   */
  private async installViaNodeVersionManager(version?: string): Promise<NodeJsInstallResult> {
    const targetVersion = version || this.recommendedNodeVersion;

    console.log(`通过版本管理器安装Node.js ${targetVersion}`);

    // 尝试nvm
    let result = await this.runCommand('nvm', ['install', targetVersion]);
    if (result.success) {
      await this.runCommand('nvm', ['use', targetVersion]);
      return {
        success: true,
        installedVersion: targetVersion,
        installPath: await this.getNodePath()
      };
    }

    // 尝试nvs
    result = await this.runCommand('nvs', ['add', targetVersion]);
    if (result.success) {
      await this.runCommand('nvs', ['use', targetVersion]);
      return {
        success: true,
        installedVersion: targetVersion,
        installPath: await this.getNodePath()
      };
    }

    return {
      success: false,
      error: '版本管理器安装失败'
    };
  }

  /**
   * 通过官方安装器安装
   */
  private async installViaOfficialInstaller(version?: string): Promise<NodeJsInstallResult> {
    console.log('通过官方安装器安装Node.js');

    // 这里应该引导用户下载并运行官方安装器
    // 由于是桌面应用，可以提供下载链接和安装指引

    return {
      success: false,
      error: '官方安装器安装需要用户手动操作，请引导用户到Node.js官网下载'
    };
  }

  /**
   * 自动安装
   */
  private async autoInstall(version?: string): Promise<NodeJsInstallResult> {
    console.log('自动安装Node.js');

    // 根据平台选择安装方法
    if (process.platform === 'darwin') {
      // macOS: 尝试使用Homebrew
      const brewResult = await this.runCommand('brew', ['install', 'node']);
      if (brewResult.success) {
        return {
          success: true,
          installedVersion: await this.getInstalledNodeVersion(),
          installPath: await this.getNodePath()
        };
      }
    }

    if (process.platform === 'linux') {
      // Linux: 尝试使用包管理器
      const aptResult = await this.runCommand('sudo', ['apt-get', 'install', '-y', 'nodejs', 'npm']);
      if (aptResult.success) {
        return {
          success: true,
          installedVersion: await this.getInstalledNodeVersion(),
          installPath: await this.getNodePath()
        };
      }
    }

    return {
      success: false,
      error: '自动安装失败，请手动安装Node.js'
    };
  }

  /**
   * 验证安装
   */
  private async verifyInstallation(): Promise<{ success: boolean; error?: string }> {
    try {
      const nodeResult = await this.runCommand('node', ['--version']);
      const npmResult = await this.runCommand('npm', ['--version']);

      if (!nodeResult.success) {
        return { success: false, error: 'Node.js验证失败' };
      }

      if (!npmResult.success) {
        return { success: false, error: 'npm验证失败' };
      }

      const nodeVersion = this.extractMajorVersion(nodeResult.stdout.trim());
      if (nodeVersion < this.minNodeVersion) {
        return { success: false, error: `Node.js版本过低: ${nodeVersion}` };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 检查PATH配置
   */
  private async checkPathConfiguration(): Promise<boolean> {
    try {
      const result = await this.runCommand('which', ['node']);
      return result.success;
    } catch {
      try {
        const result = await this.runCommand('where', ['node']);
        return result.success;
      } catch {
        return false;
      }
    }
  }

  /**
   * 检查权限
   */
  private async checkPermissions(): Promise<boolean> {
    try {
      // 检查npm全局安装权限
      const result = await this.runCommand('npm', ['config', 'get', 'prefix']);
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * 检查磁盘空间
   */
  private async checkDiskSpace(): Promise<number | undefined> {
    try {
      if (process.platform === 'win32') {
        const result = await this.runCommand('dir', ['/-c']);
        return this.extractDiskSpace(result.stdout);
      } else {
        const result = await this.runCommand('df', ['-h']);
        return this.extractDiskSpace(result.stdout);
      }
    } catch {
      return undefined;
    }
  }

  /**
   * 运行npm配置命令
   */
  private async runNpmConfig(key: string, value: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.runCommand('npm', ['config', 'set', key, value]);
      return { success: result.success, error: result.stderr };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 运行命令的辅助方法
   */
  private async runCommand(command: string, args: string[]): Promise<{
    success: boolean;
    stdout: string;
    stderr: string;
  }> {
    const { spawn } = require('child_process');

    return new Promise((resolve) => {
      const child = spawn(command, args, { shell: true });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code: number) => {
        resolve({
          success: code === 0,
          stdout,
          stderr
        });
      });

      child.on('error', () => {
        resolve({
          success: false,
          stdout,
          stderr: 'Command execution failed'
        });
      });
    });
  }

  /**
   * 获取Node.js路径
   */
  private async getNodePath(): Promise<string | undefined> {
    const result = await this.runCommand('which', ['node']);
    return result.success ? result.stdout.trim() : undefined;
  }

  /**
   * 获取已安装的Node.js版本
   */
  private async getInstalledNodeVersion(): Promise<string | undefined> {
    const result = await this.runCommand('node', ['--version']);
    return result.success ? result.stdout.trim() : undefined;
  }

  /**
   * 提取主版本号
   */
  private extractMajorVersion(version: string): number {
    const match = version.match(/v?(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * 提取缓存大小
   */
  private extractCacheSize(output: string): string {
    // 从npm cache verify输出中提取缓存大小
    const match = output.match(/Cache size:\s*([^\n]+)/i);
    return match ? match[1] : '未知';
  }

  /**
   * 提取磁盘空间
   */
  private extractDiskSpace(output: string): number {
    // 简化的磁盘空间提取逻辑
    const match = output.match(/(\d+)G?\s*available/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * 检测中国用户
   */
  private detectChinaUser(): boolean {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = process.env.LANG || 'en-US';

    return timezone.includes('Shanghai') ||
           timezone.includes('Beijing') ||
           language.startsWith('zh');
  }

  /**
   * 生成环境建议
   */
  private generateEnvironmentRecommendations(
    status: NodeInstallationStatus,
    pathConfigured: boolean,
    permissionsOk: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (!status.installed) {
      recommendations.push('Node.js未安装，需要安装Node.js ' + this.recommendedNodeVersion);
    } else if (!status.compatible) {
      recommendations.push(`Node.js版本过低 (${status.version})，建议升级到 ${this.recommendedNodeVersion}`);
    }

    if (!status.npmVersion) {
      recommendations.push('npm未安装，请确保Node.js安装包含npm');
    }

    if (!pathConfigured) {
      recommendations.push('Node.js未在PATH中配置，请检查环境变量设置');
    }

    if (!permissionsOk) {
      recommendations.push('npm权限配置有问题，可能影响全局包安装');
    }

    if (this.detectChinaUser() && status.metadata?.registry?.includes('npmjs.org')) {
      recommendations.push('建议配置npm中国镜像源以提高下载速度');
    }

    if (recommendations.length === 0) {
      recommendations.push('Node.js环境配置良好');
    }

    return recommendations;
  }
}

/**
 * 导出Node.js服务单例
 */
export const nodeJsService = new NodeJsService();

/**
 * 导出类型定义
 */
export type {
  NodeJsInstallOptions,
  NodeJsInstallResult,
  NpmMirrorConfig,
  NodeJsEnvironment
};