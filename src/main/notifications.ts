/**
 * 系统通知和错误处理
 * 提供统一的通知管理、错误处理和用户反馈机制
 */

import { Notification, app, BrowserWindow, dialog, nativeImage } from 'electron';
import { join } from 'path';

/**
 * 通知类型枚举
 */
export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  PROGRESS = 'progress'
}

/**
 * 通知优先级枚举
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 通知选项接口
 */
interface NotificationOptions {
  title: string;
  message: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  timeout?: number;
  persistent?: boolean;
  actionable?: boolean;
  actions?: NotificationAction[];
  icon?: string;
  sound?: boolean;
  silent?: boolean;
}

/**
 * 通知操作接口
 */
interface NotificationAction {
  type: string;
  text: string;
  handler?: () => void;
}

/**
 * 错误级别枚举
 */
export enum ErrorLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * 错误上下文接口
 */
interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  platform?: string;
  version?: string;
  timestamp?: Date;
  stack?: string;
  additionalData?: Record<string, any>;
}

/**
 * 对话框选项接口
 */
interface DialogOptions {
  type: 'info' | 'warning' | 'error' | 'question';
  title: string;
  message: string;
  detail?: string;
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
  icon?: string;
  checkboxLabel?: string;
  checkboxChecked?: boolean;
}

/**
 * 进度通知接口
 */
interface ProgressNotification {
  id: string;
  title: string;
  message: string;
  progress: number; // 0-100
  cancellable?: boolean;
  onCancel?: () => void;
}

/**
 * 通知管理器类
 */
class NotificationManager {
  private notifications = new Map<string, Notification>();
  private progressNotifications = new Map<string, ProgressNotification>();
  private notificationQueue: NotificationOptions[] = [];
  private isProcessingQueue = false;
  private readonly maxQueueSize = 50;

  constructor() {
    this.setupNotificationSupport();
  }

  /**
   * 设置通知支持
   */
  private setupNotificationSupport(): void {
    // 检查通知权限
    if (process.platform === 'darwin' || process.platform === 'win32') {
      // macOS和Windows自动支持通知
      console.log('系统通知支持已启用');
    } else {
      // Linux需要检查桌面环境
      console.log('检查Linux桌面环境通知支持');
    }
  }

  /**
   * 显示通知
   */
  async showNotification(options: NotificationOptions): Promise<string> {
    const notificationId = this.generateNotificationId();

    try {
      // 检查是否支持原生通知
      if (Notification.isSupported()) {
        await this.showNativeNotification(notificationId, options);
      } else {
        // 降级到应用内通知
        await this.showInAppNotification(notificationId, options);
      }

      return notificationId;

    } catch (error) {
      console.error('显示通知失败:', error);
      // 尝试降级方案
      await this.showFallbackNotification(options);
      return notificationId;
    }
  }

  /**
   * 显示原生系统通知
   */
  private async showNativeNotification(id: string, options: NotificationOptions): Promise<void> {
    const notification = new Notification({
      title: options.title,
      body: options.message,
      silent: options.silent || false,
      icon: options.icon || this.getDefaultIcon(options.type),
      urgency: this.mapPriorityToUrgency(options.priority),
      timeoutType: options.persistent ? 'never' : 'default'
    });

    // 设置事件监听器
    notification.on('click', () => {
      console.log(`通知被点击: ${id}`);
      this.bringAppToFront();

      if (options.actionable && options.actions) {
        this.handleNotificationAction(options.actions[0]);
      }
    });

    notification.on('close', () => {
      console.log(`通知已关闭: ${id}`);
      this.notifications.delete(id);
    });

    notification.on('failed', (error) => {
      console.error(`通知发送失败: ${id}`, error);
      this.notifications.delete(id);
    });

    // 显示通知
    notification.show();
    this.notifications.set(id, notification);

    // 设置自动关闭
    if (options.timeout && options.timeout > 0) {
      setTimeout(() => {
        if (this.notifications.has(id)) {
          notification.close();
        }
      }, options.timeout);
    }
  }

  /**
   * 显示应用内通知
   */
  private async showInAppNotification(id: string, options: NotificationOptions): Promise<void> {
    const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];

