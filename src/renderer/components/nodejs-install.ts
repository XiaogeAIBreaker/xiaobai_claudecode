/**
 * Node.js安装步骤组件
 * 负责Node.js环境的检测、安装和配置
 */

/// <reference path="../types/global.d.ts" />

import { EventEmitter } from 'events';

/**
 * Node.js安装配置接口
 */
interface NodeJsInstallConfig {
  autoDetect: boolean;
  autoInstall: boolean;
  preferredVersion: string;
  enableMirror: boolean;
  showAdvancedOptions: boolean;
}

/**
 * Node.js状态接口
 */
interface NodeJsStatus {
  installed: boolean;
  version?: string;
  path?: string;
  npmVersion?: string;
  compatible: boolean;
  recommendedAction: 'none' | 'install' | 'update';
  registryConfigured: boolean;
  currentRegistry?: string;
}

/**
 * 安装进度接口
 */
interface InstallProgress {
  stage: 'detecting' | 'downloading' | 'installing' | 'configuring' | 'completed';
  percentage: number;
  message: string;
  details?: any;
}

/**
 * Node.js安装组件类
 */
class NodeJsInstallComponent extends EventEmitter {
  private container: HTMLElement | null = null;
  private config: NodeJsInstallConfig = {
    autoDetect: true,
    autoInstall: false,
    preferredVersion: '18.x',
    enableMirror: true,
    showAdvancedOptions: false
  };

  private status: NodeJsStatus | null = null;
  private progress: InstallProgress | null = null;
  private isWorking = false;
  private isInitialized = false;

  /**
   * 初始化Node.js安装组件
   */
  async initialize(containerId: string, config?: Partial<NodeJsInstallConfig>): Promise<void> {
    if (this.isInitialized) {
      console.warn('Node.js安装组件已经初始化');
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
      setTimeout(() => this.detectNodeJs(), 500);
    }

    this.isInitialized = true;
    console.log('Node.js安装组件初始化完成');
  }

  /**
   * 检测Node.js安装状态
   */
  async detectNodeJs(): Promise<void> {
    if (this.isWorking) return;

    try {
      this.isWorking = true;
      this.progress = {
        stage: 'detecting',
        percentage: 0,
        message: '正在检测Node.js环境...'
      };
      this.render();

      const result = await window.electronAPI.invoke('installer:nodejs:check-installation');

      this.status = {
        installed: result.installed,
        version: result.version,
        path: result.path,
        npmVersion: result.npmVersion,
        compatible: result.compatible,
        recommendedAction: result.recommendedAction,
        registryConfigured: false,
        currentRegistry: undefined
      };

      // 检查npm镜像源配置
      if (this.status.installed) {
        await this.checkRegistryConfiguration();
      }

      this.progress = null;
      this.emit('detection-completed', this.status);

      // 自动安装（如果需要且启用）
      if (this.config.autoInstall && this.status.recommendedAction !== 'none') {
        setTimeout(() => this.installNodeJs(), 1000);
      }

    } catch (error) {
      console.error('Node.js检测失败:', error);
      this.progress = null;
      this.emit('detection-failed', error);

    } finally {
      this.isWorking = false;
      this.render();
    }
  }

  /**
   * 安装Node.js
   */
  async installNodeJs(): Promise<void> {
    if (this.isWorking) return;

    try {
      this.isWorking = true;
      this.emit('installation-started');

      // 下载阶段
      this.progress = {
        stage: 'downloading',
        percentage: 10,
        message: '正在下载Node.js安装包...'
      };
      this.render();

      // 模拟下载进度
      await this.simulateProgress(10, 40, 'downloading', '下载中...');

      // 安装阶段
      this.progress = {
        stage: 'installing',
        percentage: 50,
        message: '正在安装Node.js...'
      };
      this.render();

      // 调用主进程执行安装
      const installResult = await window.electronAPI.invoke('installer:nodejs:install', {
        version: this.config.preferredVersion
      });

      if (!installResult.success) {
        throw new Error(installResult.error || '安装失败');
      }

      // 配置阶段
      this.progress = {
        stage: 'configuring',
        percentage: 80,
        message: '正在配置环境...'
      };
      this.render();

      await this.simulateProgress(80, 95, 'configuring', '配置中...');

      // 配置npm镜像源
      if (this.config.enableMirror) {
        await this.configureNpmRegistry();
      }

      // 完成
      this.progress = {
        stage: 'completed',
        percentage: 100,
        message: 'Node.js安装完成'
      };
      this.render();

      // 重新检测
      await this.detectNodeJs();

      this.emit('installation-completed');

    } catch (error) {
      console.error('Node.js安装失败:', error);
      this.progress = null;
      this.emit('installation-failed', error);

    } finally {
      this.isWorking = false;
      this.render();
    }
  }

