/**
 * Claude CLI检测和安装服务
 * 负责Claude CLI的检测、安装、配置和管理
 */

import { getClaudeCliManager } from '../main/ipc/claude-cli-handler';
import { ClaudeCliStatus, InstallClaudeCliRequest, ConfigureClaudeCliRequest } from '../main/ipc/claude-cli-handler';

/**
 * Claude CLI安装流程接口
 */
interface ClaudeCliInstallFlow {
  checkPrerequisites: boolean;
  installCli: boolean;
  configureCli: boolean;
  verifyCli: boolean;
}

/**
 * Claude CLI安装结果接口
 */
interface ClaudeCliInstallFlowResult {
  success: boolean;
  steps: {
    prerequisites: { success: boolean; message: string };
    installation: { success: boolean; message: string };
    configuration: { success: boolean; message: string };
    verification: { success: boolean; message: string };
  };
  finalStatus?: ClaudeCliStatus;
  error?: string;
}

/**
 * Claude CLI配置验证结果接口
 */
interface ClaudeCliConfigValidation {
  isValid: boolean;
  apiKeyValid: boolean;
  connectionTest: boolean;
  permissionsOk: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Claude CLI使用统计接口
 */
interface ClaudeCliUsageStats {
  version: string;
  lastUsed?: Date;
  commandsRun: number;
  errorsEncountered: number;
  avgResponseTime?: number;
}

/**
 * Claude CLI更新检查结果接口
 */
interface ClaudeCliUpdateCheck {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseNotes?: string;
  updateRecommended: boolean;
}

/**
 * Claude CLI服务类
 */
export class ClaudeCliService {
  private claudeCliManager = getClaudeCliManager();
  private readonly packageName = '@anthropic-ai/claude-cli';

  /**
   * 执行完整的Claude CLI安装流程
   */
  async installWithFullFlow(
    flow: Partial<ClaudeCliInstallFlow> = {},
    installOptions: InstallClaudeCliRequest = {},
    configOptions: ConfigureClaudeCliRequest = {}
  ): Promise<ClaudeCliInstallFlowResult> {
    console.log('开始Claude CLI完整安装流程');

    const defaultFlow: ClaudeCliInstallFlow = {
      checkPrerequisites: true,
      installCli: true,
      configureCli: true,
      verifyCli: true,
      ...flow
    };

    const result: ClaudeCliInstallFlowResult = {
      success: false,
      steps: {
        prerequisites: { success: false, message: '' },
        installation: { success: false, message: '' },
        configuration: { success: false, message: '' },
        verification: { success: false, message: '' }
      }
    };

    try {
      // 步骤1: 检查前置条件
      if (defaultFlow.checkPrerequisites) {
        console.log('检查前置条件...');
        const prereqResult = await this.checkPrerequisites();
        result.steps.prerequisites = {
          success: prereqResult.success,
          message: prereqResult.success
            ? '前置条件检查通过'
            : `前置条件检查失败: ${prereqResult.errors.join(', ')}`
        };

        if (!prereqResult.success) {
          result.error = '前置条件不满足，无法继续安装';
          return result;
        }
      } else {
        result.steps.prerequisites = { success: true, message: '跳过前置条件检查' };
      }

      // 步骤2: 安装Claude CLI
      if (defaultFlow.installCli) {
        console.log('安装Claude CLI...');
        const installResult = await this.claudeCliManager.installCli(installOptions);
        result.steps.installation = {
          success: installResult.success,
          message: installResult.success
            ? `Claude CLI安装成功 (${installResult.installedVersion})`
            : `安装失败: ${installResult.error}`
        };

        if (!installResult.success) {
          result.error = 'Claude CLI安装失败';
          return result;
        }
      } else {
        result.steps.installation = { success: true, message: '跳过CLI安装' };
      }

      // 步骤3: 配置Claude CLI
      if (defaultFlow.configureCli) {
        console.log('配置Claude CLI...');

        if (Object.keys(configOptions).length > 0) {
          const configResult = await this.claudeCliManager.configureCli(configOptions);
          result.steps.configuration = {
            success: configResult.success,
            message: configResult.success
              ? 'Claude CLI配置成功'
              : `配置失败: ${configResult.error}`
          };

          if (!configResult.success) {
            result.steps.configuration.message += ' (可稍后手动配置)';
          }
        } else {
          result.steps.configuration = { success: true, message: '未提供配置参数，跳过配置' };
        }
      } else {
        result.steps.configuration = { success: true, message: '跳过CLI配置' };
      }

      // 步骤4: 验证安装
      if (defaultFlow.verifyCli) {
        console.log('验证Claude CLI安装...');
        const verifyResult = await this.verifyInstallation();
        result.steps.verification = {
          success: verifyResult.success,
          message: verifyResult.success
            ? 'Claude CLI验证成功'
            : `验证失败: ${verifyResult.error}`
        };

        if (verifyResult.success) {
          result.finalStatus = await this.claudeCliManager.checkInstallation(false);
        }
      } else {
        result.steps.verification = { success: true, message: '跳过安装验证' };
      }

      // 判断整体成功
      const allStepsSuccessful = Object.values(result.steps).every(step => step.success);
      result.success = allStepsSuccessful;

      console.log(`Claude CLI安装流程${result.success ? '成功' : '部分失败'}`);
      return result;

    } catch (error) {
      console.error('Claude CLI安装流程异常:', error);
      result.error = error instanceof Error ? error.message : String(error);
      return result;
    }
  }

