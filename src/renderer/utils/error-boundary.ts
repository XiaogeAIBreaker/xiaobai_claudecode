/**
 * 错误边界工具
 * 负责全局错误处理和错误边界管理
 */

/// <reference path="../types/global.d.ts" />

/**
 * 错误信息接口
 */
interface ErrorInfo {
  id: string;
  timestamp: Date;
  type: string;
  message: string;
  stack?: string;
  context?: any;
  handled: boolean;
}

/**
 * 错误处理配置接口
 */
interface ErrorHandlerConfig {
  enableLogging: boolean;
  enableReporting: boolean;
  maxErrorHistory: number;
  autoRecover: boolean;
}

/**
 * 错误边界类
 */
class ErrorBoundary {
  private errors: ErrorInfo[] = [];
  private config: ErrorHandlerConfig = {
    enableLogging: true,
    enableReporting: false,
    maxErrorHistory: 100,
    autoRecover: true
  };
  private isInitialized = false;

  /**
   * 初始化错误边界
   */
  initialize(config?: Partial<ErrorHandlerConfig>): void {
    if (this.isInitialized) {
      console.warn('错误边界已经初始化');
      return;
    }

    // 合并配置
    this.config = { ...this.config, ...config };

    // 设置全局错误处理
    this.setupGlobalErrorHandlers();

    this.isInitialized = true;
    console.log('错误边界初始化完成');
  }

  /**
   * 处理错误
   */
  handleError(error: Error, context?: any): string {
    const errorInfo: ErrorInfo = {
      id: this.generateErrorId(),
      timestamp: new Date(),
      type: error.name || 'Error',
      message: error.message,
      stack: error.stack,
      context,
      handled: true
    };

    // 添加到错误历史
    this.addToHistory(errorInfo);

    // 记录错误
    if (this.config.enableLogging) {
      this.logError(errorInfo);
    }

    // 报告错误
    if (this.config.enableReporting) {
      this.reportError(errorInfo);
    }

    // 显示用户友好的错误信息
    this.showUserError(errorInfo);

    // 尝试自动恢复
    if (this.config.autoRecover) {
      this.attemptRecovery(errorInfo);
    }

    return errorInfo.id;
  }