    if (mainWindow) {
      // 发送到渲染进程显示通知
      mainWindow.webContents.send('notification:show', {
        id,
        ...options
      });

      console.log(`应用内通知已发送: ${id}`);
    } else {
      console.warn('没有可用窗口显示应用内通知');
    }
  }

  /**
   * 显示降级通知（控制台日志）
   */
  private async showFallbackNotification(options: NotificationOptions): Promise<void> {
    const typeIndicator = this.getTypeIndicator(options.type);
    console.log(`${typeIndicator} [通知] ${options.title}: ${options.message}`);
  }

  /**
   * 显示成功通知
   */
  async showSuccess(title: string, message: string, timeout = 5000): Promise<string> {
    return this.showNotification({
      title,
      message,
      type: NotificationType.SUCCESS,
      priority: NotificationPriority.NORMAL,
      timeout,
      sound: false
    });
  }

  /**
   * 显示错误通知
   */
  async showError(title: string, message: string, persistent = true): Promise<string> {
    return this.showNotification({
      title,
      message,
      type: NotificationType.ERROR,
      priority: NotificationPriority.HIGH,
      persistent,
      sound: true
    });
  }

  /**
   * 显示警告通知
   */
  async showWarning(title: string, message: string, timeout = 8000): Promise<string> {
    return this.showNotification({
      title,
      message,
      type: NotificationType.WARNING,
      priority: NotificationPriority.NORMAL,
      timeout,
      sound: false
    });
  }

  /**
   * 显示信息通知
   */
  async showInfo(title: string, message: string, timeout = 5000): Promise<string> {
    return this.showNotification({
      title,
      message,
      type: NotificationType.INFO,
      priority: NotificationPriority.LOW,
      timeout,
      sound: false
    });
  }

  /**
   * 显示进度通知
   */
  async showProgress(id: string, title: string, message: string, progress: number): Promise<void> {
    const progressNotification: ProgressNotification = {
      id,
      title,
      message,
      progress: Math.max(0, Math.min(100, progress))
    };

    this.progressNotifications.set(id, progressNotification);

    // 发送到渲染进程
    const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('notification:progress', progressNotification);
    }

    console.log(`进度通知: ${title} - ${progress}%`);
  }

  /**
   * 更新进度通知
   */
  async updateProgress(id: string, progress: number, message?: string): Promise<void> {
    const notification = this.progressNotifications.get(id);
    if (notification) {
      notification.progress = Math.max(0, Math.min(100, progress));
      if (message) {
        notification.message = message;
      }

      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('notification:progress-update', notification);
      }
    }
  }

  /**
   * 完成进度通知
   */
  async completeProgress(id: string): Promise<void> {
    const notification = this.progressNotifications.get(id);
    if (notification) {
      notification.progress = 100;

      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('notification:progress-complete', notification);
      }

      // 延迟移除
      setTimeout(() => {
        this.progressNotifications.delete(id);
      }, 2000);
    }
  }

  /**
   * 关闭通知
   */
  closeNotification(id: string): void {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.close();
      this.notifications.delete(id);
    }

    if (this.progressNotifications.has(id)) {
      this.progressNotifications.delete(id);

      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('notification:close', { id });
      }
    }
  }

  /**
   * 清除所有通知
   */
  clearAll(): void {
    // 关闭所有原生通知
    this.notifications.forEach(notification => {
      notification.close();
    });
    this.notifications.clear();

    // 清除所有进度通知
    this.progressNotifications.clear();

    // 清除应用内通知
    const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('notification:clear-all');
    }

    console.log('所有通知已清除');
  }

  /**
   * 处理通知操作
   */
  private handleNotificationAction(action: NotificationAction): void {
    if (action.handler) {
      try {
        action.handler();
      } catch (error) {
        console.error('通知操作处理失败:', error);
      }
    }
  }

  /**
   * 将应用带到前台
   */
  private bringAppToFront(): void {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const mainWindow = windows[0];
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  }

  /**
   * 获取默认图标
   */
  private getDefaultIcon(type?: NotificationType): string {
    const iconMap = {
      [NotificationType.SUCCESS]: 'success.png',
      [NotificationType.ERROR]: 'error.png',
      [NotificationType.WARNING]: 'warning.png',
      [NotificationType.INFO]: 'info.png',
      [NotificationType.PROGRESS]: 'progress.png'
    };

    const iconFile = type ? iconMap[type] : 'app.png';
    return join(__dirname, '../assets/icons', iconFile);
  }

  /**
   * 映射优先级到紧急程度
   */
  private mapPriorityToUrgency(priority?: NotificationPriority): 'low' | 'normal' | 'critical' {
    switch (priority) {
      case NotificationPriority.LOW: return 'low';
      case NotificationPriority.HIGH:
      case NotificationPriority.CRITICAL: return 'critical';
      default: return 'normal';
    }
  }

  /**
   * 获取类型指示符
   */
  private getTypeIndicator(type?: NotificationType): string {
    switch (type) {
      case NotificationType.SUCCESS: return '✅';
      case NotificationType.ERROR: return '❌';
      case NotificationType.WARNING: return '⚠️';
      case NotificationType.INFO: return 'ℹ️';
      case NotificationType.PROGRESS: return '🔄';
      default: return '📢';
    }
  }

  /**
   * 生成通知ID
   */
  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 错误处理器类
 */
class ErrorHandler {
  private errorLog: Array<{ timestamp: Date; level: ErrorLevel; message: string; context?: ErrorContext }> = [];
  private readonly maxLogSize = 1000;