  /**
   * 配置npm镜像源
   */
  async configureNpmRegistry(): Promise<void> {
    try {
      const registries = [
        'https://registry.npmmirror.com/',
        'https://registry.npm.taobao.org/',
        'https://registry.npmjs.org/'
      ];

      // 测试并选择最快的镜像源
      let bestRegistry = registries[0];
      let bestTime = Infinity;

      for (const registry of registries) {
        try {
          const result = await window.electronAPI.invoke('installer:network:test-connection', {
            targets: [registry],
            timeout: 5000
          });

          const responseTime = result.results[0]?.responseTime || Infinity;
          if (responseTime < bestTime) {
            bestTime = responseTime;
            bestRegistry = registry;
          }
        } catch (error) {
          console.warn(`测试镜像源失败: ${registry}`, error);
        }
      }

      // 设置最优镜像源
      const setResult = await window.electronAPI.invoke('installer:nodejs:set-registry', {
        registry: bestRegistry
      });

      if (setResult.success) {
        console.log(`已配置npm镜像源: ${bestRegistry}`);
        if (this.status) {
          this.status.registryConfigured = true;
          this.status.currentRegistry = bestRegistry;
        }
      }

    } catch (error) {
      console.error('配置npm镜像源失败:', error);
    }
  }

  /**
   * 检查镜像源配置
   */
  private async checkRegistryConfiguration(): Promise<void> {
    try {
      const result = await window.electronAPI.invoke('installer:nodejs:get-registry');
      if (this.status) {
        this.status.currentRegistry = result.registry;
        this.status.registryConfigured = result.registry !== 'https://registry.npmjs.org/';
      }
    } catch (error) {
      console.warn('检查镜像源配置失败:', error);
    }
  }

  /**
   * 模拟进度更新
   */
  private async simulateProgress(start: number, end: number, stage: InstallProgress['stage'], baseMessage: string): Promise<void> {
    const steps = 10;
    const stepSize = (end - start) / steps;

    for (let i = 0; i < steps; i++) {
      this.progress = {
        stage,
        percentage: Math.round(start + (i + 1) * stepSize),
        message: `${baseMessage} ${Math.round(((i + 1) / steps) * 100)}%`
      };
      this.render();
      await this.delay(200);
    }
  }

