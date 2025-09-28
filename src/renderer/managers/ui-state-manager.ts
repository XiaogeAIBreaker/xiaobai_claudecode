/**
 * UI状态管理器
 * 负责管理渲染进程的UI状态和数据
 */

/// <reference path="../types/global.d.ts" />

import { EventEmitter } from 'events';
import { IdGenerator } from '../../utils/common';

/**
 * UI状态接口
 */
interface UIState {
  isLoading: boolean;
  currentTheme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
  notifications: NotificationState[];
  modals: ModalState[];
  navigation: NavigationState;
}

/**
 * 通知状态接口
 */
interface NotificationState {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  timeout?: number;
  persistent?: boolean;
}

/**
 * 模态框状态接口
 */
interface ModalState {
  id: string;
  type: string;
  isOpen: boolean;
  data?: any;
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
 * UI状态管理器类
 */
class UIStateManager extends EventEmitter {
  private state: UIState = {
    isLoading: false,
    currentTheme: 'light',
    language: 'zh-CN',
    notifications: [],
    modals: [],
    navigation: {
      currentPath: '/',
      currentIndex: 0,
      canGoBack: false,
      canGoNext: true,
      totalSteps: 8,
      progressPercentage: 0
    }
  };

  private isInitialized = false;

  /**
   * 初始化管理器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('UI状态管理器已经初始化');
      return;
    }

    // 从本地存储恢复状态
    await this.loadState();

    // 设置自动保存
    this.setupAutoSave();

    this.isInitialized = true;
    console.log('UI状态管理器初始化完成');
  }

  /**
   * 设置加载状态
   */
  setLoading(isLoading: boolean): void {
    this.state.isLoading = isLoading;
    this.emit('state-changed', 'loading', isLoading);
    this.updateUI();
  }

  /**
   * 设置主题
   */
  setTheme(theme: 'light' | 'dark'): void {
    this.state.currentTheme = theme;
    this.emit('state-changed', 'theme', theme);
    this.applyTheme(theme);
    this.saveState();
  }

  /**
   * 设置语言
   */
  setLanguage(language: 'zh-CN' | 'en-US'): void {
    this.state.language = language;
    this.emit('state-changed', 'language', language);
    this.applyLanguage(language);
    this.saveState();
  }

  /**
   * 添加通知
   */
  addNotification(notification: Omit<NotificationState, 'id' | 'timestamp'>): string {
    const id = this.generateId();
    const newNotification: NotificationState = {
      ...notification,
      id,
      timestamp: new Date()
    };

    this.state.notifications.push(newNotification);
    this.emit('notification-added', newNotification);

    // 自动移除非持久通知
    if (!notification.persistent && notification.timeout && notification.timeout > 0) {
      setTimeout(() => {
        this.removeNotification(id);
      }, notification.timeout);
    }

    this.updateUI();
    return id;
  }

  /**
   * 移除通知
   */
  removeNotification(id: string): boolean {
    const index = this.state.notifications.findIndex(n => n.id === id);
    if (index === -1) return false;

    const notification = this.state.notifications[index];
    this.state.notifications.splice(index, 1);
    this.emit('notification-removed', notification);
    this.updateUI();
    return true;
  }

  /**
   * 清除所有通知
   */
  clearNotifications(): void {
    const count = this.state.notifications.length;
    this.state.notifications = [];
    this.emit('notifications-cleared', count);
    this.updateUI();
  }

  /**
   * 打开模态框
   */
  openModal(type: string, data?: any): string {
    const id = this.generateId();
    const modal: ModalState = {
      id,
      type,
      isOpen: true,
      data
    };

    this.state.modals.push(modal);
    this.emit('modal-opened', modal);
    this.updateUI();
    return id;
  }

  /**
   * 关闭模态框
   */
  closeModal(id: string): boolean {
    const index = this.state.modals.findIndex(m => m.id === id);
    if (index === -1) return false;

    const modal = this.state.modals[index];
    modal.isOpen = false;
    this.state.modals.splice(index, 1);
    this.emit('modal-closed', modal);
    this.updateUI();
    return true;
  }

  /**
   * 关闭所有模态框
   */
  closeAllModals(): void {
    const count = this.state.modals.length;
    this.state.modals = [];
    this.emit('modals-closed', count);
    this.updateUI();
  }

  /**
   * 更新导航状态
   */
  updateNavigationState(navigation: Partial<NavigationState>): void {
    this.state.navigation = { ...this.state.navigation, ...navigation };
    this.emit('navigation-state-changed', this.state.navigation);
    this.updateUI();
  }

  /**
   * 获取状态
   */
  getState(): Readonly<UIState> {
    return { ...this.state };
  }

  /**
   * 获取通知列表
   */
  getNotifications(): NotificationState[] {
    return [...this.state.notifications];
  }

  /**
   * 获取模态框列表
   */
  getModals(): ModalState[] {
    return [...this.state.modals];
  }

