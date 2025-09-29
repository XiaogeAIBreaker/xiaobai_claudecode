/**
 * T016: GUI界面状态类型
 * 基于data-model.md实体定义
 */

import { InstallStep, StepStatus, StepState } from './installer';
import { ErrorInfo } from './config';

/**
 * 窗口状态
 */
export enum WindowState {
  NORMAL = 'normal',
  MINIMIZED = 'minimized',
  MAXIMIZED = 'maximized',
  FULLSCREEN = 'fullscreen'
}

/**
 * 对话框类型
 */
export enum DialogType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CONFIRM = 'confirm',
  INPUT = 'input'
}

/**
 * 动画状态
 */
export enum AnimationState {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  FINISHED = 'finished'
}

/**
 * 界面主题
 */
export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto'
}

/**
 * GUI界面状态接口
 */
export interface UIState {
  /** 当前主题 */
  theme: Theme;
  /** 语言设置 */
  language: string;
  /** 窗口状态 */
  window: WindowState;
  /** 窗口尺寸 */
  windowSize: {
    width: number;
    height: number;
  };
  /** 窗口位置 */
  windowPosition: {
    x: number;
    y: number;
  };
  /** 是否加载中 */
  loading: boolean;
  /** 加载消息 */
  loadingMessage?: string;
  /** 是否显示侧边栏 */
  sidebarVisible: boolean;
  /** 是否显示详细信息 */
  detailsVisible: boolean;
  /** 当前激活的面板 */
  activePanel: string;
  /** 动画设置 */
  animations: {
    enabled: boolean;
    speed: number;
    state: AnimationState;
  };
}

/**
 * 向导状态接口
 */
export interface WizardState {
  /** 当前步骤 */
  currentStep: InstallStep;
  /** 步骤历史 */
  stepHistory: InstallStep[];
  /** 是否可以后退 */
  canGoBack: boolean;
  /** 是否可以前进 */
  canGoForward: boolean;
  /** 步骤导航 */
  navigation: {
    showStepNumbers: boolean;
    showStepTitles: boolean;
    highlightCurrent: boolean;
    showProgress: boolean;
  };
  /** 自动播放设置 */
  autoPlay: {
    enabled: boolean;
    delay: number; // 毫秒
    pauseOnError: boolean;
  };
}

/**
 * 进度显示状态
 */
export interface ProgressState {
  /** 整体进度 (0-100) */
  overall: number;
  /** 当前步骤进度 (0-100) */
  current: number;
  /** 进度条类型 */
  type: 'linear' | 'circular' | 'stepped';
  /** 是否显示百分比 */
  showPercentage: boolean;
  /** 是否显示速度 */
  showSpeed: boolean;
  /** 是否显示剩余时间 */
  showETA: boolean;
  /** 当前操作描述 */
  currentOperation: string;
  /** 传输速度 */
  speed?: {
    value: number;
    unit: string;
  };
  /** 剩余时间 */
  eta?: {
    value: number;
    unit: string;
  };
}

/**
 * 通知状态接口
 */
export interface NotificationState {
  /** 通知列表 */
  notifications: Notification[];
  /** 最大显示数量 */
  maxVisible: number;
  /** 默认显示时间 (ms) */
  defaultDuration: number;
  /** 是否显示音效 */
  soundEnabled: boolean;
  /** 是否显示桶面通知 */
  desktopNotifications: boolean;
}

/**
 * 通知接口
 */
export interface Notification {
  /** 通知ID */
  id: string;
  /** 通知类型 */
  type: 'info' | 'success' | 'warning' | 'error';
  /** 标题 */
  title: string;
  /** 内容 */
  message: string;
  /** 持续时间 (ms) */
  duration?: number;
  /** 是否可关闭 */
  closable: boolean;
  /** 操作按钮 */
  actions?: Array<{
    label: string;
    action: string;
    primary?: boolean;
  }>;
  /** 创建时间 */
  timestamp: Date;
  /** 是否已读 */
  read: boolean;
}

/**
 * 对话框状态接口
 */