  /**
   * 处理异步错误
   */
  async handleAsyncError(promise: Promise<any>, context?: any): Promise<any> {
    try {
      return await promise;
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)), context);
      throw error;
    }
  }

  /**
   * 包装函数以捕获错误
   */
  wrapFunction<T extends (...args: any[]) => any>(
    fn: T,
    context?: any
  ): (...args: Parameters<T>) => ReturnType<T> | undefined {
    return (...args: Parameters<T>) => {
      try {
        const result = fn(...args);

        // 如果返回Promise，包装异步错误处理
        if (result instanceof Promise) {
          return this.handleAsyncError(result, context) as ReturnType<T>;
        }

        return result;
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error(String(error)), context);
        return undefined;
      }
    };
  }

  /**
   * 创建错误边界组件
   */
  createBoundary(element: HTMLElement, fallbackContent?: string): void {
    const originalOnError = window.onerror;

    // 为特定元素创建错误边界
    const boundaryHandler = (error: Error) => {
      if (element.contains(document.activeElement)) {
        this.handleError(error, { element: element.tagName, id: element.id });

        // 渲染降级内容
        if (fallbackContent) {
          element.innerHTML = fallbackContent;
        } else {
          element.innerHTML = this.getDefaultFallbackContent();
        }
      }
    };

    // 监听该元素的错误
    element.addEventListener('error', (event) => {
      boundaryHandler(new Error('Element error: ' + event.type));
    });

    // 存储原始内容以便恢复
    element.setAttribute('data-original-content', element.innerHTML);
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(): ErrorInfo[] {
    return [...this.errors];
  }

  /**
   * 获取最近的错误
   */
  getLatestError(): ErrorInfo | null {
    return this.errors.length > 0 ? this.errors[this.errors.length - 1] : null;
  }

  /**
   * 清除错误历史
   */
  clearErrorHistory(): void {
    this.errors = [];
    console.log('错误历史已清除');
  }

  /**
   * 检查是否有未处理的严重错误
   */
  hasCriticalErrors(): boolean {
    return this.errors.some(error =>
      error.type === 'TypeError' ||
      error.type === 'ReferenceError' ||
      error.message.includes('critical')
    );
  }

  /**
   * 设置全局错误处理器
   */
  private setupGlobalErrorHandlers(): void {
    // 全局错误事件
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // 未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        { promise: true }
      );
    });

    // 资源加载错误
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleError(
          new Error(`Resource loading failed: ${(event.target as any)?.src || 'unknown'}`),
          { resource: true, target: event.target }
        );
      }
    }, true);
  }

  /**
   * 添加到错误历史
   */
  private addToHistory(errorInfo: ErrorInfo): void {
    this.errors.push(errorInfo);

    // 限制历史记录大小
    if (this.errors.length > this.config.maxErrorHistory) {
      this.errors = this.errors.slice(-this.config.maxErrorHistory);
    }
  }

  /**
   * 记录错误
   */
  private logError(errorInfo: ErrorInfo): void {
    const logMessage = `[ERROR ${errorInfo.id}] ${errorInfo.type}: ${errorInfo.message}`;

    console.group(logMessage);
    console.error('Message:', errorInfo.message);
    console.error('Type:', errorInfo.type);
    console.error('Timestamp:', errorInfo.timestamp.toISOString());

    if (errorInfo.stack) {
      console.error('Stack:', errorInfo.stack);
    }

    if (errorInfo.context) {
      console.error('Context:', errorInfo.context);
    }

    console.groupEnd();
  }

  /**
   * 报告错误
   */
  private async reportError(errorInfo: ErrorInfo): Promise<void> {
    try {
      if (window.electronAPI) {
        await window.electronAPI.invoke('error:report', {
          id: errorInfo.id,
          type: errorInfo.type,
          message: errorInfo.message,
          stack: errorInfo.stack,
          timestamp: errorInfo.timestamp.toISOString(),
          context: errorInfo.context
        });
      }
    } catch (error) {
      console.warn('错误报告发送失败:', error);
    }
  }

  /**
   * 显示用户友好的错误信息
   */
  private showUserError(errorInfo: ErrorInfo): void {
    // 创建用户友好的错误消息
    let userMessage = this.getUserFriendlyMessage(errorInfo);

    // 通过UI状态管理器显示通知
    if ((window as any).uiStateManager) {
      (window as any).uiStateManager.addNotification({
        type: 'error',
        title: '发生错误',
        message: userMessage,
        timeout: 8000,
        persistent: false
      });
    } else {
      // 降级到原生alert
      console.error('Error:', userMessage);
    }
  }

  /**
   * 获取用户友好的错误消息
   */
  private getUserFriendlyMessage(errorInfo: ErrorInfo): string {
    // 根据错误类型返回用户友好的消息
    const messageMap: { [key: string]: string } = {
      'TypeError': '程序运行出现类型错误，请重试',
      'ReferenceError': '程序引用错误，请刷新页面',
      'NetworkError': '网络连接失败，请检查网络设置',
      'TimeoutError': '操作超时，请重试',
      'ValidationError': '输入数据验证失败，请检查输入',
      'PermissionError': '权限不足，请检查权限设置'
    };

    const userMessage = messageMap[errorInfo.type] || '发生未知错误，请重试';

    // 如果错误消息包含特定关键词，提供更具体的建议
    if (errorInfo.message.includes('network') || errorInfo.message.includes('fetch')) {
      return '网络连接失败，请检查网络设置后重试';
    }

    if (errorInfo.message.includes('permission') || errorInfo.message.includes('access')) {
      return '权限不足，请检查应用权限设置';
    }

    if (errorInfo.message.includes('timeout')) {
      return '操作超时，请重试或检查网络连接';
    }

    return userMessage;
  }

  /**
   * 尝试自动恢复
   */
  private attemptRecovery(errorInfo: ErrorInfo): void {
    console.log(`尝试从错误恢复: ${errorInfo.id}`);

    // 根据错误类型执行不同的恢复策略
    switch (errorInfo.type) {
      case 'NetworkError':
        this.recoverFromNetworkError();
        break;

      case 'TypeError':
      case 'ReferenceError':
        this.recoverFromScriptError();
        break;

      default:
        this.recoverFromGenericError();
        break;
    }
  }

  /**
   * 从网络错误恢复
   */
  private recoverFromNetworkError(): void {
    // 重试网络连接或切换到离线模式
    console.log('尝试网络错误恢复');
  }

  /**
   * 从脚本错误恢复
   */
  private recoverFromScriptError(): void {
    // 重置应用状态或重新加载关键组件
    console.log('尝试脚本错误恢复');
  }

  /**
   * 从通用错误恢复
   */
  private recoverFromGenericError(): void {
    // 通用恢复策略
    console.log('尝试通用错误恢复');
  }

  /**
   * 获取默认降级内容
   */
  private getDefaultFallbackContent(): string {
    return `
      <div class="error-boundary-fallback">
        <div class="error-icon">⚠️</div>
        <h3>组件加载失败</h3>
        <p>该组件遇到了错误，正在尝试恢复...</p>
        <button onclick="location.reload()">刷新页面</button>
      </div>
    `;
  }

  /**
   * 生成错误ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 销毁错误边界
   */
  destroy(): void {
    this.errors = [];
    this.isInitialized = false;
    console.log('错误边界已销毁');
  }
}

/**
 * 全局错误边界实例
 */
export const errorBoundary = new ErrorBoundary();

/**
 * 导出类型定义
 */
export type { ErrorInfo, ErrorHandlerConfig };