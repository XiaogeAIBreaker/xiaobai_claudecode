/**
 * 渲染进程路由系统
 * 负责页面导航、路由管理和视图切换
 */

/// <reference path="./types/global.d.ts" />

import { EventEmitter } from 'events';

/**
 * 路由配置接口
 */
interface RouteConfig {
  path: string;
  name: string;
  component: string;
  title: string;
  description?: string;
  meta?: {
    requiresAuth?: boolean;
    stepIndex?: number;
    isOptional?: boolean;
    canSkip?: boolean;
  };
}

/**
 * 导航状态接口
 */
interface NavigationState {
  currentPath: string;
  currentIndex: number;
  canGoBack: boolean;
  canGoNext: boolean;
  totalSteps: number;
  progressPercentage: number;
}

/**
 * 路由参数接口
 */
interface RouteParams {
  [key: string]: string | number | boolean;
}

/**
 * 路由器类
 */
class Router extends EventEmitter {
  private routes: Map<string, RouteConfig> = new Map();
  private currentRoute: RouteConfig | null = null;
  private routeHistory: string[] = [];
  private maxHistorySize = 20;
  private isInitialized = false;

  constructor() {
    super();
    this.setupRoutes();
  }

  /**
   * 设置路由配置
   */
  private setupRoutes(): void {
    const routeConfigs: RouteConfig[] = [
      {
        path: '/welcome',
        name: 'welcome',
        component: 'WelcomeView',
        title: '欢迎使用Claude CLI安装程序',
        description: '开始安装Claude CLI的引导过程',
        meta: {
          stepIndex: 0,
          isOptional: false,
          canSkip: false
        }
      },
      {
        path: '/prerequisites',
        name: 'prerequisites',
        component: 'PrerequisitesView',
        title: '系统前置条件检查',
        description: '检查系统环境和必要条件',
        meta: {
          stepIndex: 1,
          isOptional: false,
          canSkip: false
        }
      },
      {
        path: '/network-check',
        name: 'network-check',
        component: 'NetworkCheckView',
        title: '网络环境检测',
        description: '检测网络连接和访问能力',
        meta: {
          stepIndex: 2,
          isOptional: false,
          canSkip: false
        }
      },
      {
        path: '/nodejs-setup',
        name: 'nodejs-setup',
        component: 'NodeJsSetupView',
        title: 'Node.js环境配置',
        description: '安装和配置Node.js环境',
        meta: {
          stepIndex: 3,
          isOptional: false,
          canSkip: false
        }
      },
      {
        path: '/google-setup',
        name: 'google-setup',
        component: 'GoogleSetupView',
        title: 'Google服务配置',
        description: '配置Google邮箱登录（可选）',
        meta: {
          stepIndex: 4,
          isOptional: true,
          canSkip: true
        }
      },
      {
        path: '/claude-install',
        name: 'claude-install',
        component: 'ClaudeInstallView',
        title: 'Claude CLI安装',
        description: '下载和安装Claude CLI工具',
        meta: {
          stepIndex: 5,
          isOptional: false,
          canSkip: false
        }
      },
      {
        path: '/api-config',
        name: 'api-config',
        component: 'ApiConfigView',
        title: 'API配置',
        description: '配置Anthropic API密钥（可选）',
        meta: {
          stepIndex: 6,
          isOptional: true,
          canSkip: true
        }
      },
      {
        path: '/completion',
        name: 'completion',
        component: 'CompletionView',
        title: '安装完成',
        description: '安装完成，可以开始使用Claude CLI',
        meta: {
          stepIndex: 7,
          isOptional: false,
          canSkip: false
        }
      }
    ];

    // 注册路由
    routeConfigs.forEach(config => {
      this.routes.set(config.path, config);
    });

    console.log(`已注册 ${routeConfigs.length} 个路由`);
  }

