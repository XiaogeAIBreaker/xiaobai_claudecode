/**
 * 错误处理和用户反馈组件
 * 负责统一的错误显示、用户反馈收集和问题解决建议
 */

/// <reference path="../types/global.d.ts" />

import { EventEmitter } from 'events';
import { IdGenerator } from '../../utils/common';

/**
 * 错误处理配置接口
 */
interface ErrorHandlerConfig {
  showStackTrace: boolean;
  enableFeedback: boolean;
  enableAutoRetry: boolean;
  maxRetries: number;
  enableErrorReporting: boolean;
  theme: 'default' | 'minimal' | 'detailed';
}

/**
 * 错误信息接口
 */
interface ErrorInfo {
  id: string;
  type: 'network' | 'permission' | 'validation' | 'system' | 'api' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  details?: string;
  stack?: string;
  timestamp: Date;
  context?: any;
  canRetry: boolean;
  retryCount: number;
  suggestions: string[];
  relatedLinks?: { label: string; url: string }[];
}

/**
 * 用户反馈接口
 */
interface UserFeedback {
  errorId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  description: string;
  contactInfo?: string;
  includeSystemInfo: boolean;
  timestamp: Date;
}

/**
 * 解决方案接口
 */
interface Solution {
  id: string;
  title: string;
  description: string;
  steps: string[];
  complexity: 'easy' | 'medium' | 'hard';
  successRate: number;
  timeEstimate: string;
}

/**
 * 错误处理组件类
 */
class ErrorHandlerComponent extends EventEmitter {
  private container: HTMLElement | null = null;
  private config: ErrorHandlerConfig = {
    showStackTrace: false,
    enableFeedback: true,
    enableAutoRetry: true,
    maxRetries: 3,
    enableErrorReporting: true,
    theme: 'default'
  };

  private errors: Map<string, ErrorInfo> = new Map();
  private currentError: ErrorInfo | null = null;
  private feedbackForm: UserFeedback | null = null;
  private isInitialized = false;

