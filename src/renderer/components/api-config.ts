/**
 * API配置步骤组件
 * 负责Anthropic API的配置和验证（可选步骤）
 */

/// <reference path="../types/global.d.ts" />

import { EventEmitter } from 'events';

/**
 * API配置接口
 */
interface ApiConfigSettings {
  anthropicBaseUrl?: string;
  anthropicApiKey?: string;
  timeout: number;
  retryCount: number;
  enableLogging: boolean;
}

/**
 * API配置组件配置接口
 */
interface ApiConfigComponentConfig {
  allowSkip: boolean;
  showAdvanced: boolean;
  autoValidate: boolean;
  secureStorage: boolean;
  defaultBaseUrl: string;
}

/**
 * API验证结果接口
 */
interface ApiValidationResult {
  valid: boolean;
  error?: string;
  userInfo?: {
    id?: string;
    email?: string;
    plan?: string;
    usage?: {
      limit: number;
      used: number;
      remaining: number;
    };
  };
  responseTime?: number;
}

/**
 * 配置状态接口
 */
interface ConfigStatus {
  isConfigured: boolean;
  isValidated: boolean;
  isOptional: boolean;
  lastValidated?: Date;
  validationResult?: ApiValidationResult;
}

/**
 * API配置组件类
 */
class ApiConfigComponent extends EventEmitter {
  private container: HTMLElement | null = null;
  private config: ApiConfigComponentConfig = {
    allowSkip: true,
    showAdvanced: false,
    autoValidate: true,
    secureStorage: true,
    defaultBaseUrl: 'https://api.anthropic.com'
  };

  private apiConfig: ApiConfigSettings = {
    anthropicBaseUrl: 'https://api.anthropic.com',
    anthropicApiKey: '',
    timeout: 30000,
    retryCount: 3,
    enableLogging: false
  };

  private status: ConfigStatus = {
    isConfigured: false,
    isValidated: false,
    isOptional: true
  };

  private isValidating = false;
  private isInitialized = false;

