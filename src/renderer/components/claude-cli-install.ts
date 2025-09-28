/**
 * Claude CLI安装步骤组件
 * 负责Claude CLI的检测、安装和验证
 */

/// <reference path="../types/global.d.ts" />

import { EventEmitter } from 'events';

/**
 * Claude CLI安装配置接口
 */
interface ClaudeInstallConfig {
  autoDetect: boolean;
  autoInstall: boolean;
  autoVerify: boolean;
  installGlobally: boolean;
  showInstallOutput: boolean;
}

/**
 * Claude CLI状态接口
 */
interface ClaudeStatus {
  installed: boolean;
  version?: string;
  path?: string;
  working: boolean;
  needsUpdate: boolean;
  installationSource?: 'npm' | 'manual' | 'unknown';
  lastChecked?: Date;
}

/**
 * 安装进度接口
 */
interface InstallProgress {
  stage: 'checking' | 'downloading' | 'installing' | 'verifying' | 'completed' | 'failed';
  percentage: number;
  message: string;
  details?: string[];
  error?: string;
}

/**
 * 验证结果接口
 */
interface VerificationResult {
  success: boolean;
  version?: string;
  features: {
    name: string;
    available: boolean;
    description: string;
  }[];
  recommendations: string[];
}

/**
 * Claude CLI安装组件类
 */
class ClaudeInstallComponent extends EventEmitter {
  private container: HTMLElement | null = null;
  private config: ClaudeInstallConfig = {
    autoDetect: true,
    autoInstall: false,
    autoVerify: true,
    installGlobally: true,
    showInstallOutput: false
  };

  private status: ClaudeStatus | null = null;
  private progress: InstallProgress | null = null;
  private verificationResult: VerificationResult | null = null;
  private isWorking = false;
  private installOutput: string[] = [];
  private isInitialized = false;

