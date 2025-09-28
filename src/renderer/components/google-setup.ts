/**
 * Google设置步骤组件
 * 重构为邮箱登录引导，简化用户操作流程
 */

/// <reference path="../types/global.d.ts" />

import { EventEmitter } from 'events';

/**
 * Google设置配置接口
 */
interface GoogleSetupConfig {
  allowSkip: boolean;
  showDetails: boolean;
  autoDetectBrowser: boolean;
  recommendedBrowsers: string[];
}

/**
 * 邮箱提供商信息接口
 */
interface EmailProvider {
  id: string;
  name: string;
  domain: string;
  loginUrl: string;
  icon: string;
  description: string;
  setupSteps: string[];
}

/**
 * 设置状态接口
 */
interface SetupStatus {
  currentStep: number;
  totalSteps: number;
  selectedProvider?: EmailProvider;
  isCompleted: boolean;
  userChoice: 'configure' | 'skip' | 'pending';
}

/**
 * Google设置组件类
 */
class GoogleSetupComponent extends EventEmitter {
  private container: HTMLElement | null = null;
  private config: GoogleSetupConfig = {
    allowSkip: true,
    showDetails: false,
    autoDetectBrowser: true,
    recommendedBrowsers: ['Chrome', 'Edge', 'Firefox', 'Safari']
  };

  private emailProviders: EmailProvider[] = [];
  private status: SetupStatus = {
    currentStep: 1,
    totalSteps: 3,
    isCompleted: false,
    userChoice: 'pending'
  };

  private isInitialized = false;