  /**
   * 记录错误
   */
  logError(level: ErrorLevel, message: string, error?: Error, context?: ErrorContext): void {
    const logEntry = {
      timestamp: new Date(),
      level,
      message,
      context: {
        ...context,
        platform: process.platform,
        version: app.getVersion(),
        stack: error?.stack
      }
    };

    this.errorLog.push(logEntry);

    // 限制日志大小
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // 控制台输出
    const levelIndicator = this.getLevelIndicator(level);
    console.log(`${levelIndicator} [${level.toUpperCase()}] ${message}`);

    if (error) {
      console.error(error);
    }

    if (context) {
      console.log('上下文:', context);
    }

    // 严重错误显示通知
    if (level === ErrorLevel.ERROR || level === ErrorLevel.FATAL) {
      notificationManager.showError('错误', message);
    }
  }

  /**
   * 处理未捕获的异常
   */
  handleUncaughtException(error: Error): void {
    this.logError(ErrorLevel.FATAL, '未捕获的异常', error, {
      component: 'main-process',
      action: 'uncaught-exception'
    });

    // 显示错误对话框
    this.showErrorDialog({
      type: 'error',
      title: '严重错误',
      message: '应用程序遇到了未处理的错误',
      detail: error.message,
      buttons: ['重启应用', '退出']
    }).then(response => {
      if (response.response === 0) {
        // 重启应用
        app.relaunch();
        app.exit();
      } else {
        // 退出应用
        app.exit(1);
      }
    });
  }

  /**
   * 处理未处理的Promise拒绝
   */
  handleUnhandledRejection(reason: any, promise: Promise<any>): void {
    this.logError(ErrorLevel.ERROR, '未处理的Promise拒绝', undefined, {
      component: 'main-process',
      action: 'unhandled-rejection',
      additionalData: { reason: String(reason) }
    });
  }

  /**
   * 显示错误对话框
   */
  async showErrorDialog(options: DialogOptions): Promise<Electron.MessageBoxReturnValue> {
    const window = BrowserWindow.getFocusedWindow();

    const dialogOptions: Electron.MessageBoxOptions = {
      type: options.type,
      title: options.title,
      message: options.message,
      detail: options.detail,
      buttons: options.buttons || ['确定'],
      defaultId: options.defaultId || 0,
      cancelId: options.cancelId,
      icon: options.icon ? nativeImage.createFromPath(options.icon) : undefined
    };

    if (options.checkboxLabel) {
      dialogOptions.checkboxLabel = options.checkboxLabel;
      dialogOptions.checkboxChecked = options.checkboxChecked;
    }

    return dialog.showMessageBox(window || undefined, dialogOptions);
  }

  /**
   * 获取错误日志
   */
  getErrorLog(): Array<{ timestamp: Date; level: ErrorLevel; message: string; context?: ErrorContext }> {
    return [...this.errorLog];
  }

  /**
   * 清除错误日志
   */
  clearErrorLog(): void {
    this.errorLog = [];
    console.log('错误日志已清除');
  }

  /**
   * 导出错误日志
   */
  async exportErrorLog(filePath?: string): Promise<string> {
    const fs = require('fs').promises;
    const path = require('path');
    const os = require('os');

    const exportPath = filePath || path.join(os.homedir(), 'claude-cli-installer-errors.json');
    const logData = {
      exportTime: new Date().toISOString(),
      platform: process.platform,
      version: app.getVersion(),
      errors: this.errorLog
    };

    await fs.writeFile(exportPath, JSON.stringify(logData, null, 2), 'utf8');
    console.log(`错误日志已导出到: ${exportPath}`);

    return exportPath;
  }

  /**
   * 获取级别指示符
   */
  private getLevelIndicator(level: ErrorLevel): string {
    switch (level) {
      case ErrorLevel.DEBUG: return '🐛';
      case ErrorLevel.INFO: return 'ℹ️';
      case ErrorLevel.WARN: return '⚠️';
      case ErrorLevel.ERROR: return '❌';
      case ErrorLevel.FATAL: return '💀';
      default: return '📝';
    }
  }
}

/**
 * 全局实例
 */
export const notificationManager = new NotificationManager();
export const errorHandler = new ErrorHandler();

/**
 * 初始化通知和错误处理系统
 */
export function initializeNotificationSystem(): void {
  console.log('初始化通知和错误处理系统');

  // 设置全局错误处理
  process.on('uncaughtException', (error) => {
    errorHandler.handleUncaughtException(error);
  });

  process.on('unhandledRejection', (reason, promise) => {
    errorHandler.handleUnhandledRejection(reason, promise);
  });

  console.log('通知和错误处理系统初始化完成');
}

/**
 * 清理通知和错误处理系统
 */
export function cleanupNotificationSystem(): void {
  console.log('清理通知和错误处理系统');

  notificationManager.clearAll();
  errorHandler.clearErrorLog();

  console.log('通知和错误处理系统清理完成');
}

/**
 * 导出类型定义
 */
export type {
  NotificationOptions,
  NotificationAction,
  ErrorContext,
  DialogOptions,
  ProgressNotification
};