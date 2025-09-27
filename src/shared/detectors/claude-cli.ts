/**
 * T023: Claude CLI检测器
 * 检测Claude CLI安装状态、配置和API密钥有效性
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';
import {
  ClaudeEnvironment,
  DetectionResult,
  DetectionStatus,
  EnvironmentDetector
} from '../types/environment';
import { log } from '../utils/logger';
import {
  executeCommand,
  isProgramInPath,
  getProgramPath,
  getProgramVersion,
  compareVersions,
  fileExists
} from '../utils/system';

/**
 * Claude CLI检测配置
 */
interface ClaudeDetectorConfig {
  timeout: number;
  minVersion: string;
  configPaths: string[];
  apiTestUrl: string;
}

/**
 * Claude CLI检测器实现
 */
export class ClaudeCliDetector implements EnvironmentDetector {
  name = 'claude-cli-detector';
  type = 'claude' as const;
  required = true;
  timeout = 25000; // 25秒
  
  private config: ClaudeDetectorConfig;
  private progress = 0;
  
  constructor(config?: Partial<ClaudeDetectorConfig>) {
    this.config = {
      timeout: 15000,
      minVersion: '0.1.0',
      configPaths: this.getDefaultConfigPaths(),
      apiTestUrl: 'https://api.anthropic.com/v1/models',
      ...config
    };
  }
  
