/**
 * Configuration API IPC处理器实现
 * 处理用户配置管理相关的IPC请求
 */

import { IpcMainInvokeEvent } from 'electron';
import { ipcRegistry, IpcHandler, createSuccessResponse, createErrorResponse } from '../ipc-handlers';
import {
  UserConfiguration,
  createUserConfiguration,
  validateUserConfiguration,
  updateUserConfiguration,
  resetToDefaults
} from '../../models/user-configuration';

/**
 * 配置保存请求接口
 */
interface SaveConfigurationRequest {
  configuration: Partial<UserConfiguration>;
  validate?: boolean;
}

interface SaveConfigurationResponse {
  success: boolean;
  savedConfiguration?: UserConfiguration;
  validation?: {
    isValid: boolean;
    errors: string[];
  };
  error?: string;
}

/**
 * 配置导入/导出接口
 */
interface ExportConfigurationResponse {
  success: boolean;
  configuration?: UserConfiguration;
  exportPath?: string;
  error?: string;
}

interface ImportConfigurationRequest {
  source: 'file' | 'string';
  data: string; // 文件路径或JSON字符串
  merge?: boolean; // 是否与现有配置合并
}

interface ImportConfigurationResponse {
  success: boolean;
  importedConfiguration?: UserConfiguration;
  merged?: boolean;
  warnings?: string[];
  error?: string;
}

/**
 * 配置验证接口
 */
interface ValidateConfigurationRequest {
  configuration: Partial<UserConfiguration>;
  checkConnectivity?: boolean;
}

interface ValidateConfigurationResponse {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  connectivity?: {
    anthropicApi: boolean;
    googleAuth: boolean;
    network: boolean;
  };
}

/**
 * 配置管理器
 */
class ConfigurationManager {
  private configuration: UserConfiguration;
  private configPath: string;
  private isDirty = false;

  constructor() {
    this.configPath = this.getDefaultConfigPath();
    this.configuration = this.loadDefaultConfiguration();
  }

  /**
   * 获取默认配置路径
   */
  private getDefaultConfigPath(): string {
    const os = require('os');
    const path = require('path');

    // 根据操作系统确定配置目录
    let configDir: string;

    if (process.platform === 'win32') {
      configDir = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    } else if (process.platform === 'darwin') {
      configDir = path.join(os.homedir(), 'Library', 'Application Support');
    } else {
      configDir = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    }

    return path.join(configDir, 'claude-cli-installer', 'config.json');
  }

  /**
   * 加载默认配置
   */
  private loadDefaultConfiguration(): UserConfiguration {
    return createUserConfiguration({
      userId: this.generateUserId(),
      language: this.detectSystemLanguage(),
      region: this.detectSystemRegion()
    });
  }

  /**
   * 获取当前配置
   */
  getConfiguration(): UserConfiguration {
    return { ...this.configuration };
  }

