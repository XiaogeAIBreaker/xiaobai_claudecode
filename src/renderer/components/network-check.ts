/**
 * 网络检查步骤组件
 * 负责网络连接检测，简化界面减少用户困惑
 */

/// <reference path="../types/global.d.ts" />

import { EventEmitter } from 'events';

/**
 * 网络检查配置接口
 */
interface NetworkCheckConfig {
  autoStart: boolean;
  showDetails: boolean;
  enableManualRefresh: boolean;
  timeout: number;
  retryCount: number;
}

/**
 * 检查项目接口
 */
interface CheckItem {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'checking' | 'success' | 'failed' | 'warning';
  message: string;
  details?: any;
  required: boolean;
  canRetry: boolean;
}

/**
 * 网络检查结果接口
 */
interface NetworkCheckResult {
  overall: 'success' | 'failed' | 'warning';
  items: CheckItem[];
  canProceed: boolean;
  recommendations: string[];
}

/**
 * 网络检查组件类
 */
class NetworkCheckComponent extends EventEmitter {
  private container: HTMLElement | null = null;
  private config: NetworkCheckConfig = {
    autoStart: true,
    showDetails: false,
    enableManualRefresh: true,
    timeout: 10000,
    retryCount: 3
  };

  private checkItems: Map<string, CheckItem> = new Map();
  private isChecking = false;
  private result: NetworkCheckResult | null = null;
  private isInitialized = false;

