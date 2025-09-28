/**
 * Detection API IPC处理器实现
 * 处理自动检测相关的IPC请求
 */

import { IpcMainInvokeEvent } from 'electron';
import { ipcRegistry, IpcHandler, createSuccessResponse, createErrorResponse } from '../ipc-handlers';
import {
  DetectionResult,
  ComponentType,
  createDetectionResult,
  validateDetectionResult,
  isDetectionSuccessful,
  getDetectionSeverity
} from '../../models/detection-result';

/**
 * 检测请求接口
 */
interface StartDetectionRequest {
  detectionType: ComponentType;
  options?: DetectionOptions;
}

interface DetectionOptions {
  timeout?: number;
  retryCount?: number;
  skipCache?: boolean;
  customConfig?: any;
}

/**
 * 检测响应接口
 */
interface StartDetectionResponse {
  success: boolean;
  detectionId?: string;
  error?: string;
}

/**
 * 检测信息接口
 */
interface DetectionInfo {
  id: string;
  type: ComponentType;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  startTime: number;
  endTime?: number;
  result?: DetectionResult;
  error?: string;
}

/**
 * 检测管理器
 */
class DetectionManager {
  private runningDetections = new Map<string, DetectionInfo>();
  private detectionResults = new Map<ComponentType, DetectionResult>();
  private detectionCounter = 0;

