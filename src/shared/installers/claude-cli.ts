/**
 * T025: Claude CLI安装器
 * 自动下载和安装Claude CLI工具
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';
import { PlatformType, ArchType } from '../types/environment';
import { ProgressEvent, InstallStep, InstallerComponent, InstallResult } from '../types/installer';
import { log } from '../utils/logger';
import {
  executeCommand,
  executeCommandWithProgress,
  getTempFilePath,
  getFileSize,
  formatFileSize,
  ensureDir,
  safeRemove,
  retry,
  isProgramInPath
} from '../utils/system';

/**
 * Claude CLI安装器配置
 */
interface ClaudeCliInstallerConfig {
  version: string;
  installMethod: 'npm' | 'binary' | 'source';
  timeout: number;
  maxRetries: number;
  keepDownloads: boolean;
  globalInstall: boolean;
  apiKey?: string;
}

/**
 * 安装方法信息
 */
interface InstallMethodInfo {
  method: 'npm' | 'binary' | 'source';
  command: string;
  requirements: string[];
  estimatedTime: number; // 秒
  description: string;
}

/**
 * Claude CLI安装器实现类
 */
export class ClaudeCliInstaller {
  private config: ClaudeCliInstallerConfig;
  private platform: PlatformType;
  private arch: ArchType;
  private progressCallback?: (event: ProgressEvent) => void;
  
  constructor(config?: Partial<ClaudeCliInstallerConfig>) {
    this.config = {
      version: 'latest',
      installMethod: 'npm',
      timeout: 300000, // 5分钟
      maxRetries: 3,
      keepDownloads: false,
      globalInstall: true,
      ...config
    };
    
    this.platform = os.platform() as PlatformType;
    this.arch = os.arch() as ArchType;
  }
  
  /**
   * 设置进度回调
   */
  setProgressCallback(callback: (event: ProgressEvent) => void): void {
    this.progressCallback = callback;
  }
  
  /**
   * 安装Claude CLI
   */
  async install(): Promise<InstallResult> {
    const startTime = Date.now();
    const errors: InstallResult['errors'] = [];
    const warnings: InstallResult['warnings'] = [];
    const installedComponents: InstallerComponent[] = [];
    
    try {
      log.info('开始Claude CLI安装进程', {
        method: this.config.installMethod,
        version: this.config.version,
        platform: this.platform
      });
      
      this.emitProgress(0, 'install', '准备安装Claude CLI');
      
      // 1. 检查先决条件
      const prerequisites = await this.checkPrerequisites();
      if (!prerequisites.success) {
        throw new Error(`先决条件不满足: ${prerequisites.missing.join(', ')}`);
      }
      this.emitProgress(10, 'install', '先决条件检查完成');
      
      // 2. 选择安装方法
      const installMethod = await this.determineInstallMethod();
      this.emitProgress(15, 'install', `使用${installMethod.method}方式安装`);
      
      // 3. 执行安装
      const installResult = await this.executeInstallation(installMethod);

      // 4. 验证安装
      let verification: { success: boolean; version?: string; installPath?: string } | undefined;

      if (installResult.success) {
        this.emitProgress(80, 'install', '安装完成');

        this.emitProgress(85, 'test', '验证安装结果');
        verification = await this.verifyInstallation();
        if (verification.success) {
          installedComponents.push({
            name: 'Claude CLI',
            version: verification.version,
            installed: true,
            installPath: verification.installPath
          });
          
          // 5. 配置Claude CLI（如果提供API密钥）
          if (this.config.apiKey) {
            this.emitProgress(90, 'configure', '配置API密钥');
            await this.configureApiKey(this.config.apiKey);
          }
        } else {
          throw new Error('安装验证失败');
        }
      } else {
        throw new Error(installResult.error || '安装执行失败');
      }
      
      this.emitProgress(100, 'install', 'Claude CLI安装成功');
      
      const totalDuration = Date.now() - startTime;
      log.info('Claude CLI安装成功', {
        duration: totalDuration,
        method: installMethod.method,
        version: verification?.version
      });
      
      return {
        success: true,
        installedComponents,
        failedSteps: [],
        totalDuration,
        errors,
        warnings,
        summary: {
          totalSteps: 1,
          successSteps: 1,
          failedSteps: 0,
          skippedSteps: 0
        }
      };
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      log.error('Claude CLI安装失败', error as Error);
      
      errors.push({
        step: InstallStep.CLAUDE_CLI_SETUP,
        message: errorMessage,
        details: error
      });
      
      return {
        success: false,
        installedComponents,
        failedSteps: [InstallStep.CLAUDE_CLI_SETUP],
        totalDuration,
        errors,
        warnings,
        summary: {
          totalSteps: 1,
          successSteps: 0,
          failedSteps: 1,
          skippedSteps: 0
        }
      };
    }
  }
  