  /**
   * 初始化Google设置组件
   */
  async initialize(containerId: string, config?: Partial<GoogleSetupConfig>): Promise<void> {
    if (this.isInitialized) {
      console.warn('Google设置组件已经初始化');
      return;
    }

    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`容器 #${containerId} 未找到`);
    }

    // 合并配置
    this.config = { ...this.config, ...config };

    // 初始化邮箱提供商
    this.initializeEmailProviders();

    // 渲染初始界面
    this.render();

    this.isInitialized = true;
    console.log('Google设置组件初始化完成');
  }

  /**
   * 初始化邮箱提供商
   */
  private initializeEmailProviders(): void {
    this.emailProviders = [
      {
        id: 'gmail',
        name: 'Gmail',
        domain: 'gmail.com',
        loginUrl: 'https://accounts.google.com/signin',
        icon: '📧',
        description: 'Google邮箱，Claude官方推荐',
        setupSteps: [
          '打开Gmail登录页面',
          '使用您的Google账号登录',
          '确保账号已激活Claude服务'
        ]
      },
      {
        id: 'outlook',
        name: 'Outlook',
        domain: 'outlook.com',
        loginUrl: 'https://outlook.live.com/owa',
        icon: '📮',
        description: 'Microsoft邮箱服务',
        setupSteps: [
          '打开Outlook登录页面',
          '使用您的Microsoft账号登录',
          '如需要，可创建新邮箱账号'
        ]
      },
      {
        id: 'yahoo',
        name: 'Yahoo Mail',
        domain: 'yahoo.com',
        loginUrl: 'https://login.yahoo.com',
        icon: '📫',
        description: 'Yahoo邮箱服务',
        setupSteps: [
          '打开Yahoo登录页面',
          '使用您的Yahoo账号登录',
          '如需要，可创建新邮箱账号'
        ]
      },
      {
        id: 'other',
        name: '其他邮箱',
        domain: '',
        loginUrl: '',
        icon: '✉️',
        description: '使用其他邮箱提供商',
        setupSteps: [
          '访问您的邮箱提供商网站',
          '登录您的邮箱账号',
          '确保邮箱可以正常收发邮件'
        ]
      }
    ];
  }

  /**
   * 选择邮箱提供商
   */
  selectProvider(providerId: string): void {
    const provider = this.emailProviders.find(p => p.id === providerId);
    if (!provider) return;

    this.status.selectedProvider = provider;
    this.status.currentStep = 2;
    this.render();

    this.emit('provider-selected', provider);
  }

  /**
   * 打开邮箱登录页面
   */
  async openEmailLogin(): Promise<void> {
    const provider = this.status.selectedProvider;
    if (!provider || !provider.loginUrl) return;

    try {
      // 通知主进程打开外部链接
      if (window.electronAPI) {
        await window.electronAPI.invoke('app:open-external', provider.loginUrl);
      } else {
        // 降级到window.open
        window.open(provider.loginUrl, '_blank');
      }

      this.status.currentStep = 3;
      this.render();

      this.emit('login-opened', provider);

    } catch (error) {
      console.error('打开邮箱登录页面失败:', error);
    }
  }

  /**
   * 确认设置完成
   */
  confirmSetupCompleted(): void {
    this.status.isCompleted = true;
    this.status.userChoice = 'configure';
    this.emit('setup-completed', this.status.selectedProvider);
    this.render();
  }

  /**
   * 跳过Google设置
   */
  skipSetup(): void {
    this.status.userChoice = 'skip';
    this.status.isCompleted = true;
    this.emit('setup-skipped');
    this.render();
  }

  /**
   * 重新开始设置
   */
  restartSetup(): void {
    this.status = {
      currentStep: 1,
      totalSteps: 3,
      isCompleted: false,
      userChoice: 'pending'
    };
    this.render();
  }

  /**
   * 渲染组件
   */
  private render(): void {
    if (!this.container) return;

    const html = this.generateHTML();
    this.container.innerHTML = html;

    // 绑定事件
    this.bindEvents();
  }

  /**
   * 生成HTML
   */
  private generateHTML(): string {
    return `
      <div class="google-setup-component">
        ${this.generateHeaderHTML()}
        ${this.generateProgressHTML()}
        ${this.generateContentHTML()}
        ${this.generateActionsHTML()}
      </div>
    `;
  }

  /**
   * 生成头部HTML
   */
  private generateHeaderHTML(): string {
    return `
      <div class="setup-header">
        <h3 class="setup-title">
          <span class="setup-icon">📧</span>
          邮箱登录引导
        </h3>
        <p class="setup-description">
          配置邮箱登录以便接收Claude服务通知（可选步骤）
        </p>
        ${this.config.allowSkip ? `
          <div class="setup-notice">
            💡 这是可选步骤，您可以稍后在设置中配置
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 生成进度HTML
   */
  private generateProgressHTML(): string {
    if (this.status.isCompleted) return '';

    const { currentStep, totalSteps } = this.status;

    return `
      <div class="setup-progress">
        <div class="progress-steps">
          ${Array.from({ length: totalSteps }, (_, i) => {
            const stepNumber = i + 1;
            const isActive = stepNumber === currentStep;
            const isCompleted = stepNumber < currentStep;

            return `
              <div class="progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}">
                <div class="step-number">${stepNumber}</div>
                <div class="step-label">${this.getStepLabel(stepNumber)}</div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${(currentStep - 1) / (totalSteps - 1) * 100}%"></div>
        </div>
      </div>
    `;
  }

  /**
   * 生成内容HTML
   */
  private generateContentHTML(): string {
    const { currentStep, isCompleted, userChoice } = this.status;

    if (isCompleted) {
      return this.generateCompletedHTML();
    }

    switch (currentStep) {
      case 1:
        return this.generateProviderSelectionHTML();
      case 2:
        return this.generateLoginInstructionsHTML();
      case 3:
        return this.generateConfirmationHTML();
      default:
        return '';
    }
  }

  /**
   * 生成邮箱提供商选择HTML
   */
  private generateProviderSelectionHTML(): string {
    return `
      <div class="provider-selection">
        <h4 class="selection-title">选择您的邮箱提供商</h4>
        <div class="provider-grid">
          ${this.emailProviders.map(provider => `
            <div class="provider-card" data-provider="${provider.id}">
              <div class="provider-icon">${provider.icon}</div>
              <div class="provider-info">
                <div class="provider-name">${provider.name}</div>
                <div class="provider-domain">${provider.domain || '自定义'}</div>
                <div class="provider-description">${provider.description}</div>
              </div>
              ${provider.id === 'gmail' ? '<div class="provider-badge">推荐</div>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * 生成登录指引HTML
   */
  private generateLoginInstructionsHTML(): string {
    const provider = this.status.selectedProvider;
    if (!provider) return '';

    return `
      <div class="login-instructions">
        <div class="selected-provider">
          <div class="provider-header">
            <span class="provider-icon">${provider.icon}</span>
            <span class="provider-name">${provider.name}</span>
          </div>
        </div>

        <div class="instruction-steps">
          <h4>登录步骤：</h4>
          <ol class="steps-list">
            ${provider.setupSteps.map(step => `<li>${step}</li>`).join('')}
          </ol>
        </div>

        <div class="login-action">
          <button class="action-button primary open-login-button">
            ${provider.loginUrl ? '打开登录页面' : '手动访问邮箱'}
          </button>
        </div>

        ${this.config.showDetails ? `
          <div class="additional-info">
            <h5>为什么需要邮箱？</h5>
            <ul>
              <li>接收Claude服务的重要通知</li>
              <li>账号安全验证</li>
              <li>重要更新和功能提醒</li>
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 生成确认HTML
   */
  private generateConfirmationHTML(): string {
    const provider = this.status.selectedProvider;
    if (!provider) return '';

    return `
      <div class="setup-confirmation">
        <div class="confirmation-header">
          <div class="confirmation-icon">✅</div>
          <h4>请确认邮箱登录状态</h4>
        </div>

        <div class="confirmation-content">
          <p>请确认您已经成功登录到 <strong>${provider.name}</strong> 邮箱</p>

          <div class="checklist">
            <label class="checklist-item">
              <input type="checkbox" class="confirmation-checkbox">
              我已成功登录邮箱
            </label>
            <label class="checklist-item">
              <input type="checkbox" class="confirmation-checkbox">
              邮箱可以正常收发邮件
            </label>
          </div>
        </div>

        <div class="confirmation-actions">
          <button class="action-button primary confirm-button" disabled>
            确认完成
          </button>
          <button class="action-button secondary back-button">
            返回重新选择
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 生成完成状态HTML
   */
  private generateCompletedHTML(): string {
    const { userChoice, selectedProvider } = this.status;

    if (userChoice === 'skip') {
      return `
        <div class="setup-completed skipped">
          <div class="completed-icon">⏭️</div>
          <h4>已跳过邮箱设置</h4>
          <p>您可以稍后在设置中配置邮箱</p>
          <button class="action-button secondary restart-button">重新设置</button>
        </div>
      `;
    }

    return `
      <div class="setup-completed success">
        <div class="completed-icon">🎉</div>
        <h4>邮箱设置完成</h4>
        <p>您已成功配置 ${selectedProvider?.name} 邮箱</p>
        <div class="completed-info">
          <div class="info-item">
            <span class="info-label">邮箱提供商:</span>
            <span class="info-value">${selectedProvider?.name}</span>
          </div>
        </div>
        <button class="action-button secondary restart-button">重新设置</button>
      </div>
    `;
  }

  /**
   * 生成操作按钮HTML
   */
  private generateActionsHTML(): string {
    if (this.status.isCompleted) return '';

    return `
      <div class="setup-actions">
        ${this.config.allowSkip ? `
          <button class="action-button secondary skip-button">
            跳过此步骤
          </button>
        ` : ''}

        <button class="action-button details-toggle">
          ${this.config.showDetails ? '隐藏详情' : '显示详情'}
        </button>
      </div>
    `;
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.container) return;

    // 邮箱提供商选择
    const providerCards = this.container.querySelectorAll('.provider-card');
    providerCards.forEach(card => {
      card.addEventListener('click', () => {
        const providerId = card.getAttribute('data-provider');
        if (providerId) this.selectProvider(providerId);
      });
    });

    // 打开登录页面
    const openLoginButton = this.container.querySelector('.open-login-button');
    openLoginButton?.addEventListener('click', () => this.openEmailLogin());

    // 确认完成
    const confirmButton = this.container.querySelector('.confirm-button');
    confirmButton?.addEventListener('click', () => this.confirmSetupCompleted());

    // 返回按钮
    const backButton = this.container.querySelector('.back-button');
    backButton?.addEventListener('click', () => {
      this.status.currentStep = 1;
      this.status.selectedProvider = undefined;
      this.render();
    });

    // 跳过按钮
    const skipButton = this.container.querySelector('.skip-button');
    skipButton?.addEventListener('click', () => this.skipSetup());

    // 重新设置按钮
    const restartButton = this.container.querySelector('.restart-button');
    restartButton?.addEventListener('click', () => this.restartSetup());

    // 详情切换
    const detailsToggle = this.container.querySelector('.details-toggle');
    detailsToggle?.addEventListener('click', () => {
      this.config.showDetails = !this.config.showDetails;
      this.render();
    });

    // 确认复选框
    const checkboxes = this.container.querySelectorAll('.confirmation-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => this.updateConfirmButton());
    });
  }

  /**
   * 更新确认按钮状态
   */
  private updateConfirmButton(): void {
    const checkboxes = this.container?.querySelectorAll('.confirmation-checkbox') as NodeListOf<HTMLInputElement>;
    const confirmButton = this.container?.querySelector('.confirm-button') as HTMLButtonElement;

    if (!checkboxes || !confirmButton) return;

    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    confirmButton.disabled = !allChecked;
  }

  /**
   * 获取步骤标签
   */
  private getStepLabel(stepNumber: number): string {
    const labels = {
      1: '选择邮箱',
      2: '登录邮箱',
      3: '确认完成'
    };
    return labels[stepNumber as keyof typeof labels] || `步骤${stepNumber}`;
  }

  /**
   * 获取设置状态
   */
  getStatus(): Readonly<SetupStatus> {
    return { ...this.status };
  }

  /**
   * 获取选中的邮箱提供商
   */
  getSelectedProvider(): EmailProvider | undefined {
    return this.status.selectedProvider;
  }

  /**
   * 检查是否已完成设置
   */
  isSetupCompleted(): boolean {
    return this.status.isCompleted;
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
    console.log('Google设置组件已销毁');
  }
}

/**
 * 全局Google设置组件实例
 */
export const googleSetupComponent = new GoogleSetupComponent();

/**
 * 导出类型定义
 */
export type { GoogleSetupConfig, EmailProvider, SetupStatus };