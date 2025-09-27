/**
 * T047: 基础安装器 - 代码重构
 * 提供通用的安装器功能，减少代码重复
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import axios, { AxiosProgressEvent } from 'axios';
import { PlatformType, ArchType } from '../types/environment';
import { ProgressEvent, InstallResult, InstallStep } from '../types/installer';
import { log } from '../utils/logger';

/**
 * 下载配置接口
 */
export interface DownloadConfig {
  url: string;
  filename: string;
  destination?: string;
  timeout?: number;
  maxRetries?: number;
  checksumUrl?: string;
  expectedChecksum?: string;
}

/**
 * 安装配置接口
 */
export interface InstallConfig {
  name: string;
  version?: string;
  platform: PlatformType;
  arch: ArchType;
  installPath?: string;
  addToPath?: boolean;
  createShortcuts?: boolean;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean;
  version?: string;
  path?: string;
  errors: string[];
}

/**
 * 基础安装器抽象类
 * 提供通用的下载、安装、验证功能
 */
export abstract class BaseInstaller {
  protected readonly name: string;
  protected readonly tempDir: string;
  protected readonly configDir: string;

  constructor(name: string) {
    this.name = name;
    this.tempDir = path.join(os.tmpdir(), 'claude-installer', name);
    this.configDir = path.join(os.homedir(), '.claude-installer', name);

    // 确保目录存在
    this.ensureDirectories();
  }

  /**
   * 抽象方法：检测是否已安装
   */
  abstract isInstalled(): Promise<boolean>;

  /**
   * 抽象方法：获取版本信息
   */
  abstract getVersion(): Promise<string | null>;

  /**
   * 抽象方法：执行安装
   */
  abstract performInstall(config: InstallConfig): Promise<InstallResult>;

  /**
   * 抽象方法：验证安装
   */
  abstract validateInstallation(): Promise<ValidationResult>;

  /**
   * 通用下载功能
   */
  protected async downloadFile(
    config: DownloadConfig,
    onProgress?: (progress: ProgressEvent) => void
  ): Promise<string> {
    const { url, filename, destination = this.tempDir, timeout = 30000, maxRetries = 3 } = config;

    const filePath = path.join(destination, filename);

    // 确保目标目录存在
    await fs.promises.mkdir(destination, { recursive: true });

    log.info(`开始下载: ${filename}`, { url, destination });

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios({
          method: 'GET',
          url,
          timeout,
          responseType: 'stream',
          onDownloadProgress: (progressEvent: AxiosProgressEvent) => {
            if (onProgress && progressEvent.total) {
              const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
              onProgress({
                type: 'download',
                step: InstallStep.NODEJS_INSTALL, // 默认步骤，具体实现可以传入
                progress,
                message: `下载中... ${this.formatBytes(progressEvent.loaded)}/${this.formatBytes(progressEvent.total)}`,
                speed: progressEvent.rate || 0,
                data: {
                  loaded: progressEvent.loaded,
                  total: progressEvent.total,
                  speed: progressEvent.rate || 0
                }
              });
            }
          }
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        // 验证文件是否下载完成
        const stats = await fs.promises.stat(filePath);
        if (stats.size === 0) {
          throw new Error('下载的文件为空');
        }

        // 可选的校验和验证
        if (config.expectedChecksum) {
          const isValid = await this.verifyChecksum(filePath, config.expectedChecksum);
          if (!isValid) {
            throw new Error('文件校验和不匹配');
          }
        }

        log.info(`下载完成: ${filename}`, {
          path: filePath,
          size: this.formatBytes(stats.size),
          attempts: attempt
        });

        return filePath;

      } catch (error) {
        lastError = error as Error;
        log.warn(`下载失败 (尝试 ${attempt}/${maxRetries})`, {
          error: lastError.message,
          url
        });

        // 清理部分下载的文件
        try {
          await fs.promises.unlink(filePath);
        } catch {
          // 忽略清理错误
        }

        if (attempt < maxRetries) {
          // 等待后重试
          await this.sleep(1000 * attempt);
        }
      }
    }

    throw new Error(`下载失败: ${lastError?.message || '未知错误'}`);
  }

