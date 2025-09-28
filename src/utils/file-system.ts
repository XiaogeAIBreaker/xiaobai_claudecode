/**
 * 跨平台文件系统和配置存储
 * 提供统一的文件操作和配置管理接口，支持Windows、macOS、Linux
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { windowsPlatform } from '../platform/windows';
import { macOSPlatform } from '../platform/macos';

/**
 * 文件系统配置接口
 */
interface FileSystemConfig {
  useNativePermissions: boolean;
  createBackups: boolean;
  validatePaths: boolean;
  atomicWrites: boolean;
  maxFileSize: number;
  allowedExtensions?: string[];
}

/**
 * 配置存储选项接口
 */
interface ConfigStorageOptions {
  encrypted: boolean;
  global: boolean;
  createDir: boolean;
  backup: boolean;
  validation: boolean;
}

/**
 * 文件信息接口
 */
interface FileInfo {
  path: string;
  size: number;
  created: Date;
  modified: Date;
  accessed: Date;
  isDirectory: boolean;
  isFile: boolean;
  permissions: {
    readable: boolean;
    writable: boolean;
    executable: boolean;
  };
  platform: {
    windows?: any;
    macos?: any;
  };
}

/**
 * 配置条目接口
 */
interface ConfigEntry {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  encrypted: boolean;
  lastModified: Date;
  version: number;
}

/**
 * 跨平台文件系统类
 */
class CrossPlatformFileSystem {
  private config: FileSystemConfig = {
    useNativePermissions: true,
    createBackups: true,
    validatePaths: true,
    atomicWrites: true,
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedExtensions: undefined
  };

  private platform: string = os.platform();

  /**
   * 初始化文件系统
   */
  async initialize(config?: Partial<FileSystemConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    console.log(`跨平台文件系统初始化完成 (${this.platform})`);
  }

  /**
   * 规范化路径
   */
  normalizePath(inputPath: string): string {
    if (!this.config.validatePaths) {
      return path.normalize(inputPath);
    }

    let normalized = path.normalize(inputPath);

    // 平台特定的路径规范化
    if (this.platform === 'win32') {
      normalized = windowsPlatform.normalizePath(normalized);
    }

    return normalized;
  }