  /**
   * 检查前置条件
   */
  async checkPrerequisites(): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
    console.log('检查Claude CLI安装前置条件');

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 检查Node.js
      const nodeResult = await this.runCommand('node', ['--version']);
      if (!nodeResult.success) {
        errors.push('Node.js未安装或不可用');
      } else {
        const nodeVersion = this.extractMajorVersion(nodeResult.stdout);
        if (nodeVersion < 16) {
          errors.push(`Node.js版本过低 (${nodeVersion})，需要16或更高版本`);
        } else if (nodeVersion < 18) {
          warnings.push(`Node.js版本 (${nodeVersion}) 较低，建议使用18或更高版本`);
        }
      }

      // 检查npm
      const npmResult = await this.runCommand('npm', ['--version']);
      if (!npmResult.success) {
        errors.push('npm未安装或不可用');
      }

      // 检查网络连接
      const networkResult = await this.runCommand('npm', ['ping']);
      if (!networkResult.success) {
        warnings.push('npm网络连接测试失败，可能影响安装');
      }

      // 检查权限
      const permissionResult = await this.checkInstallPermissions();
      if (!permissionResult.success) {
        if (permissionResult.isPermissionIssue) {
          warnings.push('可能存在权限问题，建议使用管理员权限运行');
        } else {
          warnings.push('权限检查失败');
        }
      }

      // 检查磁盘空间
      const diskSpace = await this.checkDiskSpace();
      if (diskSpace !== undefined && diskSpace < 100) { // 100MB
        warnings.push('磁盘空间不足，可能影响安装');
      }

      const success = errors.length === 0;
      console.log(`前置条件检查完成: ${success ? '通过' : '失败'} (${errors.length} 错误, ${warnings.length} 警告)`);