  /**
   * 初始化路由器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('路由器已经初始化');
      return;
    }

    // 设置浏览器历史监听
    this.setupHistoryListener();

    // 设置键盘导航
    this.setupKeyboardNavigation();

    this.isInitialized = true;
    console.log('路由器初始化完成');
  }

  /**
   * 导航到指定路径
   */
  async navigate(path: string, params?: RouteParams): Promise<boolean> {
    console.log(`导航到: ${path}`, params);

    try {
      const route = this.routes.get(path);
      if (!route) {
        throw new Error(`路由不存在: ${path}`);
      }

      // 检查导航权限
      const canNavigate = await this.checkNavigationPermission(route);
      if (!canNavigate) {
        console.warn(`导航被拒绝: ${path}`);
        return false;
      }

      // 执行导航前钩子
      await this.beforeNavigate(route, params);

      // 更新历史记录
      this.updateHistory(path);

      // 更新当前路由
      const previousRoute = this.currentRoute;
      this.currentRoute = route;

      // 渲染新视图
      await this.renderView(route, params);

      // 更新页面标题
      this.updatePageTitle(route);

      // 更新导航状态
      await this.updateNavigationState();

      // 触发路由变化事件
      this.emit('route-changed', path, route, previousRoute);

      // 执行导航后钩子
      await this.afterNavigate(route, params);

      console.log(`导航完成: ${path}`);
      return true;

    } catch (error) {
      console.error(`导航失败: ${path}`, error);
      this.emit('navigation-error', error);
      return false;
    }
  }

  /**
   * 返回上一页
   */
  async goBack(): Promise<boolean> {
    if (this.routeHistory.length < 2) {
      console.warn('没有可返回的历史记录');
      return false;
    }

    // 移除当前路由
    this.routeHistory.pop();
    const previousPath = this.routeHistory[this.routeHistory.length - 1];

    // 导航到上一个路由（不添加到历史记录）
    return this.navigateWithoutHistory(previousPath);
  }

  /**
   * 前进到下一步
   */
  async goNext(): Promise<boolean> {
    if (!this.currentRoute?.meta?.stepIndex) {
      console.warn('当前路由不是安装步骤');
      return false;
    }

    const nextStepIndex = this.currentRoute.meta.stepIndex + 1;
    const nextRoute = this.findRouteByStepIndex(nextStepIndex);

    if (!nextRoute) {
      console.warn('没有下一个安装步骤');
      return false;
    }

    return this.navigate(nextRoute.path);
  }

  /**
   * 跳过当前步骤
   */
  async skipCurrent(): Promise<boolean> {
    if (!this.currentRoute?.meta?.canSkip) {
      console.warn('当前步骤不能跳过');
      return false;
    }

    return this.goNext();
  }

  /**
   * 渲染视图
   */
  private async renderView(route: RouteConfig, params?: RouteParams): Promise<void> {
    const container = document.getElementById('route-container');
    if (!container) {
      throw new Error('路由容器不存在');
    }

    // 显示加载状态
    container.innerHTML = '<div class="route-loading">加载中...</div>';

    try {
      // 动态导入视图组件
      const viewContent = await this.loadViewComponent(route.component, params);

      // 渲染视图内容
      container.innerHTML = viewContent;

      // 绑定视图事件
      await this.bindViewEvents(route);

      console.log(`视图渲染完成: ${route.component}`);

    } catch (error) {
      console.error(`视图渲染失败: ${route.component}`, error);

      // 渲染错误视图
      container.innerHTML = `
        <div class="route-error">
          <h3>页面加载失败</h3>
          <p>${error instanceof Error ? error.message : String(error)}</p>
          <button onclick="router.navigate('${route.path}')">重试</button>
        </div>
      `;
    }
  }

  /**
   * 加载视图组件
   */
  private async loadViewComponent(componentName: string, params?: RouteParams): Promise<string> {
    // 根据组件名称生成视图内容
    switch (componentName) {
      case 'WelcomeView':
        return this.generateWelcomeView(params);
      case 'PrerequisitesView':
        return this.generatePrerequisitesView(params);
      case 'NetworkCheckView':
        return this.generateNetworkCheckView(params);
      case 'NodeJsSetupView':
        return this.generateNodeJsSetupView(params);
      case 'GoogleSetupView':
        return this.generateGoogleSetupView(params);
      case 'ClaudeInstallView':
        return this.generateClaudeInstallView(params);
      case 'ApiConfigView':
        return this.generateApiConfigView(params);
      case 'CompletionView':
        return this.generateCompletionView(params);
      default:
        throw new Error(`未知的视图组件: ${componentName}`);
    }
  }

