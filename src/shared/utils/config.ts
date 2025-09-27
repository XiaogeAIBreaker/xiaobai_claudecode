/**
 * T017: 配置管理器
 * 负责用户配置的加载、保存、验证和加密
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import {
  UserConfig,
  ConfigManager as IConfigManager,
  ValidationResult,
  Language,
  ProxyConfig,
  LoggingConfig,
  UIConfig,
  AdvancedConfig,
  AppSettings
} from '../types/config';
import { InstallStep } from '../types/installer';

/**
 * 配置管理器实现类
 */
export class ConfigManager implements IConfigManager {
  private configDir: string;
  private configPath: string;
  private encryptionKey: string;
  private lockFile: string;

  constructor() {
    this.configDir = path.join(os.homedir(), '.claude-installer');
    this.configPath = path.join(this.configDir, 'config.json');
    this.lockFile = path.join(this.configDir, '.config.lock');
    
    // 生成加密密钥（基于机器特征）
    this.encryptionKey = this.generateEncryptionKey();
  }

  /**
   * 加载配置
   */
  async load(): Promise<UserConfig> {
    try {
      // 确保配置目录存在
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }

      // 如果配置文件不存在，返回默认配置
      if (!fs.existsSync(this.configPath)) {
        return this.getDefaultConfig();
      }

      const configData = fs.readFileSync(this.configPath, 'utf8');
      const config = JSON.parse(configData) as UserConfig;

      // 解密敏感信息
      if (config.apiKey && config.apiKey.startsWith('encrypted:')) {
        config.apiKey = this.decrypt(config.apiKey);
      }
      
      if (config.proxySettings?.password?.startsWith('encrypted:')) {
        config.proxySettings.password = this.decrypt(config.proxySettings.password);
      }

      // 验证配置并与默认配置合并
      return this.mergeWithDefaults(config);
    } catch (error) {
      console.warn('配置加载失败，使用默认配置:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * 保存配置
   */
  async save(config: UserConfig): Promise<void> {
    // 验证配置
    const validation = this.validate(config);
    if (!validation.valid) {
      throw new Error(`配置验证失败: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // 获取文件锁
    await this.acquireLock();

    try {
      // 克隆配置以避免修改原始对象
      const configToSave = JSON.parse(JSON.stringify(config));

      // 加密敏感信息
      if (configToSave.apiKey) {
        configToSave.apiKey = this.encrypt(configToSave.apiKey);
      }
      
      if (configToSave.proxySettings?.password) {
        configToSave.proxySettings.password = this.encrypt(configToSave.proxySettings.password);
      }

      // 确保配置目录存在
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }

      // 写入配置文件
      fs.writeFileSync(this.configPath, JSON.stringify(configToSave, null, 2), 'utf8');
    } finally {
      // 释放文件锁
      await this.releaseLock();
    }
  }

  /**
   * 重置配置
   */
  async reset(): Promise<void> {
    await this.acquireLock();

    try {
      // 删除配置文件
      if (fs.existsSync(this.configPath)) {
        fs.unlinkSync(this.configPath);
      }

      // 清理缓存目录
      const cacheDir = path.join(this.configDir, 'cache');
      if (fs.existsSync(cacheDir)) {
        fs.rmSync(cacheDir, { recursive: true, force: true });
      }

      // 清理日志目录
      const logsDir = path.join(this.configDir, 'logs');
      if (fs.existsSync(logsDir)) {
        fs.rmSync(logsDir, { recursive: true, force: true });
      }
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * 验证配置
   */
  validate(config: Partial<UserConfig>): ValidationResult {
    const errors: Array<{ field: string; message: string; value?: any }> = [];
    const warnings: Array<{ field: string; message: string; value?: any }> = [];

    // 验证语言设置
    if (config.language && !Object.values(Language).includes(config.language)) {
      errors.push({
        field: 'language',
        message: '无效的语言设置',
        value: config.language
      });
    }

    // 验证重试次数
    if (config.maxRetries !== undefined && config.maxRetries < 0) {
      errors.push({
        field: 'maxRetries',
        message: '重试次数必须大于0',
        value: config.maxRetries
      });
    }

    // 验证跳过步骤
    if (config.skipSteps) {
      const validSteps = Object.values(InstallStep);
      const invalidSteps = config.skipSteps.filter(step => !validSteps.includes(step));
      if (invalidSteps.length > 0) {
        errors.push({
          field: 'skipSteps',
          message: '无效的步骤编号',
          value: invalidSteps
        });
      }
    }

    // 验证代理设置
    if (config.proxySettings?.enabled) {
      if (!config.proxySettings.host) {
        errors.push({
          field: 'proxySettings.host',
          message: '代理主机不能为空'
        });
      }
      if (!config.proxySettings.port || config.proxySettings.port < 1 || config.proxySettings.port > 65535) {
        errors.push({
          field: 'proxySettings.port',
          message: '代理端口必须在1-65535之间',
          value: config.proxySettings.port
        });
      }
    }

    // 验证API密钥格式
    if (config.apiKey && !this.isValidApiKey(config.apiKey)) {
      warnings.push({
        field: 'apiKey',
        message: 'API密钥格式可能不正确'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 导入配置
   */
  async import(filePath: string): Promise<UserConfig> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`配置文件不存在: ${filePath}`);
    }

    const configData = fs.readFileSync(filePath, 'utf8');
    const config = JSON.parse(configData) as UserConfig;

    // 验证导入的配置
    const validation = this.validate(config);
    if (!validation.valid) {
      throw new Error(`配置格式无效: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // 保存导入的配置
    await this.save(config);
    return config;
  }

  /**
   * 导出配置
   */
  async export(filePath: string): Promise<void> {
    const config = await this.load();
    
    // 移除敏感信息
    const exportConfig = { ...config };
    if (exportConfig.apiKey) {
      exportConfig.apiKey = '***已隐藏***';
    }
    if (exportConfig.proxySettings?.password) {
      exportConfig.proxySettings.password = '***已隐藏***';
    }

    fs.writeFileSync(filePath, JSON.stringify(exportConfig, null, 2), 'utf8');
  }

  /**
   * 加密敏感数据
   */
  encrypt(data: string): string {
    try {
      const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return `encrypted:${encrypted}`;
    } catch (error) {
      throw new Error('加密失败');
    }
  }

  /**
   * 解密敏感数据
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData.startsWith('encrypted:')) {
      return encryptedData; // 未加密的数据直接返回
    }

    try {
      const encrypted = encryptedData.substring(10); // 移除 'encrypted:' 前缀
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw new Error('解密失败');
    }
  }

  /**
   * 获取配置路径
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): UserConfig {
    return {
      language: Language.ZH_CN,
      apiKey: null,
      apiBaseUrl: null,
      network: {
        useProxy: false,
        testUrls: ['https://www.google.com', 'https://github.com', 'https://npmjs.com']
      },
      proxySettings: null,
      installLocation: null,
      skipSteps: [],
      autoRetry: true,
      maxRetries: 3,
      logging: this.getDefaultLoggingConfig(),
      ui: this.getDefaultUIConfig(),
      advanced: this.getDefaultAdvancedConfig()
    };
  }

  /**
   * 获取默认日志配置
   */
  private getDefaultLoggingConfig(): LoggingConfig {
    return {
      level: 'info',
      console: true,
      file: true,
      filePath: path.join(this.configDir, 'logs', 'installer.log'),
      maxFileSize: 10, // 10MB
      maxFiles: 5,
      includeSensitive: false
    };
  }

  /**
   * 获取默认UI配置
   */
  private getDefaultUIConfig(): UIConfig {
    return {
      theme: 'auto',
      fontSize: 'medium',
      animations: true,
      showDetails: false,
      autoClose: false,
      windowSize: {
        width: 800,
        height: 600
      },
      windowPosition: {
        x: -1, // 居中
        y: -1  // 居中
      },
      alwaysOnTop: false
    };
  }

  /**
   * 获取默认高级配置
   */
  private getDefaultAdvancedConfig(): AdvancedConfig {
    return {
      concurrentDownloads: 3,
      downloadTimeout: 30000, // 30秒
      verifyChecksum: true,
      keepDownloads: false,
      tempDirectory: os.tmpdir(),
      customMirrors: {},
      debugMode: false,
      disableTelemetry: false,
      autoUpdate: true,
      allowPrerelease: false
    };
  }

  /**
   * 生成加密密钥
   */
  private generateEncryptionKey(): string {
    const machineId = this.getMachineId();
    return crypto.createHash('sha256').update(machineId).digest('hex').substring(0, 32);
  }

  /**
   * 获取机器ID
   */
  private getMachineId(): string {
    const platform = os.platform();
    const arch = os.arch();
    const hostname = os.hostname();
    const userInfo = os.userInfo();
    
    return `${platform}-${arch}-${hostname}-${userInfo.username}`;
  }

  /**
   * 验证API密钥格式
   */
  private isValidApiKey(apiKey: string): boolean {
    // Claude API密钥通常以 'sk-' 开头
    return /^sk-[a-zA-Z0-9]+$/.test(apiKey);
  }

  /**
   * 与默认配置合并
   */
  private mergeWithDefaults(config: Partial<UserConfig>): UserConfig {
    const defaultConfig = this.getDefaultConfig();
    return {
      ...defaultConfig,
      ...config,
      logging: { ...defaultConfig.logging, ...config.logging },
      ui: { ...defaultConfig.ui, ...config.ui },
      advanced: { ...defaultConfig.advanced, ...config.advanced }
    };
  }

  /**
   * 获取文件锁
   */
  private async acquireLock(): Promise<void> {
    const maxRetries = 10;
    const retryDelay = 100; // 100ms

    for (let i = 0; i < maxRetries; i++) {
      try {
        if (!fs.existsSync(this.lockFile)) {
          fs.writeFileSync(this.lockFile, process.pid.toString());
          return;
        }

        // 检查锁文件中的进程是否还存在
        const lockPid = parseInt(fs.readFileSync(this.lockFile, 'utf8'));
        try {
          process.kill(lockPid, 0); // 检查进程是否存在
          // 进程存在，等待
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } catch {
          // 进程不存在，删除锁文件
          fs.unlinkSync(this.lockFile);
        }
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error('无法获取配置文件锁');
        }
      }
    }
  }

  /**
   * 释放文件锁
   */
  private async releaseLock(): Promise<void> {
    try {
      if (fs.existsSync(this.lockFile)) {
        fs.unlinkSync(this.lockFile);
      }
    } catch (error) {
      console.warn('释放配置文件锁失败:', error);
    }
  }
}

// 导出单例实例
export const configManager = new ConfigManager();
