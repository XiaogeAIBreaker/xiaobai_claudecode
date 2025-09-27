/**
 * T047: 基础检测器 - 代码重构
 * 提供通用的检测器功能，减少代码重复
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync, spawn } from 'child_process';
import { DetectionResult, DetectionStatus, PlatformType, ArchType } from '../types/environment';
import { log } from '../utils/logger';

/**
 * 命令执行结果接口
 */
export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * 网络检测配置接口
 */
export interface NetworkTestConfig {
  url: string;
  timeout: number;
  expectedStatus?: number;
  expectedContent?: string;
}

/**
 * 版本信息接口
 */
export interface VersionInfo {
  version: string;
  major: number;
  minor: number;
  patch: number;
  build?: string;
}

/**
 * 基础检测器抽象类
 * 提供通用的检测功能，减少重复代码
 */
export abstract class BaseDetector {
  protected readonly name: string;
  protected readonly timeout: number;

  constructor(name: string, timeout: number = 10000) {
    this.name = name;
    this.timeout = timeout;
  }

  /**
   * 抽象方法：执行检测
   */
  abstract detect(): Promise<DetectionResult>;

  /**
   * 通用命令执行
   */
  protected async executeCommand(
    command: string,
    args: string[] = [],
    options: { timeout?: number; cwd?: string } = {}
  ): Promise<CommandResult> {
    const { timeout = this.timeout, cwd = process.cwd() } = options;

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      const child = spawn(command, args, {
        cwd,
        stdio: 'pipe',
        shell: true
      });

      // 设置超时
      const timer = setTimeout(() => {
        child.kill();
        resolve({
          success: false,
          stdout,
          stderr: stderr || '命令执行超时',
          exitCode: -1
        });
      }, timeout);

      // 收集输出
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // 处理退出
      child.on('close', (exitCode) => {
        clearTimeout(timer);
        resolve({
          success: exitCode === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: exitCode || 0
        });
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        resolve({
          success: false,
          stdout,
          stderr: error.message,
          exitCode: -1
        });
      });
    });
  }

  /**
   * 同步命令执行（简单场景）
   */
  protected executeCommandSync(command: string): CommandResult {
    try {
      const stdout = execSync(command, {
        encoding: 'utf8',
        timeout: this.timeout,
        stdio: 'pipe'
      });

      return {
        success: true,
        stdout: stdout.trim(),
        stderr: '',
        exitCode: 0
      };
    } catch (error: any) {
      return {
        success: false,
        stdout: '',
        stderr: error.message || error.stderr || '命令执行失败',
        exitCode: error.status || -1
      };
    }
  }

  /**
   * 检查文件是否存在
   */
  protected async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查目录是否存在
   */
  protected async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.promises.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * 检查命令是否可用
   */
  protected async isCommandAvailable(command: string): Promise<boolean> {
    const testCommand = process.platform === 'win32' ? 'where' : 'which';
    const result = await this.executeCommand(testCommand, [command]);
    return result.success && result.stdout.length > 0;
  }

  /**
   * 获取命令的完整路径
   */
  protected async getCommandPath(command: string): Promise<string | null> {
    const testCommand = process.platform === 'win32' ? 'where' : 'which';
    const result = await this.executeCommand(testCommand, [command]);

    if (result.success && result.stdout.length > 0) {
      // 返回第一行作为路径
      return result.stdout.split('\n')[0].trim();
    }

    return null;
  }

  /**
   * 解析版本字符串
   */
  protected parseVersion(versionString: string): VersionInfo | null {
    // 匹配常见的版本格式: x.y.z, vx.y.z, x.y.z-build
    const versionRegex = /v?(\d+)\.(\d+)\.(\d+)(?:[-.](.+))?/;
    const match = versionString.match(versionRegex);

    if (match) {
      return {
        version: match[0],
        major: parseInt(match[1], 10),
        minor: parseInt(match[2], 10),
        patch: parseInt(match[3], 10),
        build: match[4] || undefined
      };
    }

    return null;
  }

  /**
   * 比较版本
   */
  protected compareVersions(version1: VersionInfo, version2: VersionInfo): number {
    if (version1.major !== version2.major) {
      return version1.major - version2.major;
    }
    if (version1.minor !== version2.minor) {
      return version1.minor - version2.minor;
    }
    if (version1.patch !== version2.patch) {
      return version1.patch - version2.patch;
    }
    return 0; // 相等
  }

  /**
   * 检查版本是否满足要求
   */
  protected checkVersionRequirement(
    currentVersion: VersionInfo,
    requiredVersion: VersionInfo,
    operator: '>=' | '>' | '=' | '<' | '<=' = '>='
  ): boolean {
    const comparison = this.compareVersions(currentVersion, requiredVersion);

    switch (operator) {
      case '>=':
        return comparison >= 0;
      case '>':
        return comparison > 0;
      case '=':
        return comparison === 0;
      case '<':
        return comparison < 0;
      case '<=':
        return comparison <= 0;
      default:
        return false;
    }
  }

  /**
   * 网络连接测试
   */
  protected async testNetworkConnection(config: NetworkTestConfig): Promise<boolean> {
    try {
      const axios = await import('axios');

      const response = await axios.default({
        method: 'GET',
        url: config.url,
        timeout: config.timeout,
        validateStatus: (status) => {
          return config.expectedStatus ? status === config.expectedStatus : status < 400;
        }
      });

      // 检查响应内容（如果指定）
      if (config.expectedContent) {
        const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        return content.includes(config.expectedContent);
      }

      return true;
    } catch (error) {
      log.debug(`网络连接测试失败: ${config.url}`, { error: (error as Error).message });
      return false;
    }
  }

  /**
   * 批量网络测试
   */
  protected async testMultipleConnections(configs: NetworkTestConfig[]): Promise<{
    passed: number;
    total: number;
    results: Array<{ url: string; success: boolean; error?: string }>
  }> {
    const results = await Promise.allSettled(
      configs.map(async (config) => {
        try {
          const success = await this.testNetworkConnection(config);
          return { url: config.url, success };
        } catch (error) {
          return { url: config.url, success: false, error: (error as Error).message };
        }
      })
    );

    const finalResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          url: configs[index].url,
          success: false,
          error: result.reason?.message || '未知错误'
        };
      }
    });

    const passed = finalResults.filter(r => r.success).length;

    return {
      passed,
      total: configs.length,
      results: finalResults
    };
  }

  /**
   * 获取系统信息
   */
  protected getSystemInfo(): {
    platform: PlatformType;
    arch: ArchType;
    version: string;
    hostname: string;
    homedir: string;
  } {
    return {
      platform: process.platform as PlatformType,
      arch: process.arch as ArchType,
      version: os.release(),
      hostname: os.hostname(),
      homedir: os.homedir()
    };
  }

  /**
   * 获取环境变量
   */
  protected getEnvironmentVariable(name: string, defaultValue?: string): string | undefined {
    return process.env[name] || defaultValue;
  }

  /**
   * 检查端口是否可用
   */
  protected async isPortAvailable(port: number, host: string = 'localhost'): Promise<boolean> {
    return new Promise((resolve) => {
      const net = require('net');
      const server = net.createServer();

      server.listen(port, host, () => {
        server.once('close', () => {
          resolve(true);
        });
        server.close();
      });

      server.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * 获取常用路径
   */
  protected getCommonPaths(): {
    home: string;
    desktop: string;
    documents: string;
    downloads: string;
    temp: string;
    appData: string;
  } {
    const home = os.homedir();

    return {
      home,
      desktop: path.join(home, 'Desktop'),
      documents: path.join(home, 'Documents'),
      downloads: path.join(home, 'Downloads'),
      temp: os.tmpdir(),
      appData: process.platform === 'win32'
        ? path.join(home, 'AppData', 'Local')
        : path.join(home, '.local', 'share')
    };
  }

  /**
   * 搜索可执行文件
   */
  protected async findExecutable(name: string, searchPaths?: string[]): Promise<string[]> {
    const found: string[] = [];
    const extensions = process.platform === 'win32' ? ['.exe', '.cmd', '.bat'] : [''];

    // 默认搜索路径
    const defaultPaths = [
      ...((process.env.PATH || '').split(path.delimiter)),
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      path.join(os.homedir(), 'bin'),
      path.join(os.homedir(), '.local', 'bin')
    ];

    const pathsToSearch = searchPaths || defaultPaths;

    for (const dirPath of pathsToSearch) {
      if (!await this.directoryExists(dirPath)) {
        continue;
      }

      for (const ext of extensions) {
        const fullPath = path.join(dirPath, name + ext);
        if (await this.fileExists(fullPath)) {
          found.push(fullPath);
        }
      }
    }

    return found;
  }

  /**
   * 生成检测结果
   */
  protected createResult(
    status: DetectionStatus,
    message: string,
    duration: number = 0,
    error?: string,
    data?: Record<string, any>,
    recommendations?: Array<{
      action: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
    }>
  ): DetectionResult {
    return {
      status,
      message,
      timestamp: new Date(),
      duration,
      error,
      data,
      recommendations
    };
  }

  /**
   * 记录检测过程
   */
  protected logDetection(step: string, success: boolean, details?: any): void {
    const logMethod = success ? log.info : log.warn;
    logMethod(`${this.name} - ${step}`, details);
  }

  /**
   * 休眠函数
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}