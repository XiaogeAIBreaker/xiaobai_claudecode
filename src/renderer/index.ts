/**
 * 渲染进程入口
 * 负责初始化渲染进程、路由系统和UI框架
 */

/// <reference path="./types/global.d.ts" />

import { router } from './router';
import { installationStepManager } from './managers/installation-step-manager';
import { uiStateManager } from './managers/ui-state-manager';
import { errorBoundary } from './utils/error-boundary';

/**
 * 应用程序状态接口
 */
interface AppState {
  isInitialized: boolean;
  currentRoute: string;
  isLoading: boolean;
  error: Error | null;
}

/**
 * 渲染进程应用程序类
 */
class RendererApplication {
  private state: AppState = {
    isInitialized: false,
    currentRoute: '/',
    isLoading: true,
    error: null
  };

  private readonly containerId = 'root';

  /**
   * 初始化渲染进程应用
   */
  async initialize(): Promise<void> {
    console.log('初始化渲染进程应用...');

    try {
      // 设置全局错误处理
      this.setupErrorHandling();

      // 验证必要依赖
      await this.verifyDependencies();

      // 初始化管理器
      await this.initializeManagers();

      // 初始化路由系统
      await this.initializeRouter();

      // 设置IPC通信
      this.setupIpcCommunication();

      // 渲染初始界面
      await this.renderInitialView();

      // 标记为已初始化
      this.state.isInitialized = true;
      this.state.isLoading = false;

      console.log('渲染进程应用初始化完成');

      // 通知主进程渲染器已就绪
      this.notifyMainProcessReady();

    } catch (error) {
      console.error('渲染进程应用初始化失败:', error);
      this.state.error = error instanceof Error ? error : new Error(String(error));
      this.renderErrorView();
    }
  }

  /**
   * 验证必要依赖
   */
  private async verifyDependencies(): Promise<void> {
    // 检查Electron API
    if (!window.electronAPI) {
      throw new Error('Electron API未正确加载，请检查preload脚本');
    }

    // 检查必要的DOM元素
    const container = document.getElementById(this.containerId);
    if (!container) {
      throw new Error(`容器元素 #${this.containerId} 未找到`);
    }

    // 验证IPC通道
    try {
      await window.electronAPI.invoke('installer:health-check');
    } catch (error) {
      console.warn('IPC健康检查失败，某些功能可能不可用:', error);
    }
  }

  /**
   * 初始化管理器
   */
  private async initializeManagers(): Promise<void> {
    // 初始化UI状态管理器
    await uiStateManager.initialize();

    // 初始化安装步骤管理器
    await installationStepManager.initialize();

    console.log('管理器初始化完成');
  }

  /**
   * 初始化路由系统
   */
  private async initializeRouter(): Promise<void> {
    // 设置路由事件监听
    router.on('route-changed', (route: string) => {
      this.state.currentRoute = route;
      console.log(`路由变更: ${route}`);
    });

    router.on('navigation-error', (error: Error) => {
      console.error('路由导航错误:', error);
      this.handleNavigationError(error);
    });

    // 初始化路由
    await router.initialize();

    console.log('路由系统初始化完成');
  }

  /**
   * 设置IPC通信
   */
  private setupIpcCommunication(): void {
    // 监听主进程通知
    window.electronAPI.on('notification:show', (notification: any) => {
      this.handleNotification(notification);
    });

    window.electronAPI.on('notification:progress', (progress: any) => {
      this.handleProgressUpdate(progress);
    });

    window.electronAPI.on('navigation:state-changed', (state: any) => {
      this.handleNavigationStateChange(state);
    });

    window.electronAPI.on('step:progress', (progress: any) => {
      installationStepManager.handleStepProgress(progress);
    });

    console.log('IPC通信设置完成');
  }

  /**
   * 渲染初始界面
   */
  private async renderInitialView(): Promise<void> {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    // 清除加载提示
    container.innerHTML = '';

    // 创建应用结构
    const appHTML = `
      <div class="app-container">
        <header class="app-header">
          <h1 class="app-title">Claude CLI 安装程序</h1>
          <div class="app-status" id="app-status">就绪</div>
        </header>

        <main class="app-main" id="app-main">
          <div class="route-container" id="route-container">
            <!-- 路由内容将在这里渲染 -->
          </div>
        </main>

        <footer class="app-footer">
          <div class="navigation-controls" id="navigation-controls">
            <!-- 导航控件将在这里渲染 -->
          </div>
        </footer>

        <div class="notification-container" id="notification-container">
          <!-- 通知将在这里显示 -->
        </div>

        <div class="progress-overlay" id="progress-overlay" style="display: none;">
          <div class="progress-content">
            <div class="progress-spinner"></div>
            <div class="progress-message" id="progress-message">处理中...</div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = appHTML;

    // 导航到初始路由
    await router.navigate('/welcome');

    console.log('初始界面渲染完成');
  }

  /**
   * 渲染错误界面
   */
  private renderErrorView(): void {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const errorHTML = `
      <div class="error-container">
        <div class="error-content">
          <h1 class="error-title">应用程序启动失败</h1>
          <div class="error-message">${this.state.error?.message || '未知错误'}</div>
          <div class="error-actions">
            <button class="error-button" onclick="location.reload()">重新启动</button>
            <button class="error-button secondary" onclick="window.electronAPI.invoke('app:quit')">退出应用</button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = errorHTML;
  }

