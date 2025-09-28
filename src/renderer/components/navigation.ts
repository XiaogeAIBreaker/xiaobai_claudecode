/**
 * 统一导航组件
 * 负责安装步骤的导航控制，移除重复的继续安装按钮
 */

/// <reference path="../types/global.d.ts" />

import { EventEmitter } from 'events';

/**
 * 导航组件配置接口
 */
interface NavigationConfig {
  showProgress: boolean;
  showStepInfo: boolean;
  enableKeyboardNavigation: boolean;
  autoAdvance: boolean;
  confirmNavigation: boolean;
}

/**
 * 导航动作接口
 */
interface NavigationAction {
  type: 'previous' | 'next' | 'skip' | 'retry' | 'cancel';
  stepId: string;
  data?: any;
}

/**
 * 导航状态接口
 */
interface NavigationState {
  currentStepIndex: number;
  canGoBack: boolean;
  canGoNext: boolean;
  canSkip: boolean;
  canRetry: boolean;
  totalSteps: number;
  progressPercentage: number;
  isNavigating: boolean;
  errorMessage?: string;
}

/**
 * 统一导航组件类
 */
class NavigationComponent extends EventEmitter {
  private container: HTMLElement | null = null;
  private config: NavigationConfig = {
    showProgress: true,
    showStepInfo: true,
    enableKeyboardNavigation: true,
    autoAdvance: false,
    confirmNavigation: false
  };

  private state: NavigationState = {
    currentStepIndex: 0,
    canGoBack: false,
    canGoNext: true,
    canSkip: false,
    canRetry: false,
    totalSteps: 8,
    progressPercentage: 0,
    isNavigating: false
  };

  private isInitialized = false;

