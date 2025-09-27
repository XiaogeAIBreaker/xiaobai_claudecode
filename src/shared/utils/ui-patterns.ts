/**
 * T047: UI模式工具 - 代码重构
 * 提供通用的UI组件模式，减少重复代码
 */

import { AlertColor } from '@mui/material';

/**
 * 通用状态类型
 */
export type Status = 'idle' | 'loading' | 'success' | 'error' | 'warning';

/**
 * 操作结果接口
 */
export interface OperationResult {
  success: boolean;
  message: string;
  details?: string;
  data?: any;
}

/**
 * 通知配置接口
 */
export interface NotificationConfig {
  title: string;
  message: string;
  type: AlertColor;
  duration?: number;
  actions?: NotificationAction[];
}

/**
 * 通知操作接口
 */
export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
}

/**
 * 步骤状态配置
 */
export interface StepConfig {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  optional?: boolean;
  disabled?: boolean;
}

/**
 * 对话框配置接口
 */
export interface DialogConfig {
  title: string;
  content: string;
  type?: 'info' | 'warning' | 'error' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * 进度配置接口
 */
export interface ProgressConfig {
  value: number;
  label?: string;
  showPercentage?: boolean;
  showETA?: boolean;
  estimatedTime?: number;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
}

/**
 * UI状态管理工具类
 */
export class UIStateManager {
  private static instance: UIStateManager;
  private statusMap: Map<string, Status> = new Map();
  private listeners: Map<string, Set<(status: Status) => void>> = new Map();

  static getInstance(): UIStateManager {
    if (!UIStateManager.instance) {
      UIStateManager.instance = new UIStateManager();
    }
    return UIStateManager.instance;
  }

  /**
   * 设置组件状态
   */
  setStatus(componentId: string, status: Status): void {
    const previousStatus = this.statusMap.get(componentId);
    if (previousStatus !== status) {
      this.statusMap.set(componentId, status);
      this.notifyListeners(componentId, status);
    }
  }

  /**
   * 获取组件状态
   */
  getStatus(componentId: string): Status {
    return this.statusMap.get(componentId) || 'idle';
  }

  /**
   * 监听状态变化
   */
  subscribe(componentId: string, callback: (status: Status) => void): () => void {
    if (!this.listeners.has(componentId)) {
      this.listeners.set(componentId, new Set());
    }
    this.listeners.get(componentId)!.add(callback);

    // 返回取消订阅函数
    return () => {
      this.listeners.get(componentId)?.delete(callback);
    };
  }

  /**
   * 批量设置状态
   */
  setBatchStatus(statusMap: Record<string, Status>): void {
    Object.entries(statusMap).forEach(([componentId, status]) => {
      this.setStatus(componentId, status);
    });
  }

  /**
   * 清除所有状态
   */
  clearAll(): void {
    this.statusMap.clear();
    this.listeners.clear();
  }

  private notifyListeners(componentId: string, status: Status): void {
    const listeners = this.listeners.get(componentId);
    if (listeners) {
      listeners.forEach(callback => callback(status));
    }
  }
}

/**
 * 通用错误处理工具
 */
export class UIErrorHandler {
  /**
   * 格式化错误消息
   */
  static formatError(error: Error | string): {
    title: string;
    message: string;
    details?: string;
  } {
    if (typeof error === 'string') {
      return {
        title: '操作失败',
        message: error
      };
    }

    // 解析常见错误类型
    const message = error.message;

    if (message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
      return {
        title: '网络连接错误',
        message: '无法连接到服务器，请检查网络连接',
        details: message
      };
    }

    if (message.includes('EACCES') || message.includes('EPERM')) {
      return {
        title: '权限错误',
        message: '操作需要管理员权限，请以管理员身份运行',
        details: message
      };
    }

    if (message.includes('ENOSPC')) {
      return {
        title: '磁盘空间不足',
        message: '磁盘空间不足，请清理后重试',
        details: message
      };
    }

    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      return {
        title: '操作超时',
        message: '操作超时，请重试或检查网络连接',
        details: message
      };
    }

    return {
      title: '未知错误',
      message: message || '发生了未知错误',
      details: error.stack
    };
  }

  /**
   * 生成错误建议
   */
  static generateSuggestions(error: Error | string): string[] {
    const message = typeof error === 'string' ? error : error.message;
    const suggestions: string[] = [];

    if (message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
      suggestions.push('检查网络连接是否正常');
      suggestions.push('尝试配置代理服务器');
      suggestions.push('检查防火墙设置');
    }

    if (message.includes('EACCES') || message.includes('EPERM')) {
      suggestions.push('以管理员身份运行程序');
      suggestions.push('检查文件权限设置');
      suggestions.push('临时关闭杀毒软件');
    }

    if (message.includes('ENOSPC')) {
      suggestions.push('清理磁盘空间');
      suggestions.push('删除临时文件');
      suggestions.push('移动文件到其他位置');
    }

    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      suggestions.push('检查网络连接稳定性');
      suggestions.push('增加超时时间');
      suggestions.push('稍后重试');
    }

    // 通用建议
    if (suggestions.length === 0) {
      suggestions.push('重新启动应用程序');
      suggestions.push('检查系统日志获取更多信息');
      suggestions.push('联系技术支持');
    }

    return suggestions;
  }
}

/**
 * 格式化工具
 */
export class UIFormatters {
  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * 格式化时间
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  /**
   * 格式化百分比
   */
  static formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * 格式化速度
   */
  static formatSpeed(bytesPerSecond: number): string {
    const formattedSize = UIFormatters.formatFileSize(bytesPerSecond);
    return `${formattedSize}/s`;
  }