  /**
   * 初始化网络检查组件
   */
  async initialize(containerId: string, config?: Partial<NetworkCheckConfig>): Promise<void> {
    if (this.isInitialized) {
      console.warn('网络检查组件已经初始化');
      return;
    }

    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`容器 #${containerId} 未找到`);
    }

    // 合并配置
    this.config = { ...this.config, ...config };

    // 初始化检查项目
    this.initializeCheckItems();

    // 渲染初始界面
    this.render();

    // 自动开始检查
    if (this.config.autoStart) {
      setTimeout(() => this.startCheck(), 500);
    }

    this.isInitialized = true;
    console.log('网络检查组件初始化完成');
  }

  /**
   * 初始化检查项目
   */
  private initializeCheckItems(): void {
    const items: Omit<CheckItem, 'status' | 'message'>[] = [
      {
        id: 'basic-connectivity',
        name: '基础网络连接',
        description: '检查计算机是否能够连接到互联网',
        required: true,
        canRetry: true
      },
      {
        id: 'dns-resolution',
        name: 'DNS解析',
        description: '检查DNS解析是否正常工作',
        required: true,
        canRetry: true
      },
      {
        id: 'npm-registry',
        name: 'npm镜像源访问',
        description: '检查能否正常访问npm包管理器',
        required: true,
        canRetry: true
      },
      {
        id: 'anthropic-api',
        name: 'Anthropic服务连接',
        description: '检查能否连接到Claude API服务',
        required: false,
        canRetry: true
      }
    ];

    items.forEach(item => {
      this.checkItems.set(item.id, {
        ...item,
        status: 'pending',
        message: '等待检查'
      });
    });
  }

  /**
   * 开始网络检查
   */
  async startCheck(): Promise<void> {
    if (this.isChecking) {
      console.warn('网络检查正在进行中');
      return;
    }

    try {
      this.isChecking = true;
      this.result = null;

      // 重置所有检查项状态
      this.checkItems.forEach(item => {
        item.status = 'pending';
        item.message = '等待检查';
        item.details = undefined;
      });

      this.render();
      this.emit('check-started');

      // 执行检查项目
      await this.performChecks();

      // 生成结果
      this.generateResult();

      // 通知完成
      this.emit('check-completed', this.result);

      console.log('网络检查完成', this.result);

    } catch (error) {
      console.error('网络检查失败:', error);
      this.emit('check-failed', error);

    } finally {
      this.isChecking = false;
      this.render();
    }
  }

  /**
   * 执行所有检查
   */
  private async performChecks(): Promise<void> {
    const items = Array.from(this.checkItems.values());

    // 按顺序执行检查
    for (const item of items) {
      await this.performSingleCheck(item);
      this.render(); // 更新UI显示进度

      // 短暂延迟以改善用户体验
      await this.delay(300);
    }
  }

  /**
   * 执行单个检查
   */
  private async performSingleCheck(item: CheckItem): Promise<void> {
    try {
      item.status = 'checking';
      item.message = '正在检查...';

      const result = await this.executeCheck(item.id);

      item.status = result.success ? 'success' : 'failed';
      item.message = result.message;
      item.details = result.details;

    } catch (error) {
      item.status = 'failed';
      item.message = error instanceof Error ? error.message : '检查失败';
      console.error(`检查项 ${item.id} 失败:`, error);
    }
  }

  /**
   * 执行具体检查逻辑
   */
  private async executeCheck(checkId: string): Promise<{ success: boolean; message: string; details?: any }> {
    if (!window.electronAPI) {
      throw new Error('Electron API不可用');
    }

    switch (checkId) {
      case 'basic-connectivity':
        return this.checkBasicConnectivity();

      case 'dns-resolution':
        return this.checkDnsResolution();

      case 'npm-registry':
        return this.checkNpmRegistry();

      case 'anthropic-api':
        return this.checkAnthropicApi();

      default:
        throw new Error(`未知的检查项: ${checkId}`);
    }
  }

  /**
   * 检查基础网络连接
   */
  private async checkBasicConnectivity(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const result = await window.electronAPI.invoke('installer:network:test-connection', {
        targets: ['https://www.google.com', 'https://www.baidu.com'],
        timeout: this.config.timeout
      });

      const successCount = result.results.filter((r: any) => r.success).length;
      const success = successCount > 0;

      return {
        success,
        message: success ? `网络连接正常 (${successCount}/${result.results.length})` : '无法连接到互联网',
        details: result.results
      };

    } catch (error) {
      return {
        success: false,
        message: '网络连接检查失败',
        details: error
      };
    }
  }

  /**
   * 检查DNS解析
   */
  private async checkDnsResolution(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const result = await window.electronAPI.invoke('installer:network:test-dns', {
        domains: ['google.com', 'github.com', 'npmjs.com']
      });

      const successCount = result.results.filter((r: any) => r.success).length;
      const success = successCount > 0;

      return {
        success,
        message: success ? `DNS解析正常 (${successCount}/${result.results.length})` : 'DNS解析失败',
        details: result.results
      };

    } catch (error) {
      return {
        success: false,
        message: 'DNS解析检查失败',
        details: error
      };
    }
  }

  /**
   * 检查npm镜像源
   */
  private async checkNpmRegistry(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const registries = [
        'https://registry.npmjs.org/',
        'https://registry.npmmirror.com/',
        'https://registry.npm.taobao.org/'
      ];

      const results = [];
      for (const registry of registries) {
        try {
          const result = await window.electronAPI.invoke('installer:network:test-connection', {
            targets: [registry],
            timeout: 5000
          });
          results.push({
            registry,
            success: result.results[0]?.success || false,
            responseTime: result.results[0]?.responseTime
          });
        } catch (error) {
          results.push({
            registry,
            success: false,
            error: error
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const success = successCount > 0;

      return {
        success,
        message: success ? `npm镜像源可访问 (${successCount}/${results.length})` : '无法访问npm镜像源',
        details: results
      };

    } catch (error) {
      return {
        success: false,
        message: 'npm镜像源检查失败',
        details: error
      };
    }
  }

  /**
   * 检查Anthropic API
   */
  private async checkAnthropicApi(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const result = await window.electronAPI.invoke('installer:network:test-connection', {
        targets: ['https://api.anthropic.com'],
        timeout: this.config.timeout
      });

      const success = result.results[0]?.success || false;

      return {
        success,
        message: success ? 'Claude API服务可访问' : 'Claude API服务无法访问（可选）',
        details: result.results[0]
      };

    } catch (error) {
      return {
        success: false,
        message: 'Claude API连接检查失败（可选）',
        details: error
      };
    }
  }

  /**
   * 生成检查结果
   */
  private generateResult(): void {
    const items = Array.from(this.checkItems.values());
    const requiredItems = items.filter(item => item.required);
    const requiredFailures = requiredItems.filter(item => item.status === 'failed');
    const optionalWarnings = items.filter(item => !item.required && item.status === 'failed');

    let overall: 'success' | 'failed' | 'warning';
    let canProceed: boolean;
    const recommendations: string[] = [];

    if (requiredFailures.length === 0) {
      overall = optionalWarnings.length > 0 ? 'warning' : 'success';
      canProceed = true;
    } else {
      overall = 'failed';
      canProceed = false;
      recommendations.push('请检查网络连接后重试');
    }

    // 生成建议
    if (requiredFailures.some(item => item.id === 'basic-connectivity')) {
      recommendations.push('检查网络连接是否正常');
      recommendations.push('尝试关闭防火墙或代理软件');
    }

    if (requiredFailures.some(item => item.id === 'dns-resolution')) {
      recommendations.push('检查DNS设置，可尝试使用8.8.8.8或114.114.114.114');
    }

    if (requiredFailures.some(item => item.id === 'npm-registry')) {
      recommendations.push('将自动配置国内镜像源以加速下载');
    }

    this.result = {
      overall,
      items: [...items],
      canProceed,
      recommendations
    };
  }

  /**
   * 重试失败的检查项
   */
  async retryFailedChecks(): Promise<void> {
    const failedItems = Array.from(this.checkItems.values())
      .filter(item => item.status === 'failed' && item.canRetry);

    if (failedItems.length === 0) {
      console.log('没有可重试的检查项');
      return;
    }

    this.isChecking = true;
    this.render();

    try {
      for (const item of failedItems) {
        await this.performSingleCheck(item);
        this.render();
        await this.delay(300);
      }

      this.generateResult();
      this.emit('check-completed', this.result);

    } finally {
      this.isChecking = false;
      this.render();
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
      <div class="network-check-component">
        ${this.generateHeaderHTML()}
        ${this.generateCheckListHTML()}
        ${this.generateResultHTML()}
        ${this.generateActionsHTML()}
      </div>
    `;
  }

  /**
   * 生成头部HTML
   */
  private generateHeaderHTML(): string {
    return `
      <div class="check-header">
        <h3 class="check-title">
          <span class="check-icon">🌐</span>
          网络环境检测
        </h3>
        <p class="check-description">正在检查网络连接以确保安装过程顺利进行</p>
      </div>
    `;
  }

  /**
   * 生成检查列表HTML
   */
  private generateCheckListHTML(): string {
    const items = Array.from(this.checkItems.values());

    const itemsHTML = items.map(item => `
      <div class="check-item ${item.status}">
        <div class="item-icon">${this.getStatusIcon(item.status)}</div>
        <div class="item-content">
          <div class="item-name">
            ${item.name}
            ${!item.required ? '<span class="optional-tag">可选</span>' : ''}
          </div>
          <div class="item-message">${item.message}</div>
          ${this.config.showDetails && item.details ? `
            <div class="item-details">
              <pre>${JSON.stringify(item.details, null, 2)}</pre>
            </div>
          ` : ''}
        </div>
        ${item.status === 'failed' && item.canRetry ? `
          <button class="retry-button" data-item="${item.id}">重试</button>
        ` : ''}
      </div>
    `).join('');

    return `
      <div class="check-list">
        ${itemsHTML}
      </div>
    `;
  }

  /**
   * 生成结果HTML
   */
  private generateResultHTML(): string {
    if (!this.result || this.isChecking) return '';

    const { overall, canProceed, recommendations } = this.result;

    return `
      <div class="check-result ${overall}">
        <div class="result-header">
          <div class="result-icon">${this.getOverallIcon(overall)}</div>
          <div class="result-title">${this.getOverallTitle(overall)}</div>
        </div>

        ${recommendations.length > 0 ? `
          <div class="recommendations">
            <h4>建议：</h4>
            <ul>
              ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <div class="result-status">
          ${canProceed ? '✅ 可以继续安装' : '❌ 需要解决网络问题后重试'}
        </div>
      </div>
    `;
  }

  /**
   * 生成操作按钮HTML
   */
  private generateActionsHTML(): string {
    const hasFailures = Array.from(this.checkItems.values()).some(item => item.status === 'failed');

    return `
      <div class="check-actions">
        <button class="action-button refresh-button" ${this.isChecking ? 'disabled' : ''}>
          ${this.isChecking ? '检查中...' : '重新检查'}
        </button>

        ${hasFailures && this.config.enableManualRefresh ? `
          <button class="action-button retry-button" ${this.isChecking ? 'disabled' : ''}>
            重试失败项
          </button>
        ` : ''}

        <label class="details-toggle">
          <input type="checkbox" ${this.config.showDetails ? 'checked' : ''}>
          显示详细信息
        </label>
      </div>
    `;
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.container) return;

    // 重新检查按钮
    const refreshButton = this.container.querySelector('.refresh-button');
    refreshButton?.addEventListener('click', () => this.startCheck());

    // 重试失败项按钮
    const retryButton = this.container.querySelector('.retry-button');
    retryButton?.addEventListener('click', () => this.retryFailedChecks());

    // 单个项目重试按钮
    const itemRetryButtons = this.container.querySelectorAll('.retry-button[data-item]');
    itemRetryButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const itemId = (e.target as HTMLElement).getAttribute('data-item');
        if (itemId) this.retryItem(itemId);
      });
    });

    // 详细信息切换
    const detailsToggle = this.container.querySelector('.details-toggle input');
    detailsToggle?.addEventListener('change', (e) => {
      this.config.showDetails = (e.target as HTMLInputElement).checked;
      this.render();
    });
  }

  /**
   * 重试单个项目
   */
  private async retryItem(itemId: string): Promise<void> {
    const item = this.checkItems.get(itemId);
    if (!item || !item.canRetry) return;

    await this.performSingleCheck(item);
    this.generateResult();
    this.render();
  }

  /**
   * 获取状态图标
   */
  private getStatusIcon(status: string): string {
    const icons = {
      pending: '⏳',
      checking: '🔄',
      success: '✅',
      failed: '❌',
      warning: '⚠️'
    };
    return icons[status as keyof typeof icons] || '❓';
  }

  /**
   * 获取整体结果图标
   */
  private getOverallIcon(overall: string): string {
    const icons = {
      success: '🎉',
      warning: '⚠️',
      failed: '❌'
    };
    return icons[overall as keyof typeof icons] || '❓';
  }

  /**
   * 获取整体结果标题
   */
  private getOverallTitle(overall: string): string {
    const titles = {
      success: '网络检查通过',
      warning: '网络检查完成（有警告）',
      failed: '网络检查失败'
    };
    return titles[overall as keyof typeof titles] || '检查结果未知';
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取检查结果
   */
  getResult(): NetworkCheckResult | null {
    return this.result;
  }

  /**
   * 获取检查状态
   */
  isCheckingNetwork(): boolean {
    return this.isChecking;
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
    console.log('网络检查组件已销毁');
  }
}

/**
 * 全局网络检查组件实例
 */
export const networkCheckComponent = new NetworkCheckComponent();

/**
 * 导出类型定义
 */
export type { NetworkCheckConfig, CheckItem, NetworkCheckResult };