  /**
   * 重置镜像源为官方源
   */
  async resetToOfficialRegistry(): Promise<void> {
    try {
      const result = await window.electronAPI.invoke('installer:nodejs:set-registry', {
        registry: 'https://registry.npmjs.org/'
      });

      if (result.success && this.status) {
        this.status.currentRegistry = 'https://registry.npmjs.org/';
        this.status.registryConfigured = false;
        this.render();
        console.log('已重置为官方npm镜像源');
      }

    } catch (error) {
      console.error('重置镜像源失败:', error);
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
    return `
      <div class="nodejs-install-component">
        ${this.generateHeaderHTML()}
        ${this.generateStatusHTML()}
        ${this.generateProgressHTML()}
        ${this.generateRegistryConfigHTML()}
        ${this.generateActionsHTML()}
        ${this.generateAdvancedOptionsHTML()}
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
          <span class="install-icon">📦</span>
          Node.js环境配置
        </h3>
        <p class="install-description">Node.js是运行Claude CLI的必要环境</p>
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
            <span>正在检测Node.js环境...</span>
          </div>
        </div>
      `;
    }

    const { status } = this;
    const statusClass = status.installed ? (status.compatible ? 'success' : 'warning') : 'error';

    return `
      <div class="status-section ${statusClass}">
        <div class="status-header">
          <div class="status-icon">${this.getStatusIcon(status)}</div>
          <div class="status-info">
            <div class="status-title">${this.getStatusTitle(status)}</div>
            <div class="status-message">${this.getStatusMessage(status)}</div>
          </div>
        </div>

        ${status.installed ? `
          <div class="version-info">
            <div class="version-item">
              <span class="version-label">Node.js版本:</span>
              <span class="version-value">${status.version || '未知'}</span>
            </div>
            <div class="version-item">
              <span class="version-label">npm版本:</span>
              <span class="version-value">${status.npmVersion || '未知'}</span>
            </div>
            <div class="version-item">
              <span class="version-label">安装路径:</span>
              <span class="version-value path">${status.path || '未知'}</span>
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
      </div>
    `;
  }

  /**
   * 生成镜像源配置HTML
   */
  private generateRegistryConfigHTML(): string {
    if (!this.status?.installed) return '';

    return `
      <div class="registry-section">
        <h4 class="registry-title">npm镜像源配置</h4>
        <div class="registry-status">
          <span class="registry-label">当前镜像源:</span>
          <span class="registry-value">${this.status.currentRegistry || '检测中...'}</span>
          <span class="registry-indicator ${this.status.registryConfigured ? 'configured' : 'default'}">
            ${this.status.registryConfigured ? '🇨🇳 国内镜像' : '🌍 官方源'}
          </span>
        </div>

        ${!this.status.registryConfigured ? `
          <div class="registry-recommendation">
            <p>💡 建议使用国内镜像源以加速包下载</p>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 生成操作按钮HTML
   */
  private generateActionsHTML(): string {
    if (!this.status) return '';

    const { status } = this;
    const needsAction = status.recommendedAction !== 'none';

    return `
      <div class="actions-section">
        ${needsAction ? `
          <button class="action-button primary install-button" ${this.isWorking ? 'disabled' : ''}>
            ${status.recommendedAction === 'install' ? '安装Node.js' : '更新Node.js'}
          </button>
        ` : ''}

        <button class="action-button detect-button" ${this.isWorking ? 'disabled' : ''}>
          ${this.isWorking ? '检测中...' : '重新检测'}
        </button>

        ${status.installed && !status.registryConfigured ? `
          <button class="action-button configure-mirror-button" ${this.isWorking ? 'disabled' : ''}>
            配置国内镜像
          </button>
        ` : ''}

        ${status.installed && status.registryConfigured ? `
          <button class="action-button secondary reset-registry-button" ${this.isWorking ? 'disabled' : ''}>
            重置为官方源
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * 生成高级选项HTML
   */
  private generateAdvancedOptionsHTML(): string {
    if (!this.config.showAdvancedOptions) {
      return `
        <div class="advanced-toggle">
          <button class="toggle-advanced">显示高级选项</button>
        </div>
      `;
    }

    return `
      <div class="advanced-section">
        <h4 class="advanced-title">高级选项</h4>

        <div class="option-group">
          <label class="option-item">
            <input type="checkbox" ${this.config.autoInstall ? 'checked' : ''} data-option="autoInstall">
            自动安装/更新Node.js
          </label>

          <label class="option-item">
            <input type="checkbox" ${this.config.enableMirror ? 'checked' : ''} data-option="enableMirror">
            自动配置国内镜像源
          </label>
        </div>

        <div class="version-selector">
          <label class="version-label">首选Node.js版本:</label>
          <select class="version-select" data-option="preferredVersion">
            <option value="18.x" ${this.config.preferredVersion === '18.x' ? 'selected' : ''}>18.x (推荐)</option>
            <option value="20.x" ${this.config.preferredVersion === '20.x' ? 'selected' : ''}>20.x (最新)</option>
            <option value="16.x" ${this.config.preferredVersion === '16.x' ? 'selected' : ''}>16.x (稳定)</option>
          </select>
        </div>

        <button class="toggle-advanced">隐藏高级选项</button>
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
    installButton?.addEventListener('click', () => this.installNodeJs());

    // 检测按钮
    const detectButton = this.container.querySelector('.detect-button');
    detectButton?.addEventListener('click', () => this.detectNodeJs());

    // 配置镜像按钮
    const configureMirrorButton = this.container.querySelector('.configure-mirror-button');
    configureMirrorButton?.addEventListener('click', () => this.configureNpmRegistry());

    // 重置镜像源按钮
    const resetRegistryButton = this.container.querySelector('.reset-registry-button');
    resetRegistryButton?.addEventListener('click', () => this.resetToOfficialRegistry());

    // 高级选项切换
    const toggleAdvanced = this.container.querySelector('.toggle-advanced');
    toggleAdvanced?.addEventListener('click', () => {
      this.config.showAdvancedOptions = !this.config.showAdvancedOptions;
      this.render();
    });

    // 配置选项
    const optionInputs = this.container.querySelectorAll('[data-option]');
    optionInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement | HTMLSelectElement;
        const option = target.getAttribute('data-option') as keyof NodeJsInstallConfig;

        if (target.type === 'checkbox') {
          (this.config as any)[option] = (target as HTMLInputElement).checked;
        } else {
          (this.config as any)[option] = target.value;
        }
      });
    });
  }

  /**
   * 获取状态图标
   */
  private getStatusIcon(status: NodeJsStatus): string {
    if (!status.installed) return '❌';
    if (!status.compatible) return '⚠️';
    return '✅';
  }

  /**
   * 获取状态标题
   */
  private getStatusTitle(status: NodeJsStatus): string {
    if (!status.installed) return 'Node.js未安装';
    if (!status.compatible) return 'Node.js版本过旧';
    return 'Node.js已就绪';
  }

  /**
   * 获取状态消息
   */
  private getStatusMessage(status: NodeJsStatus): string {
    if (!status.installed) {
      return '需要安装Node.js才能使用Claude CLI';
    }
    if (!status.compatible) {
      return `当前版本 ${status.version} 过旧，建议升级到 ${this.config.preferredVersion}`;
    }
    return `Node.js ${status.version} 已安装并兼容`;
  }

  /**
   * 获取阶段标题
   */
  private getStageTitle(stage: InstallProgress['stage']): string {
    const titles = {
      detecting: '检测中',
      downloading: '下载中',
      installing: '安装中',
      configuring: '配置中',
      completed: '完成'
    };
    return titles[stage] || '处理中';
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取安装状态
   */
  getStatus(): NodeJsStatus | null {
    return this.status;
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
    console.log('Node.js安装组件已销毁');
  }
}

/**
 * 全局Node.js安装组件实例
 */
export const nodeJsInstallComponent = new NodeJsInstallComponent();

/**
 * 导出类型定义
 */
export type { NodeJsInstallConfig, NodeJsStatus, InstallProgress };