  /**
   * 初始化Claude CLI安装组件
   */
  async initialize(containerId: string, config?: Partial<ClaudeInstallConfig>): Promise<void> {
    if (this.isInitialized) {
      console.warn('Claude CLI安装组件已经初始化');
      return;
    }

    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`容器 #${containerId} 未找到`);
    }

    // 合并配置
    this.config = { ...this.config, ...config };

    // 渲染初始界面
    this.render();

    // 自动检测
    if (this.config.autoDetect) {
      setTimeout(() => this.checkInstallation(), 500);
    }

    this.isInitialized = true;
    console.log('Claude CLI安装组件初始化完成');
  }

  /**
   * 检查Claude CLI安装状态
   */
  async checkInstallation(): Promise<void> {
    if (this.isWorking) return;

    try {
      this.isWorking = true;
      this.progress = {
        stage: 'checking',
        percentage: 0,
        message: '正在检测Claude CLI...'
      };
      this.render();

      const result = await window.electronAPI.invoke('installer:claude:check-installation');

      this.status = {
        installed: result.installed,
        version: result.version,
        path: result.path,
        working: result.working,
        needsUpdate: result.needsUpdate,
        installationSource: this.detectInstallationSource(result.path),
        lastChecked: new Date()
      };

      this.progress = null;

      // 自动验证功能
      if (this.status.installed && this.config.autoVerify) {
        await this.verifyInstallation();
      }

      this.emit('check-completed', this.status);

      // 自动安装（如果需要且启用）
      if (this.config.autoInstall && !this.status.installed) {
        setTimeout(() => this.installClaude(), 1000);
      }

    } catch (error) {
      console.error('Claude CLI检测失败:', error);
      this.progress = {
        stage: 'failed',
        percentage: 0,
        message: '检测失败',
        error: error instanceof Error ? error.message : String(error)
      };
      this.emit('check-failed', error);

    } finally {
      this.isWorking = false;
      this.render();
    }
  }

  /**
   * 安装Claude CLI
   */
  async installClaude(): Promise<void> {
    if (this.isWorking) return;

    try {
      this.isWorking = true;
      this.installOutput = [];
      this.emit('installation-started');

      // 下载阶段
      this.progress = {
        stage: 'downloading',
        percentage: 10,
        message: '正在下载Claude CLI...',
        details: ['连接到npm registry...']
      };
      this.render();

      // 调用主进程执行安装
      const installResult = await window.electronAPI.invoke('installer:claude:install', {
        force: false,
        global: this.config.installGlobally
      });

      if (!installResult.success) {
        throw new Error(installResult.error || '安装失败');
      }

      // 监听安装进度
      await this.monitorInstallation(installResult.taskId);

      // 验证安装
      this.progress = {
        stage: 'verifying',
        percentage: 90,
        message: '正在验证安装...'
      };
      this.render();

      await this.verifyInstallation();

      // 完成
      this.progress = {
        stage: 'completed',
        percentage: 100,
        message: 'Claude CLI安装完成'
      };
      this.render();

      // 重新检测状态
      await this.checkInstallation();

      this.emit('installation-completed');

    } catch (error) {
      console.error('Claude CLI安装失败:', error);
      this.progress = {
        stage: 'failed',
        percentage: 0,
        message: '安装失败',
        error: error instanceof Error ? error.message : String(error)
      };
      this.emit('installation-failed', error);

    } finally {
      this.isWorking = false;
      this.render();
    }
  }

  /**
   * 监听安装进度
   */
  private async monitorInstallation(taskId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const progressHandler = (progressData: any) => {
        if (progressData.taskId === taskId) {
          this.progress = {
            stage: 'installing',
            percentage: Math.min(40 + progressData.progress * 0.4, 80),
            message: progressData.message || '安装中...',
            details: progressData.details ? [progressData.details] : undefined
          };

          if (progressData.output) {
            this.installOutput.push(progressData.output);
          }

          this.render();
        }
      };

      const completionHandler = (completionData: any) => {
        if (completionData.taskId === taskId) {
          window.electronAPI.removeAllListeners('installer:step:progress');
          window.electronAPI.removeAllListeners('installer:step:completed');

          if (completionData.status === 'success') {
            resolve();
          } else {
            reject(new Error(completionData.message || '安装失败'));
          }
        }
      };

      // 监听进度和完成事件
      window.electronAPI.on('installer:step:progress', progressHandler);
      window.electronAPI.on('installer:step:completed', completionHandler);

      // 设置超时
      setTimeout(() => {
        window.electronAPI.removeAllListeners('installer:step:progress');
        window.electronAPI.removeAllListeners('installer:step:completed');
        reject(new Error('安装超时'));
      }, 300000); // 5分钟超时
    });
  }

  /**
   * 验证Claude CLI安装
   */
  async verifyInstallation(): Promise<void> {
    try {
      const features = [
        {
          name: 'claude version',
          description: '检查Claude CLI版本信息',
          command: ['claude', '--version']
        },
        {
          name: 'claude help',
          description: '检查帮助文档',
          command: ['claude', '--help']
        },
        {
          name: 'claude config',
          description: '检查配置功能',
          command: ['claude', 'config', '--help']
        }
      ];

      const verificationResults = [];

      for (const feature of features) {
        try {
          const result = await window.electronAPI.invoke('system:execute-command', {
            command: feature.command[0],
            args: feature.command.slice(1),
            timeout: 10000
          });

          verificationResults.push({
            name: feature.name,
            available: result.success && result.exitCode === 0,
            description: feature.description
          });
        } catch (error) {
          verificationResults.push({
            name: feature.name,
            available: false,
            description: feature.description
          });
        }
      }

      const successCount = verificationResults.filter(r => r.available).length;
      const recommendations = [];

      if (successCount === 0) {
        recommendations.push('Claude CLI可能未正确安装，请尝试重新安装');
      } else if (successCount < verificationResults.length) {
        recommendations.push('部分功能不可用，可能需要重启终端或检查PATH环境变量');
      } else {
        recommendations.push('Claude CLI已成功安装并可以正常使用');
      }

      this.verificationResult = {
        success: successCount > 0,
        version: this.status?.version,
        features: verificationResults,
        recommendations
      };

    } catch (error) {
      console.error('验证Claude CLI安装失败:', error);
      this.verificationResult = {
        success: false,
        features: [],
        recommendations: ['验证过程失败，请手动检查Claude CLI是否正常工作']
      };
    }
  }

  /**
   * 更新Claude CLI
   */
  async updateClaude(): Promise<void> {
    if (!this.status?.installed) return;

    try {
      this.isWorking = true;
      this.progress = {
        stage: 'downloading',
        percentage: 10,
        message: '正在更新Claude CLI...'
      };
      this.render();

      const result = await window.electronAPI.invoke('installer:claude:install', {
        force: true,
        global: this.config.installGlobally
      });

      if (result.success) {
        await this.checkInstallation();
        this.emit('update-completed');
      } else {
        throw new Error(result.error || '更新失败');
      }

    } catch (error) {
      console.error('Claude CLI更新失败:', error);
      this.emit('update-failed', error);

    } finally {
      this.isWorking = false;
      this.render();
    }
  }

  /**
   * 卸载Claude CLI
   */
  async uninstallClaude(): Promise<void> {
    if (!this.status?.installed) return;

    const confirmed = confirm('确定要卸载Claude CLI吗？这将移除所有已安装的文件。');
    if (!confirmed) return;

    try {
      this.isWorking = true;
      this.progress = {
        stage: 'checking',
        percentage: 50,
        message: '正在卸载Claude CLI...'
      };
      this.render();

      const result = await window.electronAPI.invoke('installer:claude:uninstall');

      if (result.success) {
        this.status = null;
        this.verificationResult = null;
        this.emit('uninstall-completed');
      } else {
        throw new Error(result.error || '卸载失败');
      }

    } catch (error) {
      console.error('Claude CLI卸载失败:', error);
      this.emit('uninstall-failed', error);

    } finally {
      this.isWorking = false;
      this.progress = null;
      this.render();
    }
  }

  /**
   * 检测安装来源
   */
  private detectInstallationSource(path?: string): 'npm' | 'manual' | 'unknown' {
    if (!path) return 'unknown';

    if (path.includes('npm') || path.includes('node_modules')) {
      return 'npm';
    }

    return 'manual';
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
      <div class="claude-install-component">
        ${this.generateHeaderHTML()}
        ${this.generateStatusHTML()}
        ${this.generateProgressHTML()}
        ${this.generateVerificationHTML()}
        ${this.generateInstallOutputHTML()}
        ${this.generateActionsHTML()}
        ${this.generateConfigHTML()}
      </div>
    `;
  }

  /**
   * 生成头部HTML
   */
  private generateHeaderHTML(): string {
    return `
      <div class="install-header">
        <h3 class="install-title">
          <span class="install-icon">🤖</span>
          Claude CLI安装
        </h3>
        <p class="install-description">安装Claude命令行工具以开始使用AI助手</p>
      </div>
    `;
  }

  /**
   * 生成状态HTML
   */
  private generateStatusHTML(): string {
    if (!this.status) {
      return `
        <div class="status-section">
          <div class="status-placeholder">
            <div class="loading-spinner"></div>
            <span>正在检测Claude CLI...</span>
          </div>
        </div>
      `;
    }

    const { status } = this;
    const statusClass = status.installed ? (status.working ? 'success' : 'warning') : 'error';

    return `
      <div class="status-section ${statusClass}">
        <div class="status-header">
          <div class="status-icon">${this.getStatusIcon(status)}</div>
          <div class="status-info">
            <div class="status-title">${this.getStatusTitle(status)}</div>
            <div class="status-message">${this.getStatusMessage(status)}</div>
          </div>
          ${status.needsUpdate ? '<div class="update-badge">需要更新</div>' : ''}
        </div>

        ${status.installed ? `
          <div class="install-details">
            <div class="detail-item">
              <span class="detail-label">版本:</span>
              <span class="detail-value">${status.version || '未知'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">安装路径:</span>
              <span class="detail-value path">${status.path || '未知'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">安装方式:</span>
              <span class="detail-value">${this.getInstallationSourceText(status.installationSource)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">最后检查:</span>
              <span class="detail-value">${status.lastChecked?.toLocaleString() || '未知'}</span>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 生成进度HTML
   */
  private generateProgressHTML(): string {
    if (!this.progress || !this.isWorking) return '';

    return `
      <div class="progress-section">
        <div class="progress-header">
          <span class="progress-stage">${this.getStageTitle(this.progress.stage)}</span>
          <span class="progress-percentage">${this.progress.percentage}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${this.progress.percentage}%"></div>
        </div>
        <div class="progress-message">${this.progress.message}</div>

        ${this.progress.details && this.progress.details.length > 0 ? `
          <div class="progress-details">
            ${this.progress.details.map(detail => `<div class="detail-line">${detail}</div>`).join('')}
          </div>
        ` : ''}

        ${this.progress.error ? `
          <div class="progress-error">
            <span class="error-icon">❌</span>
            <span class="error-message">${this.progress.error}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 生成验证结果HTML
   */
  private generateVerificationHTML(): string {
    if (!this.verificationResult) return '';

    const { verificationResult } = this;

    return `
      <div class="verification-section">
        <h4 class="verification-title">功能验证</h4>
        <div class="verification-status ${verificationResult.success ? 'success' : 'failed'}">
          <span class="status-icon">${verificationResult.success ? '✅' : '❌'}</span>
          <span class="status-text">${verificationResult.success ? '验证通过' : '验证失败'}</span>
        </div>

        <div class="feature-list">
          ${verificationResult.features.map(feature => `
            <div class="feature-item ${feature.available ? 'available' : 'unavailable'}">
              <span class="feature-icon">${feature.available ? '✓' : '✗'}</span>
              <span class="feature-name">${feature.name}</span>
              <span class="feature-description">${feature.description}</span>
            </div>
          `).join('')}
        </div>

        ${verificationResult.recommendations.length > 0 ? `
          <div class="recommendations">
            <h5>建议：</h5>
            <ul>
              ${verificationResult.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 生成安装输出HTML
   */
  private generateInstallOutputHTML(): string {
    if (!this.config.showInstallOutput || this.installOutput.length === 0) return '';

    return `
      <div class="install-output-section">
        <h4 class="output-title">安装日志</h4>
        <div class="output-console">
          ${this.installOutput.map(line => `<div class="output-line">${line}</div>`).join('')}
        </div>
      </div>
    `;
  }

  /**
   * 生成操作按钮HTML
   */
  private generateActionsHTML(): string {
    const { status } = this;

    return `
      <div class="actions-section">
        ${!status?.installed ? `
          <button class="action-button primary install-button" ${this.isWorking ? 'disabled' : ''}>
            ${this.isWorking ? '安装中...' : '安装Claude CLI'}
          </button>
        ` : ''}

        ${status?.needsUpdate ? `
          <button class="action-button primary update-button" ${this.isWorking ? 'disabled' : ''}>
            更新Claude CLI
          </button>
        ` : ''}

        <button class="action-button check-button" ${this.isWorking ? 'disabled' : ''}>
          ${this.isWorking ? '检测中...' : '重新检测'}
        </button>

        ${status?.installed ? `
          <button class="action-button verify-button" ${this.isWorking ? 'disabled' : ''}>
            验证功能
          </button>
        ` : ''}

        ${status?.installed ? `
          <button class="action-button secondary uninstall-button" ${this.isWorking ? 'disabled' : ''}>
            卸载
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * 生成配置HTML
   */
  private generateConfigHTML(): string {
    return `
      <div class="config-section">
        <h4 class="config-title">安装选项</h4>
        <div class="config-options">
          <label class="config-option">
            <input type="checkbox" ${this.config.installGlobally ? 'checked' : ''} data-config="installGlobally">
            全局安装（推荐）
          </label>
          <label class="config-option">
            <input type="checkbox" ${this.config.autoInstall ? 'checked' : ''} data-config="autoInstall">
            自动安装
          </label>
          <label class="config-option">
            <input type="checkbox" ${this.config.autoVerify ? 'checked' : ''} data-config="autoVerify">
            自动验证功能
          </label>
          <label class="config-option">
            <input type="checkbox" ${this.config.showInstallOutput ? 'checked' : ''} data-config="showInstallOutput">
            显示安装日志
          </label>
        </div>
      </div>
    `;
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.container) return;

    // 安装按钮
    const installButton = this.container.querySelector('.install-button');
    installButton?.addEventListener('click', () => this.installClaude());

    // 更新按钮
    const updateButton = this.container.querySelector('.update-button');
    updateButton?.addEventListener('click', () => this.updateClaude());

    // 检测按钮
    const checkButton = this.container.querySelector('.check-button');
    checkButton?.addEventListener('click', () => this.checkInstallation());

    // 验证按钮
    const verifyButton = this.container.querySelector('.verify-button');
    verifyButton?.addEventListener('click', () => this.verifyInstallation());

    // 卸载按钮
    const uninstallButton = this.container.querySelector('.uninstall-button');
    uninstallButton?.addEventListener('click', () => this.uninstallClaude());

    // 配置选项
    const configInputs = this.container.querySelectorAll('[data-config]');
    configInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const configKey = target.getAttribute('data-config') as keyof ClaudeInstallConfig;
        (this.config as any)[configKey] = target.checked;
      });
    });
  }

  /**
   * 获取状态图标
   */
  private getStatusIcon(status: ClaudeStatus): string {
    if (!status.installed) return '❌';
    if (!status.working) return '⚠️';
    return '✅';
  }

  /**
   * 获取状态标题
   */
  private getStatusTitle(status: ClaudeStatus): string {
    if (!status.installed) return 'Claude CLI未安装';
    if (!status.working) return 'Claude CLI存在问题';
    if (status.needsUpdate) return 'Claude CLI需要更新';
    return 'Claude CLI已就绪';
  }

  /**
   * 获取状态消息
   */
  private getStatusMessage(status: ClaudeStatus): string {
    if (!status.installed) {
      return '需要安装Claude CLI才能使用AI助手功能';
    }
    if (!status.working) {
      return 'Claude CLI已安装但无法正常工作，请检查安装';
    }
    if (status.needsUpdate) {
      return `当前版本 ${status.version}，建议更新到最新版本`;
    }
    return `Claude CLI ${status.version} 已安装并可正常使用`;
  }

  /**
   * 获取安装来源文本
   */
  private getInstallationSourceText(source?: string): string {
    const sources = {
      npm: 'npm包管理器',
      manual: '手动安装',
      unknown: '未知'
    };
    return sources[source as keyof typeof sources] || '未知';
  }

  /**
   * 获取阶段标题
   */
  private getStageTitle(stage: InstallProgress['stage']): string {
    const titles = {
      checking: '检测中',
      downloading: '下载中',
      installing: '安装中',
      verifying: '验证中',
      completed: '完成',
      failed: '失败'
    };
    return titles[stage] || '处理中';
  }

  /**
   * 获取安装状态
   */
  getStatus(): ClaudeStatus | null {
    return this.status;
  }

  /**
   * 获取验证结果
   */
  getVerificationResult(): VerificationResult | null {
    return this.verificationResult;
  }

  /**
   * 获取工作状态
   */
  isWorking(): boolean {
    return this.isWorking;
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
    console.log('Claude CLI安装组件已销毁');
  }
}

/**
 * 全局Claude CLI安装组件实例
 */
export const claudeInstallComponent = new ClaudeInstallComponent();

/**
 * 导出类型定义
 */
export type { ClaudeInstallConfig, ClaudeStatus, InstallProgress, VerificationResult };