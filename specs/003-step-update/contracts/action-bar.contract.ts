/**
 * ActionBar组件合约
 * 定义了底部操作栏的行为规范和接口契约
 */

// ============================================================================
// ActionBar行为合约
// ============================================================================

/**
 * ActionBar行为规范
 * 定义了操作栏在不同状态下应该表现的行为
 */
export interface ActionBarBehaviorContract {
  /**
   * 第一步时的行为
   * - "上一步"按钮应该被禁用或隐藏
   * - "下一步"按钮根据步骤状态启用/禁用
   */
  readonly FIRST_STEP_BEHAVIOR: {
    previousButton: {
      visible: false;
      enabled: false;
    };
    nextButton: {
      visible: true;
      enabled: boolean; // 依赖于步骤状态
    };
  };

  /**
   * 中间步骤时的行为
   * - "上一步"按钮启用
   * - "下一步"按钮根据步骤状态启用/禁用
   */
  readonly MIDDLE_STEP_BEHAVIOR: {
    previousButton: {
      visible: true;
      enabled: true;
    };
    nextButton: {
      visible: true;
      enabled: boolean; // 依赖于步骤状态
    };
  };

  /**
   * 最后一步时的行为
   * - "上一步"按钮启用
   * - "下一步"变为"完成安装"
   */
  readonly LAST_STEP_BEHAVIOR: {
    previousButton: {
      visible: true;
      enabled: true;
    };
    nextButton: {
      visible: true;
      enabled: boolean; // 依赖于步骤状态
      label: '完成安装';
    };
  };
}

/**
 * ActionBar状态计算规则
 */
export interface ActionBarStateRules {
  /**
   * 计算"上一步"按钮状态
   * @param stepIndex 当前步骤索引 (0-6)
   * @param isCurrentStepRunning 当前步骤是否正在运行
   * @returns 按钮状态
   */
  computePreviousButtonState(
    stepIndex: number,
    isCurrentStepRunning: boolean
  ): ButtonState;

  /**
   * 计算"下一步"按钮状态
   * @param stepIndex 当前步骤索引 (0-6)
   * @param currentStepStatus 当前步骤状态
   * @param totalSteps 总步骤数
   * @returns 按钮状态
   */
  computeNextButtonState(
    stepIndex: number,
    currentStepStatus: StepStatus,
    totalSteps: number
  ): ButtonState;

  /**
   * 验证状态转换的有效性
   * @param fromStep 源步骤
   * @param toStep 目标步骤
   * @param installState 当前安装状态
   * @returns 是否允许转换
   */
  isValidTransition(
    fromStep: InstallStep,
    toStep: InstallStep,
    installState: InstallState
  ): boolean;
}

// ============================================================================
// 事件处理合约
// ============================================================================

/**
 * ActionBar事件处理接口
 */
export interface ActionBarEventHandlers {
  /**
   * 处理"上一步"按钮点击
   * 前置条件：
   * - 按钮必须是启用状态
   * - 当前步骤不能是第一步
   * - 当前步骤不能正在运行
   *
   * 后置条件：
   * - 成功：UI导航到上一步
   * - 失败：显示错误消息，保持当前状态
   */
  onPreviousClick(): Promise<NavigationResult>;

  /**
   * 处理"下一步"按钮点击
   * 前置条件：
   * - 按钮必须是启用状态
   * - 当前步骤状态必须是SUCCESS
   * - 没有阻塞性错误
   *
   * 后置条件：
   * - 成功：UI导航到下一步
   * - 最后一步：完成安装流程
   * - 失败：显示错误消息，保持当前状态
   */
  onNextClick(): Promise<NavigationResult>;

  /**
   * 处理键盘快捷键
   * - Alt + Left: 上一步
   * - Alt + Right: 下一步
   * - Enter: 下一步（当前步骤完成时）
   */
  onKeyboardShortcut(key: KeyboardEvent): Promise<NavigationResult>;
}

/**
 * 导航结果接口
 */
export interface NavigationResult {
  success: boolean;
  targetStep?: InstallStep;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// ============================================================================
// 样式和渲染合约
// ============================================================================

/**
 * ActionBar样式规范
 */
export interface ActionBarStyleContract {
  /**
   * 容器样式要求
   */
  readonly CONTAINER_STYLES: {
    position: 'fixed' | 'sticky';
    bottom: number;
    width: '100%';
    background: string;
    borderTop: string;
    padding: string;
    zIndex: number;
  };

  /**
   * 按钮样式要求
   */
  readonly BUTTON_STYLES: {
    primary: CSSProperties;    // "下一步"/"完成安装"按钮
    secondary: CSSProperties;  // "上一步"按钮
    disabled: CSSProperties;   // 禁用状态
  };

  /**
   * 响应式断点
   */
  readonly RESPONSIVE_BREAKPOINTS: {
    mobile: number;   // 小屏幕下的样式调整
    tablet: number;   // 中等屏幕下的样式调整
    desktop: number;  // 大屏幕下的样式调整
  };
}

/**
 * ActionBar渲染契约
 */
export interface ActionBarRenderContract {
  /**
   * 必须渲染的元素
   */
  readonly REQUIRED_ELEMENTS: [
    'container',      // 主容器
    'button-group',   // 按钮组
    'previous-button', // 上一步按钮
    'next-button'     // 下一步按钮
  ];

  /**
   * 可选渲染的元素
   */
  readonly OPTIONAL_ELEMENTS: [
    'progress-indicator', // 进度指示器
    'step-counter',      // 步骤计数器
    'help-button'        // 帮助按钮
  ];

  /**
   * 无障碍性要求
   */
  readonly ACCESSIBILITY_REQUIREMENTS: {
    'aria-label': string;
    'role': 'navigation';
    'tabIndex': number;
    'aria-describedby'?: string;
  };
}

// ============================================================================
// 性能合约
// ============================================================================

/**
 * ActionBar性能要求
 */
export interface ActionBarPerformanceContract {
  /**
   * 渲染性能要求
   */
  readonly RENDER_PERFORMANCE: {
    maxRenderTime: 16; // 毫秒 (60fps)
    maxReRenderCount: 3; // 每秒最大重渲染次数
  };

  /**
   * 事件响应性能要求
   */
  readonly EVENT_PERFORMANCE: {
    maxClickResponseTime: 100; // 毫秒
    maxKeyboardResponseTime: 50; // 毫秒
  };

  /**
   * 内存使用要求
   */
  readonly MEMORY_REQUIREMENTS: {
    maxComponentMemory: 1; // MB
    maxEventListenerCount: 5;
  };
}

// ============================================================================
// 测试合约
// ============================================================================

/**
 * ActionBar测试规范
 */
export interface ActionBarTestContract {
  /**
   * 单元测试要求
   */
  readonly UNIT_TESTS: [
    'button-state-calculation',
    'event-handler-validation',
    'style-application',
    'accessibility-compliance'
  ];

  /**
   * 集成测试要求
   */
  readonly INTEGRATION_TESTS: [
    'wizard-navigation-flow',
    'state-synchronization',
    'error-handling',
    'keyboard-navigation'
  ];

  /**
   * E2E测试要求
   */
  readonly E2E_TESTS: [
    'complete-installation-flow',
    'cross-platform-consistency',
    'user-interaction-scenarios',
    'error-recovery-flows'
  ];
}

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 按钮状态接口
 */
export interface ButtonState {
  visible: boolean;
  enabled: boolean;
  label: string;
  variant: 'primary' | 'secondary' | 'disabled';
  loading?: boolean;
}

/**
 * CSS属性类型（简化版）
 */
export interface CSSProperties {
  [key: string]: string | number;
}