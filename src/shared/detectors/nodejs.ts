/**
 * T021: Node.js环境检测器
 * 检测Node.js安装状态、版本信息和npm配置
 */

import * as path from 'path';
import * as os from 'os';
import {
  NodeEnvironment,
  DetectionResult,
  DetectionStatus,
  EnvironmentDetector,
  ArchType
} from '../types/environment';
import { log } from '../utils/logger';
import {
  executeCommand,
  isProgramInPath,
  getProgramPath,
  getProgramVersion,
  compareVersions
} from '../utils/system';

/**
 * Node.js检测配置
 */
interface NodeDetectorConfig {
  recommendedVersion: string;
  minVersion: string;
  timeout: number;
}

/**
 * Node.js环境检测器实现
 */
export class NodeJsDetector implements EnvironmentDetector {
  name = 'nodejs-detector';
  type = 'nodejs' as const;
  required = true;
  timeout = 15000; // 15秒
  
  private config: NodeDetectorConfig;
  private progress = 0;
  
  constructor(config?: Partial<NodeDetectorConfig>) {
    this.config = {
      recommendedVersion: '18.17.0',
      minVersion: '16.0.0',
      timeout: 10000,
      ...config
    };
  }
  
  /**
   * 执行Node.js检测
   */
  async detect(): Promise<DetectionResult> {
    const startTime = Date.now();
    this.progress = 0;
    
    try {
      log.info('开始Node.js环境检测');
      
      // 检查先决条件
      const prerequisites = await this.checkPrerequisites();
      if (!prerequisites) {
        throw new Error('Node.js检测先决条件不满足');
      }
      this.progress = 10;
      
      // 检测Node.js安装状态
      const installed = await this.checkNodeInstallation();
      this.progress = 30;
      
      let currentVersion: string | undefined;
      let installPath: string | undefined;
      let needsUpdate = false;
      
      if (installed) {
        // 获取版本信息
        currentVersion = await this.getNodeVersion();
        this.progress = 50;
        
        // 获取安装路径
        installPath = await this.getNodePath();
        this.progress = 60;
        
        // 检查是否需要更新
        if (currentVersion) {
          needsUpdate = compareVersions(currentVersion, this.config.recommendedVersion) < 0;
        }
      }
      
      // 检测npm信息
      const npmVersion = await this.getNpmVersion();
      this.progress = 70;
      
      // 获取npm配置
      const npmConfig = await this.getNpmConfig();
      this.progress = 80;
      
      // 获取环境变量
      const environmentVars = this.getEnvironmentVariables();
      this.progress = 90;
      
      // 获取支持的架构
      const supportedArchs = this.getSupportedArchitectures();
      this.progress = 100;
      
      const nodeEnvironment: NodeEnvironment = {
        installed,
        currentVersion,
        recommendedVersion: this.config.recommendedVersion,
        installPath,
        npmVersion,
        npmConfig,
        needsUpdate,
        supportedArchs,
        environmentVars
      };
      
      const duration = Date.now() - startTime;
      log.info('Node.js环境检测完成', { duration, nodeEnvironment });
      
      return {
        status: DetectionStatus.SUCCESS,
        timestamp: new Date(),
        duration,
        message: 'Node.js环境检测成功',
        data: nodeEnvironment,
        recommendations: this.generateRecommendations(nodeEnvironment)
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error('Node.js环境检测失败', error as Error);
      
      return {
        status: DetectionStatus.FAILED,
        timestamp: new Date(),
        duration,
        message: `Node.js检测失败: ${error instanceof Error ? error.message : '未知错误'}`,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }
  
  /**
   * 检查先决条件
   */
  async checkPrerequisites(): Promise<boolean> {
    // Node.js检测不需要特殊的先决条件
    return true;
  }
  
  /**
   * 获取检测进度
   */
  getProgress(): number {
    return this.progress;
  }
  
  /**
   * 检查Node.js是否已安装
   */
  private async checkNodeInstallation(): Promise<boolean> {
    try {
      const result = await executeCommand('node --version', {
        timeout: this.config.timeout
      });
      return result.exitCode === 0 && result.stdout.trim().startsWith('v');
    } catch {
      return false;
    }
  }
  
  /**
   * 获取Node.js版本
   */
  private async getNodeVersion(): Promise<string | undefined> {
    try {
      const result = await executeCommand('node --version', {
        timeout: this.config.timeout
      });
      
      if (result.exitCode === 0) {
        const version = result.stdout.trim();
        // 移除版本号前的 'v' 前缀
        return version.startsWith('v') ? version.substring(1) : version;
      }
      
      return undefined;
    } catch {
      return undefined;
    }
  }
  
  /**
   * 获取Node.js安装路径
   */
  private async getNodePath(): Promise<string | undefined> {
    return getProgramPath('node') || undefined;
  }
  
  /**
   * 获取npm版本
   */
  private async getNpmVersion(): Promise<string | undefined> {
    try {
      const result = await executeCommand('npm --version', {
        timeout: this.config.timeout
      });
      
      if (result.exitCode === 0) {
        return result.stdout.trim();
      }
      
      return undefined;
    } catch {
      return undefined;
    }
  }
  
  /**
   * 获取npm配置
   */
  private async getNpmConfig(): Promise<NodeEnvironment['npmConfig']> {
    try {
      const configCommands = [
        'npm config get registry',
        'npm config get cache',
        'npm config get prefix',
        'npm config get userconfig'
      ];
      
      const configs = await Promise.all(
        configCommands.map(async (cmd) => {
          try {
            const result = await executeCommand(cmd, {
              timeout: this.config.timeout
            });
            return result.exitCode === 0 ? result.stdout.trim() : null;
          } catch {
            return null;
          }
        })
      );
      
      return {
        registry: configs[0] || 'https://registry.npmjs.org/',
        cache: configs[1] || '',
        prefix: configs[2] || '',
        userconfig: configs[3] || ''
      };
    } catch (error) {
      log.warn('获取npm配置失败', { error });
      return {
        registry: 'https://registry.npmjs.org/',
        cache: '',
        prefix: '',
        userconfig: ''
      };
    }
  }
  
  /**
   * 获取环境变量
   */
  private getEnvironmentVariables(): NodeEnvironment['environmentVars'] {
    const pathVar = process.env.PATH || '';
    const pathArray = pathVar.split(path.delimiter).filter(p => p.trim());
    
    return {
      NODE_PATH: process.env.NODE_PATH,
      NPM_CONFIG_PREFIX: process.env.NPM_CONFIG_PREFIX,
      PATH: pathArray
    };
  }
  
  /**
   * 获取支持的架构
   */
  private getSupportedArchitectures(): ArchType[] {
    const currentArch = os.arch() as ArchType;
    
    // 根据平台返回支持的架构
    switch (os.platform()) {
      case 'win32':
        return [ArchType.X64, ArchType.X86];
      case 'darwin':
        return [ArchType.X64, ArchType.ARM64];
      case 'linux':
        return [ArchType.X64, ArchType.ARM64];
      default:
        return [currentArch];
    }
  }
  
  /**
   * 生成建议
   */
  private generateRecommendations(env: NodeEnvironment): Array<{
    action: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    const recommendations = [];
    
    if (!env.installed) {
      recommendations.push({
        action: 'install-nodejs',
        description: `需要安装Node.js ${env.recommendedVersion}或更高版本`,
        priority: 'high' as const
      });
    } else if (env.needsUpdate && env.currentVersion) {
      recommendations.push({
        action: 'update-nodejs',
        description: `当前Node.js版本(${env.currentVersion})较旧，建议升级到${env.recommendedVersion}`,
        priority: 'medium' as const
      });
    }
    
    if (!env.npmVersion) {
      recommendations.push({
        action: 'install-npm',
        description: '未检测到npm，可能需要单独安装',
        priority: 'medium' as const
      });
    }
    
    // 检查npm镜像源
    if (env.npmConfig?.registry === 'https://registry.npmjs.org/') {
      recommendations.push({
        action: 'setup-npm-mirror',
        description: '建议配置国内npm镜像源以提高下载速度',
        priority: 'low' as const
      });
    }
    
    // 检查PATH配置
    const nodeInPath = isProgramInPath('node');
    const npmInPath = isProgramInPath('npm');
    
    if (!nodeInPath || !npmInPath) {
      recommendations.push({
        action: 'fix-path',
        description: 'Node.js或npm未正确配置在PATH中',
        priority: 'medium' as const
      });
    }
    
    return recommendations;
  }
  
  /**
   * 检查是否已安装（公共方法）
   */
  async isInstalled(): Promise<boolean> {
    return this.checkNodeInstallation();
  }
  
  /**
   * 获取当前版本（公共方法）
   */
  async getCurrentVersion(): Promise<string | null> {
    const version = await this.getNodeVersion();
    return version || null;
  }
  
  /**
   * 检查版本是否满足要求
   */
  isVersionCompatible(version: string): boolean {
    return compareVersions(version, this.config.minVersion) >= 0;
  }
  
  /**
   * 获取推荐的下载URL
   */
  getDownloadUrl(platform: string, arch: string): string {
    const version = this.config.recommendedVersion;
    const baseUrl = 'https://nodejs.org/dist';
    
    switch (platform) {
      case 'win32':
        const winArch = arch === 'x64' ? 'x64' : 'x86';
        return `${baseUrl}/v${version}/node-v${version}-win-${winArch}.msi`;
      case 'darwin':
        const macArch = arch === 'arm64' ? 'arm64' : 'x64';
        return `${baseUrl}/v${version}/node-v${version}-darwin-${macArch}.pkg`;
      case 'linux':
        const linuxArch = arch === 'arm64' ? 'arm64' : 'x64';
        return `${baseUrl}/v${version}/node-v${version}-linux-${linuxArch}.tar.xz`;
      default:
        throw new Error(`不支持的平台: ${platform}`);
    }
  }
  
  /**
   * 获取安装文件类型
   */
  getInstallerType(platform: string): string {
    switch (platform) {
      case 'win32':
        return '.msi';
      case 'darwin':
        return '.pkg';
      case 'linux':
        return '.tar.xz';
      default:
        throw new Error(`不支持的平台: ${platform}`);
    }
  }
}

// 导出单例实例
export const nodeJsDetector = new NodeJsDetector();
