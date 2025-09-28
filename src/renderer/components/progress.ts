/**
 * 进度指示器和状态显示组件
 * 负责显示安装进度、状态更新和用户反馈
 */

/// <reference path="../types/global.d.ts" />

import { EventEmitter } from 'events';
import { IdGenerator } from '../../utils/common';

/**
 * 进度指示器配置接口
 */
interface ProgressConfig {
  showPercentage: boolean;
  showEta: boolean;
  showSpeed: boolean;
  enableAnimation: boolean;
  updateInterval: number;
  theme: 'default' | 'minimal' | 'detailed';
}

/**
 * 进度数据接口
 */
interface ProgressData {
  id: string;
  name: string;
  percentage: number;
  message: string;
  stage: string;
  startTime: Date;
  estimatedTotal?: number;
  currentValue?: number;
  speed?: number;
  eta?: number;
  details?: string[];
}

/**
 * 状态消息接口
 */
interface StatusMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'progress';
  title: string;
  message: string;
  timestamp: Date;
  persistent?: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
}

/**
 * 进度指示器组件类
 */
class ProgressComponent extends EventEmitter {
  private container: HTMLElement | null = null;
  private config: ProgressConfig = {
    showPercentage: true,
    showEta: true,
    showSpeed: false,
    enableAnimation: true,
    updateInterval: 100,
    theme: 'default'
  };

