/**
 * T013: 安装器和步骤状态类型
 * 基于data-model.md实体定义
 */

/**
 * 安装步骤枚举
 */
export enum InstallStep {
  NETWORK_CHECK = 'network-check',
  NODEJS_INSTALL = 'nodejs-install',
  GOOGLE_SETUP = 'google-setup',
  CLAUDE_CLI_SETUP = 'claude-cli-setup',
  API_CONFIGURATION = 'api-configuration',
  TESTING = 'testing',
  COMPLETION = 'completion'
}

/**
 * 步骤状态枚举
 */
export enum StepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

/**
 * 安装器状态枚举
 */
export enum InstallerStatus {
  INITIALIZING = 'initializing',
  DETECTING = 'detecting',
  DOWNLOADING = 'downloading',
  INSTALLING = 'installing',
  CONFIGURING = 'configuring',
  TESTING = 'testing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * 步骤状态接口
 */
export interface StepState {
  /** 步骤编号 */
  stepNumber: InstallStep;
  /** 步骤状态 */
  status: StepStatus;
  /** 步骤名称 */
  title: string;
  /** 步骤描述 */
  description: string;
  /** 进度百分比 (0-100) */
  progress: number;
  /** 开始时间 */
  startTime?: Date;
  /** 结束时间 */
  endTime?: Date;
  /** 错误信息 */
  error?: string;
  /** 是否可跳过 */
  skippable: boolean;
  /** 是否必需 */
  required: boolean;
  /** 额外数据 */
  data?: Record<string, any>;

  /** UI相关状态 (T002扩展) */
  ui?: {
    /** 用户可见的状态消息 */
    userMessage?: string;
    /** 详细的技术消息 */
    technicalMessage?: string;
    /** 是否显示详细信息 */
    showDetails?: boolean;
    /** 重试次数 */
    retryCount?: number;
    /** 最大重试次数 */
    maxRetries?: number;
    /** 是否用户手动触发 */
    userTriggered?: boolean;
  };
}

/**
 * 安装器状态接口
 */
export interface InstallerState {
  /** 当前状态 */
  status: InstallerStatus;
  /** 当前步骤 */
  currentStep: InstallStep;
  /** 所有步骤状态 */
  steps: Record<InstallStep, StepState>;
  /** 总体进度 (0-100) */
  overallProgress: number;
  /** 开始时间 */
  startTime?: Date;
  /** 结束时间 */
  endTime?: Date;
  /** 是否允许后退 */
  allowBackward: boolean;
  /** 是否自动重试 */
  autoRetry: boolean;
  /** 最大重试次数 */
  maxRetries: number;
  /** 当前重试次数 */
  currentRetries: number;

  /** UI导航状态 (T002扩展) */
  navigation?: {
    /** 是否可以导航到上一步 */
    canNavigatePrevious: boolean;
    /** 是否可以导航到下一步 */
    canNavigateNext: boolean;
    /** 当前步骤索引 */
    currentStepIndex: number;
    /** 已完成的步骤数 */
    completedSteps: number;
    /** 用户界面模式 */
    uiMode: 'wizard' | 'advanced' | 'silent';
  };
}

/**
 * 安装组件接口
 */
export interface InstallerComponent {
  /** 组件名称 */
  name: string;
  /** 组件版本 */
  version?: string;
  /** 是否已安装 */
  installed: boolean;
  /** 安装路径 */
  installPath?: string;
  /** 下载URL */
  downloadUrl?: string;
  /** 文件大小 (字节) */
  fileSize?: number;
  /** 校验和 */
  checksum?: string;
  /** 平台特定信息 */
  platformData?: Record<string, any>;
}

/**
 * 安装进度事件
 */
export interface ProgressEvent {
  /** 事件类型 */
  type: 'download' | 'install' | 'configure' | 'test';
  /** 步骤编号 */
  step: InstallStep;
  /** 进度百分比 */
  progress: number;
  /** 当前操作描述 */
  message: string;
  /** 传输速度 (字节/秒) */
  speed?: number;
  /** 剩余时间 (秒) */
  remainingTime?: number;
  /** 额外数据 */
  data?: Record<string, any>;
}

/**
 * 安装选项接口
 */
export interface InstallOptions {
  /** 安装位置 */
  installLocation?: string;
  /** 跳过的步骤 */
  skipSteps: InstallStep[];
  /** 是否使用代理 */
  useProxy: boolean;
  /** 代理设置 */
  proxyConfig?: {
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
  /** 是否保留下载文件 */
  keepDownloads: boolean;
  /** 是否静默安装 */
  silentMode: boolean;
  /** 自定义下载源 */
  customMirrors?: Record<string, string>;
}

/**
 * 安装结果接口
 */
export interface InstallResult {
  /** 是否成功 */
  success: boolean;
  /** 已安装的组件 */
  installedComponents: InstallerComponent[];
  /** 失败的步骤 */
  failedSteps: InstallStep[];
  /** 总耗时 (毫秒) */
  totalDuration: number;
  /** 错误信息 */
  errors: Array<{
    step: InstallStep;
    message: string;
    code?: string;
    details?: any;
  }>;
  /** 警告信息 */
  warnings: Array<{
    step: InstallStep;
    message: string;
    details?: any;
  }>;
  /** 安装摘要 */
  summary: {
    totalSteps: number;
    successSteps: number;
    failedSteps: number;
    skippedSteps: number;
  };
}