  /**
   * 格式化剩余时间
   */
  static formatETA(remainingBytes: number, bytesPerSecond: number): string {
    if (bytesPerSecond === 0) return '计算中...';

    const remainingSeconds = remainingBytes / bytesPerSecond;
    return `剩余 ${UIFormatters.formatDuration(remainingSeconds * 1000)}`;
  }

  /**
   * 格式化状态文本
   */
  static formatStatus(status: Status): { text: string; color: AlertColor } {
    switch (status) {
      case 'idle':
        return { text: '就绪', color: 'info' };
      case 'loading':
        return { text: '进行中...', color: 'info' };
      case 'success':
        return { text: '完成', color: 'success' };
      case 'error':
        return { text: '失败', color: 'error' };
      case 'warning':
        return { text: '警告', color: 'warning' };
      default:
        return { text: '未知', color: 'info' };
    }
  }
}

/**
 * 动画工具
 */
export class UIAnimations {
  /**
   * 淡入动画配置
   */
  static fadeIn(duration: number = 300) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: duration / 1000 }
    };
  }

  /**
   * 滑入动画配置
   */
  static slideIn(direction: 'left' | 'right' | 'up' | 'down' = 'up', duration: number = 300) {
    const distance = 20;
    const transforms = {
      left: { x: -distance, y: 0 },
      right: { x: distance, y: 0 },
      up: { x: 0, y: -distance },
      down: { x: 0, y: distance }
    };

    return {
      initial: { ...transforms[direction], opacity: 0 },
      animate: { x: 0, y: 0, opacity: 1 },
      transition: { duration: duration / 1000 }
    };
  }

  /**
   * 弹跳动画配置
   */
  static bounce(scale: number = 1.1, duration: number = 200) {
    return {
      whileHover: { scale },
      whileTap: { scale: scale * 0.95 },
      transition: { duration: duration / 1000 }
    };
  }

  /**
   * 脉冲动画配置
   */
  static pulse(scale: number = 1.05, duration: number = 1000) {
    return {
      animate: {
        scale: [1, scale, 1],
      },
      transition: {
        duration: duration / 1000,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    };
  }
}

/**
 * 响应式工具
 */
export class UIResponsive {
  /**
   * 获取断点
   */
  static getBreakpoints() {
    return {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536
    };
  }

  /**
   * 检查是否为移动设备
   */
  static isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < this.getBreakpoints().sm;
  }

  /**
   * 检查是否为平板
   */
  static isTablet(): boolean {
    if (typeof window === 'undefined') return false;
    const width = window.innerWidth;
    const breakpoints = this.getBreakpoints();
    return width >= breakpoints.sm && width < breakpoints.lg;
  }

  /**
   * 检查是否为桌面
   */
  static isDesktop(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= this.getBreakpoints().lg;
  }

  /**
   * 获取当前断点
   */
  static getCurrentBreakpoint(): string {
    if (typeof window === 'undefined') return 'md';

    const width = window.innerWidth;
    const breakpoints = this.getBreakpoints();

    if (width >= breakpoints.xl) return 'xl';
    if (width >= breakpoints.lg) return 'lg';
    if (width >= breakpoints.md) return 'md';
    if (width >= breakpoints.sm) return 'sm';
    return 'xs';
  }
}

/**
 * 键盘快捷键工具
 */
export class UIKeyboard {
  private static listeners: Map<string, (event: KeyboardEvent) => void> = new Map();

  /**
   * 注册快捷键
   */
  static registerShortcut(
    key: string,
    callback: (event: KeyboardEvent) => void,
    options: { ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean } = {}
  ): () => void {
    const keyId = this.generateKeyId(key, options);

    const handler = (event: KeyboardEvent) => {
      if (
        event.key === key &&
        event.ctrlKey === !!options.ctrlKey &&
        event.altKey === !!options.altKey &&
        event.shiftKey === !!options.shiftKey
      ) {
        event.preventDefault();
        callback(event);
      }
    };

    this.listeners.set(keyId, handler);
    document.addEventListener('keydown', handler);

    // 返回取消注册函数
    return () => {
      document.removeEventListener('keydown', handler);
      this.listeners.delete(keyId);
    };
  }

  /**
   * 取消所有快捷键
   */
  static clearAllShortcuts(): void {
    this.listeners.forEach(handler => {
      document.removeEventListener('keydown', handler);
    });
    this.listeners.clear();
  }

  private static generateKeyId(
    key: string,
    options: { ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean }
  ): string {
    const modifiers = [];
    if (options.ctrlKey) modifiers.push('ctrl');
    if (options.altKey) modifiers.push('alt');
    if (options.shiftKey) modifiers.push('shift');

    return `${modifiers.join('+')}+${key}`;
  }
}

/**
 * 本地存储工具
 */
export class UIStorage {
  /**
   * 保存UI状态
   */
  static saveUIState(key: string, state: any): void {
    try {
      localStorage.setItem(`ui-state-${key}`, JSON.stringify(state));
    } catch (error) {
      console.warn('保存UI状态失败:', error);
    }
  }

  /**
   * 加载UI状态
   */
  static loadUIState<T>(key: string, defaultValue: T): T {
    try {
      const saved = localStorage.getItem(`ui-state-${key}`);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (error) {
      console.warn('加载UI状态失败:', error);
      return defaultValue;
    }
  }

  /**
   * 清除UI状态
   */
  static clearUIState(key: string): void {
    try {
      localStorage.removeItem(`ui-state-${key}`);
    } catch (error) {
      console.warn('清除UI状态失败:', error);
    }
  }

  /**
   * 清除所有UI状态
   */
  static clearAllUIStates(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('ui-state-'));
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('清除所有UI状态失败:', error);
    }
  }
}

/**
 * 获取UI状态管理器实例
 */
export const uiStateManager = UIStateManager.getInstance();