  /**
   * 检查先决条件
   */
  private async checkPrerequisites(): Promise<{
    success: boolean;
    missing: string[];
  }> {
    const missing: string[] = [];
    
    // 检查Node.js
    if (!isProgramInPath('node')) {
      missing.push('Node.js');
    }
    
    // 检查npm
    if (!isProgramInPath('npm')) {
      missing.push('npm');
    }
    
    // 检查网络连接
    try {
      await axios.get('https://www.npmjs.com', { timeout: 5000 });
    } catch {
      missing.push('网络连接');
    }
    
    return {
      success: missing.length === 0,
      missing
    };
  }
  
  /**
   * 确定安装方法
   */
  private async determineInstallMethod(): Promise<InstallMethodInfo> {
    const availableMethods = this.getAvailableInstallMethods();
    
    // 优先使用配置指定的方法
    const preferredMethod = availableMethods.find(m => m.method === this.config.installMethod);
    if (preferredMethod) {
      return preferredMethod;
    }
    
    // 否则使用第一个可用的方法
    return availableMethods[0];
  }
  
  /**
   * 获取可用的安装方法
   */
  private getAvailableInstallMethods(): InstallMethodInfo[] {
    const methods: InstallMethodInfo[] = [];
    
    // npm安装方法
    if (isProgramInPath('npm')) {
      methods.push({
        method: 'npm',
        command: this.config.globalInstall 
          ? 'npm install -g @anthropic-ai/claude-cli'
          : 'npm install @anthropic-ai/claude-cli',
        requirements: ['Node.js', 'npm'],
        estimatedTime: 60,
        description: '通过npm安装（推荐）'
      });
    }
    
    // 如果没有可用的方法，返回默认方法
    if (methods.length === 0) {
      methods.push({
        method: 'npm',
        command: 'npm install -g @anthropic-ai/claude-cli',
        requirements: ['Node.js', 'npm'],
        estimatedTime: 60,
        description: '通过npm安装'
      });
    }
    
    return methods;
  }
  
  /**
   * 执行安装
   */
  private async executeInstallation(method: InstallMethodInfo): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      log.info('执行安装命令', { command: method.command });
      
      // 执行安装命令
      const result = await executeCommandWithProgress(
        method.command,
        (output) => {
          // 解析npm输出获取进度
          const progress = this.parseInstallProgress(output);
          this.emitProgress(
            20 + progress * 0.6, // 安装进度从npm输出解析
            'install',
            '正在安装Claude CLI...'
          );
        },
        { timeout: this.config.timeout }
      );
      
      const success = result.exitCode === 0;
      if (success) {
        log.info('Claude CLI安装命令执行成功');
        return { success: true };
      } else {
        const error = `安装命令失败，退出代码: ${result.exitCode}`;
        log.error(error);
        return { success: false, error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      log.error('Claude CLI安装执行失败', error as Error);
      return { success: false, error: errorMessage };
    }
  }
  
  /**
   * 解析安装进度
   */
  private parseInstallProgress(output: string): number {
    // 简单的npm进度解析
    if (output.includes('downloading')) {
      return 0.3;
    } else if (output.includes('installing')) {
      return 0.6;
    } else if (output.includes('added') || output.includes('updated')) {
      return 1.0;
    }
    return 0.1;
  }
  
  /**
   * 验证安装
   */
  private async verifyInstallation(): Promise<{
    success: boolean;
    version?: string;
    installPath?: string;
  }> {
    try {
      // 检查claude命令是否可用
      const versionResult = await executeCommand('claude --version', { timeout: 10000 });
      
      if (versionResult.exitCode === 0) {
        const version = this.parseVersion(versionResult.stdout);
        
        // 获取安装路径
        const pathResult = await executeCommand(
          os.platform() === 'win32' ? 'where claude' : 'which claude',
          { timeout: 5000 }
        );
        
        const installPath = pathResult.exitCode === 0 ? pathResult.stdout.trim() : undefined;
        
        return {
          success: true,
          version,
          installPath
        };
      }
      
      return { success: false };
    } catch {
      return { success: false };
    }
  }
  