  private progressItems: Map<string, ProgressData> = new Map();
  private statusMessages: StatusMessage[] = [];
  private updateTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  /**
   * 初始化进度指示器组件
   */
  async initialize(containerId: string, config?: Partial<ProgressConfig>): Promise<void> {
    if (this.isInitialized) {
      console.warn('进度指示器组件已经初始化');
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

    // 启动更新定时器
    this.startUpdateTimer();

    this.isInitialized = true;
    console.log('进度指示器组件初始化完成');
  }

  /**
   * 添加进度项
   */
  addProgress(data: Omit<ProgressData, 'startTime'>): void {
    const progressData: ProgressData = {
      ...data,
      startTime: new Date()
    };

    this.progressItems.set(data.id, progressData);
    this.render();
    this.emit('progress-added', progressData);
  }

  /**
   * 更新进度
   */
  updateProgress(id: string, updates: Partial<Omit<ProgressData, 'id' | 'startTime'>>): void {
    const existing = this.progressItems.get(id);
    if (!existing) {
      console.warn(`进度项不存在: ${id}`);
      return;
    }

    const updated = { ...existing, ...updates };

    // 计算ETA和速度
    if (updates.percentage !== undefined) {
      this.calculateMetrics(updated);
    }

    this.progressItems.set(id, updated);
    this.render();
    this.emit('progress-updated', updated);
  }

  /**
   * 完成进度
   */
  completeProgress(id: string, message?: string): void {
    const existing = this.progressItems.get(id);
    if (!existing) return;

    const completed = {
      ...existing,
      percentage: 100,
      message: message || '完成',
      stage: 'completed'
    };

    this.progressItems.set(id, completed);
    this.render();
    this.emit('progress-completed', completed);

    // 延迟移除完成的进度项
    setTimeout(() => {
      this.removeProgress(id);
    }, 3000);
  }

  /**
   * 移除进度项
   */
  removeProgress(id: string): void {
    if (this.progressItems.delete(id)) {
      this.render();
      this.emit('progress-removed', id);
    }
  }

  /**
   * 清除所有进度项
   */
  clearProgress(): void {
    this.progressItems.clear();
    this.render();
    this.emit('progress-cleared');
  }

  /**
   * 添加状态消息
   */
  addStatusMessage(message: Omit<StatusMessage, 'id' | 'timestamp'>): string {
    const id = this.generateId();
    const statusMessage: StatusMessage = {
      ...message,
      id,
      timestamp: new Date()
    };

    this.statusMessages.push(statusMessage);
    this.render();
    this.emit('message-added', statusMessage);

    // 自动移除非持久消息
    if (!message.persistent) {
      setTimeout(() => {
        this.removeStatusMessage(id);
      }, this.getMessageTimeout(message.type));
    }

    return id;
  }

  /**
   * 移除状态消息
   */
  removeStatusMessage(id: string): void {
    const index = this.statusMessages.findIndex(msg => msg.id === id);
    if (index !== -1) {
      const removed = this.statusMessages.splice(index, 1)[0];
      this.render();
      this.emit('message-removed', removed);
    }
  }

  /**
   * 清除所有状态消息
   */
  clearStatusMessages(): void {
    this.statusMessages = [];
    this.render();
    this.emit('messages-cleared');
  }

  /**
   * 显示加载状态
   */
  showLoading(message: string = '加载中...'): string {
    return this.addProgress({
      id: 'loading',
      name: '加载',
      percentage: -1, // 无限进度条
      message,
      stage: 'loading'
    });
  }

  /**
   * 隐藏加载状态
   */
  hideLoading(): void {
    this.removeProgress('loading');
  }

  /**
   * 计算进度指标
   */
  private calculateMetrics(data: ProgressData): void {
    const elapsed = Date.now() - data.startTime.getTime();
    const elapsedSeconds = elapsed / 1000;

    if (data.percentage > 0 && data.percentage < 100) {
      // 计算速度 (百分比/秒)
      data.speed = data.percentage / elapsedSeconds;

      // 计算ETA (秒)
      if (data.speed > 0) {
        data.eta = (100 - data.percentage) / data.speed;
      }
    }
  }

  /**
   * 获取消息超时时间
   */
  private getMessageTimeout(type: StatusMessage['type']): number {
    const timeouts = {
      info: 5000,
      success: 3000,
      warning: 8000,
      error: 10000,
      progress: 0 // 不自动移除
    };
    return timeouts[type];
  }

  /**
   * 启动更新定时器
   */
  private startUpdateTimer(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    this.updateTimer = setInterval(() => {
      if (this.progressItems.size > 0) {
        this.updateMetrics();
      }
    }, this.config.updateInterval);
  }

  /**
   * 更新所有进度项的指标
   */
  private updateMetrics(): void {
    let needsRender = false;

    this.progressItems.forEach(data => {
      if (data.percentage > 0 && data.percentage < 100) {
        const oldEta = data.eta;
        this.calculateMetrics(data);

        // 只有ETA显著变化时才重新渲染
        if (Math.abs((data.eta || 0) - (oldEta || 0)) > 1) {
          needsRender = true;
        }
      }
    });

    if (needsRender) {
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
      <div class="progress-component theme-${this.config.theme}">
        ${this.generateProgressListHTML()}
        ${this.generateStatusMessagesHTML()}
      </div>
    `;
  }

  /**
   * 生成进度列表HTML
   */
  private generateProgressListHTML(): string {
    if (this.progressItems.size === 0) return '';

    const progressHTML = Array.from(this.progressItems.values())
      .map(data => this.generateProgressItemHTML(data))
      .join('');

    return `
      <div class="progress-list">
        ${progressHTML}
      </div>
    `;
  }

  /**
   * 生成单个进度项HTML
   */
  private generateProgressItemHTML(data: ProgressData): string {
    const isIndeterminate = data.percentage < 0;
    const percentage = Math.max(0, Math.min(100, data.percentage));

    return `
      <div class="progress-item ${data.stage}" data-id="${data.id}">
        <div class="progress-header">
          <div class="progress-title">${data.name}</div>
          <div class="progress-controls">
            ${this.config.showPercentage && !isIndeterminate ? `
              <span class="progress-percentage">${Math.round(percentage)}%</span>
            ` : ''}
            ${this.config.showEta && data.eta && data.eta > 0 ? `
              <span class="progress-eta">剩余 ${this.formatTime(data.eta)}</span>
            ` : ''}
            ${this.config.showSpeed && data.speed && data.speed > 0 ? `
              <span class="progress-speed">${data.speed.toFixed(1)}%/s</span>
            ` : ''}
          </div>
        </div>

        <div class="progress-bar-container">
          <div class="progress-bar ${isIndeterminate ? 'indeterminate' : ''}">
            ${isIndeterminate ? `
              <div class="progress-fill indeterminate-fill"></div>
            ` : `
              <div class="progress-fill" style="width: ${percentage}%"></div>
            `}
          </div>
        </div>

        <div class="progress-message">${data.message}</div>

        ${data.details && data.details.length > 0 && this.config.theme === 'detailed' ? `
          <div class="progress-details">
            ${data.details.map(detail => `<div class="detail-line">${detail}</div>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 生成状态消息HTML
   */
  private generateStatusMessagesHTML(): string {
    if (this.statusMessages.length === 0) return '';

    const messagesHTML = this.statusMessages
      .slice(-5) // 只显示最近5条消息
      .map(message => this.generateStatusMessageHTML(message))
      .join('');

    return `
      <div class="status-messages">
        ${messagesHTML}
      </div>
    `;
  }

  /**
   * 生成单个状态消息HTML
   */
  private generateStatusMessageHTML(message: StatusMessage): string {
    return `
      <div class="status-message ${message.type}" data-id="${message.id}">
        <div class="message-icon">${this.getMessageIcon(message.type)}</div>
        <div class="message-content">
          <div class="message-title">${message.title}</div>
          <div class="message-text">${message.message}</div>
          <div class="message-time">${this.formatTimestamp(message.timestamp)}</div>
        </div>
        ${message.action ? `
          <button class="message-action" data-message-id="${message.id}">
            ${message.action.label}
          </button>
        ` : ''}
        <button class="message-close" data-message-id="${message.id}" title="关闭">×</button>
      </div>
    `;
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.container) return;

    // 消息操作按钮
    const actionButtons = this.container.querySelectorAll('.message-action');
    actionButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const messageId = (e.target as HTMLElement).getAttribute('data-message-id');
        if (messageId) {
          const message = this.statusMessages.find(msg => msg.id === messageId);
          if (message?.action) {
            message.action.handler();
          }
        }
      });
    });