  /**
   * 通用文件移动功能
   */
  protected async moveFile(source: string, destination: string): Promise<void> {
    try {
      // 确保目标目录存在
      await fs.promises.mkdir(path.dirname(destination), { recursive: true });

      // 移动文件
      await fs.promises.rename(source, destination);

      log.info('文件移动完成', { source, destination });
    } catch (error) {
      // 如果重命名失败，尝试复制+删除
      try {
        await fs.promises.copyFile(source, destination);
        await fs.promises.unlink(source);
        log.info('文件复制移动完成', { source, destination });
      } catch (copyError) {
        throw new Error(`文件移动失败: ${(copyError as Error).message}`);
      }
    }
  }

  /**
   * 通用文件解压功能
   */
  protected async extractArchive(archivePath: string, extractPath: string): Promise<void> {
    const extension = path.extname(archivePath).toLowerCase();

    await fs.promises.mkdir(extractPath, { recursive: true });

    switch (extension) {
      case '.zip':
        await this.extractZip(archivePath, extractPath);
        break;
      case '.tar':
      case '.gz':
      case '.tgz':
        await this.extractTarGz(archivePath, extractPath);
        break;
      case '.msi':
      case '.pkg':
      case '.exe':
        // 这些格式需要特殊处理，在子类中实现
        throw new Error(`不支持的归档格式: ${extension}`);
      default:
        throw new Error(`未知的归档格式: ${extension}`);
    }

    log.info('归档解压完成', { archivePath, extractPath });
  }

  /**
   * 校验文件校验和
   */
  protected async verifyChecksum(filePath: string, expectedChecksum: string): Promise<boolean> {
    try {
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      return new Promise((resolve, reject) => {
        stream.on('data', data => hash.update(data));
        stream.on('end', () => {
          const actualChecksum = hash.digest('hex');
          resolve(actualChecksum === expectedChecksum);
        });
        stream.on('error', reject);
      });
    } catch (error) {
      log.warn('校验和验证失败', { error: (error as Error).message, filePath });
      return false;
    }
  }

  /**
   * 添加到系统PATH
   */
  protected async addToPath(executablePath: string): Promise<void> {
    const executableDir = path.dirname(executablePath);

    if (process.platform === 'win32') {
      await this.addToWindowsPath(executableDir);
    } else {
      await this.addToUnixPath(executableDir);
    }

    log.info('已添加到PATH', { path: executableDir });
  }

  /**
   * 创建桌面快捷方式
   */
  protected async createShortcuts(executablePath: string, name: string): Promise<void> {
    if (process.platform === 'win32') {
      await this.createWindowsShortcut(executablePath, name);
    } else if (process.platform === 'darwin') {
      await this.createMacOSAlias(executablePath, name);
    } else {
      await this.createLinuxDesktopEntry(executablePath, name);
    }

    log.info('快捷方式创建完成', { name, executablePath });
  }

  /**
   * 获取平台信息
   */
  protected getPlatformInfo(): { platform: PlatformType; arch: ArchType } {
    const platform = process.platform as PlatformType;
    const arch = process.arch as ArchType;

    return { platform, arch };
  }

  /**
   * 确保必要目录存在
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await fs.promises.mkdir(this.tempDir, { recursive: true });
      await fs.promises.mkdir(this.configDir, { recursive: true });
    } catch (error) {
      log.error('创建目录失败', {
        error: error as Error,
        tempDir: this.tempDir,
        configDir: this.configDir
      });
    }
  }

  /**
   * 格式化字节数
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * 休眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 解压ZIP文件
   */
  private async extractZip(zipPath: string, extractPath: string): Promise<void> {
    try {
      const AdmZip = await import('adm-zip');
      const zip = new AdmZip.default(zipPath);
      zip.extractAllTo(extractPath, true);
    } catch (error) {
      throw new Error(`ZIP解压失败: ${(error as Error).message}`);
    }
  }

  /**
   * 解压TAR.GZ文件
   */
  private async extractTarGz(tarPath: string, extractPath: string): Promise<void> {
    try {
      const tar = await import('tar');
      await tar.extract({
        file: tarPath,
        cwd: extractPath,
        strip: 1 // 移除顶层目录
      });
    } catch (error) {
      throw new Error(`TAR.GZ解压失败: ${(error as Error).message}`);
    }
  }