  /**
   * 初始化错误处理组件
   */
  async initialize(containerId: string, config?: Partial<ErrorHandlerConfig>): Promise<void> {
    if (this.isInitialized) {
      console.warn('错误处理组件已经初始化');
      return;
    }

    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`容器 #${containerId} 未找到`);
    }

    // 合并配置
    this.config = { ...this.config, ...config };

    // 监听全局错误边界
    this.setupGlobalErrorHandling();

    // 渲染初始界面
    this.render();

    this.isInitialized = true;
    console.log('错误处理组件初始化完成');
  }

  /**
   * 显示错误
   */
  showError(error: Partial<ErrorInfo>): string {
    const errorInfo: ErrorInfo = {
      id: this.generateId(),
      type: error.type || 'unknown',
      severity: error.severity || 'medium',
      title: error.title || '发生错误',
      message: error.message || '未知错误',
      details: error.details,
      stack: error.stack,
      timestamp: new Date(),
      context: error.context,
      canRetry: error.canRetry ?? true,
      retryCount: 0,
      suggestions: error.suggestions || this.generateSuggestions(error.type || 'unknown'),
      relatedLinks: error.relatedLinks
    };

    this.errors.set(errorInfo.id, errorInfo);
    this.currentError = errorInfo;
    this.render();

    this.emit('error-shown', errorInfo);
    console.error('错误显示:', errorInfo);

    return errorInfo.id;
  }

  /**
   * 隐藏错误
   */
  hideError(errorId?: string): void {
    if (errorId) {
      this.errors.delete(errorId);
      if (this.currentError?.id === errorId) {
        this.currentError = null;
      }
    } else {
      this.currentError = null;
    }

    this.render();
    this.emit('error-hidden', errorId);
  }

  /**
   * 重试操作
   */
  async retryOperation(errorId: string): Promise<void> {
    const error = this.errors.get(errorId);
    if (!error || !error.canRetry) return;

    if (error.retryCount >= this.config.maxRetries) {
      this.showError({
        type: 'system',
        severity: 'high',
        title: '重试失败',
        message: '已达到最大重试次数，请尝试其他解决方案',
        canRetry: false
      });
      return;
    }

    error.retryCount++;
    this.render();

    this.emit('retry-requested', error);

    try {
      // 模拟重试延迟
      await this.delay(1000 * error.retryCount);

      // 触发重试事件，让调用者处理具体重试逻辑
      this.emit('retry-execute', error);

    } catch (retryError) {
      this.showError({
        type: 'system',
        severity: 'high',
        title: '重试失败',
        message: `重试操作失败: ${retryError}`,
        canRetry: true
      });
    }
  }

  /**
   * 收集用户反馈
   */
  collectFeedback(errorId: string): void {
    const error = this.errors.get(errorId);
    if (!error) return;

    this.feedbackForm = {
      errorId,
      rating: 3,
      description: '',
      includeSystemInfo: true,
      timestamp: new Date()
    };

    this.render();
  }

  /**
   * 提交用户反馈
   */
  async submitFeedback(): Promise<void> {
    if (!this.feedbackForm) return;

    try {
      if (this.config.enableErrorReporting && window.electronAPI) {
        await window.electronAPI.invoke('error:report-feedback', {
          feedback: this.feedbackForm,
          error: this.errors.get(this.feedbackForm.errorId)
        });
      }

      this.emit('feedback-submitted', this.feedbackForm);
      this.feedbackForm = null;
      this.render();

      this.showSuccessMessage('感谢您的反馈！这将帮助我们改进产品。');

    } catch (error) {
      console.error('提交反馈失败:', error);
      this.showError({
        type: 'network',
        severity: 'low',
        title: '反馈提交失败',
        message: '无法提交反馈，请稍后重试',
        canRetry: true
      });
    }
  }

  /**
   * 应用解决方案
   */
  async applySolution(solutionId: string, errorId: string): Promise<void> {
    const error = this.errors.get(errorId);
    if (!error) return;

    const solution = this.getSolutionById(solutionId);
    if (!solution) return;

    this.emit('solution-apply-started', solution, error);

    try {
      // 根据解决方案类型执行不同的操作
      await this.executeSolution(solution, error);

      this.showSuccessMessage(`解决方案"${solution.title}"已成功应用`);
      this.hideError(errorId);

    } catch (solutionError) {
      this.showError({
        type: 'system',
        severity: 'medium',
        title: '解决方案执行失败',
        message: `执行解决方案时出错: ${solutionError}`,
        canRetry: true
      });
    }
  }

  /**
   * 设置全局错误处理
   */
  private setupGlobalErrorHandling(): void {
    // 监听错误边界事件
    if ((window as any).errorBoundary) {
      (window as any).errorBoundary.on('error-handled', (errorInfo: any) => {
        this.showError({
          type: this.mapErrorType(errorInfo.type),
          severity: this.mapErrorSeverity(errorInfo),
          title: '应用程序错误',
          message: errorInfo.message,
          stack: errorInfo.stack,
          context: errorInfo.context
        });
      });
    }

    // 监听IPC错误
    if (window.electronAPI) {
      window.electronAPI.on('error', (error: any) => {
        this.showError({
          type: 'system',
          severity: 'high',
          title: '系统错误',
          message: error.message || '系统发生未知错误',
          details: error.details
        });
      });
    }
  }

  /**
   * 生成建议
   */
  private generateSuggestions(errorType: string): string[] {
    const suggestionMap: Record<string, string[]> = {
      network: [
        '检查网络连接是否正常',
        '尝试重启路由器或调制解调器',
        '暂时关闭防火墙或安全软件',
        '使用其他网络连接（如手机热点）'
      ],
      permission: [
        '以管理员身份运行程序',
        '检查文件或目录的访问权限',
        '确保防病毒软件没有阻止程序运行',
        '检查用户账户控制(UAC)设置'
      ],
      validation: [
        '检查输入的数据格式是否正确',
        '确保所有必填字段都已填写',
        '验证API密钥或配置信息的有效性',
        '检查系统时间和时区设置'
      ],
      system: [
        '重启应用程序',
        '清除临时文件和缓存',
        '检查系统资源使用情况',
        '更新操作系统和驱动程序'
      ],
      api: [
        '检查API密钥是否有效',
        '验证网络连接和服务状态',
        '检查API配额和使用限制',
        '尝试稍后重新请求'
      ],
      unknown: [
        '重启应用程序',
        '检查系统日志获取更多信息',
        '联系技术支持寻求帮助',
        '尝试重新安装程序'
      ]
    };

    return suggestionMap[errorType] || suggestionMap.unknown;
  }

  /**
   * 获取解决方案
   */
  private getSolutionsForError(error: ErrorInfo): Solution[] {
    // 基于错误类型返回相关解决方案
    const solutions: Solution[] = [];

    if (error.type === 'network') {
      solutions.push({
        id: 'network-reset',
        title: '重置网络配置',
        description: '重置网络适配器和DNS设置',
        steps: [
          '打开命令提示符（以管理员身份运行）',
          '运行: ipconfig /flushdns',
          '运行: netsh winsock reset',
          '重启计算机'
        ],
        complexity: 'medium',
        successRate: 85,
        timeEstimate: '5-10分钟'
      });
    }

    if (error.type === 'permission') {
      solutions.push({
        id: 'permission-fix',
        title: '修复权限问题',
        description: '获取必要的文件和系统权限',
        steps: [
          '右键点击程序图标',
          '选择"以管理员身份运行"',
          '或在属性中启用"以管理员身份运行此程序"'
        ],
        complexity: 'easy',
        successRate: 90,
        timeEstimate: '1-2分钟'
      });
    }

    return solutions;
  }

  /**
   * 获取解决方案详情
   */
  private getSolutionById(solutionId: string): Solution | null {
    // 实际应用中，这里会从解决方案数据库或API获取
    const solutions = this.currentError ? this.getSolutionsForError(this.currentError) : [];
    return solutions.find(s => s.id === solutionId) || null;
  }

  /**
   * 执行解决方案
   */
  private async executeSolution(solution: Solution, error: ErrorInfo): Promise<void> {
    // 根据解决方案ID执行相应的操作
    switch (solution.id) {
      case 'network-reset':
        await this.executeNetworkReset();
        break;
      case 'permission-fix':
        await this.executePermissionFix();
        break;
      default:
        throw new Error(`未知的解决方案: ${solution.id}`);
    }
  }

  /**
   * 执行网络重置
   */
  private async executeNetworkReset(): Promise<void> {
    if (window.electronAPI) {
      await window.electronAPI.invoke('system:execute-command', {
        command: 'ipconfig',
        args: ['/flushdns']
      });
    }
  }

  /**
   * 执行权限修复
   */
  private async executePermissionFix(): Promise<void> {
    // 提示用户手动操作
    alert('请重新以管理员身份运行程序');
  }

  /**
   * 映射错误类型
   */
  private mapErrorType(type: string): ErrorInfo['type'] {
    const typeMap: Record<string, ErrorInfo['type']> = {
      'TypeError': 'system',
      'ReferenceError': 'system',
      'NetworkError': 'network',
      'PermissionError': 'permission',
      'ValidationError': 'validation'
    };
    return typeMap[type] || 'unknown';
  }

  /**
   * 映射错误严重程度
   */
  private mapErrorSeverity(errorInfo: any): ErrorInfo['severity'] {
    if (errorInfo.message?.includes('critical') || errorInfo.type === 'ReferenceError') {
      return 'critical';
    }
    if (errorInfo.message?.includes('warning') || errorInfo.type === 'TypeError') {
      return 'high';
    }
    return 'medium';
  }

  /**
   * 显示成功消息
   */
  private showSuccessMessage(message: string): void {
    // 可以集成到进度组件或通知系统
    if ((window as any).uiStateManager) {
      (window as any).uiStateManager.addNotification({
        type: 'success',
        title: '成功',
        message,
        timeout: 3000
      });
    }
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
    if (!this.currentError) {
      return '<div class="error-handler-component empty"></div>';
    }

    return `
      <div class="error-handler-component theme-${this.config.theme}">
        ${this.generateErrorDisplayHTML()}
        ${this.feedbackForm ? this.generateFeedbackFormHTML() : ''}
      </div>
    `;
  }

  /**
   * 生成错误显示HTML
   */
  private generateErrorDisplayHTML(): string {
    if (!this.currentError) return '';

    const error = this.currentError;
    const solutions = this.getSolutionsForError(error);

    return `
      <div class="error-display ${error.severity}">
        <div class="error-header">
          <div class="error-icon">${this.getErrorIcon(error.severity)}</div>
          <div class="error-info">
            <h3 class="error-title">${error.title}</h3>
            <div class="error-meta">
              <span class="error-type">${this.getErrorTypeText(error.type)}</span>
              <span class="error-time">${error.timestamp.toLocaleString()}</span>
            </div>
          </div>
          <button class="error-close" data-error-id="${error.id}">×</button>
        </div>

        <div class="error-content">
          <div class="error-message">${error.message}</div>

          ${error.details ? `
            <div class="error-details">
              <summary class="details-toggle">详细信息</summary>
              <div class="details-content">${error.details}</div>
            </div>
          ` : ''}

          ${this.config.showStackTrace && error.stack ? `
            <div class="error-stack">
              <summary class="stack-toggle">堆栈跟踪</summary>
              <pre class="stack-content">${error.stack}</pre>
            </div>
          ` : ''}
        </div>

        <div class="error-suggestions">
          <h4>建议的解决方案:</h4>
          <ul class="suggestions-list">
            ${error.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
          </ul>
        </div>

        ${solutions.length > 0 ? `
          <div class="error-solutions">
            <h4>自动解决方案:</h4>
            ${solutions.map(solution => `
              <div class="solution-item">
                <div class="solution-header">
                  <span class="solution-title">${solution.title}</span>
                  <span class="solution-complexity ${solution.complexity}">${this.getComplexityText(solution.complexity)}</span>
                  <span class="solution-success">${solution.successRate}% 成功率</span>
                </div>
                <div class="solution-description">${solution.description}</div>
                <div class="solution-estimate">预计时间: ${solution.timeEstimate}</div>
                <button class="apply-solution-button" data-solution-id="${solution.id}" data-error-id="${error.id}">
                  应用此解决方案
                </button>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="error-actions">
          ${error.canRetry && error.retryCount < this.config.maxRetries ? `
            <button class="retry-button" data-error-id="${error.id}">
              重试 ${error.retryCount > 0 ? `(${error.retryCount}/${this.config.maxRetries})` : ''}
            </button>
          ` : ''}

          ${this.config.enableFeedback ? `
            <button class="feedback-button" data-error-id="${error.id}">
              提供反馈
            </button>
          ` : ''}

          <button class="copy-error-button" data-error-id="${error.id}">
            复制错误信息
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 生成反馈表单HTML
   */
  private generateFeedbackFormHTML(): string {
    if (!this.feedbackForm) return '';

    return `
      <div class="feedback-form">
        <h4>错误反馈</h4>
        <p>您的反馈将帮助我们改进产品质量</p>

        <div class="form-group">
          <label>错误严重程度评分:</label>
          <div class="rating-group">
            ${[1, 2, 3, 4, 5].map(rating => `
              <label class="rating-item">
                <input type="radio" name="rating" value="${rating}" ${this.feedbackForm?.rating === rating ? 'checked' : ''}>
                <span class="rating-star">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label for="feedback-description">问题描述:</label>
          <textarea
            id="feedback-description"
            placeholder="请描述您遇到的问题和当时的操作..."
            rows="4"
          >${this.feedbackForm.description}</textarea>
        </div>

        <div class="form-group">
          <label for="feedback-contact">联系方式 (可选):</label>
          <input
            type="email"
            id="feedback-contact"
            placeholder="your@email.com"
            value="${this.feedbackForm.contactInfo || ''}"
          >
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              id="include-system-info"
              ${this.feedbackForm.includeSystemInfo ? 'checked' : ''}
            >
            包含系统信息以帮助诊断问题
          </label>
        </div>

        <div class="feedback-actions">
          <button class="submit-feedback-button">提交反馈</button>
          <button class="cancel-feedback-button">取消</button>
        </div>
      </div>
    `;
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.container) return;

    // 错误关闭按钮
    const closeButtons = this.container.querySelectorAll('.error-close');
    closeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const errorId = (e.target as HTMLElement).getAttribute('data-error-id');
        if (errorId) this.hideError(errorId);
      });
    });

    // 重试按钮
    const retryButtons = this.container.querySelectorAll('.retry-button');
    retryButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const errorId = (e.target as HTMLElement).getAttribute('data-error-id');
        if (errorId) this.retryOperation(errorId);
      });
    });

    // 反馈按钮
    const feedbackButtons = this.container.querySelectorAll('.feedback-button');
    feedbackButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const errorId = (e.target as HTMLElement).getAttribute('data-error-id');
        if (errorId) this.collectFeedback(errorId);
      });
    });

    // 复制错误信息按钮
    const copyButtons = this.container.querySelectorAll('.copy-error-button');
    copyButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const errorId = (e.target as HTMLElement).getAttribute('data-error-id');
        if (errorId) this.copyErrorInfo(errorId);
      });
    });

    // 应用解决方案按钮
    const solutionButtons = this.container.querySelectorAll('.apply-solution-button');
    solutionButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const solutionId = target.getAttribute('data-solution-id');
        const errorId = target.getAttribute('data-error-id');
        if (solutionId && errorId) {
          this.applySolution(solutionId, errorId);
        }
      });
    });

    // 反馈表单事件
    this.bindFeedbackFormEvents();
  }

  /**
   * 绑定反馈表单事件
   */
  private bindFeedbackFormEvents(): void {
    if (!this.feedbackForm) return;

    // 评分选择
    const ratingInputs = this.container?.querySelectorAll('input[name="rating"]');
    ratingInputs?.forEach(input => {
      input.addEventListener('change', (e) => {
        if (this.feedbackForm) {
          this.feedbackForm.rating = parseInt((e.target as HTMLInputElement).value) as any;
        }
      });
    });

    // 描述输入
    const descriptionTextarea = this.container?.querySelector('#feedback-description') as HTMLTextAreaElement;
    descriptionTextarea?.addEventListener('input', (e) => {
      if (this.feedbackForm) {
        this.feedbackForm.description = (e.target as HTMLTextAreaElement).value;
      }
    });

    // 联系方式输入
    const contactInput = this.container?.querySelector('#feedback-contact') as HTMLInputElement;
    contactInput?.addEventListener('input', (e) => {
      if (this.feedbackForm) {
        this.feedbackForm.contactInfo = (e.target as HTMLInputElement).value;
      }
    });

    // 系统信息复选框
    const systemInfoCheckbox = this.container?.querySelector('#include-system-info') as HTMLInputElement;
    systemInfoCheckbox?.addEventListener('change', (e) => {
      if (this.feedbackForm) {
        this.feedbackForm.includeSystemInfo = (e.target as HTMLInputElement).checked;
      }
    });

    // 提交反馈按钮
    const submitButton = this.container?.querySelector('.submit-feedback-button');
    submitButton?.addEventListener('click', () => this.submitFeedback());

    // 取消反馈按钮
    const cancelButton = this.container?.querySelector('.cancel-feedback-button');
    cancelButton?.addEventListener('click', () => {
      this.feedbackForm = null;
      this.render();
    });
  }

  /**
   * 复制错误信息
   */
  private async copyErrorInfo(errorId: string): Promise<void> {
    const error = this.errors.get(errorId);
    if (!error) return;

    const errorText = `
错误类型: ${this.getErrorTypeText(error.type)}
错误标题: ${error.title}
错误消息: ${error.message}
发生时间: ${error.timestamp.toLocaleString()}
${error.details ? `详细信息: ${error.details}` : ''}
${error.stack ? `堆栈跟踪: ${error.stack}` : ''}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      this.showSuccessMessage('错误信息已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
    }
  }

  /**
   * 获取错误图标
   */
  private getErrorIcon(severity: ErrorInfo['severity']): string {
    const icons = {
      low: '💡',
      medium: '⚠️',
      high: '❌',
      critical: '🚨'
    };
    return icons[severity];
  }

  /**
   * 获取错误类型文本
   */
  private getErrorTypeText(type: ErrorInfo['type']): string {
    const typeTexts = {
      network: '网络错误',
      permission: '权限错误',
      validation: '验证错误',
      system: '系统错误',
      api: 'API错误',
      unknown: '未知错误'
    };
    return typeTexts[type];
  }

  /**
   * 获取复杂度文本
   */
  private getComplexityText(complexity: Solution['complexity']): string {
    const complexityTexts = {
      easy: '简单',
      medium: '中等',
      hard: '复杂'
    };
    return complexityTexts[complexity];
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return IdGenerator.generateErrorId();
  }

  /**
   * 获取当前错误
   */
  getCurrentError(): ErrorInfo | null {
    return this.currentError;
  }

  /**
   * 获取所有错误
   */
  getAllErrors(): ErrorInfo[] {
    return Array.from(this.errors.values());
  }

  /**
   * 清除所有错误
   */
  clearAllErrors(): void {
    this.errors.clear();
    this.currentError = null;
    this.feedbackForm = null;
    this.render();
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    this.removeAllListeners();

    if (this.container) {
      this.container.innerHTML = '';
    }

    this.errors.clear();
    this.currentError = null;
    this.feedbackForm = null;
    this.isInitialized = false;
    console.log('错误处理组件已销毁');
  }
}

/**
 * 全局错误处理组件实例
 */
export const errorHandlerComponent = new ErrorHandlerComponent();

/**
 * 导出类型定义
 */
export type { ErrorHandlerConfig, ErrorInfo, UserFeedback, Solution };