    // 消息关闭按钮
    const closeButtons = this.container.querySelectorAll('.message-close');
    closeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const messageId = (e.target as HTMLElement).getAttribute('data-message-id');
        if (messageId) {
          this.removeStatusMessage(messageId);
        }
      });
    });
  }

  /**
   * 获取消息图标
   */
  private getMessageIcon(type: StatusMessage['type']): string {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      progress: '🔄'
    };
    return icons[type];
  }

  /**
   * 格式化时间
   */
  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}秒`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}分${remainingSeconds}秒`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}小时${minutes}分`;
    }
  }

  /**
   * 格式化时间戳
   */
  private formatTimestamp(timestamp: Date): string {
    return timestamp.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return IdGenerator.generatePrefixedId('progress');
  }

  /**
   * 获取当前进度项
   */
  getProgressItems(): ProgressData[] {
    return Array.from(this.progressItems.values());
  }

  /**
   * 获取状态消息
   */
  getStatusMessages(): StatusMessage[] {
    return [...this.statusMessages];
  }

  /**
   * 设置主题
   */
  setTheme(theme: ProgressConfig['theme']): void {
    this.config.theme = theme;
    this.render();
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ProgressConfig>): void {
    this.config = { ...this.config, ...config };

    // 重启定时器如果更新间隔改变
    if (config.updateInterval !== undefined) {
      this.startUpdateTimer();
    }

    this.render();
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    this.removeAllListeners();

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    if (this.container) {
      this.container.innerHTML = '';
    }

    this.progressItems.clear();
    this.statusMessages = [];
    this.isInitialized = false;
    console.log('进度指示器组件已销毁');
  }
}

/**
 * 全局进度指示器组件实例
 */
export const progressComponent = new ProgressComponent();

/**
 * 导出类型定义
 */
export type { ProgressConfig, ProgressData, StatusMessage };