export interface DialogState {
  /** 是否显示对话框 */
  visible: boolean;
  /** 对话框类型 */
  type: DialogType;
  /** 标题 */
  title: string;
  /** 内容 */
  content: string;
  /** 是否模态 */
  modal: boolean;
  /** 是否可拖拽 */
  draggable: boolean;
  /** 是否可调整大小 */
  resizable: boolean;
  /** 按钮配置 */
  buttons: Array<{
    label: string;
    action: string;
    variant: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
  }>;
  /** 输入框配置 (仅对INPUT类型) */
  input?: {
    label: string;
    placeholder: string;
    value: string;
    type: 'text' | 'password' | 'email' | 'number';
    required: boolean;
    validation?: RegExp;
  };
}

/**
 * 二维码显示状态
 */
export interface QRCodeState {
  /** 是否显示二维码 */
  visible: boolean;
  /** 二维码数据 */
  data: string;
  /** 二维码大小 */
  size: number;
  /** 错误纠正级别 */
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  /** 前景色 */
  foregroundColor: string;
  /** 背景色 */
  backgroundColor: string;
  /** 是否包含边框 */
  includeMargin: boolean;
  /** 描述文本 */
  description?: string;
  /** 过期时间 */
  expiresAt?: Date;
  /** 刷新回调 */
  onRefresh?: () => void;
}

/**
 * 键盘快捷键接口
 */
export interface KeyboardShortcut {
  /** 快捷键组合 */
  keys: string[];
  /** 描述 */
  description: string;
  /** 回调函数 */
  action: string;
  /** 是否全局 */
  global: boolean;
  /** 是否禁用 */
  disabled: boolean;
}

/**
 * 辅助功能状态
 */
export interface AccessibilityState {
  /** 屏幕阅读器支持 */
  screenReader: boolean;
  /** 高对比度模式 */
  highContrast: boolean;
  /** 减少动画 */
  reducedMotion: boolean;
  /** 大字体模式 */
  largeText: boolean;
  /** 键盘导航 */
  keyboardNavigation: boolean;
  /** 焦点指示器 */
  focusIndicator: boolean;
  /** 声音反馈 */
  audioFeedback: boolean;
}

/**
 * 综合界面状态
 */
export interface GlobalUIState {
  /** 基本界面状态 */
  ui: UIState;
  /** 向导状态 */
  wizard: WizardState;
  /** 进度状态 */
  progress: ProgressState;
  /** 通知状态 */
  notifications: NotificationState;
  /** 对话框状态 */
  dialog: DialogState;
  /** 二维码状态 */
  qrCode: QRCodeState;
  /** 错误状态 */
  errors: ErrorInfo[];
  /** 快捷键设置 */
  shortcuts: KeyboardShortcut[];
  /** 辅助功能 */
  accessibility: AccessibilityState;
  /** 最后更新时间 */
  lastUpdated: Date;
}

/**
 * 界面事件接口
 */
export interface UIEvent {
  /** 事件类型 */
  type: string;
  /** 事件数据 */
  data?: any;
  /** 事件源 */
  source: string;
  /** 事件时间 */
  timestamp: Date;
  /** 是否可取消 */
  cancelable: boolean;
  /** 取消事件 */
  preventDefault?: () => void;
}

/**
 * UI组件属性接口
 */
export interface ComponentProps {
  /** 组件ID */
  id?: string;
  /** CSS类名 */
  className?: string;
  /** 内联样式 */
  style?: React.CSSProperties;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否可见 */
  visible?: boolean;
  /** 工具提示 */
  tooltip?: string;
  /** 辅助文本 */
  ariaLabel?: string;
  /** 事件处理器 */
  onEvent?: (event: UIEvent) => void;
}

// ============================================================================
// 安装向导专用UI状态类型 (T001扩展)
// ============================================================================

/**
 * 按钮状态接口
 */
export interface ButtonState {
  /** 是否可见 */
  visible: boolean;
  /** 是否启用 */
  enabled: boolean;
  /** 按钮标签 */
  label: string;
  /** 按钮样式变体 */
  variant: 'primary' | 'secondary' | 'disabled';
  /** 是否显示加载状态 */
  loading?: boolean;
}

