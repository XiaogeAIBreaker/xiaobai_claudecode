/**
 * T024: Node.js自动安装器
 * 支持Windows (.exe/.msi)和macOS (.pkg)的Node.js自动下载和安装
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';
import { execSync } from 'child_process';
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
  retry
} from '../utils/system';

/**
 * Node.js安装器配置
 */
interface NodeJsInstallerConfig {
  version: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  verifyChecksum: boolean;
  keepDownloads: boolean;
  silentInstall: boolean;
}

/**
 * 下载进度信息
 */
interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
  speed: number; // 字节/秒
  remainingTime: number; // 秒
}

/**
 * Node.js安装器实现类
 */
export class NodeJsInstaller {
  private config: NodeJsInstallerConfig;
  private platform: PlatformType;
  private arch: ArchType;
  private progressCallback?: (event: ProgressEvent) => void;
  
  constructor(config?: Partial<NodeJsInstallerConfig>) {
    this.config = {
      version: '18.17.0',
      baseUrl: 'https://nodejs.org/dist',
      timeout: 300000, // 5分钟
      maxRetries: 3,
      verifyChecksum: true,
      keepDownloads: false,
      silentInstall: true,
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
   * 安装Node.js
   */
  async install(): Promise<InstallResult> {
    const startTime = Date.now();
    const errors: InstallResult['errors'] = [];
    const warnings: InstallResult['warnings'] = [];
    const installedComponents: InstallerComponent[] = [];
    
    try {
      log.info('开始Node.js安装进程', {
        version: this.config.version,
        platform: this.platform,
        arch: this.arch
      });
      
      this.emitProgress(0, 'download', '准备下载Node.js安装包');
      
      // 1. 获取下载信息
      const downloadInfo = this.getDownloadInfo();
      log.info('Node.js下载信息', downloadInfo);
      
      // 2. 下载Node.js安装包
      const installerPath = await this.downloadInstaller(downloadInfo);
      this.emitProgress(40, 'download', '下载完成');
      
      // 3. 验证文件完整性（如果启用）
      if (this.config.verifyChecksum && downloadInfo.checksum) {
        this.emitProgress(45, 'install', '验证文件完整性');
        const isValid = await this.verifyChecksum(installerPath, downloadInfo.checksum);
        if (!isValid) {
          throw new Error('文件校验和验证失败');
        }
      }
      
      // 4. 执行安装
      this.emitProgress(50, 'install', '开始安装Node.js');
      const installSuccess = await this.executeInstallation(installerPath);
      
      if (installSuccess) {
        this.emitProgress(80, 'install', '安装完成');
        
        // 5. 验证安装
        this.emitProgress(85, 'test', '验证安装结果');
        const verification = await this.verifyInstallation();
        
        if (verification.success) {
          installedComponents.push({
            name: 'Node.js',
            version: verification.version,
            installed: true,
            installPath: verification.installPath
          });
          
          // 检查npm
          const npmVerification = await this.verifyNpmInstallation();
          if (npmVerification.success) {
            installedComponents.push({
              name: 'npm',
              version: npmVerification.version,
              installed: true,
              installPath: npmVerification.installPath
            });
          }
        } else {
          throw new Error('安装验证失败');
        }
      } else {
        throw new Error('安装执行失败');
      }
      
      // 6. 清理下载文件（如果不保留）
      if (!this.config.keepDownloads) {
        this.emitProgress(95, 'install', '清理临时文件');
        safeRemove(installerPath);
      }
      
      this.emitProgress(100, 'install', 'Node.js安装成功');
      
      const totalDuration = Date.now() - startTime;
      log.info('Node.js安装成功', {
        duration: totalDuration,
        components: installedComponents.length
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
      
      log.error('Node.js安装失败', error as Error);
      
      errors.push({
        step: InstallStep.NODEJS_INSTALL,
        message: errorMessage,
        details: error
      });
      
      return {
        success: false,
        installedComponents,
        failedSteps: [InstallStep.NODEJS_INSTALL],
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
   * 获取下载信息
   */
  private getDownloadInfo() {
    const version = this.config.version;
    const platform = this.platform;
    const arch = this.arch;
    
    let filename: string;
    let url: string;
    
    switch (platform) {
      case 'win32':
        const winArch = arch === 'x64' ? 'x64' : 'x86';
        filename = `node-v${version}-${winArch}.msi`;
        url = `${this.config.baseUrl}/v${version}/${filename}`;
        break;
      case 'darwin':
        const macArch = arch === 'arm64' ? 'arm64' : 'x64';
        filename = `node-v${version}.pkg`;
        url = `${this.config.baseUrl}/v${version}/${filename}`;
        break;
      default:
        throw new Error(`不支持的平台: ${platform}`);
    }
    
    return {
      filename,
      url,
      version,
      platform,
      arch,
      checksum: null // 可以后续添加校验和支持
    };
  }
  
  /**
   * 下载Node.js安装包
   */
  private async downloadInstaller(downloadInfo: ReturnType<typeof this.getDownloadInfo>): Promise<string> {
    const tempDir = os.tmpdir();
    const installerPath = path.join(tempDir, downloadInfo.filename);
    
    // 如果文件已存在且大小正确，跳过下载
    if (fs.existsSync(installerPath)) {
      const existingSize = getFileSize(installerPath);
      if (existingSize > 0) {
        log.info('使用已存在的安装文件', { path: installerPath, size: existingSize });
        return installerPath;
      }
    }
    
    return retry(async () => {
      log.info('开始下载Node.js', { url: downloadInfo.url });
      
      const response = await axios({
        method: 'GET',
        url: downloadInfo.url,
        responseType: 'stream',
        timeout: this.config.timeout,
        headers: {
          'User-Agent': 'Claude-Installer/1.0'
        }
      });
      
      const totalSize = parseInt(response.headers['content-length'] || '0');
      let downloadedSize = 0;
      let lastProgressTime = Date.now();
      let lastDownloadedSize = 0;
      
      // 创建写入流
      const writer = fs.createWriteStream(installerPath);
      
      return new Promise<string>((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          downloadedSize += chunk.length;
          
          // 计算下载进度
          const now = Date.now();
          if (now - lastProgressTime > 1000) { // 每秒更新一次
            const timeDiff = (now - lastProgressTime) / 1000;
            const sizeDiff = downloadedSize - lastDownloadedSize;
            const speed = sizeDiff / timeDiff;
            const remainingSize = totalSize - downloadedSize;
            const remainingTime = speed > 0 ? remainingSize / speed : 0;
            
            const percentage = totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0;
            
            this.emitProgress(
              Math.min(percentage * 0.4, 40), // 下载占总进度的40%
              'download',
              `下载中: ${formatFileSize(downloadedSize)}/${formatFileSize(totalSize)}`,
              speed,
              remainingTime
            );
            
            lastProgressTime = now;
            lastDownloadedSize = downloadedSize;
          }
        });
        
        response.data.on('end', () => {
          writer.end();
          log.info('Node.js下载完成', {
            path: installerPath,
            size: downloadedSize,
            totalSize
          });
          resolve(installerPath);
        });
        
        response.data.on('error', (error: Error) => {
          writer.destroy();
          safeRemove(installerPath);
          reject(error);
        });
        
        writer.on('error', (error) => {
          response.data.destroy();
          safeRemove(installerPath);
          reject(error);
        });
        
        response.data.pipe(writer);
      });
    }, this.config.maxRetries, 2000);
  }
  
  /**
   * 验证文件校验和
   */
  private async verifyChecksum(filePath: string, expectedChecksum: string): Promise<boolean> {
    try {
      const crypto = require('crypto');
      const fileBuffer = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha256');
      hash.update(fileBuffer);
      const actualChecksum = hash.digest('hex');
      
      return actualChecksum.toLowerCase() === expectedChecksum.toLowerCase();
    } catch (error) {
      log.error('校验和验证失败', error as Error);
      return false;
    }
  }
  
  /**
   * 执行安装
   */
  private async executeInstallation(installerPath: string): Promise<boolean> {
    const platform = this.platform;
    
    try {
      let command: string;
      
      switch (platform) {
        case 'win32':
          // Windows MSI安装
          if (this.config.silentInstall) {
            command = `msiexec /i "${installerPath}" /quiet /norestart`;
          } else {
            command = `msiexec /i "${installerPath}"`;
          }
          break;
        case 'darwin':
          // macOS PKG安装
          if (this.config.silentInstall) {
            command = `sudo installer -pkg "${installerPath}" -target /`;
          } else {
            command = `open "${installerPath}"`;
            // 对于图形安装，我们只能打开安装程序
            await executeCommand(command, { timeout: this.config.timeout });
            return true;
          }
          break;
        default:
          throw new Error(`不支持的平台: ${platform}`);
      }
      
      log.info('执行安装命令', { command });
      
      // 执行安装命令并获取实时输出
      const result = await executeCommandWithProgress(
        command,
        (output) => {
          // 更新安装进度
          this.emitProgress(70, 'install', '正在安装Node.js...');
        },
        { timeout: this.config.timeout }
      );
      
      const success = result.exitCode === 0;
      if (success) {
        log.info('Node.js安装命令执行成功');
      } else {
        log.error('Node.js安装命令执行失败', { exitCode: result.exitCode });
      }
      
      return success;
    } catch (error) {
      log.error('Node.js安装执行失败', error as Error);
      return false;
    }
  }
  
  /**
   * 验证Node.js安装
   */
  private async verifyInstallation(): Promise<{
    success: boolean;
    version?: string;
    installPath?: string;
  }> {
    try {
      const result = await executeCommand('node --version', { timeout: 10000 });
      
      if (result.exitCode === 0) {
        const version = result.stdout.trim().replace(/^v/, '');
        const pathResult = await executeCommand(
          os.platform() === 'win32' ? 'where node' : 'which node',
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
   * 验证npm安装
   */
  private async verifyNpmInstallation(): Promise<{
    success: boolean;
    version?: string;
    installPath?: string;
  }> {
    try {
      const result = await executeCommand('npm --version', { timeout: 10000 });
      
      if (result.exitCode === 0) {
        const version = result.stdout.trim();
        const pathResult = await executeCommand(
          os.platform() === 'win32' ? 'where npm' : 'which npm',
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
        step: InstallStep.NODEJS_INSTALL,
        progress: Math.min(Math.max(progress, 0), 100),
        message,
        speed,
        remainingTime
      });
    }
  }
  
  /**
   * 获取支持的平台
   */
  static getSupportedPlatforms(): PlatformType[] {
    return [PlatformType.WINDOWS, PlatformType.MACOS];
  }
  
  /**
   * 检查平台支持
   */
  static isPlatformSupported(platform: PlatformType): boolean {
    return this.getSupportedPlatforms().includes(platform);
  }
  
  /**
   * 获取推荐版本
   */
  static getRecommendedVersion(): string {
    return '18.17.0';
  }
  
  /**
   * 获取下载大小估计
   */
  static getEstimatedDownloadSize(platform: PlatformType): number {
    switch (platform) {
      case 'win32':
        return 25 * 1024 * 1024; // 25MB
      case 'darwin':
        return 30 * 1024 * 1024; // 30MB
      default:
        return 20 * 1024 * 1024; // 20MB
    }
  }
}

// 导出单例实例
export const nodeJsInstaller = new NodeJsInstaller();
