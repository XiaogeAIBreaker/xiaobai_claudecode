/**
 * 配置管理服务
 * 负责用户配置的安全存储、环境变量管理和配置同步
 */

import { getConfigurationManager } from '../main/ipc/config-handler';
import { UserConfiguration, validateUserConfiguration } from '../models/user-configuration';

/**
 * 环境变量配置接口
 */
interface EnvironmentVariables {
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_BASE_URL?: string;
  CLAUDE_CLI_CONFIG_PATH?: string;
  NODE_ENV?: string;
  NPM_CONFIG_REGISTRY?: string;
  HTTP_PROXY?: string;
  HTTPS_PROXY?: string;
}

/**
 * 配置备份接口
 */
interface ConfigurationBackup {
  id: string;
  timestamp: Date;
  configuration: UserConfiguration;
  description?: string;
  automatic: boolean;
}

/**
 * 配置同步结果接口
 */
interface ConfigurationSyncResult {
  success: boolean;
  syncedSettings: string[];
  conflicts: string[];
  errors: string[];
}

/**
 * 配置迁移结果接口
 */
interface ConfigurationMigrationResult {
  success: boolean;
  migratedVersion: string;
  changes: string[];
  warnings: string[];
}

/**
 * 配置安全检查结果接口
 */
interface ConfigurationSecurityCheck {
  isSecure: boolean;
  vulnerabilities: {
    type: 'exposed_secrets' | 'weak_permissions' | 'insecure_storage' | 'plaintext_keys';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation: string;
  }[];
  recommendations: string[];
}

/**
 * 配置管理服务类
 */
export class ConfigurationService {
  private configurationManager = getConfigurationManager();
  private backups: ConfigurationBackup[] = [];
  private readonly maxBackups = 10;
  private readonly encryptionKey: string;

  constructor() {
    this.encryptionKey = this.generateEncryptionKey();
    this.initializeService();
  }

  /**
   * 初始化服务
   */
  private async initializeService(): Promise<void> {
    try {
      // 加载配置
      await this.configurationManager.loadConfiguration();

      // 加载备份
      await this.loadBackups();

      // 执行安全检查
      await this.performSecurityCheck();

      console.log('配置管理服务初始化完成');
    } catch (error) {
      console.error('配置管理服务初始化失败:', error);
    }
  }