  /**
   * 保存配置
   */
  async saveConfiguration(request: SaveConfigurationRequest): Promise<SaveConfigurationResponse> {
    console.log('保存用户配置');

    try {
      const response: SaveConfigurationResponse = {
        success: false
      };

      // 验证配置
      if (request.validate !== false) {
        const validation = this.validateConfigurationData(request.configuration);
        response.validation = validation;

        if (!validation.isValid) {
          return {
            ...response,
            error: `配置验证失败: ${validation.errors.join(', ')}`
          };
        }
      }

      // 更新配置
      this.configuration = updateUserConfiguration(this.configuration, request.configuration);

      // 保存到文件
      await this.saveToFile();

      response.success = true;
      response.savedConfiguration = this.getConfiguration();
      this.isDirty = false;

      console.log('用户配置保存成功');
      return response;

    } catch (error) {
      console.error('保存用户配置失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 加载配置
   */
  async loadConfiguration(): Promise<UserConfiguration> {
    console.log('加载用户配置');

    try {
      const fs = require('fs').promises;

      // 检查配置文件是否存在
      if (await this.fileExists(this.configPath)) {
        const configData = await fs.readFile(this.configPath, 'utf8');
        const parsedConfig = JSON.parse(configData);

        // 验证加载的配置
        validateUserConfiguration(parsedConfig);
        this.configuration = parsedConfig;
        this.isDirty = false;

        console.log('用户配置加载成功');
      } else {
        console.log('配置文件不存在，使用默认配置');
        // 保存默认配置
        await this.saveToFile();
      }

      return this.getConfiguration();

    } catch (error) {
      console.error('加载用户配置失败:', error);
      // 发生错误时使用默认配置
      this.configuration = this.loadDefaultConfiguration();
      return this.getConfiguration();
    }
  }

  /**
   * 重置配置
   */
  async resetConfiguration(): Promise<UserConfiguration> {
    console.log('重置用户配置');

    try {
      this.configuration = resetToDefaults(this.configuration);
      await this.saveToFile();
      this.isDirty = false;

      console.log('用户配置重置成功');
      return this.getConfiguration();

    } catch (error) {
      console.error('重置用户配置失败:', error);
      throw error;
    }
  }

  /**
   * 导出配置
   */
  async exportConfiguration(exportPath?: string): Promise<ExportConfigurationResponse> {
    console.log('导出用户配置');

    try {
      const response: ExportConfigurationResponse = {
        success: false,
        configuration: this.getConfiguration()
      };

      if (exportPath) {
        const fs = require('fs').promises;
        const path = require('path');

        // 确保目录存在
        const dir = path.dirname(exportPath);
        await fs.mkdir(dir, { recursive: true });

        // 导出配置到文件
        const configJson = JSON.stringify(this.configuration, null, 2);
        await fs.writeFile(exportPath, configJson, 'utf8');

        response.exportPath = exportPath;
        console.log(`用户配置导出到: ${exportPath}`);
      }

      response.success = true;
      return response;

    } catch (error) {
      console.error('导出用户配置失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 导入配置
   */
  async importConfiguration(request: ImportConfigurationRequest): Promise<ImportConfigurationResponse> {
    console.log('导入用户配置:', { source: request.source, merge: request.merge });

    try {
      const response: ImportConfigurationResponse = {
        success: false,
        merged: request.merge || false,
        warnings: []
      };

      let configData: string;

      if (request.source === 'file') {
        const fs = require('fs').promises;
        configData = await fs.readFile(request.data, 'utf8');
      } else {
        configData = request.data;
      }

      // 解析配置数据
      const importedConfig = JSON.parse(configData);

      // 验证导入的配置
      try {
        validateUserConfiguration(importedConfig);
      } catch (error) {
        return {
          ...response,
          error: `导入的配置无效: ${error instanceof Error ? error.message : String(error)}`
        };
      }

      // 应用配置
      if (request.merge) {
        // 合并配置
        this.configuration = updateUserConfiguration(this.configuration, importedConfig);
        response.warnings?.push('配置已与现有设置合并');
      } else {
        // 完全替换
        this.configuration = importedConfig;
        response.warnings?.push('现有配置已被完全替换');
      }

      // 保存配置
      await this.saveToFile();
      this.isDirty = false;

      response.success = true;
      response.importedConfiguration = this.getConfiguration();

      console.log('用户配置导入成功');
      return response;

    } catch (error) {
      console.error('导入用户配置失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 验证配置
   */
  async validateConfiguration(request: ValidateConfigurationRequest): Promise<ValidateConfigurationResponse> {
    console.log('验证用户配置');

    try {
      const response = this.validateConfigurationData(request.configuration);

      // 检查连接性
      if (request.checkConnectivity) {
        response.connectivity = await this.testConnectivity(request.configuration);
      }

      console.log('配置验证完成:', { isValid: response.isValid, errors: response.errors.length });
      return response;

    } catch (error) {
      console.error('验证用户配置失败:', error);
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: []
      };
    }
  }

  /**
   * 验证配置数据
   */
  private validateConfigurationData(config: Partial<UserConfiguration>): ValidateConfigurationResponse {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 使用模型的验证函数
      const testConfig = updateUserConfiguration(this.configuration, config);
      validateUserConfiguration(testConfig);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }

    // 额外的业务逻辑验证
    if (config.apiSettings?.anthropicApiKey) {
      const apiKey = config.apiSettings.anthropicApiKey;
      if (apiKey.length < 10) {
        errors.push('Anthropic API密钥长度不足');
      }
      if (!apiKey.startsWith('sk-')) {
        warnings.push('API密钥格式可能不正确，应以"sk-"开头');
      }
    }

    if (config.networkSettings?.customDnsServers) {
      for (const dns of config.networkSettings.customDnsServers) {
        if (!this.isValidIpAddress(dns)) {
          errors.push(`无效的DNS服务器地址: ${dns}`);
        }
      }
    }

    if (config.installationSettings?.installationPath) {
      const path = config.installationSettings.installationPath;
      if (path.includes(' ') && process.platform === 'win32') {
        warnings.push('Windows上包含空格的安装路径可能导致问题');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 测试连接性
   */
  private async testConnectivity(config: Partial<UserConfiguration>): Promise<{
    anthropicApi: boolean;
    googleAuth: boolean;
    network: boolean;
  }> {
    const connectivity = {
      anthropicApi: false,
      googleAuth: false,
      network: false
    };

    try {
      // 测试网络连接
      const fetch = require('node-fetch');
      const networkTest = await fetch('https://www.google.com', { method: 'HEAD', timeout: 5000 });
      connectivity.network = networkTest.ok;

      // 测试Anthropic API
      if (config.apiSettings?.anthropicApiKey) {
        try {
          const apiTest = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.apiSettings.anthropicApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              max_tokens: 1,
              messages: [{ role: 'user', content: 'test' }]
            }),
            timeout: 10000
          });
          connectivity.anthropicApi = apiTest.status !== 401; // 非认证错误就算成功
        } catch {
          connectivity.anthropicApi = false;
        }
      }

      // 测试Google认证（简单检查能否访问Google服务）
      if (config.googleSettings?.enabled) {
        try {
          const googleTest = await fetch('https://accounts.google.com', { method: 'HEAD', timeout: 5000 });
          connectivity.googleAuth = googleTest.ok;
        } catch {
          connectivity.googleAuth = false;
        }
      }

    } catch (error) {
      console.warn('连接性测试失败:', error);
    }

    return connectivity;
  }

  /**
   * 保存配置到文件
   */
  private async saveToFile(): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');

    // 确保目录存在
    const dir = path.dirname(this.configPath);
    await fs.mkdir(dir, { recursive: true });

    // 保存配置
    const configJson = JSON.stringify(this.configuration, null, 2);
    await fs.writeFile(this.configPath, configJson, 'utf8');

    console.log(`配置已保存到: ${this.configPath}`);
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

  /**
   * 验证IP地址格式
   */
  private isValidIpAddress(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    if (ipv4Regex.test(ip)) {
      return ip.split('.').every(octet => {
        const num = parseInt(octet, 10);
        return num >= 0 && num <= 255;
      });
    }

    return ipv6Regex.test(ip);
  }

  /**
   * 生成用户ID
   */
  private generateUserId(): string {
    const crypto = require('crypto');
    return crypto.randomUUID();
  }

  /**
   * 检测系统语言
   */
  private detectSystemLanguage(): 'zh-CN' | 'en-US' {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale.startsWith('zh') ? 'zh-CN' : 'en-US';
  }

  /**
   * 检测系统地区
   */
  private detectSystemRegion(): 'CN' | 'US' | 'Other' {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone.includes('Shanghai') || timezone.includes('Beijing')) {
      return 'CN';
    }
    if (timezone.includes('New_York') || timezone.includes('Los_Angeles')) {
      return 'US';
    }
    return 'Other';
  }

  /**
   * 获取配置路径
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * 检查配置是否有变更
   */
  isDirtyConfiguration(): boolean {
    return this.isDirty;
  }

  /**
   * 标记配置为已变更
   */
  markDirty(): void {
    this.isDirty = true;
  }
}

/**
 * 全局配置管理器实例
 */
const configurationManager = new ConfigurationManager();

/**
 * 处理获取配置的请求
 */
async function handleGetConfiguration(event: IpcMainInvokeEvent): Promise<any> {
  try {
    const configuration = await configurationManager.loadConfiguration();
    return createSuccessResponse(configuration);

  } catch (error) {
    console.error('获取配置失败:', error);
    return createErrorResponse(
      'GET_CONFIGURATION_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 处理保存配置的请求
 */
async function handleSaveConfiguration(
  event: IpcMainInvokeEvent,
  request: SaveConfigurationRequest
): Promise<any> {
  console.log('处理保存配置请求');

  try {
    if (!request.configuration) {
      throw new Error('configuration 参数是必需的');
    }

    const result = await configurationManager.saveConfiguration(request);
    return createSuccessResponse(result);

  } catch (error) {
    console.error('处理保存配置请求失败:', error);
    return createErrorResponse(
      'SAVE_CONFIGURATION_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 处理重置配置的请求
 */
async function handleResetConfiguration(event: IpcMainInvokeEvent): Promise<any> {
  try {
    const configuration = await configurationManager.resetConfiguration();
    return createSuccessResponse(configuration);

  } catch (error) {
    console.error('重置配置失败:', error);
    return createErrorResponse(
      'RESET_CONFIGURATION_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 处理导出配置的请求
 */
async function handleExportConfiguration(
  event: IpcMainInvokeEvent,
  exportPath?: string
): Promise<any> {
  try {
    const result = await configurationManager.exportConfiguration(exportPath);
    return createSuccessResponse(result);

  } catch (error) {
    console.error('导出配置失败:', error);
    return createErrorResponse(
      'EXPORT_CONFIGURATION_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 处理导入配置的请求
 */
async function handleImportConfiguration(
  event: IpcMainInvokeEvent,
  request: ImportConfigurationRequest
): Promise<any> {
  console.log('处理导入配置请求:', { source: request.source });

  try {
    if (!request.source || !request.data) {
      throw new Error('source 和 data 参数是必需的');
    }

    const result = await configurationManager.importConfiguration(request);
    return createSuccessResponse(result);

  } catch (error) {
    console.error('处理导入配置请求失败:', error);
    return createErrorResponse(
      'IMPORT_CONFIGURATION_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 处理验证配置的请求
 */
async function handleValidateConfiguration(
  event: IpcMainInvokeEvent,
  request: ValidateConfigurationRequest
): Promise<any> {
  console.log('处理验证配置请求');

  try {
    if (!request.configuration) {
      throw new Error('configuration 参数是必需的');
    }

    const result = await configurationManager.validateConfiguration(request);
    return createSuccessResponse(result);

  } catch (error) {
    console.error('处理验证配置请求失败:', error);
    return createErrorResponse(
      'VALIDATE_CONFIGURATION_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Configuration API IPC处理器定义
 */
const configurationHandlers: IpcHandler[] = [
  {
    channel: 'installer:config:get',
    handler: handleGetConfiguration
  },
  {
    channel: 'installer:config:save',
    handler: handleSaveConfiguration
  },
  {
    channel: 'installer:config:reset',
    handler: handleResetConfiguration
  },
  {
    channel: 'installer:config:export',
    handler: handleExportConfiguration
  },
  {
    channel: 'installer:config:import',
    handler: handleImportConfiguration
  },
  {
    channel: 'installer:config:validate',
    handler: handleValidateConfiguration
  }
];

/**
 * 注册Configuration API处理器
 */
export function registerConfigurationHandlers(): void {
  console.log('注册Configuration API处理器...');

  configurationHandlers.forEach(handler => {
    try {
      ipcRegistry.register(handler);
    } catch (error) {
      console.error(`注册Configuration API处理器失败 [${handler.channel}]:`, error);
    }
  });

  console.log('Configuration API处理器注册完成');
}

/**
 * 注销Configuration API处理器
 */
export function unregisterConfigurationHandlers(): void {
  console.log('注销Configuration API处理器...');

  configurationHandlers.forEach(handler => {
    try {
      ipcRegistry.unregister(handler.channel);
    } catch (error) {
      console.error(`注销Configuration API处理器失败 [${handler.channel}]:`, error);
    }
  });

  console.log('Configuration API处理器注销完成');
}

/**
 * 获取配置管理器实例（用于其他模块）
 */
export function getConfigurationManager(): ConfigurationManager {
  return configurationManager;
}

/**
 * 导出类型定义
 */
export type {
  SaveConfigurationRequest,
  SaveConfigurationResponse,
  ExportConfigurationResponse,
  ImportConfigurationRequest,
  ImportConfigurationResponse,
  ValidateConfigurationRequest,
  ValidateConfigurationResponse
};