  /**
   * 验证路径
   */
  async validatePath(inputPath: string): Promise<boolean> {
    if (!this.config.validatePaths) {
      return true;
    }

    try {
      const normalized = this.normalizePath(inputPath);

      // 检查路径长度
      if (normalized.length > (this.platform === 'win32' ? 260 : 1024)) {
        return false;
      }

      // 平台特定验证
      if (this.platform === 'win32') {
        return await windowsPlatform.validatePath(normalized);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 安全创建目录
   */
  async ensureDirectory(dirPath: string, mode?: number): Promise<void> {
    const normalized = this.normalizePath(dirPath);

    if (!(await this.validatePath(normalized))) {
      throw new Error(`无效的目录路径: ${normalized}`);
    }

    try {
      await fs.mkdir(normalized, { recursive: true, mode });
    } catch (error) {
      throw new Error(`创建目录失败: ${error}`);
    }
  }

  /**
   * 安全读取文件
   */
  async readFile(filePath: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
    const normalized = this.normalizePath(filePath);

    if (!(await this.validatePath(normalized))) {
      throw new Error(`无效的文件路径: ${normalized}`);
    }

    try {
      // 检查文件大小
      const stats = await fs.stat(normalized);
      if (stats.size > this.config.maxFileSize) {
        throw new Error(`文件过大: ${stats.size} bytes`);
      }

      return await fs.readFile(normalized, encoding);
    } catch (error) {
      throw new Error(`读取文件失败: ${error}`);
    }
  }

  /**
   * 安全写入文件
   */
  async writeFile(filePath: string, content: string, options?: {
    encoding?: BufferEncoding;
    mode?: number;
    atomic?: boolean;
  }): Promise<void> {
    const normalized = this.normalizePath(filePath);
    const opts = {
      encoding: 'utf8' as BufferEncoding,
      atomic: this.config.atomicWrites,
      ...options
    };

    if (!(await this.validatePath(normalized))) {
      throw new Error(`无效的文件路径: ${normalized}`);
    }

    // 检查文件扩展名
    if (this.config.allowedExtensions) {
      const ext = path.extname(normalized).toLowerCase();
      if (!this.config.allowedExtensions.includes(ext)) {
        throw new Error(`不允许的文件扩展名: ${ext}`);
      }
    }

    try {
      // 确保目录存在
      await this.ensureDirectory(path.dirname(normalized));

      // 创建备份
      if (this.config.createBackups && await this.exists(normalized)) {
        await this.createBackup(normalized);
      }

      if (opts.atomic) {
        // 原子写入
        const tempPath = `${normalized}.tmp.${Date.now()}`;
        await fs.writeFile(tempPath, content, { encoding: opts.encoding, mode: opts.mode });
        await fs.rename(tempPath, normalized);
      } else {
        // 直接写入
        await fs.writeFile(normalized, content, { encoding: opts.encoding, mode: opts.mode });
      }
    } catch (error) {
      throw new Error(`写入文件失败: ${error}`);
    }
  }

  /**
   * 检查文件或目录是否存在
   */
  async exists(targetPath: string): Promise<boolean> {
    try {
      const normalized = this.normalizePath(targetPath);
      await fs.access(normalized);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(filePath: string): Promise<FileInfo> {
    const normalized = this.normalizePath(filePath);

    try {
      const stats = await fs.stat(normalized);

      // 基本权限检查
      const permissions = {
        readable: true,
        writable: true,
        executable: true
      };

      try {
        await fs.access(normalized, fs.constants.R_OK);
      } catch {
        permissions.readable = false;
      }

      try {
        await fs.access(normalized, fs.constants.W_OK);
      } catch {
        permissions.writable = false;
      }

      try {
        await fs.access(normalized, fs.constants.X_OK);
      } catch {
        permissions.executable = false;
      }

      // 平台特定信息
      const platformInfo: any = {};

      if (this.config.useNativePermissions) {
        try {
          if (this.platform === 'win32') {
            platformInfo.windows = await windowsPlatform.getPermissions(normalized);
          } else if (this.platform === 'darwin') {
            platformInfo.macos = await macOSPlatform.getPermissions(normalized);
          }
        } catch (error) {
          // 忽略平台特定权限获取错误
        }
      }

      return {
        path: normalized,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        permissions,
        platform: platformInfo
      };
    } catch (error) {
      throw new Error(`获取文件信息失败: ${error}`);
    }
  }

  /**
   * 复制文件
   */
  async copyFile(srcPath: string, destPath: string, options?: {
    overwrite?: boolean;
    preserveTimestamps?: boolean;
  }): Promise<void> {
    const normalizedSrc = this.normalizePath(srcPath);
    const normalizedDest = this.normalizePath(destPath);
    const opts = { overwrite: false, preserveTimestamps: true, ...options };

    if (!(await this.validatePath(normalizedSrc)) || !(await this.validatePath(normalizedDest))) {
      throw new Error('无效的文件路径');
    }

    try {
      // 检查源文件是否存在
      if (!(await this.exists(normalizedSrc))) {
        throw new Error(`源文件不存在: ${normalizedSrc}`);
      }

      // 检查目标文件是否已存在
      if (!opts.overwrite && await this.exists(normalizedDest)) {
        throw new Error(`目标文件已存在: ${normalizedDest}`);
      }

      // 确保目标目录存在
      await this.ensureDirectory(path.dirname(normalizedDest));

      // 复制文件
      await fs.copyFile(normalizedSrc, normalizedDest);

      // 保持时间戳
      if (opts.preserveTimestamps) {
        const srcStats = await fs.stat(normalizedSrc);
        await fs.utimes(normalizedDest, srcStats.atime, srcStats.mtime);
      }
    } catch (error) {
      throw new Error(`复制文件失败: ${error}`);
    }
  }

  /**
   * 移动文件
   */
  async moveFile(srcPath: string, destPath: string, options?: {
    overwrite?: boolean;
  }): Promise<void> {
    const normalizedSrc = this.normalizePath(srcPath);
    const normalizedDest = this.normalizePath(destPath);
    const opts = { overwrite: false, ...options };

    if (!(await this.validatePath(normalizedSrc)) || !(await this.validatePath(normalizedDest))) {
      throw new Error('无效的文件路径');
    }

    try {
      // 检查源文件是否存在
      if (!(await this.exists(normalizedSrc))) {
        throw new Error(`源文件不存在: ${normalizedSrc}`);
      }

      // 检查目标文件是否已存在
      if (!opts.overwrite && await this.exists(normalizedDest)) {
        throw new Error(`目标文件已存在: ${normalizedDest}`);
      }

      // 确保目标目录存在
      await this.ensureDirectory(path.dirname(normalizedDest));

      // 移动文件
      await fs.rename(normalizedSrc, normalizedDest);
    } catch (error) {
      throw new Error(`移动文件失败: ${error}`);
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(filePath: string, options?: {
    force?: boolean;
    backup?: boolean;
  }): Promise<void> {
    const normalized = this.normalizePath(filePath);
    const opts = { force: false, backup: this.config.createBackups, ...options };

    if (!(await this.validatePath(normalized))) {
      throw new Error(`无效的文件路径: ${normalized}`);
    }

    try {
      if (!(await this.exists(normalized))) {
        if (!opts.force) {
          throw new Error(`文件不存在: ${normalized}`);
        }
        return;
      }

      // 创建备份
      if (opts.backup) {
        await this.createBackup(normalized);
      }

      await fs.unlink(normalized);
    } catch (error) {
      throw new Error(`删除文件失败: ${error}`);
    }
  }

  /**
   * 列出目录内容
   */
  async listDirectory(dirPath: string, options?: {
    recursive?: boolean;
    includeHidden?: boolean;
    filter?: (name: string) => boolean;
  }): Promise<string[]> {
    const normalized = this.normalizePath(dirPath);
    const opts = { recursive: false, includeHidden: false, ...options };

    if (!(await this.validatePath(normalized))) {
      throw new Error(`无效的目录路径: ${normalized}`);
    }

    try {
      if (!(await this.exists(normalized))) {
        throw new Error(`目录不存在: ${normalized}`);
      }

      const entries = await fs.readdir(normalized, { withFileTypes: true });
      const results: string[] = [];

      for (const entry of entries) {
        const fullPath = path.join(normalized, entry.name);

        // 过滤隐藏文件
        if (!opts.includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        // 应用自定义过滤器
        if (opts.filter && !opts.filter(entry.name)) {
          continue;
        }

        results.push(fullPath);

        // 递归处理子目录
        if (opts.recursive && entry.isDirectory()) {
          const subResults = await this.listDirectory(fullPath, opts);
          results.push(...subResults);
        }
      }

      return results.sort();
    } catch (error) {
      throw new Error(`列出目录内容失败: ${error}`);
    }
  }

  /**
   * 创建备份
   */
  async createBackup(filePath: string): Promise<string> {
    const normalized = this.normalizePath(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${normalized}.backup.${timestamp}`;

    try {
      await this.copyFile(normalized, backupPath, { overwrite: false });
      return backupPath;
    } catch (error) {
      throw new Error(`创建备份失败: ${error}`);
    }
  }

  /**
   * 获取临时目录
   */
  getTempDirectory(): string {
    return this.normalizePath(os.tmpdir());
  }

  /**
   * 获取用户主目录
   */
  getHomeDirectory(): string {
    return this.normalizePath(os.homedir());
  }

  /**
   * 获取当前工作目录
   */
  getCurrentDirectory(): string {
    return this.normalizePath(process.cwd());
  }
}

/**
 * 跨平台配置存储类
 */
class CrossPlatformConfigStorage {
  private fileSystem: CrossPlatformFileSystem;
  private configDir: string;
  private configCache: Map<string, ConfigEntry> = new Map();

  constructor(fileSystem: CrossPlatformFileSystem, configDir?: string) {
    this.fileSystem = fileSystem;
    this.configDir = configDir || this.getDefaultConfigDirectory();
  }

  /**
   * 初始化配置存储
   */
  async initialize(): Promise<void> {
    await this.fileSystem.ensureDirectory(this.configDir);
    await this.loadAllConfigs();
    console.log(`配置存储初始化完成: ${this.configDir}`);
  }

  /**
   * 设置配置值
   */
  async set(key: string, value: any, options?: ConfigStorageOptions): Promise<void> {
    const opts: ConfigStorageOptions = {
      encrypted: false,
      global: false,
      createDir: true,
      backup: true,
      validation: true,
      ...options
    };

    try {
      const entry: ConfigEntry = {
        key,
        value,
        type: this.getValueType(value),
        encrypted: opts.encrypted,
        lastModified: new Date(),
        version: this.getNextVersion(key)
      };

      // 验证值
      if (opts.validation) {
        this.validateConfigValue(key, value);
      }

      // 存储到缓存
      this.configCache.set(key, entry);

      // 持久化到文件
      const configPath = this.getConfigPath(key, opts.global);

      if (opts.createDir) {
        await this.fileSystem.ensureDirectory(path.dirname(configPath));
      }

      const content = JSON.stringify(entry, null, 2);
      await this.fileSystem.writeFile(configPath, content, {
        atomic: true
      });

    } catch (error) {
      throw new Error(`设置配置失败: ${error}`);
    }
  }

  /**
   * 获取配置值
   */
  async get<T = any>(key: string, defaultValue?: T, options?: { global?: boolean }): Promise<T> {
    const opts = { global: false, ...options };

    try {
      // 首先检查缓存
      if (this.configCache.has(key)) {
        const entry = this.configCache.get(key)!;
        return entry.value as T;
      }

      // 从文件加载
      const configPath = this.getConfigPath(key, opts.global);

      if (!(await this.fileSystem.exists(configPath))) {
        return defaultValue as T;
      }

      const content = await this.fileSystem.readFile(configPath);
      const entry: ConfigEntry = JSON.parse(content);

      // 验证和更新缓存
      this.configCache.set(key, entry);

      return entry.value as T;
    } catch (error) {
      console.warn(`获取配置失败: ${error}`);
      return defaultValue as T;
    }
  }

  /**
   * 删除配置
   */
  async delete(key: string, options?: { global?: boolean; backup?: boolean }): Promise<boolean> {
    const opts = { global: false, backup: true, ...options };

    try {
      // 从缓存删除
      this.configCache.delete(key);

      // 从文件删除
      const configPath = this.getConfigPath(key, opts.global);

      if (await this.fileSystem.exists(configPath)) {
        await this.fileSystem.deleteFile(configPath, { backup: opts.backup });
        return true;
      }

      return false;
    } catch (error) {
      throw new Error(`删除配置失败: ${error}`);
    }
  }

  /**
   * 检查配置是否存在
   */
  async has(key: string, options?: { global?: boolean }): Promise<boolean> {
    const opts = { global: false, ...options };

    if (this.configCache.has(key)) {
      return true;
    }

    const configPath = this.getConfigPath(key, opts.global);
    return await this.fileSystem.exists(configPath);
  }

  /**
   * 获取所有配置键
   */
  async keys(options?: { global?: boolean }): Promise<string[]> {
    const opts = { global: false, ...options };

    try {
      const configPath = opts.global ? this.getGlobalConfigDirectory() : this.configDir;

      if (!(await this.fileSystem.exists(configPath))) {
        return [];
      }

      const files = await this.fileSystem.listDirectory(configPath, {
        recursive: false,
        filter: (name) => name.endsWith('.json')
      });

      return files
        .map(file => path.basename(file, '.json'))
        .sort();
    } catch (error) {
      console.warn(`获取配置键失败: ${error}`);
      return [];
    }
  }

  /**
   * 清除所有配置
   */
  async clear(options?: { global?: boolean; backup?: boolean }): Promise<void> {
    const opts = { global: false, backup: true, ...options };

    try {
      const keys = await this.keys(opts);

      for (const key of keys) {
        await this.delete(key, opts);
      }

      this.configCache.clear();
    } catch (error) {
      throw new Error(`清除配置失败: ${error}`);
    }
  }

  /**
   * 导出配置
   */
  async export(filePath: string, options?: { global?: boolean; includeEncrypted?: boolean }): Promise<void> {
    const opts = { global: false, includeEncrypted: false, ...options };

    try {
      const keys = await this.keys(opts);
      const exportData: Record<string, any> = {};

      for (const key of keys) {
        const entry = this.configCache.get(key) || await this.loadConfig(key, opts.global);

        if (entry && (opts.includeEncrypted || !entry.encrypted)) {
          exportData[key] = {
            value: entry.value,
            type: entry.type,
            lastModified: entry.lastModified,
            version: entry.version
          };
        }
      }

      const content = JSON.stringify(exportData, null, 2);
      await this.fileSystem.writeFile(filePath, content);
    } catch (error) {
      throw new Error(`导出配置失败: ${error}`);
    }
  }

  /**
   * 导入配置
   */
  async import(filePath: string, options?: { global?: boolean; overwrite?: boolean }): Promise<void> {
    const opts = { global: false, overwrite: false, ...options };

    try {
      if (!(await this.fileSystem.exists(filePath))) {
        throw new Error(`配置文件不存在: ${filePath}`);
      }

      const content = await this.fileSystem.readFile(filePath);
      const importData = JSON.parse(content);

      for (const [key, data] of Object.entries(importData)) {
        if (!opts.overwrite && await this.has(key, opts)) {
          continue;
        }

        await this.set(key, (data as any).value, {
          global: opts.global,
          validation: true
        });
      }
    } catch (error) {
      throw new Error(`导入配置失败: ${error}`);
    }
  }

  /**
   * 获取默认配置目录
   */
  private getDefaultConfigDirectory(): string {
    const platform = os.platform();
    const home = os.homedir();

    switch (platform) {
      case 'win32':
        return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'claude-code-cli');
      case 'darwin':
        return path.join(home, 'Library', 'Application Support', 'claude-code-cli');
      default:
        return path.join(home, '.config', 'claude-code-cli');
    }
  }

  /**
   * 获取全局配置目录
   */
  private getGlobalConfigDirectory(): string {
    const platform = os.platform();

    switch (platform) {
      case 'win32':
        return path.join(process.env.ProgramData || 'C:\\ProgramData', 'claude-code-cli');
      case 'darwin':
        return '/Library/Application Support/claude-code-cli';
      default:
        return '/etc/claude-code-cli';
    }
  }

  /**
   * 获取配置文件路径
   */
  private getConfigPath(key: string, global: boolean): string {
    const configDir = global ? this.getGlobalConfigDirectory() : this.configDir;
    return path.join(configDir, `${key}.json`);
  }

  /**
   * 加载单个配置
   */
  private async loadConfig(key: string, global: boolean): Promise<ConfigEntry | null> {
    try {
      const configPath = this.getConfigPath(key, global);

      if (!(await this.fileSystem.exists(configPath))) {
        return null;
      }

      const content = await this.fileSystem.readFile(configPath);
      return JSON.parse(content) as ConfigEntry;
    } catch (error) {
      console.warn(`加载配置失败: ${key}`, error);
      return null;
    }
  }

  /**
   * 加载所有配置
   */
  private async loadAllConfigs(): Promise<void> {
    try {
      const keys = await this.keys();

      for (const key of keys) {
        const entry = await this.loadConfig(key, false);
        if (entry) {
          this.configCache.set(key, entry);
        }
      }
    } catch (error) {
      console.warn('加载配置失败:', error);
    }
  }

  /**
   * 获取值类型
   */
  private getValueType(value: any): ConfigEntry['type'] {
    if (Array.isArray(value)) return 'array';
    if (value === null || value === undefined) return 'string';
    return typeof value as ConfigEntry['type'];
  }

  /**
   * 获取下一个版本号
   */
  private getNextVersion(key: string): number {
    const existing = this.configCache.get(key);
    return existing ? existing.version + 1 : 1;
  }

  /**
   * 验证配置值
   */
  private validateConfigValue(key: string, value: any): void {
    // 基本验证规则
    if (key.length === 0) {
      throw new Error('配置键不能为空');
    }

    if (key.length > 100) {
      throw new Error('配置键过长');
    }

    // 序列化测试
    try {
      JSON.stringify(value);
    } catch (error) {
      throw new Error('配置值无法序列化');
    }
  }
}

/**
 * 全局文件系统实例
 */
export const fileSystem = new CrossPlatformFileSystem();

/**
 * 全局配置存储实例
 */
export const configStorage = new CrossPlatformConfigStorage(fileSystem);

/**
 * 导出类型定义
 */
export type { FileSystemConfig, ConfigStorageOptions, FileInfo, ConfigEntry };

/**
 * 导出类
 */
export { CrossPlatformFileSystem, CrossPlatformConfigStorage };