  /**
   * 执行Claude CLI检测
   */
  async detect(): Promise<DetectionResult> {
    const startTime = Date.now();
    this.progress = 0;
    
    try {
      log.info('开始Claude CLI环境检测');
      
      // 检查先决条件
      const prerequisites = await this.checkPrerequisites();
      if (!prerequisites) {
        throw new Error('Claude CLI检测先决条件不满足');
      }
      this.progress = 10;
      
      // 检测Claude CLI安装状态
      const installed = await this.checkClaudeInstallation();
      this.progress = 25;
      
      let currentVersion: string | undefined;
      let installPath: string | undefined;
      let configured = false;
      let apiKeyStatus: ClaudeEnvironment['apiKeyStatus'] = 'missing';
      let configPath: string | undefined;
      let availableCommands: string[] = [];
      
      if (installed) {
        // 获取版本信息
        currentVersion = await this.getClaudeVersion();
        this.progress = 40;
        
        // 获取安装路径
        installPath = await this.getClaudePath();
        this.progress = 50;
        
        // 检查配置状态
        configPath = await this.findConfigFile();
        if (configPath) {
          configured = true;
          apiKeyStatus = await this.checkApiKey(configPath);
        }
        this.progress = 70;
        
        // 获取可用命令
        availableCommands = await this.getAvailableCommands();
        this.progress = 85;
      }
      
      // 获取使用统计（如果有配置文件）
      const usage = configPath ? await this.getUsageStats(configPath) : undefined;
      const lastUsed = undefined; // 暂时设为undefined，实际使用时可从配置文件读取
      this.progress = 100;
      
      // 获取最新版本信息
      const latestVersion = await this.getLatestVersion();
      
      const claudeEnvironment: ClaudeEnvironment = {
        installed,
        currentVersion,
        latestVersion,
        installPath,
        configured,
        apiKeyStatus,
        configPath,
        availableCommands,
        lastUsed,
        usage
      };
      
      const duration = Date.now() - startTime;
      log.info('Claude CLI环境检测完成', { duration, claudeEnvironment });
      
      return {
        status: DetectionStatus.SUCCESS,
        timestamp: new Date(),
        duration,
        message: 'Claude CLI环境检测成功',
        data: claudeEnvironment,
        recommendations: this.generateRecommendations(claudeEnvironment)
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error('Claude CLI环境检测失败', error as Error);
      
      return {
        status: DetectionStatus.FAILED,
        timestamp: new Date(),
        duration,
        message: `Claude CLI检测失败: ${error instanceof Error ? error.message : '未知错误'}`,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }
  
  /**
   * 检查先决条件
   */
  async checkPrerequisites(): Promise<boolean> {
    // Claude CLI需要网络连接
    try {
      // 尝试访问一个可靠的网站
      await axios.get('https://www.baidu.com', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * 获取检测进度
   */
  getProgress(): number {
    return this.progress;
  }
  
  /**
   * 获取默认配置文件路径
   */
  private getDefaultConfigPaths(): string[] {
    const homeDir = os.homedir();
    const platform = os.platform();
    
    const paths = [];
    
    switch (platform) {
      case 'win32':
        paths.push(
          path.join(homeDir, '.claude', 'config.json'),
          path.join(homeDir, 'AppData', 'Roaming', 'claude', 'config.json'),
          path.join(homeDir, 'AppData', 'Local', 'claude', 'config.json')
        );
        break;
      case 'darwin':
        paths.push(
          path.join(homeDir, '.claude', 'config.json'),
          path.join(homeDir, 'Library', 'Application Support', 'claude', 'config.json'),
          path.join(homeDir, '.config', 'claude', 'config.json')
        );
        break;
      case 'linux':
      default:
        paths.push(
          path.join(homeDir, '.claude', 'config.json'),
          path.join(homeDir, '.config', 'claude', 'config.json'),
          '/etc/claude/config.json'
        );
        break;
    }
    
    return paths;
  }
  
  /**
   * 检查Claude CLI是否已安装
   */
  private async checkClaudeInstallation(): Promise<boolean> {
    try {
      const result = await executeCommand('claude --version', {
        timeout: this.config.timeout
      });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }
  
  /**
   * 获取Claude CLI版本
   */
  private async getClaudeVersion(): Promise<string | undefined> {
    try {
      const result = await executeCommand('claude --version', {
        timeout: this.config.timeout
      });
      
      if (result.exitCode === 0) {
        // 提取版本号
        const versionMatch = result.stdout.match(/v?([0-9]+\.[0-9]+\.[0-9]+[^\s]*)/i);
        return versionMatch ? versionMatch[1] : result.stdout.trim();
      }
      
      return undefined;
    } catch {
      return undefined;
    }
  }
  
  /**
   * 获取Claude CLI安装路径
   */
  private async getClaudePath(): Promise<string | undefined> {
    return getProgramPath('claude') || undefined;
  }
  
  /**
   * 查找配置文件
   */
  private async findConfigFile(): Promise<string | undefined> {
    for (const configPath of this.config.configPaths) {
      if (fileExists(configPath)) {
        return configPath;
      }
    }
    return undefined;
  }
  
  /**
   * 检查API密钥状态
   */
  private async checkApiKey(configPath: string): Promise<ClaudeEnvironment['apiKeyStatus']> {
    try {
      // 读取配置文件
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      
      const apiKey = config.api_key || config.apiKey || config.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        return 'missing';
      }
      
      // 验证API密钥格式
      if (!this.isValidApiKeyFormat(apiKey)) {
        return 'invalid';
      }
      
      // 测试API密钥有效性
      const isValid = await this.testApiKey(apiKey);
      return isValid ? 'valid' : 'invalid';
    } catch (error) {
      log.warn('检查API密钥失败', { error });
      return 'invalid';
    }
  }
  
  /**
   * 验证API密钥格式
   */
  private isValidApiKeyFormat(apiKey: string): boolean {
    // Claude API密钥通常以 'sk-ant-' 开头
    return /^sk-ant-[a-zA-Z0-9_-]+$/.test(apiKey);
  }
  
  /**
   * 测试API密钥有效性
   */
  private async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await axios.get(this.config.apiTestUrl, {
        timeout: this.config.timeout,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        validateStatus: (status) => status < 500
      });
      
      return response.status === 200;
    } catch (error) {
      log.debug('API密钥测试失败', { error });
      return false;
    }
  }
  
  /**
   * 获取可用命令
   */
  private async getAvailableCommands(): Promise<string[]> {
    try {
      const result = await executeCommand('claude --help', {
        timeout: this.config.timeout
      });
      
      if (result.exitCode === 0) {
        // 解析帮助信息提取命令
        const commands = this.parseHelpOutput(result.stdout);
        return commands;
      }
      
      return [];
    } catch {
      return [];
    }
  }
  
  /**
   * 解析帮助输出
   */
  private parseHelpOutput(helpText: string): string[] {
    const commands: string[] = [];
    const lines = helpText.split('\n');
    
    let inCommandsSection = false;
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 查找命令列表开始
      if (trimmedLine.toLowerCase().includes('commands:') || trimmedLine.toLowerCase().includes('available commands:')) {
        inCommandsSection = true;
        continue;
      }
      
      // 查找命令列表结束
      if (inCommandsSection && (trimmedLine.toLowerCase().includes('options:') || trimmedLine.toLowerCase().includes('global options:'))) {
        break;
      }
      
      // 提取命令名称
      if (inCommandsSection && trimmedLine.length > 0 && !trimmedLine.startsWith('-')) {
        const commandMatch = trimmedLine.match(/^\s*([a-zA-Z0-9-_]+)/);
        if (commandMatch) {
          commands.push(commandMatch[1]);
        }
      }
    }
    
    return commands;
  }
  
  /**
   * 获取使用统计
   */
  private async getUsageStats(configPath: string): Promise<ClaudeEnvironment['usage']> {
    try {
      const configDir = path.dirname(configPath);
      const statsPath = path.join(configDir, 'usage.json');
      
      if (fileExists(statsPath)) {
        const statsContent = fs.readFileSync(statsPath, 'utf8');
        const stats = JSON.parse(statsContent);
        
        return {
          totalCommands: stats.totalCommands || 0,
          successfulCommands: stats.successfulCommands || 0,
          failedCommands: stats.failedCommands || 0
        };
      }
      
      return undefined;
    } catch {
      return undefined;
    }
  }
  
  /**
   * 获取最新版本信息
   */
  private async getLatestVersion(): Promise<string> {
    try {
      // 尝试从Claude CLI的GitHub或官方源获取最新版本
      const response = await axios.get('https://api.github.com/repos/anthropics/claude-cli/releases/latest', {
        timeout: this.config.timeout,
        validateStatus: (status) => status < 500
      });
      
      if (response.status === 200 && response.data.tag_name) {
        const version = response.data.tag_name;
        return version.startsWith('v') ? version.substring(1) : version;
      }
      
      // 如果无法获取，返回默认版本
      return '1.0.0';
    } catch {
      return '1.0.0';
    }
  }
  
  /**
   * 生成建议
   */
  private generateRecommendations(env: ClaudeEnvironment): Array<{
    action: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    const recommendations = [];
    
    if (!env.installed) {
      recommendations.push({
        action: 'install-claude-cli',
        description: '需要安装Claude CLI工具',
        priority: 'high' as const
      });
    } else {
      if (!env.configured) {
        recommendations.push({
          action: 'configure-claude-cli',
          description: 'Claude CLI尚未配置，需要创建配置文件',
          priority: 'high' as const
        });
      }
      
      if (env.apiKeyStatus === 'missing') {
        recommendations.push({
          action: 'add-api-key',
          description: '需要添加Claude API密钥',
          priority: 'high' as const
        });
      } else if (env.apiKeyStatus === 'invalid') {
        recommendations.push({
          action: 'fix-api-key',
          description: 'API密钥无效，请检查和更新',
          priority: 'high' as const
        });
      } else if (env.apiKeyStatus === 'expired') {
        recommendations.push({
          action: 'renew-api-key',
          description: 'API密钥已过期，需要更新',
          priority: 'high' as const
        });
      }
      
      // 检查版本更新
      if (env.currentVersion && compareVersions(env.currentVersion, env.latestVersion) < 0) {
        recommendations.push({
          action: 'update-claude-cli',
          description: `有新版本可用: ${env.latestVersion}（当前: ${env.currentVersion}）`,
          priority: 'medium' as const
        });
      }
      
      // 检查命令可用性
      if (env.availableCommands.length === 0) {
        recommendations.push({
          action: 'check-installation',
          description: '未检测到可用命令，安装可能有问题',
          priority: 'medium' as const
        });
      }
    }
    
    return recommendations;
  }
  
  /**
   * 公共方法：检查是否已安装
   */
  async isInstalled(): Promise<boolean> {
    return this.checkClaudeInstallation();
  }
  
  /**
   * 公共方法：获取当前版本
   */
  async getCurrentVersion(): Promise<string | null> {
    const version = await this.getClaudeVersion();
    return version || null;
  }
  
  /**
   * 公共方法：检查配置状态
   */
  async isConfigured(): Promise<boolean> {
    const configPath = await this.findConfigFile();
    return configPath !== undefined;
  }
  
  /**
   * 公共方法：测试命令
   */
  async testCommand(command: string): Promise<boolean> {
    try {
      const result = await executeCommand(`claude ${command} --help`, {
        timeout: this.config.timeout
      });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }
  
  /**
   * 公共方法：创建配置文件
   */
  async createConfigFile(apiKey: string, additionalConfig?: Record<string, any>): Promise<string> {
    const configPath = this.config.configPaths[0]; // 使用第一个路径
    const configDir = path.dirname(configPath);
    
    // 确保目录存在
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    const config = {
      api_key: apiKey,
      ...additionalConfig
    };
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return configPath;
  }
}

// 导出单例实例
export const claudeCliDetector = new ClaudeCliDetector();
