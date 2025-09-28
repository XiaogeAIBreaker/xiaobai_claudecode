/**
 * 全局类型声明
 * 包含Electron API和窗口扩展的类型定义
 */

/**
 * Electron API接口定义
 */
interface ElectronAPI {
  // IPC通信方法
  invoke(channel: string, ...args: any[]): Promise<any>;
  send(channel: string, ...args: any[]): void;
  on(channel: string, listener: (...args: any[]) => void): void;
  removeAllListeners(channel: string): void;

  // 应用程序控制
  quit(): void;
  minimize(): void;
  maximize(): void;
  close(): void;

  // 文件系统操作
  showOpenDialog(options?: any): Promise<any>;
  showSaveDialog(options?: any): Promise<any>;
  showMessageBox(options?: any): Promise<any>;

  // 系统信息
  getSystemInfo(): Promise<{
    platform: string;
    arch: string;
    version: string;
    os: string;
    node: string;
  }>;

  // 安装步骤相关
  startInstallationStep(stepId: string, options?: any): Promise<void>;
  getInstallationProgress(): Promise<any>;

  // 网络检测
  checkNetworkAccess(url: string): Promise<boolean>;
  testNetworkSpeed(): Promise<number>;

  // Node.js环境管理
  checkNodejs(): Promise<boolean>;
  installNodejs(): Promise<void>;

  // Claude CLI相关
  installClaudeCli(): Promise<void>;
  checkClaudeCli(): Promise<boolean>;

  // 配置管理
  getConfig(): Promise<any>;
  setConfig(config: any): Promise<void>;

  // 通知系统
  showNotification(options: {
    title: string;
    body: string;
    type?: 'info' | 'success' | 'warning' | 'error';
  }): void;
}

/**
 * 扩展Window接口
 */
declare global {
  interface Window {
    electronAPI: ElectronAPI;

    // 全局管理器实例（通过script标签暴露）
    uiStateManager?: any;
    router?: any;
    installationStepManager?: any;
    errorBoundary?: any;
    app?: any;
  }
}

/**
 * UI状态相关类型
 */
export interface UIState {
  isLoading: boolean;
  currentTheme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
  notifications: NotificationState[];
  modals: ModalState[];
  navigation: NavigationState;
}

export interface NotificationState {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  timeout?: number;
  persistent?: boolean;
}

export interface ModalState {
  id: string;
  type: string;
  isOpen: boolean;
  data?: any;
}

export interface NavigationState {
  currentPath: string;
  currentIndex: number;
  canGoBack: boolean;
  canGoNext: boolean;
  totalSteps: number;
  progressPercentage: number;
}

/**
 * 路由相关类型
 */
export interface RouteConfig {
  path: string;
  name: string;
  component: string;
  title: string;
  description?: string;
  meta?: {
    requiresAuth?: boolean;
    stepIndex?: number;
    isOptional?: boolean;
    canSkip?: boolean;
  };
}

export interface RouteParams {
  [key: string]: string | number | boolean;
}

/**
 * 安装步骤相关类型
 */
export interface StepState {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  progress: number;
  message: string;
  details?: any;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  canRetry: boolean;
  canSkip: boolean;
}

export interface InstallationSessionState {
  id: string;
  status: 'preparing' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  totalSteps: number;
  completedSteps: number;
  currentStepIndex: number;
  overallProgress: number;
  estimatedTimeRemaining?: number;
}

/**
 * 错误处理相关类型
 */
export interface ErrorInfo {
  id: string;
  timestamp: Date;
  type: string;
  message: string;
  stack?: string;
  context?: any;
  handled: boolean;
}

export interface ErrorHandlerConfig {
  enableLogging: boolean;
  enableReporting: boolean;
  maxErrorHistory: number;
  autoRecover: boolean;
}

/**
 * 应用程序状态类型
 */
export interface AppState {
  isInitialized: boolean;
  currentRoute: string;
  isLoading: boolean;
  error: Error | null;
}

// 确保这是一个模块
export {};