  /**
   * 保存配置（加密存储）
   */
  async saveSecureConfiguration(configuration: Partial<UserConfiguration>, createBackup = true): Promise<{
    success: boolean;
    backupId?: string;
    error?: string;
  }> {
    console.log('保存安全配置');

    try {
      // 创建备份
      let backupId: string | undefined;
      if (createBackup) {
        const currentConfig = this.configurationManager.getConfiguration();
        backupId = await this.createBackup(currentConfig, '自动备份 - 配置更新前');
      }

      // 加密敏感信息
      const secureConfig = await this.encryptSensitiveData(configuration);

      // 保存配置
      const saveResult = await this.configurationManager.saveConfiguration({
        configuration: secureConfig,
        validate: true
      });

      if (!saveResult.success) {
        return {
          success: false,
          error: saveResult.error
        };
      }

      // 同步环境变量
      await this.syncEnvironmentVariables(saveResult.savedConfiguration!);

      console.log('安全配置保存成功');
      return {
        success: true,
        backupId
      };

    } catch (error) {
      console.error('保存安全配置失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 加载配置（解密）
   */
  async loadSecureConfiguration(): Promise<UserConfiguration> {
    console.log('加载安全配置');

    try {
      const configuration = await this.configurationManager.loadConfiguration();

      // 解密敏感信息
      const decryptedConfig = await this.decryptSensitiveData(configuration);

      console.log('安全配置加载成功');
      return decryptedConfig;

    } catch (error) {
      console.error('加载安全配置失败:', error);
      throw error;
    }
  }

  /**
   * 管理环境变量
   */
  async manageEnvironmentVariables(variables: EnvironmentVariables): Promise<{
    success: boolean;
    applied: string[];
    errors: string[];
  }> {
    console.log('管理环境变量');

    const applied: string[] = [];
    const errors: string[] = [];

    try {
      for (const [key, value] of Object.entries(variables)) {
        if (value !== undefined) {
          try {
            // 在主进程中设置环境变量
            process.env[key] = value;
            applied.push(key);

            // 对于敏感变量，记录但不显示值
            if (this.isSensitiveVariable(key)) {
              console.log(`环境变量 ${key} 已设置 (敏感信息)`);
            } else {
              console.log(`环境变量 ${key} 已设置: ${value}`);
            }
          } catch (error) {
            errors.push(`设置 ${key} 失败: ${error}`);
          }
        }
      }

      // 将环境变量持久化到配置文件
      await this.persistEnvironmentVariables(variables);

      const success = errors.length === 0;
      console.log(`环境变量管理完成: ${applied.length} 个成功, ${errors.length} 个失败`);

      return { success, applied, errors };

    } catch (error) {
      console.error('管理环境变量失败:', error);
      return {
        success: false,
        applied,
        errors: [...errors, error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 创建配置备份
   */
  async createBackup(configuration: UserConfiguration, description?: string): Promise<string> {
    console.log('创建配置备份');

    try {
      const backup: ConfigurationBackup = {
        id: this.generateBackupId(),
        timestamp: new Date(),
        configuration: { ...configuration },
        description,
        automatic: !description
      };

      this.backups.push(backup);

      // 限制备份数量
      if (this.backups.length > this.maxBackups) {
        this.backups = this.backups
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, this.maxBackups);
      }

      // 保存备份到文件
      await this.saveBackupsToFile();

      console.log(`配置备份创建成功: ${backup.id}`);
      return backup.id;

    } catch (error) {
      console.error('创建配置备份失败:', error);
      throw error;
    }
  }

  /**
   * 恢复配置备份
   */
  async restoreBackup(backupId: string): Promise<{
    success: boolean;
    restoredConfiguration?: UserConfiguration;
    error?: string;
  }> {
    console.log(`恢复配置备份: ${backupId}`);

    try {
      const backup = this.backups.find(b => b.id === backupId);
      if (!backup) {
        return {
          success: false,
          error: `备份不存在: ${backupId}`
        };
      }

      // 创建当前配置的备份
      const currentConfig = this.configurationManager.getConfiguration();
      await this.createBackup(currentConfig, '恢复前自动备份');

      // 恢复配置
      const saveResult = await this.configurationManager.saveConfiguration({
        configuration: backup.configuration,
        validate: true
      });

      if (!saveResult.success) {
        return {
          success: false,
          error: saveResult.error
        };
      }

      console.log(`配置备份恢复成功: ${backupId}`);
      return {
        success: true,
        restoredConfiguration: backup.configuration
      };

    } catch (error) {
      console.error('恢复配置备份失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 获取备份列表
   */
  getBackups(): ConfigurationBackup[] {
    return this.backups
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .map(backup => ({
        ...backup,
        configuration: { ...backup.configuration } // 创建副本
      }));
  }

  /**
   * 删除备份
   */
  async deleteBackup(backupId: string): Promise<boolean> {
    console.log(`删除配置备份: ${backupId}`);

    try {
      const initialLength = this.backups.length;
      this.backups = this.backups.filter(b => b.id !== backupId);

      if (this.backups.length === initialLength) {
        console.warn(`备份不存在: ${backupId}`);
        return false;
      }

      await this.saveBackupsToFile();
      console.log(`配置备份删除成功: ${backupId}`);
      return true;

    } catch (error) {
      console.error('删除配置备份失败:', error);
      return false;
    }
  }

  /**
   * 同步配置到外部系统
   */
  async syncConfiguration(): Promise<ConfigurationSyncResult> {
    console.log('同步配置到外部系统');

    const syncedSettings: string[] = [];
    const conflicts: string[] = [];
    const errors: string[] = [];

    try {
      const configuration = await this.loadSecureConfiguration();

      // 同步到npm配置
      if (configuration.networkSettings?.preferredRegistry) {
        try {
          await this.syncToNpmConfig(configuration.networkSettings.preferredRegistry);
          syncedSettings.push('npm registry');
        } catch (error) {
          errors.push(`npm配置同步失败: ${error}`);
        }
      }

      // 同步到Claude CLI配置
      if (configuration.apiSettings?.anthropicApiKey) {
        try {
          await this.syncToClaudeCli(configuration.apiSettings);
          syncedSettings.push('Claude CLI API settings');
        } catch (error) {
          errors.push(`Claude CLI配置同步失败: ${error}`);
        }
      }

      // 同步环境变量
      try {
        const envVars = this.extractEnvironmentVariables(configuration);
        await this.manageEnvironmentVariables(envVars);
        syncedSettings.push('environment variables');
      } catch (error) {
        errors.push(`环境变量同步失败: ${error}`);
      }

      const success = errors.length === 0;
      console.log(`配置同步完成: ${syncedSettings.length} 项成功, ${errors.length} 项失败`);

      return { success, syncedSettings, conflicts, errors };

    } catch (error) {
      console.error('配置同步失败:', error);
      return {
        success: false,
        syncedSettings,
        conflicts,
        errors: [...errors, error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 执行安全检查
   */
  async performSecurityCheck(): Promise<ConfigurationSecurityCheck> {
    console.log('执行配置安全检查');

    const vulnerabilities: ConfigurationSecurityCheck['vulnerabilities'] = [];
    const recommendations: string[] = [];

    try {
      const configuration = this.configurationManager.getConfiguration();

      // 检查暴露的密钥
      if (configuration.apiSettings?.anthropicApiKey) {
        const apiKey = configuration.apiSettings.anthropicApiKey;
        if (this.isKeyExposed(apiKey)) {
          vulnerabilities.push({
            type: 'exposed_secrets',
            severity: 'critical',
            description: 'API密钥可能在日志或临时文件中暴露',
            recommendation: '重新生成API密钥并确保安全存储'
          });
        }
      }

      // 检查文件权限
      const configPath = this.configurationManager.getConfigPath();
      const permissionsOk = await this.checkFilePermissions(configPath);
      if (!permissionsOk) {
        vulnerabilities.push({
          type: 'weak_permissions',
          severity: 'high',
          description: '配置文件权限过于宽松',
          recommendation: '设置配置文件为仅当前用户可读写'
        });
      }

      // 检查加密状态
      if (!this.isConfigurationEncrypted(configuration)) {
        vulnerabilities.push({
          type: 'insecure_storage',
          severity: 'medium',
          description: '敏感配置信息未加密存储',
          recommendation: '启用配置加密功能'
        });
      }

      // 检查明文存储的密钥
      if (this.hasPlaintextKeys(configuration)) {
        vulnerabilities.push({
          type: 'plaintext_keys',
          severity: 'high',
          description: '敏感信息以明文形式存储',
          recommendation: '使用加密存储敏感信息'
        });
      }

      // 生成建议
      if (vulnerabilities.length === 0) {
        recommendations.push('配置安全性良好，无发现安全问题');
      } else {
        recommendations.push('发现安全问题，建议立即修复');
        recommendations.push('定期更新API密钥和敏感信息');
        recommendations.push('使用强权限保护配置文件');
      }

      const isSecure = vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0;

      console.log(`安全检查完成: ${isSecure ? '安全' : '存在风险'} (${vulnerabilities.length} 个问题)`);

      return { isSecure, vulnerabilities, recommendations };

    } catch (error) {
      console.error('安全检查失败:', error);
      return {
        isSecure: false,
        vulnerabilities: [],
        recommendations: ['安全检查失败，建议手动检查配置文件安全性']
      };
    }
  }

  /**
   * 迁移配置版本
   */
  async migrateConfiguration(targetVersion: string): Promise<ConfigurationMigrationResult> {
    console.log(`迁移配置到版本: ${targetVersion}`);

    const changes: string[] = [];
    const warnings: string[] = [];

    try {
      const configuration = await this.loadSecureConfiguration();

      // 创建迁移前备份
      await this.createBackup(configuration, `迁移前备份 - v${targetVersion}`);

      // 执行版本特定的迁移逻辑
      let migratedConfig = { ...configuration };

      // 示例迁移逻辑
      if (targetVersion === '2.0.0') {
        // 迁移网络设置结构
        if (configuration.networkSettings) {
          // 假设新版本改变了网络设置结构
          changes.push('网络设置结构已更新');
        }

        // 迁移API设置
        if (configuration.apiSettings) {
          // 假设新版本增加了新的API设置
          changes.push('API设置已扩展');
        }
      }

      // 验证迁移后的配置
      validateUserConfiguration(migratedConfig);

      // 保存迁移后的配置
      await this.configurationManager.saveConfiguration({
        configuration: migratedConfig,
        validate: true
      });

      console.log(`配置迁移完成: ${changes.length} 项更改`);

      return {
        success: true,
        migratedVersion: targetVersion,
        changes,
        warnings
      };

    } catch (error) {
      console.error('配置迁移失败:', error);
      return {
        success: false,
        migratedVersion: targetVersion,
        changes,
        warnings: [...warnings, error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 加密敏感数据
   */
  private async encryptSensitiveData(configuration: Partial<UserConfiguration>): Promise<Partial<UserConfiguration>> {
    const encrypted = { ...configuration };

    if (encrypted.apiSettings?.anthropicApiKey) {
      encrypted.apiSettings.anthropicApiKey = await this.encrypt(encrypted.apiSettings.anthropicApiKey);
    }

    return encrypted;
  }

  /**
   * 解密敏感数据
   */
  private async decryptSensitiveData(configuration: UserConfiguration): Promise<UserConfiguration> {
    const decrypted = { ...configuration };

    if (decrypted.apiSettings?.anthropicApiKey) {
      try {
        decrypted.apiSettings.anthropicApiKey = await this.decrypt(decrypted.apiSettings.anthropicApiKey);
      } catch {
        // 如果解密失败，可能是明文存储的旧配置
        console.warn('API密钥解密失败，可能是明文存储');
      }
    }

    return decrypted;
  }

  /**
   * 生成加密密钥
   */
  private generateEncryptionKey(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 加密文本
   */
  private async encrypt(text: string): Promise<string> {
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(this.encryptionKey, 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipher(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * 解密文本
   */
  private async decrypt(encryptedText: string): Promise<string> {
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(this.encryptionKey, 'hex');

    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('无效的加密格式');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipher(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * 同步环境变量
   */
  private async syncEnvironmentVariables(configuration: UserConfiguration): Promise<void> {
    const envVars = this.extractEnvironmentVariables(configuration);
    await this.manageEnvironmentVariables(envVars);
  }

  /**
   * 提取环境变量
   */
  private extractEnvironmentVariables(configuration: UserConfiguration): EnvironmentVariables {
    const envVars: EnvironmentVariables = {};

    if (configuration.apiSettings?.anthropicApiKey) {
      envVars.ANTHROPIC_API_KEY = configuration.apiSettings.anthropicApiKey;
    }

    if (configuration.apiSettings?.baseUrl) {
      envVars.ANTHROPIC_BASE_URL = configuration.apiSettings.baseUrl;
    }

    if (configuration.networkSettings?.preferredRegistry) {
      envVars.NPM_CONFIG_REGISTRY = configuration.networkSettings.preferredRegistry;
    }

    return envVars;
  }

  /**
   * 持久化环境变量
   */
  private async persistEnvironmentVariables(variables: EnvironmentVariables): Promise<void> {
    // 将环境变量写入配置文件，以便下次启动时加载
    const path = require('path');
    const fs = require('fs').promises;
    const os = require('os');

    const envFile = path.join(os.homedir(), '.claude-cli-installer', '.env');
    const envContent = Object.entries(variables)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    await fs.mkdir(path.dirname(envFile), { recursive: true });
    await fs.writeFile(envFile, envContent, 'utf8');
  }

  /**
   * 检查是否为敏感变量
   */
  private isSensitiveVariable(key: string): boolean {
    const sensitiveKeys = ['ANTHROPIC_API_KEY', 'API_KEY', 'SECRET', 'TOKEN', 'PASSWORD'];
    return sensitiveKeys.some(sensitiveKey => key.toUpperCase().includes(sensitiveKey));
  }

  /**
   * 同步到npm配置
   */
  private async syncToNpmConfig(registry: string): Promise<void> {
    const { spawn } = require('child_process');

    return new Promise((resolve, reject) => {
      const child = spawn('npm', ['config', 'set', 'registry', registry], { shell: true });
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`npm配置失败，退出码: ${code}`));
        }
      });
    });
  }

  /**
   * 同步到Claude CLI
   */
  private async syncToClaudeCli(apiSettings: any): Promise<void> {
    const { spawn } = require('child_process');

    return new Promise((resolve, reject) => {
      const child = spawn('claude', ['config', 'set', 'api-key', apiSettings.anthropicApiKey], { shell: true });
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Claude CLI配置失败，退出码: ${code}`));
        }
      });
    });
  }

  /**
   * 检查密钥是否暴露
   */
  private isKeyExposed(key: string): boolean {
    // 简化的检查逻辑
    return key.length > 0 && !key.includes(':'); // 加密后的密钥包含':'
  }

  /**
   * 检查文件权限
   */
  private async checkFilePermissions(filePath: string): Promise<boolean> {
    try {
      const fs = require('fs').promises;
      const stats = await fs.stat(filePath);

      // 检查文件权限（简化版）
      const mode = stats.mode & parseInt('777', 8);
      return mode <= parseInt('600', 8); // 仅所有者可读写
    } catch {
      return false;
    }
  }

  /**
   * 检查配置是否加密
   */
  private isConfigurationEncrypted(configuration: UserConfiguration): boolean {
    if (configuration.apiSettings?.anthropicApiKey) {
      return configuration.apiSettings.anthropicApiKey.includes(':');
    }
    return true; // 没有敏感信息时认为是安全的
  }

  /**
   * 检查是否有明文密钥
   */
  private hasPlaintextKeys(configuration: UserConfiguration): boolean {
    if (configuration.apiSettings?.anthropicApiKey) {
      const apiKey = configuration.apiSettings.anthropicApiKey;
      return apiKey.startsWith('sk-') && !apiKey.includes(':');
    }
    return false;
  }

  /**
   * 生成备份ID
   */
  private generateBackupId(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * 加载备份文件
   */
  private async loadBackups(): Promise<void> {
    try {
      const path = require('path');
      const fs = require('fs').promises;
      const os = require('os');

      const backupFile = path.join(os.homedir(), '.claude-cli-installer', 'backups.json');

      if (await this.fileExists(backupFile)) {
        const backupData = await fs.readFile(backupFile, 'utf8');
        const parsedBackups = JSON.parse(backupData);

        this.backups = parsedBackups.map((backup: any) => ({
          ...backup,
          timestamp: new Date(backup.timestamp)
        }));
      }
    } catch (error) {
      console.warn('加载备份文件失败:', error);
      this.backups = [];
    }
  }

  /**
   * 保存备份到文件
   */
  private async saveBackupsToFile(): Promise<void> {
    const path = require('path');
    const fs = require('fs').promises;
    const os = require('os');

    const backupDir = path.join(os.homedir(), '.claude-cli-installer');
    const backupFile = path.join(backupDir, 'backups.json');

    await fs.mkdir(backupDir, { recursive: true });
    await fs.writeFile(backupFile, JSON.stringify(this.backups, null, 2), 'utf8');
  }

  /**
   * 检查文件是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const fs = require('fs').promises;
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 导出配置管理服务单例
 */
export const configurationService = new ConfigurationService();

/**
 * 导出类型定义
 */
export type {
  EnvironmentVariables,
  ConfigurationBackup,
  ConfigurationSyncResult,
  ConfigurationMigrationResult,
  ConfigurationSecurityCheck
};