  /**
   * 设置错误处理
   */
  private setupErrorHandling(): void {
    // 全局错误处理
    window.addEventListener('error', (event) => {
      console.error('全局错误:', event.error);
      errorBoundary.handleError(event.error);
    });

    // 未捕获的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      console.error('未处理的Promise拒绝:', event.reason);
      errorBoundary.handleError(new Error(String(event.reason)));
    });

    // Electron特定错误
    if (window.electronAPI) {
      window.electronAPI.on('error', (error: any) => {
        console.error('Electron错误:', error);
        errorBoundary.handleError(new Error(error.message || String(error)));
      });
    }
  }

  /**
   * 处理通知
   */
  private handleNotification(notification: any): void {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notificationElement = document.createElement('div');
    notificationElement.className = `notification notification-${notification.type || 'info'}`;
    notificationElement.innerHTML = `
      <div class="notification-content">
        <div class="notification-title">${notification.title}</div>
        <div class="notification-message">${notification.message}</div>
      </div>
      <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(notificationElement);

    // 自动移除
    if (notification.timeout && notification.timeout > 0) {
      setTimeout(() => {
        if (notificationElement.parentElement) {
          notificationElement.remove();
        }
      }, notification.timeout);
    }
  }

  /**
   * 处理进度更新
   */
  private handleProgressUpdate(progress: any): void {
    const overlay = document.getElementById('progress-overlay');
    const message = document.getElementById('progress-message');

    if (!overlay || !message) return;

    if (progress.progress >= 0 && progress.progress <= 100) {
      overlay.style.display = 'flex';
      message.textContent = progress.message || '处理中...';

      if (progress.progress >= 100) {
        setTimeout(() => {
          overlay.style.display = 'none';
        }, 1000);
      }
    } else {
      overlay.style.display = 'none';
    }
  }

  /**
   * 处理导航状态变化
   */
  private handleNavigationStateChange(state: any): void {
    uiStateManager.updateNavigationState(state);
  }

  /**
   * 处理导航错误
   */
  private handleNavigationError(error: Error): void {
    console.error('导航错误:', error);
    this.handleNotification({
      type: 'error',
      title: '导航错误',
      message: error.message,
      timeout: 5000
    });
  }

  /**
   * 通知主进程渲染器已就绪
   */
  private notifyMainProcessReady(): void {
    if (window.electronAPI) {
      window.electronAPI.invoke('renderer:ready').catch((error: any) => {
        console.warn('通知主进程失败:', error);
      });
    }
  }

  /**
   * 获取应用状态
   */
  getState(): Readonly<AppState> {
    return { ...this.state };
  }

  /**
   * 销毁应用
   */
  destroy(): void {
    console.log('销毁渲染进程应用...');

    // 清理路由
    router.destroy();

    // 清理管理器
    uiStateManager.destroy();
    installationStepManager.destroy();

    // 重置状态
    this.state = {
      isInitialized: false,
      currentRoute: '/',
      isLoading: true,
      error: null
    };

    console.log('渲染进程应用已销毁');
  }
}

/**
 * 全局应用实例
 */
export const app = new RendererApplication();

/**
 * 应用入口函数
 */
async function main(): Promise<void> {
  try {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }

    // 初始化应用
    await app.initialize();

  } catch (error) {
    console.error('应用启动失败:', error);

    // 显示基本错误界面
    const container = document.getElementById('root');
    if (container) {
      container.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif;">
          <div style="text-align: center;">
            <h2 style="color: #d73a49;">应用启动失败</h2>
            <p style="color: #586069;">${error instanceof Error ? error.message : String(error)}</p>
            <button onclick="location.reload()" style="padding: 8px 16px; background: #0366d6; color: white; border: none; border-radius: 6px; cursor: pointer;">重新启动</button>
          </div>
        </div>
      `;
    }
  }
}

// 启动应用
main();

/**
 * 导出类型定义
 */
export type { AppState };