  /**
   * 开始检测
   */
  async startDetection(type: ComponentType, options?: DetectionOptions): Promise<StartDetectionResponse> {
    try {
      // 生成检测ID
      const detectionId = this.generateDetectionId();

      // 创建检测信息
      const detectionInfo: DetectionInfo = {
        id: detectionId,
        type,
        status: 'running',
        startTime: Date.now()
      };

      this.runningDetections.set(detectionId, detectionInfo);

      // 异步执行检测
      this.executeDetectionAsync(detectionId, type, options);

      console.log(`开始检测 ${type}，检测ID: ${detectionId}`);

      return {
        success: true,
        detectionId
      };

    } catch (error) {
      console.error(`开始检测 ${type} 失败:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 异步执行检测
   */
  private async executeDetectionAsync(
    detectionId: string,
    type: ComponentType,
    options?: DetectionOptions
  ): Promise<void> {
    const detectionInfo = this.runningDetections.get(detectionId);
    if (!detectionInfo) return;

    try {
      console.log(`执行检测: ${type}`, options);

      // 检查缓存
      if (!options?.skipCache && this.detectionResults.has(type)) {
        const cachedResult = this.detectionResults.get(type)!;
        const cacheAge = Date.now() - new Date(cachedResult.detectedAt).getTime();

        // 缓存有效期5分钟
        if (cacheAge < 5 * 60 * 1000) {
          console.log(`使用缓存的检测结果: ${type}`);
          this.completeDetection(detectionId, cachedResult);
          return;
        }
      }

      // 执行实际检测
      let result: DetectionResult;
      const timeout = options?.timeout || 30000; // 默认30秒超时

      const detectionPromise = this.performDetection(type, options);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('检测超时')), timeout);
      });

      result = await Promise.race([detectionPromise, timeoutPromise]);

      // 验证检测结果
      validateDetectionResult(result);

      // 缓存结果
      this.detectionResults.set(type, result);

      // 完成检测
      this.completeDetection(detectionId, result);

    } catch (error) {
      console.error(`执行检测 ${type} 失败:`, error);
      this.failDetection(detectionId, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 执行具体的检测逻辑
   */
  private async performDetection(type: ComponentType, options?: DetectionOptions): Promise<DetectionResult> {
    switch (type) {
      case ComponentType.NODEJS:
        return await this.detectNodeJs(options);
      case ComponentType.NPM:
        return await this.detectNpm(options);
      case ComponentType.CLAUDE_CLI:
        return await this.detectClaudeCli(options);
      case ComponentType.NETWORK:
        return await this.detectNetwork(options);
      case ComponentType.GOOGLE_AUTH:
        return await this.detectGoogleAuth(options);
      case ComponentType.ANTHROPIC_API:
        return await this.detectAnthropicApi(options);
      default:
        throw new Error(`不支持的检测类型: ${type}`);
    }
  }

  /**
   * 检测Node.js
   */
  private async detectNodeJs(options?: DetectionOptions): Promise<DetectionResult> {
    console.log('检测Node.js安装状态');

    try {
      // 模拟检测过程
      await this.sleep(1000);

      // 实际实现中应该执行: node --version
      const mockNodeVersion = '18.17.0';
      const mockNodePath = '/usr/local/bin/node';

      const result = createDetectionResult(ComponentType.NODEJS, true, {
        version: mockNodeVersion,
        path: mockNodePath,
        compatible: true,
        metadata: {
          npmVersion: '9.6.7',
          architecture: 'arm64',
          platform: 'darwin'
        }
      });

      console.log('Node.js检测完成:', result);
      return result;

    } catch (error) {
      console.error('Node.js检测失败:', error);
      return createDetectionResult(ComponentType.NODEJS, false, {
        issues: [error instanceof Error ? error.message : String(error)],
        recommendations: ['请安装Node.js 18或更高版本']
      });
    }
  }

  /**
   * 检测npm
   */
  private async detectNpm(options?: DetectionOptions): Promise<DetectionResult> {
    console.log('检测npm安装状态');

    try {
      await this.sleep(800);

      const mockNpmVersion = '9.6.7';
      const mockNpmPath = '/usr/local/bin/npm';

      const result = createDetectionResult(ComponentType.NPM, true, {
        version: mockNpmVersion,
        path: mockNpmPath,
        compatible: true,
        metadata: {
          registry: 'https://registry.npmmirror.com/',
          globalPath: '/usr/local/lib/node_modules'
        }
      });

      console.log('npm检测完成:', result);
      return result;

    } catch (error) {
      console.error('npm检测失败:', error);
      return createDetectionResult(ComponentType.NPM, false, {
        issues: [error instanceof Error ? error.message : String(error)],
        recommendations: ['npm通常随Node.js一起安装']
      });
    }
  }

  /**
   * 检测Claude CLI
   */
  private async detectClaudeCli(options?: DetectionOptions): Promise<DetectionResult> {
    console.log('检测Claude CLI安装状态');

    try {
      await this.sleep(1200);

      // 模拟Claude CLI未安装的情况
      const result = createDetectionResult(ComponentType.CLAUDE_CLI, false, {
        compatible: false,
        issues: ['Claude CLI未安装'],
        recommendations: ['将自动安装Claude CLI'],
        metadata: {
          expectedPath: '/usr/local/bin/claude',
          installMethod: 'npm'
        }
      });

      console.log('Claude CLI检测完成:', result);
      return result;

    } catch (error) {
      console.error('Claude CLI检测失败:', error);
      return createDetectionResult(ComponentType.CLAUDE_CLI, false, {
        issues: [error instanceof Error ? error.message : String(error)],
        recommendations: ['将尝试自动安装Claude CLI']
      });
    }
  }

  /**
   * 检测网络连接
   */
  private async detectNetwork(options?: DetectionOptions): Promise<DetectionResult> {
    console.log('检测网络连接状态');

    try {
      await this.sleep(2000);

      // 模拟网络检测
      const testUrls = [
        'https://registry.npmjs.org',
        'https://api.anthropic.com',
        'https://www.google.com'
      ];

      const results = await Promise.all(
        testUrls.map(async url => {
          await this.sleep(Math.random() * 500);
          return {
            url,
            success: Math.random() > 0.1, // 90%成功率
            responseTime: Math.floor(Math.random() * 500) + 100
          };
        })
      );

      const allSuccessful = results.every(r => r.success);
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

      const result = createDetectionResult(ComponentType.NETWORK, allSuccessful, {
        compatible: allSuccessful,
        issues: allSuccessful ? [] : ['部分网络连接失败'],
        recommendations: allSuccessful ? ['网络连接正常'] : ['请检查网络连接'],
        metadata: {
          testResults: results,
          averageResponseTime: avgResponseTime
        }
      });

      console.log('网络检测完成:', result);
      return result;

    } catch (error) {
      console.error('网络检测失败:', error);
      return createDetectionResult(ComponentType.NETWORK, false, {
        issues: [error instanceof Error ? error.message : String(error)],
        recommendations: ['请检查网络连接设置']
      });
    }
  }

  /**
   * 检测Google认证
   */
  private async detectGoogleAuth(options?: DetectionOptions): Promise<DetectionResult> {
    console.log('检测Google认证状态');

    try {
      await this.sleep(1500);

      // Google认证是可选的，默认返回未配置状态
      const result = createDetectionResult(ComponentType.GOOGLE_AUTH, false, {
        compatible: true, // 兼容但未配置
        issues: [],
        recommendations: ['Google认证是可选的，可以稍后配置'],
        metadata: {
          optional: true,
          configurable: true
        }
      });

      console.log('Google认证检测完成:', result);
      return result;

    } catch (error) {
      console.error('Google认证检测失败:', error);
      return createDetectionResult(ComponentType.GOOGLE_AUTH, false, {
        issues: [error instanceof Error ? error.message : String(error)],
        recommendations: ['Google认证是可选功能']
      });
    }
  }

  /**
   * 检测Anthropic API
   */
  private async detectAnthropicApi(options?: DetectionOptions): Promise<DetectionResult> {
    console.log('检测Anthropic API配置');

    try {
      await this.sleep(1000);

      // API配置通常在安装过程中设置
      const result = createDetectionResult(ComponentType.ANTHROPIC_API, false, {
        compatible: true, // 兼容但未配置
        issues: [],
        recommendations: ['API配置是可选的，可以在安装过程中设置'],
        metadata: {
          optional: true,
          configurable: true,
          envVars: ['ANTHROPIC_API_KEY', 'ANTHROPIC_BASE_URL']
        }
      });

      console.log('Anthropic API检测完成:', result);
      return result;

    } catch (error) {
      console.error('Anthropic API检测失败:', error);
      return createDetectionResult(ComponentType.ANTHROPIC_API, false, {
        issues: [error instanceof Error ? error.message : String(error)],
        recommendations: ['API配置是可选功能']
      });
    }
  }

  /**
   * 完成检测
   */
  private completeDetection(detectionId: string, result: DetectionResult): void {
    const detectionInfo = this.runningDetections.get(detectionId);
    if (!detectionInfo) return;

    detectionInfo.status = 'completed';
    detectionInfo.endTime = Date.now();
    detectionInfo.result = result;

    const duration = detectionInfo.endTime - detectionInfo.startTime;
    console.log(`检测完成 [${detectionInfo.type}]: ${duration}ms`);

    // 发送检测结果事件
    this.emitDetectionResult(detectionId, result);

    // 清理已完成的检测
    setTimeout(() => {
      this.runningDetections.delete(detectionId);
    }, 60000); // 1分钟后清理
  }

  /**
   * 失败检测
   */
  private failDetection(detectionId: string, error: string): void {
    const detectionInfo = this.runningDetections.get(detectionId);
    if (!detectionInfo) return;

    detectionInfo.status = 'failed';
    detectionInfo.endTime = Date.now();
    detectionInfo.error = error;

    const duration = detectionInfo.endTime - detectionInfo.startTime;
    console.log(`检测失败 [${detectionInfo.type}]: ${error} (${duration}ms)`);

    // 清理失败的检测
    setTimeout(() => {
      this.runningDetections.delete(detectionId);
    }, 60000); // 1分钟后清理
  }

  /**
   * 发送检测结果事件
   */
  private emitDetectionResult(detectionId: string, result: DetectionResult): void {
    const severity = getDetectionSeverity(result);

    // TODO: 向渲染进程发送检测结果事件
    console.log(`检测结果 [${result.component}]: ${severity}`, {
      detectionId,
      installed: result.installed,
      compatible: result.compatible,
      issues: result.issues.length,
      recommendations: result.recommendations.length
    });
  }

  /**
   * 获取检测信息
   */
  getDetectionInfo(detectionId: string): DetectionInfo | undefined {
    return this.runningDetections.get(detectionId);
  }

  /**
   * 获取所有运行中的检测
   */
  getRunningDetections(): DetectionInfo[] {
    return Array.from(this.runningDetections.values());
  }

  /**
   * 获取缓存的检测结果
   */
  getCachedResult(type: ComponentType): DetectionResult | undefined {
    return this.detectionResults.get(type);
  }

  /**
   * 清除缓存
   */
  clearCache(type?: ComponentType): void {
    if (type) {
      this.detectionResults.delete(type);
      console.log(`清除 ${type} 的检测缓存`);
    } else {
      this.detectionResults.clear();
      console.log('清除所有检测缓存');
    }
  }

  /**
   * 生成检测ID
   */
  private generateDetectionId(): string {
    return `detection_${++this.detectionCounter}_${Date.now()}`;
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 全局检测管理器实例
 */
const detectionManager = new DetectionManager();

/**
 * 处理开始检测的请求
 */
async function handleDetectionStart(
  event: IpcMainInvokeEvent,
  request: StartDetectionRequest
): Promise<any> {
  console.log('处理开始检测请求:', request);

  try {
    // 验证请求参数
    if (!request.detectionType || !Object.values(ComponentType).includes(request.detectionType)) {
      throw new Error('detectionType 必须是有效的组件类型');
    }

    const result = await detectionManager.startDetection(request.detectionType, request.options);
    return createSuccessResponse(result);

  } catch (error) {
    console.error('处理开始检测请求失败:', error);
    return createErrorResponse(
      'DETECTION_START_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 获取检测信息
 */
async function handleGetDetectionInfo(event: IpcMainInvokeEvent, detectionId: string): Promise<any> {
  try {
    const detectionInfo = detectionManager.getDetectionInfo(detectionId);
    if (!detectionInfo) {
      return createErrorResponse('DETECTION_NOT_FOUND', `检测不存在: ${detectionId}`);
    }

    return createSuccessResponse(detectionInfo);

  } catch (error) {
    console.error('获取检测信息失败:', error);
    return createErrorResponse(
      'GET_DETECTION_INFO_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 获取缓存的检测结果
 */
async function handleGetCachedResult(event: IpcMainInvokeEvent, componentType: ComponentType): Promise<any> {
  try {
    const result = detectionManager.getCachedResult(componentType);
    return createSuccessResponse(result || null);

  } catch (error) {
    console.error('获取缓存检测结果失败:', error);
    return createErrorResponse(
      'GET_CACHED_RESULT_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 清除检测缓存
 */
async function handleClearCache(event: IpcMainInvokeEvent, componentType?: ComponentType): Promise<any> {
  try {
    detectionManager.clearCache(componentType);
    return createSuccessResponse({ cleared: true });

  } catch (error) {
    console.error('清除检测缓存失败:', error);
    return createErrorResponse(
      'CLEAR_CACHE_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Detection API IPC处理器定义
 */
const detectionHandlers: IpcHandler[] = [
  {
    channel: 'installer:detection:start',
    handler: handleDetectionStart
  },
  {
    channel: 'installer:detection:get-info',
    handler: handleGetDetectionInfo
  },
  {
    channel: 'installer:detection:get-cached',
    handler: handleGetCachedResult
  },
  {
    channel: 'installer:detection:clear-cache',
    handler: handleClearCache
  }
];

/**
 * 注册Detection API处理器
 */
export function registerDetectionHandlers(): void {
  console.log('注册Detection API处理器...');

  detectionHandlers.forEach(handler => {
    try {
      ipcRegistry.register(handler);
    } catch (error) {
      console.error(`注册Detection API处理器失败 [${handler.channel}]:`, error);
    }
  });

  console.log('Detection API处理器注册完成');
}

/**
 * 注销Detection API处理器
 */
export function unregisterDetectionHandlers(): void {
  console.log('注销Detection API处理器...');

  detectionHandlers.forEach(handler => {
    try {
      ipcRegistry.unregister(handler.channel);
    } catch (error) {
      console.error(`注销Detection API处理器失败 [${handler.channel}]:`, error);
    }
  });

  console.log('Detection API处理器注销完成');
}

/**
 * 获取检测管理器实例（用于其他模块）
 */
export function getDetectionManager(): DetectionManager {
  return detectionManager;
}

/**
 * 导出类型定义
 */
export type {
  StartDetectionRequest,
  StartDetectionResponse,
  DetectionOptions,
  DetectionInfo
};