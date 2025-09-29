/**
 * 主进程IPC处理器基础框架
 * 提供安全的IPC通信基础设施
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { InstallationStep } from '../models/installation-step';
import { DetectionResult } from '../models/detection-result';
import { UserConfiguration } from '../models/user-configuration';
import { NavigationState } from '../models/navigation-state';
import { NetworkConfiguration } from '../models/network-configuration';

/**
 * IPC处理器接口
 */
export interface IpcHandler {
  channel: string;
  handler: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any;
}

/**
 * IPC错误类型
 */
export interface IpcError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  requestId?: string;
}

/**
 * 标准IPC响应格式
 */
export interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: IpcError;
  requestId?: string;
}

/**
 * IPC通道注册表
 */
class IpcChannelRegistry {
  private channels = new Map<string, IpcHandler>();
  private middleware: IpcMiddleware[] = [];

  /**
   * 注册IPC处理器
   */
  register(handler: IpcHandler): void {
    if (this.channels.has(handler.channel)) {
      throw new Error(`IPC通道已存在: ${handler.channel}`);
    }

    // 包装处理器以支持中间件和错误处理
    const wrappedHandler = this.wrapHandler(handler);

    ipcMain.handle(handler.channel, wrappedHandler);
    this.channels.set(handler.channel, handler);

    console.log(`IPC通道已注册: ${handler.channel}`);
  }

  /**
   * 注销IPC处理器
   */
  unregister(channel: string): void {
    if (this.channels.has(channel)) {
      ipcMain.removeHandler(channel);
      this.channels.delete(channel);
      console.log(`IPC通道已注销: ${channel}`);
    }
  }

  /**
   * 添加中间件
   */
  use(middleware: IpcMiddleware): void {
    this.middleware.push(middleware);
  }

  /**
   * 获取已注册的通道列表
   */
  getRegisteredChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  /**
   * 包装处理器以支持中间件和错误处理
   */
  private wrapHandler(handler: IpcHandler) {
    return async (event: IpcMainInvokeEvent, ...args: any[]): Promise<IpcResponse> => {
      const requestId = generateRequestId();
      const startTime = Date.now();

      try {
        // 执行前置中间件
        for (const middleware of this.middleware) {
          if (middleware.before) {
            await middleware.before(event, handler.channel, args);
          }
        }

        // 执行实际处理器
        const result = await handler.handler(event, ...args);

        // 执行后置中间件
        for (const middleware of this.middleware) {
          if (middleware.after) {
            await middleware.after(event, handler.channel, result);
          }
        }

        const duration = Date.now() - startTime;
        console.log(`IPC请求完成: ${handler.channel} (${duration}ms)`);

        return {
          success: true,
          data: result,
          requestId
        };

      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`IPC请求失败: ${handler.channel} (${duration}ms)`, error);

        const ipcError: IpcError = {
          code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
          requestId
        };

        // 执行错误中间件
        for (const middleware of this.middleware) {
          if (middleware.onError) {
            await middleware.onError(event, handler.channel, ipcError);
          }
        }

        return {
          success: false,
          error: ipcError,
          requestId
        };
      }
    };
  }
}

/**
 * IPC中间件接口
 */
export interface IpcMiddleware {
  before?(event: IpcMainInvokeEvent, channel: string, args: any[]): Promise<void> | void;
  after?(event: IpcMainInvokeEvent, channel: string, result: any): Promise<void> | void;
  onError?(event: IpcMainInvokeEvent, channel: string, error: IpcError): Promise<void> | void;
}

/**
 * 全局IPC注册表实例
 */
export const ipcRegistry = new IpcChannelRegistry();

/**
 * 生成请求ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * 验证中间件 - 验证请求参数
 */
export class ValidationMiddleware implements IpcMiddleware {
  async before(event: IpcMainInvokeEvent, channel: string, args: any[]): Promise<void> {
    // 基本安全检查
    if (!event || !channel) {
      throw new Error('无效的IPC请求');
    }

    // 检查是否来自授权的渲染进程
    const webContents = event.sender;
    if (!webContents || webContents.isDestroyed()) {
      throw new Error('无效的渲染进程');
    }

    console.log(`IPC请求验证通过: ${channel}`);
  }
}

/**
 * 日志中间件 - 记录IPC调用
 */
export class LoggingMiddleware implements IpcMiddleware {
  async before(event: IpcMainInvokeEvent, channel: string, args: any[]): Promise<void> {
    console.log(`IPC请求开始: ${channel}`, {
      args: this.sanitizeArgs(args),
      timestamp: new Date().toISOString()
    });
  }

  async after(event: IpcMainInvokeEvent, channel: string, result: any): Promise<void> {
    console.log(`IPC请求成功: ${channel}`, {
      hasResult: !!result,
      timestamp: new Date().toISOString()
    });
  }

  async onError(event: IpcMainInvokeEvent, channel: string, error: IpcError): Promise<void> {
    console.error(`IPC请求错误: ${channel}`, {
      error: error.message,
      code: error.code,
      timestamp: error.timestamp
    });
  }

  /**
   * 清理敏感信息
   */
  private sanitizeArgs(args: any[]): any[] {
    return args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        const sanitized = { ...arg };

        // 移除敏感字段
        const sensitiveFields = ['password', 'apiKey', 'token', 'secret'];
        sensitiveFields.forEach(field => {
          if (field in sanitized) {
            sanitized[field] = '***masked***';
          }
        });

        return sanitized;
      }
      return arg;
    });
  }
}