  /**
   * 解析版本号
   */
  private parseVersion(versionOutput: string): string {
    const versionMatch = versionOutput.match(/v?([0-9]+\.[0-9]+\.[0-9]+[^\s]*)/i);
    return versionMatch ? versionMatch[1] : versionOutput.trim();
  }
  
  /**
   * 配置API密钥
   */
  private async configureApiKey(apiKey: string): Promise<void> {
    try {
      // 使用claude configure命令或直接修改配置文件
      const configResult = await executeCommand(
        `claude configure --api-key "${apiKey}"`,
        { timeout: 30000 }
      );
      
      if (configResult.exitCode === 0) {
        log.info('API密钥配置成功');
      } else {
        // 如果命令失败，尝试直接修改配置文件
        await this.writeConfigFile(apiKey);
      }
    } catch (error) {
      log.warn('API密钥配置失败', { error });
      // 尝试直接修改配置文件
      await this.writeConfigFile(apiKey);
    }
  }
  
  /**
   * 直接写入配置文件
   */
  private async writeConfigFile(apiKey: string): Promise<void> {
    try {
      const homeDir = os.homedir();
      const configDir = path.join(homeDir, '.claude');
      const configPath = path.join(configDir, 'config.json');
      
      // 确保配置目录存在
      ensureDir(configDir);
      
      // 读取现有配置（如果存在）
      let config: Record<string, any> = {};
      if (fs.existsSync(configPath)) {
        try {
          const existingConfig = fs.readFileSync(configPath, 'utf8');
          config = JSON.parse(existingConfig);
        } catch {
          // 如果解析失败，使用空配置
        }
      }
      
      // 更新API密钥
      config.api_key = apiKey;
      
      // 写入配置文件
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      
      log.info('Claude CLI配置文件写入成功', { configPath });
    } catch (error) {
      log.error('写入Claude CLI配置文件失败', error as Error);
      throw error;
    }
  }
  
  /**
   * 发送进度事件
   */
  private emitProgress(
    progress: number,
    type: ProgressEvent['type'],
    message: string,
    speed?: number,
    remainingTime?: number
  ): void {
    if (this.progressCallback) {
      this.progressCallback({
        type,
        step: InstallStep.CLAUDE_CLI_SETUP,
        progress: Math.min(Math.max(progress, 0), 100),
        message,
        speed,
        remainingTime
      });
    }
  }
  
  /**
   * 检查是否已安装
   */
  async isInstalled(): Promise<boolean> {
    const verification = await this.verifyInstallation();
    return verification.success;
  }
  
  /**
   * 获取当前版本
   */
  async getCurrentVersion(): Promise<string | null> {
    const verification = await this.verifyInstallation();
    return verification.version || null;
  }
  
  /**
   * 卸载Claude CLI
   */
  async uninstall(): Promise<boolean> {
    try {
      if (this.config.globalInstall) {
        const result = await executeCommand('npm uninstall -g @anthropic-ai/claude-cli', {
          timeout: this.config.timeout
        });
        return result.exitCode === 0;
      } else {
        // 如果是本地安装，需要在项目目录中执行
        const result = await executeCommand('npm uninstall @anthropic-ai/claude-cli', {
          timeout: this.config.timeout
        });
        return result.exitCode === 0;
      }
    } catch {
      return false;
    }
  }
  
  /**
   * 更新Claude CLI
   */
  async update(): Promise<boolean> {
    try {
      const command = this.config.globalInstall
        ? 'npm update -g @anthropic-ai/claude-cli'
        : 'npm update @anthropic-ai/claude-cli';
        
      const result = await executeCommand(command, {
        timeout: this.config.timeout
      });
      
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }
  
  /**
   * 获取支持的平台
   */
  static getSupportedPlatforms(): PlatformType[] {
    return [PlatformType.WINDOWS, PlatformType.MACOS, PlatformType.LINUX];
  }
  
  /**
   * 检查平台支持
   */
  static isPlatformSupported(platform: PlatformType): boolean {
    return this.getSupportedPlatforms().includes(platform);
  }
  
  /**
   * 获取推荐的安装方法
   */
  static getRecommendedInstallMethod(): 'npm' | 'binary' | 'source' {
    return 'npm';
  }
  
  /**
   * 获取安装时间估计
   */
  static getEstimatedInstallTime(): number {
    return 60; // 1分钟
  }
}

// 导出单例实例
export const claudeCliInstaller = new ClaudeCliInstaller();