  /**
   * 生成欢迎视图
   */
  private generateWelcomeView(params?: RouteParams): string {
    return `
      <div class="welcome-view step-view">
        <div class="step-header">
          <h2>欢迎使用Claude CLI安装程序</h2>
          <p>本程序将帮助您安装和配置Claude CLI工具</p>
        </div>

        <div class="step-content">
          <div class="welcome-features">
            <div class="feature-item">
              <div class="feature-icon">🚀</div>
              <h3>自动化安装</h3>
              <p>自动检测系统环境，一键完成安装配置</p>
            </div>
            <div class="feature-item">
              <div class="feature-icon">🌍</div>
              <h3>网络优化</h3>
              <p>针对中国网络环境进行优化，提供最佳访问体验</p>
            </div>
            <div class="feature-item">
              <div class="feature-icon">⚡</div>
              <h3>快速配置</h3>
              <p>智能配置镜像源和代理，加速下载安装过程</p>
            </div>
          </div>

          <div class="system-info">
            <h4>系统信息</h4>
            <div class="info-grid">
              <div>操作系统: <span id="os-info">检测中...</span></div>
              <div>架构: <span id="arch-info">检测中...</span></div>
              <div>Node.js: <span id="node-info">检测中...</span></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 生成其他视图的占位符实现
   */
  private generatePrerequisitesView(params?: RouteParams): string {
    return '<div class="prerequisites-view step-view"><h2>系统前置条件检查</h2><p>检查中...</p></div>';
  }

  private generateNetworkCheckView(params?: RouteParams): string {
    return '<div class="network-check-view step-view"><h2>网络环境检测</h2><p>检测中...</p></div>';
  }

  private generateNodeJsSetupView(params?: RouteParams): string {
    return '<div class="nodejs-setup-view step-view"><h2>Node.js环境配置</h2><p>配置中...</p></div>';
  }

  private generateGoogleSetupView(params?: RouteParams): string {
    return '<div class="google-setup-view step-view"><h2>Google服务配置</h2><p>可选步骤</p></div>';
  }

  private generateClaudeInstallView(params?: RouteParams): string {
    return '<div class="claude-install-view step-view"><h2>Claude CLI安装</h2><p>安装中...</p></div>';
  }

  private generateApiConfigView(params?: RouteParams): string {
    return '<div class="api-config-view step-view"><h2>API配置</h2><p>可选配置</p></div>';
  }

  private generateCompletionView(params?: RouteParams): string {
    return '<div class="completion-view step-view"><h2>安装完成</h2><p>恭喜！Claude CLI已成功安装</p></div>';
  }

  /**
   * 绑定视图事件
   */
  private async bindViewEvents(route: RouteConfig): Promise<void> {
    // 根据路由绑定特定事件
    console.log(`绑定视图事件: ${route.component}`);

    // 更新系统信息（如果是欢迎页面）
    if (route.component === 'WelcomeView') {
      await this.updateSystemInfo();
    }
  }

  /**
   * 更新系统信息
   */
  private async updateSystemInfo(): Promise<void> {
    try {
      if (window.electronAPI) {
        // 获取系统信息
        const systemInfo = await window.electronAPI.invoke('system:get-info');

        const osInfo = document.getElementById('os-info');
        const archInfo = document.getElementById('arch-info');
        const nodeInfo = document.getElementById('node-info');

        if (osInfo) osInfo.textContent = systemInfo.os || '未知';
        if (archInfo) archInfo.textContent = systemInfo.arch || '未知';
        if (nodeInfo) nodeInfo.textContent = systemInfo.node || '未安装';
      }
    } catch (error) {
      console.warn('获取系统信息失败:', error);
    }
  }

  /**
   * 检查导航权限
   */
  private async checkNavigationPermission(route: RouteConfig): Promise<boolean> {
    // 检查是否需要完成前置步骤
    if (route.meta?.stepIndex && route.meta.stepIndex > 0) {
      // 可以在这里添加前置步骤完成检查逻辑
    }

    return true;
  }

  /**
   * 导航前钩子
   */
  private async beforeNavigate(route: RouteConfig, params?: RouteParams): Promise<void> {
    console.log(`导航前钩子: ${route.path}`);

    // 通知主进程导航开始
    if (window.electronAPI) {
      window.electronAPI.invoke('navigation:before', {
        path: route.path,
        route: route,
        params: params
      }).catch(console.warn);
    }
  }

  /**
   * 导航后钩子
   */
  private async afterNavigate(route: RouteConfig, params?: RouteParams): Promise<void> {
    console.log(`导航后钩子: ${route.path}`);

    // 通知主进程导航完成
    if (window.electronAPI) {
      window.electronAPI.invoke('navigation:after', {
        path: route.path,
        route: route,
        params: params
      }).catch(console.warn);
    }
  }

  /**
   * 更新页面标题
   */
  private updatePageTitle(route: RouteConfig): void {
    document.title = `${route.title} - Claude CLI 安装程序`;
  }

  /**
   * 更新导航状态
   */
  private async updateNavigationState(): Promise<void> {
    if (!this.currentRoute) return;

    const totalSteps = Array.from(this.routes.values()).filter(r => r.meta?.stepIndex !== undefined).length;
    const currentIndex = this.currentRoute.meta?.stepIndex || 0;

    const navigationState: NavigationState = {
      currentPath: this.currentRoute.path,
      currentIndex,
      canGoBack: this.routeHistory.length > 1,
      canGoNext: currentIndex < totalSteps - 1,
      totalSteps,
      progressPercentage: Math.round((currentIndex / Math.max(totalSteps - 1, 1)) * 100)
    };

    // 更新导航控件
    this.updateNavigationControls(navigationState);

    // 触发状态变化事件
    this.emit('navigation-state-changed', navigationState);
  }

  /**
   * 更新导航控件
   */
  private updateNavigationControls(state: NavigationState): void {
    const container = document.getElementById('navigation-controls');
    if (!container) return;

    const controlsHTML = `
      <div class="navigation-buttons">
        <button
          class="nav-button nav-back"
          ${!state.canGoBack ? 'disabled' : ''}
          onclick="router.goBack()"
        >
          ← 上一步
        </button>

        <div class="nav-progress">
          <span class="step-indicator">${state.currentIndex + 1} / ${state.totalSteps}</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${state.progressPercentage}%"></div>
          </div>
        </div>

        <button
          class="nav-button nav-next"
          ${!state.canGoNext ? 'disabled' : ''}
          onclick="router.goNext()"
        >
          下一步 →
        </button>
      </div>
    `;

    container.innerHTML = controlsHTML;
  }

  /**
   * 不添加历史记录的导航
   */
  private async navigateWithoutHistory(path: string): Promise<boolean> {
    const originalHistory = [...this.routeHistory];
    const result = await this.navigate(path);

    if (result) {
      // 恢复历史记录（移除navigate添加的记录）
      this.routeHistory = originalHistory;
    }

    return result;
  }

  /**
   * 更新历史记录
   */
  private updateHistory(path: string): void {
    this.routeHistory.push(path);

    // 限制历史记录大小
    if (this.routeHistory.length > this.maxHistorySize) {
      this.routeHistory = this.routeHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * 根据步骤索引查找路由
   */
  private findRouteByStepIndex(stepIndex: number): RouteConfig | null {
    for (const route of this.routes.values()) {
      if (route.meta?.stepIndex === stepIndex) {
        return route;
      }
    }
    return null;
  }

  /**
   * 设置浏览器历史监听
   */
  private setupHistoryListener(): void {
    // 在Electron环境中，通常不需要处理浏览器历史
    // 但可以在这里添加自定义历史管理逻辑
  }

  /**
   * 设置键盘导航
   */
  private setupKeyboardNavigation(): void {
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault();
            this.goBack();
            break;
          case 'ArrowRight':
            event.preventDefault();
            this.goNext();
            break;
        }
      }
    });
  }

  /**
   * 获取当前路由
   */
  getCurrentRoute(): RouteConfig | null {
    return this.currentRoute;
  }

  /**
   * 获取所有路由
   */
  getAllRoutes(): RouteConfig[] {
    return Array.from(this.routes.values());
  }

  /**
   * 销毁路由器
   */
  destroy(): void {
    this.removeAllListeners();
    this.routes.clear();
    this.currentRoute = null;
    this.routeHistory = [];
    this.isInitialized = false;
    console.log('路由器已销毁');
  }
}

/**
 * 全局路由器实例
 */
export const router = new Router();

// 将路由器挂载到全局，便于模板中调用
(window as any).router = router;

/**
 * 导出类型定义
 */
export type { RouteConfig, NavigationState, RouteParams };