  /**
   * 初始化API配置组件
   */
  async initialize(containerId: string, config?: Partial<ApiConfigComponentConfig>): Promise<void> {
    if (this.isInitialized) {
      console.warn('API配置组件已经初始化');
      return;
    }

    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`容器 #${containerId} 未找到`);
    }

    // 合并配置
    this.config = { ...this.config, ...config };
    this.apiConfig.anthropicBaseUrl = this.config.defaultBaseUrl;

    // 加载已保存的配置
    await this.loadSavedConfig();

    // 渲染初始界面
    this.render();

    this.isInitialized = true;
    console.log('API配置组件初始化完成');
  }

  /**
   * 加载已保存的配置
   */
  private async loadSavedConfig(): Promise<void> {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.invoke('installer:config:get', {
          keys: ['apiConfig']
        });

        if (result.config?.apiConfig) {
          const savedConfig = result.config.apiConfig;
          this.apiConfig = { ...this.apiConfig, ...savedConfig };
          this.status.isConfigured = !!savedConfig.anthropicApiKey;

          if (this.status.isConfigured && this.config.autoValidate) {
            // 延迟验证以避免界面卡顿
            setTimeout(() => this.validateApiKey(), 1000);
          }
        }
      }
    } catch (error) {
      console.warn('加载API配置失败:', error);
    }
  }

  /**
   * 保存API配置
   */
  async saveApiConfig(): Promise<void> {
    if (!this.apiConfig.anthropicApiKey) {
      throw new Error('API密钥不能为空');
    }

    try {
      const configToSave = {
        apiConfig: this.apiConfig
      };

      const encryptFields = this.config.secureStorage ? ['apiConfig.anthropicApiKey'] : [];

      const result = await window.electronAPI.invoke('installer:config:set', {
        config: configToSave,
        encrypt: encryptFields
      });

      if (!result.success) {
        throw new Error(result.error || '保存配置失败');
      }

      this.status.isConfigured = true;
      this.emit('config-saved', this.apiConfig);

      console.log('API配置已保存');

    } catch (error) {
      console.error('保存API配置失败:', error);
      throw error;
    }
  }

  /**
   * 验证API密钥
   */
  async validateApiKey(): Promise<void> {
    if (!this.apiConfig.anthropicApiKey) {
      throw new Error('请先输入API密钥');
    }

    try {
      this.isValidating = true;
      this.render();

      const startTime = Date.now();

      const result = await window.electronAPI.invoke('installer:config:validate-api', {
        baseUrl: this.apiConfig.anthropicBaseUrl,
        apiKey: this.apiConfig.anthropicApiKey,
        timeout: this.apiConfig.timeout
      });

      const responseTime = Date.now() - startTime;

      this.status.validationResult = {
        ...result,
        responseTime
      };

      this.status.isValidated = result.valid;
      this.status.lastValidated = new Date();

      if (result.valid) {
        this.emit('validation-success', this.status.validationResult);
      } else {
        this.emit('validation-failed', result.error);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.status.validationResult = {
        valid: false,
        error: errorMessage
      };
      this.status.isValidated = false;
      this.emit('validation-failed', errorMessage);

    } finally {
      this.isValidating = false;
      this.render();
    }
  }

  /**
   * 保存并验证配置
   */
  async saveAndValidate(): Promise<void> {
    try {
      await this.saveApiConfig();
      await this.validateApiKey();
    } catch (error) {
      throw error;
    }
  }

  /**
   * 清除配置
   */
  async clearConfig(): Promise<void> {
    const confirmed = confirm('确定要清除API配置吗？这将删除已保存的API密钥。');
    if (!confirmed) return;

    try {
      this.apiConfig.anthropicApiKey = '';
      this.status.isConfigured = false;
      this.status.isValidated = false;
      this.status.validationResult = undefined;

      await this.saveApiConfig();
      this.emit('config-cleared');
      this.render();

    } catch (error) {
      console.error('清除配置失败:', error);
    }
  }

  /**
   * 跳过API配置
   */
  skipConfig(): void {
    this.emit('config-skipped');
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
      <div class="api-config-component">
        ${this.generateHeaderHTML()}
        ${this.generateStatusHTML()}
        ${this.generateConfigFormHTML()}
        ${this.generateValidationResultHTML()}
        ${this.generateAdvancedOptionsHTML()}
        ${this.generateActionsHTML()}
      </div>
    `;
  }

  /**
   * 生成头部HTML
   */
  private generateHeaderHTML(): string {
    return `
      <div class="config-header">
        <h3 class="config-title">
          <span class="config-icon">🔑</span>
          API配置
        </h3>
        <p class="config-description">配置Anthropic API密钥以启用Claude服务</p>
        ${this.status.isOptional ? `
          <div class="config-notice">
            💡 这是可选步骤，您可以稍后配置API密钥
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 生成状态HTML
   */
  private generateStatusHTML(): string {
    const { status } = this;

    let statusClass = 'pending';
    let statusIcon = '⏳';
    let statusText = '未配置';

    if (status.isConfigured) {
      if (status.isValidated) {
        statusClass = 'success';
        statusIcon = '✅';
        statusText = 'API密钥有效';
      } else {
        statusClass = 'warning';
        statusIcon = '⚠️';
        statusText = 'API密钥未验证';
      }
    }

    return `
      <div class="config-status ${statusClass}">
        <div class="status-indicator">
          <span class="status-icon">${statusIcon}</span>
          <span class="status-text">${statusText}</span>
        </div>

        ${status.lastValidated ? `
          <div class="status-details">
            <span class="detail-label">最后验证:</span>
            <span class="detail-value">${status.lastValidated.toLocaleString()}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 生成配置表单HTML
   */
  private generateConfigFormHTML(): string {
    return `
      <div class="config-form">
        <div class="form-group">
          <label class="form-label" for="api-key">
            Anthropic API密钥 *
            <span class="help-text">在 <a href="https://console.anthropic.com" target="_blank">Anthropic Console</a> 获取</span>
          </label>
          <div class="input-group">
            <input
              type="password"
              id="api-key"
              class="form-input"
              placeholder="sk-ant-..."
              value="${this.apiConfig.anthropicApiKey || ''}"
              ${this.isValidating ? 'disabled' : ''}
            >
            <button class="toggle-visibility" type="button" title="显示/隐藏密钥">
              👁️
            </button>
          </div>
          <div class="input-hint">API密钥将被安全加密存储</div>
        </div>

        <div class="form-group">
          <label class="form-label" for="base-url">API基础URL</label>
          <input
            type="url"
            id="base-url"
            class="form-input"
            placeholder="https://api.anthropic.com"
            value="${this.apiConfig.anthropicBaseUrl || ''}"
            ${this.isValidating ? 'disabled' : ''}
          >
          <div class="input-hint">通常使用默认值，除非您使用代理或自定义端点</div>
        </div>
      </div>
    `;
  }

  /**
   * 生成验证结果HTML
   */
  private generateValidationResultHTML(): string {
    if (!this.status.validationResult) return '';

    const { validationResult } = this.status;

    return `
      <div class="validation-result ${validationResult.valid ? 'success' : 'error'}">
        <div class="result-header">
          <span class="result-icon">${validationResult.valid ? '✅' : '❌'}</span>
          <span class="result-title">${validationResult.valid ? '验证成功' : '验证失败'}</span>
          ${validationResult.responseTime ? `
            <span class="result-time">(${validationResult.responseTime}ms)</span>
          ` : ''}
        </div>

        ${validationResult.valid && validationResult.userInfo ? `
          <div class="user-info">
            ${validationResult.userInfo.email ? `
              <div class="info-item">
                <span class="info-label">邮箱:</span>
                <span class="info-value">${validationResult.userInfo.email}</span>
              </div>
            ` : ''}
            ${validationResult.userInfo.plan ? `
              <div class="info-item">
                <span class="info-label">计划:</span>
                <span class="info-value">${validationResult.userInfo.plan}</span>
              </div>
            ` : ''}
            ${validationResult.userInfo.usage ? `
              <div class="info-item">
                <span class="info-label">使用情况:</span>
                <span class="info-value">
                  ${validationResult.userInfo.usage.used}/${validationResult.userInfo.usage.limit}
                  (剩余 ${validationResult.userInfo.usage.remaining})
                </span>
              </div>
            ` : ''}
          </div>
        ` : ''}

        ${!validationResult.valid && validationResult.error ? `
          <div class="error-message">
            <span class="error-icon">❌</span>
            <span class="error-text">${validationResult.error}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 生成高级选项HTML
   */
  private generateAdvancedOptionsHTML(): string {
    if (!this.config.showAdvanced) {
      return `
        <div class="advanced-toggle">
          <button class="toggle-advanced-button">显示高级选项</button>
        </div>
      `;
    }

    return `
      <div class="advanced-options">
        <h4 class="advanced-title">高级选项</h4>

        <div class="form-group">
          <label class="form-label" for="timeout">请求超时时间 (毫秒)</label>
          <input
            type="number"
            id="timeout"
            class="form-input"
            min="5000"
            max="300000"
            step="1000"
            value="${this.apiConfig.timeout}"
          >
        </div>

        <div class="form-group">
          <label class="form-label" for="retry-count">重试次数</label>
          <input
            type="number"
            id="retry-count"
            class="form-input"
            min="0"
            max="10"
            value="${this.apiConfig.retryCount}"
          >
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              id="enable-logging"
              ${this.apiConfig.enableLogging ? 'checked' : ''}
            >
            启用API请求日志记录
          </label>
        </div>

        <button class="toggle-advanced-button">隐藏高级选项</button>
      </div>
    `;
  }

  /**
   * 生成操作按钮HTML
   */
  private generateActionsHTML(): string {
    const hasApiKey = !!this.apiConfig.anthropicApiKey;
    const isConfigured = this.status.isConfigured;

    return `
      <div class="config-actions">
        <button
          class="action-button primary save-validate-button"
          ${!hasApiKey || this.isValidating ? 'disabled' : ''}
        >
          ${this.isValidating ? '验证中...' : (isConfigured ? '更新并验证' : '保存并验证')}
        </button>

        ${hasApiKey ? `
          <button
            class="action-button secondary validate-button"
            ${this.isValidating ? 'disabled' : ''}
          >
            ${this.isValidating ? '验证中...' : '仅验证'}
          </button>
        ` : ''}

        ${isConfigured ? `
          <button class="action-button secondary clear-button">
            清除配置
          </button>
        ` : ''}

        ${this.config.allowSkip ? `
          <button class="action-button secondary skip-button">
            跳过此步骤
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.container) return;

    // API密钥输入
    const apiKeyInput = this.container.querySelector('#api-key') as HTMLInputElement;
    apiKeyInput?.addEventListener('input', (e) => {
      this.apiConfig.anthropicApiKey = (e.target as HTMLInputElement).value.trim();
      this.updateButtonStates();
    });

    // 基础URL输入
    const baseUrlInput = this.container.querySelector('#base-url') as HTMLInputElement;
    baseUrlInput?.addEventListener('input', (e) => {
      this.apiConfig.anthropicBaseUrl = (e.target as HTMLInputElement).value.trim();
    });

    // 显示/隐藏密钥
    const toggleVisibility = this.container.querySelector('.toggle-visibility');
    toggleVisibility?.addEventListener('click', () => {
      const input = apiKeyInput;
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    });

    // 保存并验证按钮
    const saveValidateButton = this.container.querySelector('.save-validate-button');
    saveValidateButton?.addEventListener('click', () => this.saveAndValidate());

    // 仅验证按钮
    const validateButton = this.container.querySelector('.validate-button');
    validateButton?.addEventListener('click', () => this.validateApiKey());

    // 清除配置按钮
    const clearButton = this.container.querySelector('.clear-button');
    clearButton?.addEventListener('click', () => this.clearConfig());

    // 跳过按钮
    const skipButton = this.container.querySelector('.skip-button');
    skipButton?.addEventListener('click', () => this.skipConfig());

    // 高级选项切换
    const toggleAdvanced = this.container.querySelector('.toggle-advanced-button');
    toggleAdvanced?.addEventListener('click', () => {
      this.config.showAdvanced = !this.config.showAdvanced;
      this.render();
    });

    // 高级选项输入
    this.bindAdvancedOptionsEvents();
  }

  /**
   * 绑定高级选项事件
   */
  private bindAdvancedOptionsEvents(): void {
    if (!this.config.showAdvanced) return;

    const timeoutInput = this.container?.querySelector('#timeout') as HTMLInputElement;
    timeoutInput?.addEventListener('input', (e) => {
      this.apiConfig.timeout = parseInt((e.target as HTMLInputElement).value);
    });

    const retryCountInput = this.container?.querySelector('#retry-count') as HTMLInputElement;
    retryCountInput?.addEventListener('input', (e) => {
      this.apiConfig.retryCount = parseInt((e.target as HTMLInputElement).value);
    });

    const enableLoggingInput = this.container?.querySelector('#enable-logging') as HTMLInputElement;
    enableLoggingInput?.addEventListener('change', (e) => {
      this.apiConfig.enableLogging = (e.target as HTMLInputElement).checked;
    });
  }

  /**
   * 更新按钮状态
   */
  private updateButtonStates(): void {
    const saveValidateButton = this.container?.querySelector('.save-validate-button') as HTMLButtonElement;
    const validateButton = this.container?.querySelector('.validate-button') as HTMLButtonElement;

    const hasApiKey = !!this.apiConfig.anthropicApiKey;

    if (saveValidateButton) {
      saveValidateButton.disabled = !hasApiKey || this.isValidating;
    }

    if (validateButton) {
      validateButton.disabled = !hasApiKey || this.isValidating;
    }
  }

  /**
   * 获取API配置
   */
  getApiConfig(): Readonly<ApiConfigSettings> {
    return { ...this.apiConfig };
  }

  /**
   * 获取配置状态
   */
  getStatus(): Readonly<ConfigStatus> {
    return { ...this.status };
  }

  /**
   * 检查是否已配置
   */
  isConfigured(): boolean {
    return this.status.isConfigured;
  }

  /**
   * 检查是否已验证
   */
  isValidated(): boolean {
    return this.status.isValidated;
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
    console.log('API配置组件已销毁');
  }
}

/**
 * 全局API配置组件实例
 */
export const apiConfigComponent = new ApiConfigComponent();

/**
 * 导出类型定义
 */
export type { ApiConfigSettings, ApiConfigComponentConfig, ApiValidationResult, ConfigStatus };