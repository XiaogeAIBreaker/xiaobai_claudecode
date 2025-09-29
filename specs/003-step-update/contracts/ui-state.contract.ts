/**
 * UI状态管理合约
 * 定义了UI状态相关的接口和事件处理合约
 */

// ============================================================================
// UI状态管理接口合约
// ============================================================================

/**
 * UI状态管理器接口
 * 负责管理整个安装向导的UI状态
 */
export interface UIStateManager {
  /**
   * 获取当前UI状态
   * @returns 当前完整的UI状态
   */
  getCurrentState(): UIState;

  /**
   * 更新UI状态
   * @param updates 需要更新的状态部分
   */
  updateState(updates: Partial<UIState>): void;

  /**
   * 订阅UI状态变更
   * @param callback 状态变更时的回调函数
   * @returns 取消订阅的函数
   */
  subscribe(callback: (state: UIState) => void): () => void;

  /**
   * 重置UI状态到初始状态
   */
  reset(): void;
}

/**
 * 操作栏控制器接口
 * 专门管理底部操作栏的状态和行为
 */
export interface ActionBarController {
  /**
   * 计算并返回操作栏当前状态
   * @param installState 安装器状态
   * @returns 操作栏状态
   */
  computeActionBarState(installState: InstallState): ActionBarState;

  /**
   * 处理"上一步"按钮点击
   * @returns Promise<boolean> 操作是否成功
   */
  handlePreviousStep(): Promise<boolean>;

  /**
   * 处理"下一步"按钮点击
   * @returns Promise<boolean> 操作是否成功
   */
  handleNextStep(): Promise<boolean>;

  /**
   * 验证是否可以导航到指定步骤
   * @param targetStep 目标步骤
   * @returns boolean 是否可以导航
   */
  canNavigateToStep(targetStep: InstallStep): boolean;
}

/**
 * 步骤UI控制器接口
 * 管理单个安装步骤的UI行为
 */
export interface StepUIController {
  /**
   * 计算步骤UI状态
   * @param stepState 步骤的安装状态
   * @returns 步骤的UI状态
   */
  computeStepUIState(stepState: StepState): StepUIState;

  /**
   * 处理重试操作
   * @param step 需要重试的步骤
   * @returns Promise<boolean> 重试是否成功启动
   */
  handleRetry(step: InstallStep): Promise<boolean>;

  /**
   * 处理跳过操作
   * @param step 需要跳过的步骤
   * @returns Promise<boolean> 跳过是否成功
   */
  handleSkip(step: InstallStep): Promise<boolean>;
}

// ============================================================================
// 事件处理合约
// ============================================================================

/**
 * UI事件类型定义
 */
export type UIEventType =
  | 'step-transition'
  | 'button-click'
  | 'state-update'
  | 'navigation-request'
  | 'error-occurred';

/**
 * UI事件数据接口
 */
export interface UIEvent {
  type: UIEventType;
  source: 'action-bar' | 'step-component' | 'wizard-controller';
  timestamp: Date;
  data: Record<string, any>;
}

/**
 * UI事件处理器接口
 */
export interface UIEventHandler {
  /**
   * 处理UI事件
   * @param event UI事件
   * @returns Promise<void> 事件处理完成
   */
  handleEvent(event: UIEvent): Promise<void>;

  /**
   * 检查是否可以处理指定类型的事件
   * @param eventType 事件类型
   * @returns boolean 是否可以处理
   */
  canHandle(eventType: UIEventType): boolean;
}

// ============================================================================
// 组件接口合约
// ============================================================================

/**
 * ActionBar组件接口
 */
export interface ActionBarComponent {
  /**
   * 组件属性
   */
  props: {
    state: ActionBarState;
    onPrevious: () => Promise<void>;
    onNext: () => Promise<void>;
    disabled?: boolean;
  };

  /**
   * 渲染方法
   */
  render(): JSX.Element;
}

/**
 * StepComponent组件接口
 */
export interface StepComponent {
  /**
   * 组件属性
   */
  props: {
    step: InstallStep;
    state: StepUIState;
    onRetry?: () => Promise<void>;
    onSkip?: () => Promise<void>;
  };

  /**
   * 渲染方法
   */
  render(): JSX.Element;
}

/**
 * InstallationWizard组件接口
 */
export interface InstallationWizardComponent {
  /**
   * 组件属性
   */
  props: {
    uiState: UIState;
    installState: InstallState;
    onStateChange: (state: UIState) => void;
  };

  /**
   * 渲染方法
   */
  render(): JSX.Element;
}

// ============================================================================
// 验证合约
// ============================================================================

/**
 * UI状态验证器接口
 */
export interface UIStateValidator {
  /**
   * 验证UI状态的有效性
   * @param state UI状态
   * @returns ValidationResult 验证结果
   */
  validateUIState(state: UIState): ValidationResult;

  /**
   * 验证状态转换的有效性
   * @param fromState 原状态
   * @param toState 目标状态
   * @returns ValidationResult 验证结果
   */
  validateStateTransition(fromState: UIState, toState: UIState): ValidationResult;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// 测试合约
// ============================================================================

/**
 * UI测试工具接口
 */
export interface UITestUtils {
  /**
   * 创建模拟的UI状态
   * @param overrides 状态覆盖
   * @returns 模拟的UI状态
   */
  createMockUIState(overrides?: Partial<UIState>): UIState;

  /**
   * 创建模拟的安装状态
   * @param overrides 状态覆盖
   * @returns 模拟的安装状态
   */
  createMockInstallState(overrides?: Partial<InstallState>): InstallState;

  /**
   * 模拟用户交互
   * @param interaction 交互类型
   * @param params 交互参数
   */
  simulateUserInteraction(interaction: string, params?: any): Promise<void>;
}