/**
 * 频率限制中间件
 */
export class RateLimitMiddleware implements IpcMiddleware {
  private requestCounts = new Map<string, { count: number; lastReset: number }>();
  private readonly limits = new Map<string, { maxRequests: number; windowMs: number }>();

  constructor() {
    // 设置默认限制
    this.setLimit('installer:detection:*', 10, 60000); // 检测API每分钟10次
    this.setLimit('installer:config:*', 5, 60000);     // 配置API每分钟5次
    this.setLimit('*', 100, 60000);                    // 默认每分钟100次
  }

  /**
   * 设置频率限制
   */
  setLimit(pattern: string, maxRequests: number, windowMs: number): void {
    this.limits.set(pattern, { maxRequests, windowMs });
  }

  async before(event: IpcMainInvokeEvent, channel: string, args: any[]): Promise<void> {
    const now = Date.now();
    const limit = this.getLimit(channel);

    if (!limit) {
      return; // 没有限制
    }

    const key = `${channel}:${event.sender.id}`;
    const current = this.requestCounts.get(key) || { count: 0, lastReset: now };

    // 重置计数器（如果窗口期已过）
    if (now - current.lastReset > limit.windowMs) {
      current.count = 0;
      current.lastReset = now;
    }

    // 检查是否超过限制
    if (current.count >= limit.maxRequests) {
      throw new Error(`频率限制: ${channel} 超过每${limit.windowMs/1000}秒${limit.maxRequests}次的限制`);
    }

    // 增加计数
    current.count++;
    this.requestCounts.set(key, current);
  }

  /**
   * 获取通道的限制设置
   */
  private getLimit(channel: string): { maxRequests: number; windowMs: number } | null {
    // 精确匹配
    if (this.limits.has(channel)) {
      return this.limits.get(channel)!;
    }

    // 模式匹配
    for (const [pattern, limit] of this.limits) {
      if (this.matchPattern(pattern, channel)) {
        return limit;
      }
    }

    return null;
  }

  /**
   * 模式匹配
   */
  private matchPattern(pattern: string, channel: string): boolean {
    if (pattern === '*') {
      return true;
    }

    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return channel.startsWith(prefix);
    }

    return pattern === channel;
  }
}

/**
 * 初始化IPC框架
 */
export function initializeIpcFramework(): void {
  console.log('初始化IPC框架...');

  // 注册核心中间件
  ipcRegistry.use(new ValidationMiddleware());
  ipcRegistry.use(new LoggingMiddleware());
  ipcRegistry.use(new RateLimitMiddleware());

  console.log('IPC框架初始化完成');
}

/**
 * 清理IPC框架
 */
export function cleanupIpcFramework(): void {
  console.log('清理IPC框架...');

  // 注销所有通道
  const channels = ipcRegistry.getRegisteredChannels();
  channels.forEach(channel => {
    ipcRegistry.unregister(channel);
  });

  console.log('IPC框架清理完成');
}

/**
 * 创建标准错误响应
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: any,
  requestId?: string
): IpcResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date(),
      requestId
    },
    requestId
  };
}

/**
 * 创建标准成功响应
 */
export function createSuccessResponse<T>(data: T, requestId?: string): IpcResponse<T> {
  return {
    success: true,
    data,
    requestId
  };
}

/**
 * IPC通道常量
 */
export const IPC_CHANNELS = {
  // Navigation API
  NAVIGATION_NEXT: 'installer:navigation:next',
  NAVIGATION_PREVIOUS: 'installer:navigation:previous',
  NAVIGATION_STATE_CHANGED: 'installer:navigation:state-changed',

  // Step Execution API
  STEP_START: 'installer:step:start',
  STEP_PROGRESS: 'installer:step:progress',
  STEP_COMPLETED: 'installer:step:completed',

  // Detection API
  DETECTION_START: 'installer:detection:start',
  DETECTION_RESULT: 'installer:detection:result',

  // Network API
  NETWORK_TEST_CONNECTION: 'installer:network:test-connection',
  NETWORK_TEST_DNS: 'installer:network:test-dns',

  // Node.js API
  NODEJS_CHECK_INSTALLATION: 'installer:nodejs:check-installation',
  NODEJS_SET_REGISTRY: 'installer:nodejs:set-registry',

  // Claude CLI API
  CLAUDE_CHECK_INSTALLATION: 'installer:claude:check-installation',
  CLAUDE_INSTALL: 'installer:claude:install',

  // Configuration API
  CONFIG_GET: 'installer:config:get',
  CONFIG_SET: 'installer:config:set',
  CONFIG_VALIDATE_API: 'installer:config:validate-api'
} as const;

/**
 * 类型定义导出
 */
export type IpcChannelName = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

/**
 * 注册所有IPC处理器
 */
export function registerAllHandlers(): void {
  console.log('注册所有IPC处理器...');

  try {
    // 初始化IPC框架
    initializeIpcFramework();

    // 这里可以注册具体的处理器
    // 目前先初始化基础框架

    console.log('所有IPC处理器注册完成');
  } catch (error) {
    console.error('注册IPC处理器失败:', error);
    throw error;
  }
}

/**
 * 注销所有IPC处理器
 */
export function unregisterAllHandlers(): void {
  console.log('注销所有IPC处理器...');

  try {
    // 清理IPC框架
    cleanupIpcFramework();

    console.log('所有IPC处理器注销完成');
  } catch (error) {
    console.error('注销IPC处理器失败:', error);
    throw error;
  }
}