  /**
   * 初始化导航组件
   */
  async initialize(containerId: string, config?: Partial<NavigationConfig>): Promise<void> {
    if (this.isInitialized) {
      console.warn('导航组件已经初始化');
      return;
    }

    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`导航容器 #${containerId} 未找到`);
    }

    // 合并配置
    this.config = { ...this.config, ...config };

    // 设置键盘导航
    if (this.config.enableKeyboardNavigation) {
      this.setupKeyboardNavigation();
    }

    // 监听路由器导航状态变化
    if ((window as any).router) {
      (window as any).router.on('navigation-state-changed', (navState: any) => {
        this.updateNavigationState(navState);
      });
    }

    // 渲染导航控件
    this.render();

    this.isInitialized = true;
    console.log('统一导航组件初始化完成');
  }

  /**
   * 更新导航状态
   */
  updateNavigationState(newState: Partial<NavigationState>): void {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...newState };

    // 检查状态变化
    if (this.hasStateChanged(prevState, this.state)) {
      this.render();
      this.emit('state-changed', this.state);
    }
  }

  /**
   * 执行导航动作
   */
  async executeAction(action: NavigationAction): Promise<boolean> {
    if (this.state.isNavigating) {
      console.warn('正在导航中，请稍候');
      return false;
    }

    try {
      this.setState({ isNavigating: true, errorMessage: undefined });

      // 验证动作是否允许
      if (!this.validateAction(action)) {
        throw new Error(`当前状态不允许执行 ${action.type} 操作`);
      }

      // 确认导航（如果启用）
      if (this.config.confirmNavigation && action.type !== 'cancel') {
        const confirmed = await this.confirmNavigation(action);
        if (!confirmed) {
          return false;
        }
      }

      // 执行具体动作
      const result = await this.performAction(action);

      if (result) {
        this.emit('action-executed', action);
        console.log(`导航动作执行成功: ${action.type}`);
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.setState({ errorMessage });
      this.emit('action-failed', action, errorMessage);
      console.error(`导航动作执行失败: ${action.type}`, error);
      return false;

    } finally {
      this.setState({ isNavigating: false });
    }
  }

  /**
   * 渲染导航控件
   */
  private render(): void {
    if (!this.container) return;

    const html = this.generateHTML();
    this.container.innerHTML = html;

    // 绑定事件
    this.bindEvents();
  }

  /**
   * 生成导航HTML
   */
  private generateHTML(): string {
    const { state, config } = this;

    return `
      <div class="navigation-component">
        ${config.showProgress ? this.generateProgressHTML() : ''}

        <div class="navigation-controls">
          <div class="navigation-buttons">
            ${this.generateBackButtonHTML()}
            ${this.generateSkipButtonHTML()}
            ${this.generateRetryButtonHTML()}
            ${this.generateNextButtonHTML()}
            ${this.generateCancelButtonHTML()}
          </div>
        </div>

        ${state.errorMessage ? this.generateErrorHTML() : ''}
        ${state.isNavigating ? this.generateLoadingHTML() : ''}
      </div>
    `;
  }

  /**
   * 生成进度条HTML
   */
  private generateProgressHTML(): string {
    const { state, config } = this;

    return `
      <div class="navigation-progress">
        ${config.showStepInfo ? `
          <div class="step-info">
            <span class="step-current">${state.currentStepIndex + 1}</span>
            <span class="step-separator">/</span>
            <span class="step-total">${state.totalSteps}</span>
          </div>
        ` : ''}

        <div class="progress-bar">
          <div class="progress-track">
            <div
              class="progress-fill"
              style="width: ${state.progressPercentage}%"
            ></div>
          </div>
          <div class="progress-text">${Math.round(state.progressPercentage)}%</div>
        </div>
      </div>
    `;
  }

  /**
   * 生成返回按钮HTML
   */
  private generateBackButtonHTML(): string {
    const { state } = this;
    const disabled = !state.canGoBack || state.isNavigating;

    return `
      <button
        class="nav-button nav-button-back ${disabled ? 'disabled' : ''}"
        data-action="previous"
        ${disabled ? 'disabled' : ''}
        title="返回上一步"
      >
        <span class="button-icon">←</span>
        <span class="button-text">上一步</span>
      </button>
    `;
  }

  /**
   * 生成跳过按钮HTML
   */
  private generateSkipButtonHTML(): string {
    const { state } = this;

    if (!state.canSkip) return '';

    const disabled = state.isNavigating;

    return `
      <button
        class="nav-button nav-button-skip ${disabled ? 'disabled' : ''}"
        data-action="skip"
        ${disabled ? 'disabled' : ''}
        title="跳过当前步骤"
      >
        <span class="button-text">跳过</span>
      </button>
    `;
  }

  /**
   * 生成重试按钮HTML
   */
  private generateRetryButtonHTML(): string {
    const { state } = this;

    if (!state.canRetry) return '';

    const disabled = state.isNavigating;

    return `
      <button
        class="nav-button nav-button-retry ${disabled ? 'disabled' : ''}"
        data-action="retry"
        ${disabled ? 'disabled' : ''}
        title="重试当前步骤"
      >
        <span class="button-icon">↻</span>
        <span class="button-text">重试</span>
      </button>
    `;
  }

  /**
   * 生成下一步按钮HTML
   */
  private generateNextButtonHTML(): string {
    const { state } = this;
    const disabled = !state.canGoNext || state.isNavigating;
    const isLastStep = state.currentStepIndex >= state.totalSteps - 1;

    return `
      <button
        class="nav-button nav-button-next primary ${disabled ? 'disabled' : ''}"
        data-action="next"
        ${disabled ? 'disabled' : ''}
        title="${isLastStep ? '完成安装' : '继续下一步'}"
      >
        <span class="button-text">${isLastStep ? '完成' : '下一步'}</span>
        <span class="button-icon">→</span>
      </button>
    `;
  }

  /**
   * 生成取消按钮HTML
   */
  private generateCancelButtonHTML(): string {
    const { state } = this;

    return `
      <button
        class="nav-button nav-button-cancel secondary"
        data-action="cancel"
        title="取消安装"
      >
        <span class="button-text">取消</span>
      </button>
    `;
  }

  /**
   * 生成错误信息HTML
   */
  private generateErrorHTML(): string {
    const { state } = this;

    return `
      <div class="navigation-error">
        <div class="error-icon">⚠️</div>
        <div class="error-message">${state.errorMessage}</div>
        <button class="error-dismiss" onclick="this.parentElement.remove()">×</button>
      </div>
    `;
  }

  /**
   * 生成加载状态HTML
   */
  private generateLoadingHTML(): string {
    return `
      <div class="navigation-loading">
        <div class="loading-spinner"></div>
        <div class="loading-text">正在处理...</div>
      </div>
    `;
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.container) return;

    // 绑定按钮点击事件
    const buttons = this.container.querySelectorAll('.nav-button');
    buttons.forEach(button => {
      button.addEventListener('click', this.handleButtonClick.bind(this));
    });
  }

  /**
   * 处理按钮点击
   */
  private async handleButtonClick(event: Event): Promise<void> {
    const button = event.target as HTMLElement;
    const actionType = button.getAttribute('data-action');

    if (!actionType || button.hasAttribute('disabled')) {
      return;
    }

    const action: NavigationAction = {
      type: actionType as any,
      stepId: this.getCurrentStepId()
    };

    await this.executeAction(action);
  }

  /**
   * 设置键盘导航
   */
  private setupKeyboardNavigation(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  /**
   * 处理键盘事件
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // 只在没有焦点在输入框时处理快捷键
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement) {
      return;
    }

    const { state } = this;

    switch (event.key) {
      case 'ArrowLeft':
        if (state.canGoBack && !state.isNavigating) {
          event.preventDefault();
          this.executeAction({ type: 'previous', stepId: this.getCurrentStepId() });
        }
        break;

      case 'ArrowRight':
        if (state.canGoNext && !state.isNavigating) {
          event.preventDefault();
          this.executeAction({ type: 'next', stepId: this.getCurrentStepId() });
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.executeAction({ type: 'cancel', stepId: this.getCurrentStepId() });
        break;

      case 'F5':
        if (state.canRetry && !state.isNavigating) {
          event.preventDefault();
          this.executeAction({ type: 'retry', stepId: this.getCurrentStepId() });
        }
        break;
    }
  }

  /**
   * 执行具体导航动作
   */
  private async performAction(action: NavigationAction): Promise<boolean> {
    try {
      switch (action.type) {
        case 'previous':
          return this.goBack();

        case 'next':
          return this.goNext();

        case 'skip':
          return this.skipStep();

        case 'retry':
          return this.retryStep();

        case 'cancel':
          return this.cancelInstallation();

        default:
          throw new Error(`未知的导航动作: ${action.type}`);
      }
    } catch (error) {
      console.error('执行导航动作失败:', error);
      return false;
    }
  }

  /**
   * 返回上一步
   */
  private async goBack(): Promise<boolean> {
    if ((window as any).router) {
      return (window as any).router.goBack();
    }
    return false;
  }

  /**
   * 前进下一步
   */
  private async goNext(): Promise<boolean> {
    if ((window as any).router) {
      return (window as any).router.goNext();
    }
    return false;
  }

  /**
   * 跳过当前步骤
   */
  private async skipStep(): Promise<boolean> {
    if ((window as any).router) {
      return (window as any).router.skipCurrent();
    }
    return false;
  }

  /**
   * 重试当前步骤
   */
  private async retryStep(): Promise<boolean> {
    // 通知当前步骤重试
    this.emit('step-retry', this.getCurrentStepId());
    return true;
  }

  /**
   * 取消安装
   */
  private async cancelInstallation(): Promise<boolean> {
    const confirmed = await this.showConfirmDialog(
      '确认取消安装？',
      '取消安装将关闭程序，已完成的步骤不会丢失。'
    );

    if (confirmed) {
      this.emit('installation-cancelled');
      if (window.electronAPI) {
        window.electronAPI.invoke('app:quit');
      }
      return true;
    }

    return false;
  }

  /**
   * 验证动作是否允许
   */
  private validateAction(action: NavigationAction): boolean {
    const { state } = this;

    switch (action.type) {
      case 'previous':
        return state.canGoBack;

      case 'next':
        return state.canGoNext;

      case 'skip':
        return state.canSkip;

      case 'retry':
        return state.canRetry;

      case 'cancel':
        return true; // 总是允许取消

      default:
        return false;
    }
  }

  /**
   * 确认导航操作
   */
  private async confirmNavigation(action: NavigationAction): Promise<boolean> {
    const messages = {
      previous: '确定要返回上一步吗？当前步骤的进度可能会丢失。',
      next: '确定要继续下一步吗？',
      skip: '确定要跳过当前步骤吗？',
      retry: '确定要重试当前步骤吗？',
      cancel: '确定要取消安装吗？'
    };

    const message = messages[action.type];
    return this.showConfirmDialog('确认操作', message);
  }

  /**
   * 显示确认对话框
   */
  private async showConfirmDialog(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      // 使用系统原生对话框或自定义模态框
      const confirmed = confirm(`${title}\n\n${message}`);
      resolve(confirmed);
    });
  }

  /**
   * 检查状态是否改变
   */
  private hasStateChanged(prevState: NavigationState, newState: NavigationState): boolean {
    const keys: (keyof NavigationState)[] = [
      'currentStepIndex', 'canGoBack', 'canGoNext', 'canSkip', 'canRetry',
      'progressPercentage', 'isNavigating', 'errorMessage'
    ];

    return keys.some(key => prevState[key] !== newState[key]);
  }

  /**
   * 设置状态
   */
  private setState(newState: Partial<NavigationState>): void {
    this.updateNavigationState(newState);
  }

  /**
   * 获取当前步骤ID
   */
  private getCurrentStepId(): string {
    if ((window as any).router) {
      const currentRoute = (window as any).router.getCurrentRoute();
      return currentRoute?.name || 'unknown';
    }
    return 'unknown';
  }

  /**
   * 获取当前状态
   */
  getState(): Readonly<NavigationState> {
    return { ...this.state };
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    this.removeAllListeners();

    if (this.container) {
      this.container.innerHTML = '';
    }

    this.isInitialized = false;
    console.log('统一导航组件已销毁');
  }
}

/**
 * 全局导航组件实例
 */
export const navigationComponent = new NavigationComponent();

/**
 * 导出类型定义
 */
export type { NavigationConfig, NavigationAction, NavigationState };