  /**
   * Windows PATH 添加
   */
  private async addToWindowsPath(dirPath: string): Promise<void> {
    try {
      const { execSync } = await import('child_process');

      // 检查是否已在PATH中
      const currentPath = process.env.PATH || '';
      if (currentPath.split(';').includes(dirPath)) {
        return;
      }

      // 添加到用户PATH
      const command = `setx PATH "%PATH%;${dirPath}"`;
      execSync(command, { stdio: 'pipe' });

    } catch (error) {
      log.warn('Windows PATH添加失败', { error: (error as Error).message, dirPath });
    }
  }

  /**
   * Unix PATH 添加
   */
  private async addToUnixPath(dirPath: string): Promise<void> {
    try {
      const homeDir = os.homedir();
      const shellRc = path.join(homeDir, '.bashrc');
      const zshRc = path.join(homeDir, '.zshrc');

      const pathLine = `export PATH="$PATH:${dirPath}"`;

      // 添加到 .bashrc
      if (fs.existsSync(shellRc)) {
        const content = await fs.promises.readFile(shellRc, 'utf8');
        if (!content.includes(dirPath)) {
          await fs.promises.appendFile(shellRc, `\n${pathLine}\n`);
        }
      }

      // 添加到 .zshrc
      if (fs.existsSync(zshRc)) {
        const content = await fs.promises.readFile(zshRc, 'utf8');
        if (!content.includes(dirPath)) {
          await fs.promises.appendFile(zshRc, `\n${pathLine}\n`);
        }
      }

    } catch (error) {
      log.warn('Unix PATH添加失败', { error: (error as Error).message, dirPath });
    }
  }

  /**
   * 创建Windows快捷方式
   */
  private async createWindowsShortcut(executablePath: string, name: string): Promise<void> {
    try {
      const desktopPath = path.join(os.homedir(), 'Desktop');
      const shortcutPath = path.join(desktopPath, `${name}.lnk`);

      // 这里需要使用Windows API或第三方库来创建快捷方式
      // 简化实现，记录日志
      log.info('Windows快捷方式创建跳过', { executablePath, shortcutPath });

    } catch (error) {
      log.warn('Windows快捷方式创建失败', { error: (error as Error).message });
    }
  }

  /**
   * 创建macOS别名
   */
  private async createMacOSAlias(executablePath: string, name: string): Promise<void> {
    try {
      const desktopPath = path.join(os.homedir(), 'Desktop');
      const aliasPath = path.join(desktopPath, `${name}.app`);

      // 创建符号链接作为简化实现
      if (!fs.existsSync(aliasPath)) {
        await fs.promises.symlink(executablePath, aliasPath);
      }

    } catch (error) {
      log.warn('macOS别名创建失败', { error: (error as Error).message });
    }
  }

  /**
   * 创建Linux桌面条目
   */
  private async createLinuxDesktopEntry(executablePath: string, name: string): Promise<void> {
    try {
      const desktopPath = path.join(os.homedir(), 'Desktop');
      const entryPath = path.join(desktopPath, `${name}.desktop`);

      const desktopEntry = `[Desktop Entry]
Version=1.0
Type=Application
Name=${name}
Exec=${executablePath}
Icon=${executablePath}
Terminal=false
Categories=Development;`;

      await fs.promises.writeFile(entryPath, desktopEntry);

      // 设置可执行权限
      await fs.promises.chmod(entryPath, 0o755);

    } catch (error) {
      log.warn('Linux桌面条目创建失败', { error: (error as Error).message });
    }
  }

  /**
   * 清理临时文件
   */
  protected async cleanup(): Promise<void> {
    try {
      if (fs.existsSync(this.tempDir)) {
        await fs.promises.rm(this.tempDir, { recursive: true, force: true });
        log.info('临时文件清理完成', { tempDir: this.tempDir });
      }
    } catch (error) {
      log.warn('临时文件清理失败', { error: (error as Error).message });
    }
  }
}