  /**
   * 获取导航状态
   */
  getNavigationState(): NavigationState {
    return { ...this.state.navigation };
  }

  /**
   * 应用主题
   */
  private applyTheme(theme: 'light' | 'dark'): void {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = document.body.className.replace(/theme-\w+/g, '') + ` theme-${theme}`;
  }

  /**
   * 应用语言
   */
  private applyLanguage(language: 'zh-CN' | 'en-US'): void {
    document.documentElement.setAttribute('lang', language);
    document.body.setAttribute('data-language', language);
  }

  /**
   * 更新UI
   */
  private updateUI(): void {
    // 更新加载状态
    this.updateLoadingState();

    // 更新通知显示
    this.updateNotificationDisplay();

    // 更新模态框显示
    this.updateModalDisplay();

    // 触发UI更新事件
    this.emit('ui-updated', this.state);
  }

  /**
   * 更新加载状态
   */
  private updateLoadingState(): void {
    const appStatus = document.getElementById('app-status');
    if (appStatus) {
      appStatus.textContent = this.state.isLoading ? '加载中...' : '就绪';
      appStatus.className = this.state.isLoading ? 'loading' : 'ready';
    }

    const progressOverlay = document.getElementById('progress-overlay');
    if (progressOverlay) {
      progressOverlay.style.display = this.state.isLoading ? 'flex' : 'none';
    }
  }

  /**
   * 更新通知显示
   */
  private updateNotificationDisplay(): void {
    const container = document.getElementById('notification-container');
    if (!container) return;

    // 清空现有通知
    container.innerHTML = '';

    // 渲染所有通知
    this.state.notifications.forEach(notification => {
      const element = this.createNotificationElement(notification);
      container.appendChild(element);
    });
  }

  /**
   * 创建通知元素
   */
  private createNotificationElement(notification: NotificationState): HTMLElement {
    const element = document.createElement('div');
    element.className = `notification notification-${notification.type}`;
    element.setAttribute('data-id', notification.id);

    element.innerHTML = `
      <div class="notification-content">
        <div class="notification-title">${notification.title}</div>
        <div class="notification-message">${notification.message}</div>
        <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
      </div>
      <button class="notification-close" onclick="uiStateManager.removeNotification('${notification.id}')">×</button>
    `;

    return element;
  }

  /**
   * 更新模态框显示
   */
  private updateModalDisplay(): void {
    // 移除所有现有模态框
    document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());

    // 渲染所有打开的模态框
    this.state.modals.filter(modal => modal.isOpen).forEach(modal => {
      const element = this.createModalElement(modal);
      document.body.appendChild(element);
    });
  }

  /**
   * 创建模态框元素
   */
  private createModalElement(modal: ModalState): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('data-id', modal.id);

    overlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>模态框</h3>
          <button class="modal-close" onclick="uiStateManager.closeModal('${modal.id}')">×</button>
        </div>
        <div class="modal-body">
          <p>模态框内容: ${modal.type}</p>
        </div>
      </div>
    `;

    // 点击背景关闭
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        this.closeModal(modal.id);
      }
    });

    return overlay;
  }

  /**
   * 从本地存储加载状态
   */
  private async loadState(): Promise<void> {
    try {
      if (window.electronAPI) {
        const savedState = await window.electronAPI.invoke('ui-state:load');
        if (savedState) {
          this.state = { ...this.state, ...savedState };
          this.applyTheme(this.state.currentTheme);
          this.applyLanguage(this.state.language);
        }
      }
    } catch (error) {
      console.warn('加载UI状态失败:', error);
    }
  }

  /**
   * 保存状态到本地存储
   */
  private async saveState(): Promise<void> {
    try {
      if (window.electronAPI) {
        const stateToSave = {
          currentTheme: this.state.currentTheme,
          language: this.state.language
        };
        await window.electronAPI.invoke('ui-state:save', stateToSave);
      }
    } catch (error) {
      console.warn('保存UI状态失败:', error);
    }
  }

  /**
   * 设置自动保存
   */
  private setupAutoSave(): void {
    // 每5分钟自动保存一次状态
    setInterval(() => {
      this.saveState();
    }, 5 * 60 * 1000);

    // 窗口关闭前保存状态
    window.addEventListener('beforeunload', () => {
      this.saveState();
    });
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return IdGenerator.generatePrefixedId('ui');
  }

  /**
   * 格式化时间
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.removeAllListeners();
    this.saveState();
    this.isInitialized = false;
    console.log('UI状态管理器已销毁');
  }
}

/**
 * 全局UI状态管理器实例
 */
export const uiStateManager = new UIStateManager();

// 将管理器挂载到全局，便于模板中调用
(window as any).uiStateManager = uiStateManager;

/**
 * 导出类型定义
 */
export type { UIState, NotificationState, ModalState, NavigationState };