      return { success, errors, warnings };

    } catch (error) {
      console.error('前置条件检查异常:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings
      };
    }
  }

  /**
   * 验证Claude CLI安装
   */
  async verifyInstallation(): Promise<{ success: boolean; error?: string; details?: any }> {
    console.log('验证Claude CLI安装');

    try {
      // 检查CLI是否可执行
      const versionResult = await this.runCommand('claude', ['--version']);
      if (!versionResult.success) {
        return {
          success: false,
          error: 'Claude CLI命令不可用'
        };
      }

      // 检查版本
      const version = versionResult.stdout.trim();
      if (!version) {
        return {
          success: false,
          error: '无法获取Claude CLI版本'
        };
      }

      // 检查帮助命令
      const helpResult = await this.runCommand('claude', ['--help']);
      if (!helpResult.success) {
        return {
          success: false,
          error: 'Claude CLI帮助命令失败'
        };
      }

      // 检查配置状态
      const configResult = await this.runCommand('claude', ['config', 'show']);
      const configStatus = configResult.success ? 'available' : 'unavailable';

      console.log(`Claude CLI验证成功: ${version}`);

      return {
        success: true,
        details: {
          version,
          configStatus,
          installPath: await this.getClaudeCliPath()
        }
      };

    } catch (error) {
      console.error('Claude CLI验证失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 配置验证
   */
  async validateConfiguration(apiKey?: string): Promise<ClaudeCliConfigValidation> {
    console.log('验证Claude CLI配置');

    const validation: ClaudeCliConfigValidation = {
      isValid: false,
      apiKeyValid: false,
      connectionTest: false,
      permissionsOk: false,
      errors: [],
      warnings: []
    };

    try {
      // 检查配置文件权限
      const permissionResult = await this.checkConfigPermissions();
      validation.permissionsOk = permissionResult.success;
      if (!permissionResult.success) {
        validation.errors.push('配置文件权限问题');
      }

      // 检查API密钥
      if (apiKey) {
        if (apiKey.length < 10) {
          validation.errors.push('API密钥长度不足');
        } else if (!apiKey.startsWith('sk-')) {
          validation.warnings.push('API密钥格式可能不正确');
        } else {
          validation.apiKeyValid = true;
        }
      } else {
        // 检查已配置的API密钥
        const configResult = await this.runCommand('claude', ['config', 'show']);
        if (configResult.success && !configResult.stdout.includes('No API key')) {
          validation.apiKeyValid = true;
        } else {
          validation.warnings.push('未配置API密钥');
        }
      }

      // 连接测试
      if (validation.apiKeyValid) {
        try {
          const testResult = await this.runCommand('claude', ['auth', 'test'], 10000);
          validation.connectionTest = testResult.success;
          if (!testResult.success) {
            validation.errors.push('API连接测试失败');
          }
        } catch {
          validation.warnings.push('无法执行连接测试');
        }
      }

      validation.isValid = validation.errors.length === 0 && validation.apiKeyValid && validation.connectionTest;

      console.log(`配置验证完成: ${validation.isValid ? '有效' : '无效'}`);
      return validation;

    } catch (error) {
      console.error('配置验证失败:', error);
      validation.errors.push(error instanceof Error ? error.message : String(error));
      return validation;
    }
  }

  /**
   * 检查更新
   */
  async checkForUpdates(): Promise<ClaudeCliUpdateCheck> {
    console.log('检查Claude CLI更新');

    try {
      // 获取当前版本
      const currentResult = await this.runCommand('claude', ['--version']);
      if (!currentResult.success) {
        throw new Error('无法获取当前版本');
      }

      const currentVersion = currentResult.stdout.trim();

      // 检查最新版本
      const latestResult = await this.runCommand('npm', ['view', this.packageName, 'version']);
      if (!latestResult.success) {
        throw new Error('无法获取最新版本信息');
      }

      const latestVersion = latestResult.stdout.trim();

      // 比较版本
      const updateAvailable = this.compareVersions(currentVersion, latestVersion) < 0;
      const updateRecommended = updateAvailable && this.isSignificantUpdate(currentVersion, latestVersion);

      // 获取发布说明
      let releaseNotes: string | undefined;
      if (updateAvailable) {
        try {
          const notesResult = await this.runCommand('npm', ['view', this.packageName, 'description']);
          releaseNotes = notesResult.stdout.trim();
        } catch {
          // 发布说明获取失败不影响主要功能
        }
      }

      const result: ClaudeCliUpdateCheck = {
        updateAvailable,
        currentVersion,
        latestVersion: updateAvailable ? latestVersion : undefined,
        releaseNotes,
        updateRecommended
      };

      console.log(`更新检查完成: ${updateAvailable ? '有可用更新' : '已是最新版本'}`);
      return result;

    } catch (error) {
      console.error('检查更新失败:', error);
      return {
        updateAvailable: false,
        currentVersion: '未知',
        updateRecommended: false
      };
    }
  }

  /**
   * 更新Claude CLI
   */
  async updateCli(): Promise<{ success: boolean; oldVersion?: string; newVersion?: string; error?: string }> {
    console.log('更新Claude CLI');

    try {
      // 获取当前版本
      const currentStatus = await this.claudeCliManager.checkInstallation(false);
      const oldVersion = currentStatus.version;

      // 执行更新
      const updateResult = await this.runCommand('npm', ['install', '-g', `${this.packageName}@latest`]);

      if (!updateResult.success) {
        return {
          success: false,
          oldVersion,
          error: updateResult.stderr
        };
      }

      // 验证新版本
      const newStatus = await this.claudeCliManager.checkInstallation(false);
      const newVersion = newStatus.version;

      console.log(`Claude CLI更新完成: ${oldVersion} → ${newVersion}`);

      return {
        success: true,
        oldVersion,
        newVersion
      };

    } catch (error) {
      console.error('Claude CLI更新失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 获取使用统计
   */
  async getUsageStats(): Promise<ClaudeCliUsageStats | null> {
    console.log('获取Claude CLI使用统计');

    try {
      const status = await this.claudeCliManager.checkInstallation();
      if (!status.installed) {
        return null;
      }

      // 这里应该从配置文件或日志中获取实际的使用统计
      // 暂时返回模拟数据
      const stats: ClaudeCliUsageStats = {
        version: status.version || 'unknown',
        lastUsed: new Date(), // 实际应该从日志获取
        commandsRun: 0, // 实际应该从统计数据获取
        errorsEncountered: 0,
        avgResponseTime: undefined
      };

      return stats;

    } catch (error) {
      console.error('获取使用统计失败:', error);
      return null;
    }
  }

  /**
   * 重置Claude CLI配置
   */
  async resetConfiguration(): Promise<{ success: boolean; error?: string }> {
    console.log('重置Claude CLI配置');

    try {
      // 清除配置
      const resetResult = await this.runCommand('claude', ['config', 'reset']);

      if (!resetResult.success) {
        return {
          success: false,
          error: resetResult.stderr
        };
      }

      console.log('Claude CLI配置重置成功');
      return { success: true };

    } catch (error) {
      console.error('重置Claude CLI配置失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 检查安装权限
   */
  private async checkInstallPermissions(): Promise<{ success: boolean; isPermissionIssue: boolean }> {
    try {
      const result = await this.runCommand('npm', ['config', 'get', 'prefix']);
      return { success: result.success, isPermissionIssue: false };
    } catch {
      return { success: false, isPermissionIssue: true };
    }
  }

  /**
   * 检查配置文件权限
   */
  private async checkConfigPermissions(): Promise<{ success: boolean }> {
    try {
      const result = await this.runCommand('claude', ['config', 'path']);
      return { success: result.success };
    } catch {
      return { success: false };
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
   * 获取Claude CLI路径
   */
  private async getClaudeCliPath(): Promise<string | undefined> {
    try {
      const result = await this.runCommand('which', ['claude']);
      return result.success ? result.stdout.trim() : undefined;
    } catch {
      try {
        const result = await this.runCommand('where', ['claude']);
        return result.success ? result.stdout.split('\n')[0].trim() : undefined;
      } catch {
        return undefined;
      }
    }
  }

  /**
   * 运行命令
   */
  private async runCommand(command: string, args: string[], timeout = 30000): Promise<{
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

      setTimeout(() => {
        if (!child.killed) {
          child.kill();
          resolve({
            success: false,
            stdout,
            stderr: 'Command timeout'
          });
        }
      }, timeout);
    });
  }

  /**
   * 提取主版本号
   */
  private extractMajorVersion(version: string): number {
    const match = version.match(/v?(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * 提取磁盘空间 (MB)
   */
  private extractDiskSpace(output: string): number {
    const match = output.match(/(\d+)M?\s*available/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * 比较版本号
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.replace(/^v/, '').split('.').map(Number);
    const v2Parts = version2.replace(/^v/, '').split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }

    return 0;
  }

  /**
   * 判断是否为重要更新
   */
  private isSignificantUpdate(currentVersion: string, latestVersion: string): boolean {
    const current = currentVersion.replace(/^v/, '').split('.').map(Number);
    const latest = latestVersion.replace(/^v/, '').split('.').map(Number);

    // 主版本或次版本更新被认为是重要更新
    return current[0] < latest[0] || current[1] < latest[1];
  }
}

/**
 * 导出Claude CLI服务单例
 */
export const claudeCliService = new ClaudeCliService();

/**
 * 导出类型定义
 */
export type {
  ClaudeCliInstallFlow,
  ClaudeCliInstallFlowResult,
  ClaudeCliConfigValidation,
  ClaudeCliUsageStats,
  ClaudeCliUpdateCheck
};