/**
 * 安装向导UI状态接口
 * 专门管理安装向导的界面状态
 */
export interface InstallationUIState {
  /** 当前激活的步骤 */
  currentStep: InstallStep;

  /** 底部操作栏状态 */
  actionBar: {
    /** 上一步按钮状态 */
    previousButton: ButtonState;
    /** 下一步按钮状态 */
    nextButton: ButtonState;
  };

  /** 每个步骤的UI状态 */
  stepStates: Record<InstallStep, StepUIState>;

  /** 整体UI设置 */
  settings: {
    /** 是否显示进度条 */
    showProgress: boolean;
    /** 是否启用动画 */
    enableAnimations: boolean;
    /** 是否显示详细日志 */
    showDetailedLogs: boolean;
  };
}

/**
 * 步骤UI状态接口
 * 扩展现有StepState以添加UI特定属性
 */
export interface StepUIState extends StepState {
  /** 步骤内按钮显示控制 */
  inlineButtons: {
    /** 继续安装按钮（将被移除） */
    continueInstall: {
      visible: boolean;
      enabled: boolean;
    };
    /** 重试按钮（失败时显示） */
    retry: {
      visible: boolean;
      enabled: boolean;
    };
    /** 跳过按钮（可选步骤） */
    skip?: {
      visible: boolean;
      enabled: boolean;
    };
  };

  /** UI特定的状态指示器 */
  uiIndicators: {
    /** 是否显示旋转器 */
    showSpinner: boolean;
    /** 是否显示成功勾选 */
    showCheckmark: boolean;
    /** 是否显示错误图标 */
    showErrorIcon: boolean;
    /** 进度百分比显示 */
    progressPercent: number;
    /** 状态颜色 */
    statusColor: 'default' | 'success' | 'error' | 'warning' | 'info';
  };

  /** 用户交互状态 */
  interaction: {
    /** 是否可以与用户交互 */
    interactive: boolean;
    /** 是否正在等待用户输入 */
    awaitingInput: boolean;
    /** 是否显示帮助信息 */
    showHelp: boolean;
  };
}

/**
 * 操作栏状态接口
 * 专门管理底部操作栏的状态
 */
export interface ActionBarState {
  /** 当前步骤索引（0-6，对应7个步骤） */
  stepIndex: number;

  /** 总步骤数 */
  totalSteps: number;

  /** 是否允许向前导航 */
  canNavigateNext: boolean;

  /** 是否允许向后导航 */
  canNavigatePrevious: boolean;

  /** 下一步操作类型 */
  nextActionType: 'next' | 'complete' | 'disabled';

  /** 按钮组状态 */
  buttons: {
    previous: ButtonState;
    next: ButtonState;
  };

  /** 进度指示器设置 */
  progressIndicator: {
    /** 是否显示步骤计数器 */
    showStepCounter: boolean;
    /** 是否显示进度条 */
    showProgressBar: boolean;
    /** 进度条样式 */
    progressStyle: 'linear' | 'circular' | 'stepped';
  };
}

/**
 * UI状态转换规则接口
 */
export interface UIStateRules {
  /** 步骤状态到UI状态的映射规则 */
  stepStatusMapping: Record<StepStatus, Partial<StepUIState['uiIndicators']>>;

  /** 操作栏状态计算规则 */
  actionBarRules: {
    /** 第一步特殊规则 */
    firstStep: Partial<ActionBarState>;
    /** 最后一步特殊规则 */
    lastStep: Partial<ActionBarState>;
    /** 中间步骤默认规则 */
    middleStep: Partial<ActionBarState>;
  };

  /** 按钮状态转换规则 */
  buttonStateRules: {
    /** 成功状态按钮配置 */
    onSuccess: Partial<ButtonState>;
    /** 失败状态按钮配置 */
    onFailure: Partial<ButtonState>;
    /** 运行状态按钮配置 */
    onRunning: Partial<ButtonState>;
    /** 等待状态按钮配置 */
    onPending: Partial<ButtonState>;
  };
}
