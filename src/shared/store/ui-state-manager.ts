/**
 * UI状态管理器架构
 * T003: 为安装向导UI状态管理提供核心架构
 */

import { InstallStep, StepStatus, InstallerState } from '../types/installer';
import { InstallationUIState, StepUIState, ActionBarState, ButtonState, UIStateRules } from '../types/ui';

/**
 * UI状态管理器接口
 * 定义了UI状态管理的核心方法
 */
export interface UIStateManager {
  /**
   * 获取当前UI状态
   */
  getCurrentState(): InstallationUIState;

  /**
   * 更新UI状态
   * @param updates 需要更新的状态部分
   */
  updateState(updates: Partial<InstallationUIState>): void;

  /**
   * 根据安装器状态计算UI状态
   * @param installerState 安装器状态
   */
  computeUIState(installerState: InstallerState): InstallationUIState;

  /**
   * 订阅UI状态变更
   * @param callback 状态变更时的回调函数
   * @returns 取消订阅的函数
   */
  subscribe(callback: (state: InstallationUIState) => void): () => void;

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
   * @param installerState 安装器状态
   * @returns 操作栏状态
   */
  computeActionBarState(installerState: InstallerState): ActionBarState;

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
  computeStepUIState(stepState: any): StepUIState;

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

/**
 * UI状态计算器
 * 提供各种UI状态计算的静态方法
 */
export class UIStateCalculator {
  /**
   * 默认的UI状态转换规则
   */
  private static readonly DEFAULT_RULES: UIStateRules = {
    stepStatusMapping: {
      [StepStatus.PENDING]: {
        showSpinner: false,
        showCheckmark: false,
        showErrorIcon: false,
        progressPercent: 0,
        statusColor: 'default'
      },
      [StepStatus.RUNNING]: {
        showSpinner: true,
        showCheckmark: false,
        showErrorIcon: false,
        progressPercent: 50,
        statusColor: 'info'
      },
      [StepStatus.SUCCESS]: {
        showSpinner: false,
        showCheckmark: true,
        showErrorIcon: false,
        progressPercent: 100,
        statusColor: 'success'
      },
      [StepStatus.FAILED]: {
        showSpinner: false,
        showCheckmark: false,
        showErrorIcon: true,
        progressPercent: 0,
        statusColor: 'error'
      },
      [StepStatus.SKIPPED]: {
        showSpinner: false,
        showCheckmark: false,
        showErrorIcon: false,
        progressPercent: 100,
        statusColor: 'warning'
      }
    },
    actionBarRules: {
      firstStep: {
        canNavigatePrevious: false,
        buttons: {
          previous: {
            visible: false,
            enabled: false,
            label: '上一步',
            variant: 'secondary'
          },
          next: {
            visible: true,
            enabled: false, // 将根据步骤状态动态设置
            label: '下一步',
            variant: 'primary'
          }
        }
      },
      lastStep: {
        canNavigatePrevious: true,
        nextActionType: 'complete',
        buttons: {
          previous: {
            visible: true,
            enabled: true,
            label: '上一步',
            variant: 'secondary'
          },
          next: {
            visible: true,
            enabled: false, // 将根据步骤状态动态设置
            label: '完成安装',
            variant: 'primary'
          }
        }
      },
      middleStep: {
        canNavigatePrevious: true,
        canNavigateNext: false, // 将根据步骤状态动态设置
        buttons: {
          previous: {
            visible: true,
            enabled: true,
            label: '上一步',
            variant: 'secondary'
          },
          next: {
            visible: true,
            enabled: false, // 将根据步骤状态动态设置
            label: '下一步',
            variant: 'primary'
          }
        }
      }
    },
    buttonStateRules: {
      onSuccess: {
        enabled: true,
        variant: 'primary'
      },
      onFailure: {
        enabled: false,
        variant: 'disabled'
      },
      onRunning: {
        enabled: false,
        variant: 'disabled',
        loading: true
      },
      onPending: {
        enabled: false,
        variant: 'disabled'
      }
    }
  };

  /**
   * 计算按钮状态
   * @param baseState 基础按钮状态
   * @param stepStatus 步骤状态
   * @returns 计算后的按钮状态
   */
  static computeButtonState(baseState: ButtonState, stepStatus: StepStatus): ButtonState {
    const rules = this.DEFAULT_RULES.buttonStateRules;
    let stateUpdate: Partial<ButtonState> = {};

    switch (stepStatus) {
      case StepStatus.SUCCESS:
        stateUpdate = rules.onSuccess;
        break;
      case StepStatus.FAILED:
        stateUpdate = rules.onFailure;
        break;
      case StepStatus.RUNNING:
        stateUpdate = rules.onRunning;
        break;
      case StepStatus.PENDING:
      case StepStatus.SKIPPED:
        stateUpdate = rules.onPending;
        break;
    }

    return {
      ...baseState,
      ...stateUpdate
    };
  }

  /**
   * 计算ActionBar状态
   * @param stepIndex 当前步骤索引
   * @param totalSteps 总步骤数
   * @param currentStepStatus 当前步骤状态
   * @returns ActionBar状态
   */
  static computeActionBarState(
    stepIndex: number,
    totalSteps: number,
    currentStepStatus: StepStatus
  ): ActionBarState {
    const rules = this.DEFAULT_RULES.actionBarRules;
    let baseState: Partial<ActionBarState>;

    // 根据步骤位置选择基础规则
    if (stepIndex === 0) {
      baseState = rules.firstStep;
    } else if (stepIndex === totalSteps - 1) {
      baseState = rules.lastStep;
    } else {
      baseState = rules.middleStep;
    }

    // 创建完整的状态对象
    const actionBarState: ActionBarState = {
      stepIndex,
      totalSteps,
      canNavigateNext: currentStepStatus === StepStatus.SUCCESS,
      canNavigatePrevious: stepIndex > 0,
      nextActionType: stepIndex === totalSteps - 1 ? 'complete' :
                     currentStepStatus === StepStatus.SUCCESS ? 'next' : 'disabled',
      buttons: {
        previous: baseState.buttons?.previous || {
          visible: stepIndex > 0,
          enabled: stepIndex > 0,
          label: '上一步',
          variant: 'secondary'
        },
        next: baseState.buttons?.next || {
          visible: true,
          enabled: currentStepStatus === StepStatus.SUCCESS,
          label: stepIndex === totalSteps - 1 ? '完成安装' : '下一步',
          variant: 'primary'
        }
      },
      progressIndicator: {
        showStepCounter: true,
        showProgressBar: true,
        progressStyle: 'stepped'
      }
    };

    // 应用步骤状态到按钮
    actionBarState.buttons.next = this.computeButtonState(
      actionBarState.buttons.next,
      currentStepStatus
    );

    return actionBarState;
  }

  /**
   * 计算步骤UI状态
   * @param stepState 步骤状态
   * @returns 步骤UI状态
   */
  static computeStepUIState(stepState: any): StepUIState {
    const statusMapping = this.DEFAULT_RULES.stepStatusMapping[stepState.status];

    return {
      ...stepState,
      inlineButtons: {
        continueInstall: {
          visible: false, // 核心改动：移除"继续安装"按钮
          enabled: false
        },
        retry: {
          visible: stepState.status === StepStatus.FAILED,
          enabled: stepState.status === StepStatus.FAILED
        },
        skip: stepState.skippable ? {
          visible: true,
          enabled: stepState.status !== StepStatus.RUNNING
        } : undefined
      },
      uiIndicators: {
        ...statusMapping,
        progressPercent: stepState.progress || statusMapping.progressPercent
      },
      interaction: {
        interactive: stepState.status !== StepStatus.RUNNING,
        awaitingInput: stepState.status === StepStatus.PENDING,
        showHelp: stepState.status === StepStatus.FAILED
      }
    };
  }
}

/**
 * 默认UI状态管理器完整实现 (T016)
 */
export class InstallationUIStateManager implements UIStateManager {
  private static instance: InstallationUIStateManager | null = null;
  private currentState: InstallationUIState;
  private subscribers: Set<(state: InstallationUIState) => void> = new Set();
  private readonly TOTAL_STEPS = 7; // 7个安装步骤

  constructor(initialState?: Partial<InstallationUIState>) {
    this.currentState = this.createInitialState(initialState);
  }

  /**
   * 获取单例实例
   */
  static getInstance(): InstallationUIStateManager {
    if (!InstallationUIStateManager.instance) {
      InstallationUIStateManager.instance = new InstallationUIStateManager();
    }
    return InstallationUIStateManager.instance;
  }

  private createInitialState(overrides?: Partial<InstallationUIState>): InstallationUIState {
    const defaultState: InstallationUIState = {
      currentStep: InstallStep.NETWORK_CHECK,
      actionBar: {
        previousButton: {
          visible: false,
          enabled: false,
          label: '上一步',
          variant: 'secondary'
        },
        nextButton: {
          visible: true,
          enabled: false,
          label: '下一步',
          variant: 'primary'
        }
      },
      stepStates: this.createInitialStepStates(),
      settings: {
        showProgress: true,
        enableAnimations: true,
        showDetailedLogs: false
      }
    };

    return {
      ...defaultState,
      ...overrides
    };
  }

  private createInitialStepStates(): Record<InstallStep, StepUIState> {
    const steps = Object.values(InstallStep);
    const stepStates: Record<InstallStep, StepUIState> = {} as any;

    steps.forEach(step => {
      stepStates[step] = {
        stepNumber: step,
        status: StepStatus.PENDING,
        title: this.getStepTitle(step),
        description: this.getStepDescription(step),
        progress: 0,
        skippable: false,
        required: true,
        inlineButtons: {
          continueInstall: {
            visible: false, // 核心改动：默认隐藏
            enabled: false
          },
          retry: {
            visible: false,
            enabled: false
          }
        },
        uiIndicators: {
          showSpinner: false,
          showCheckmark: false,
          showErrorIcon: false,
          progressPercent: 0,
          statusColor: 'default'
        },
        interaction: {
          interactive: true,
          awaitingInput: false,
          showHelp: false
        }
      };
    });

    return stepStates;
  }

  private getStepTitle(step: InstallStep): string {
    const titles: Record<InstallStep, string> = {
      [InstallStep.NETWORK_CHECK]: '网络检查',
      [InstallStep.NODEJS_INSTALL]: 'Node.js 安装',
      [InstallStep.GOOGLE_SETUP]: 'Google 设置',
      [InstallStep.CLAUDE_CLI_SETUP]: 'Claude CLI 设置',
      [InstallStep.API_CONFIGURATION]: 'API 配置',
      [InstallStep.TESTING]: '系统测试',
      [InstallStep.COMPLETION]: '安装完成'
    };
    return titles[step];
  }

  private getStepDescription(step: InstallStep): string {
    const descriptions: Record<InstallStep, string> = {
      [InstallStep.NETWORK_CHECK]: '检查网络连接和系统环境',
      [InstallStep.NODEJS_INSTALL]: '安装 Node.js 运行环境',
      [InstallStep.GOOGLE_SETUP]: '配置 Google 相关设置',
      [InstallStep.CLAUDE_CLI_SETUP]: '设置 Claude CLI 工具',
      [InstallStep.API_CONFIGURATION]: '配置 API 密钥和连接',
      [InstallStep.TESTING]: '验证安装和配置',
      [InstallStep.COMPLETION]: '完成安装流程'
    };
    return descriptions[step];
  }

  getCurrentState(): InstallationUIState {
    return { ...this.currentState };
  }

  updateState(updates: Partial<InstallationUIState>): void {
    const oldState = this.currentState;
    this.currentState = {
      ...this.currentState,
      ...updates
    };

    // 如果步骤发生变化，重新计算ActionBar状态
    if (updates.currentStep && updates.currentStep !== oldState.currentStep) {
      this.updateActionBarForCurrentStep();
    }

    this.notifySubscribers();
  }

  computeUIState(installerState: InstallerState): InstallationUIState {
    const stepIndex = this.getStepIndex(installerState.currentStep);
    const currentStepState = installerState.steps[installerState.currentStep];

    // 计算ActionBar状态
    const actionBarState = UIStateCalculator.computeActionBarState(
      stepIndex,
      this.TOTAL_STEPS,
      currentStepState.status
    );

    // 计算所有步骤的UI状态
    const stepStates: Record<InstallStep, StepUIState> = {} as any;
    Object.keys(installerState.steps).forEach(stepKey => {
      const step = stepKey as InstallStep;
      const stepState = installerState.steps[step];
      stepStates[step] = UIStateCalculator.computeStepUIState(stepState);
    });

    return {
      currentStep: installerState.currentStep,
      actionBar: {
        previousButton: actionBarState.buttons.previous,
        nextButton: actionBarState.buttons.next
      },
      stepStates,
      settings: this.currentState.settings // 保持用户设置
    };
  }

  subscribe(callback: (state: InstallationUIState) => void): () => void {
    this.subscribers.add(callback);
    // 立即调用一次回调，提供当前状态
    callback(this.getCurrentState());

    return () => {
      this.subscribers.delete(callback);
    };
  }

  reset(): void {
    this.currentState = this.createInitialState();
    this.notifySubscribers();
  }

  // T016 新增方法：步骤导航
  navigateToStep(targetStep: InstallStep): boolean {
    const targetIndex = this.getStepIndex(targetStep);
    const currentIndex = this.getStepIndex(this.currentState.currentStep);

    // 只能向前导航到下一步，或向后导航
    if (targetIndex === currentIndex + 1 || targetIndex < currentIndex) {
      this.updateState({ currentStep: targetStep });
      return true;
    }

    return false;
  }

  // T016 新增方法：更新步骤状态
  updateStepState(step: InstallStep, updates: Partial<StepUIState>): void {
    const newStepStates = {
      ...this.currentState.stepStates,
      [step]: {
        ...this.currentState.stepStates[step],
        ...updates
      }
    };

    this.updateState({ stepStates: newStepStates });
  }

  // T016 新增方法：获取ActionBar控制器
  getActionBarController(): ActionBarController {
    return new InstallationActionBarController(this);
  }

  private getStepIndex(step: InstallStep): number {
    const steps = Object.values(InstallStep);
    return steps.indexOf(step);
  }

  private updateActionBarForCurrentStep(): void {
    const stepIndex = this.getStepIndex(this.currentState.currentStep);
    const currentStepState = this.currentState.stepStates[this.currentState.currentStep];

    const actionBarState = UIStateCalculator.computeActionBarState(
      stepIndex,
      this.TOTAL_STEPS,
      currentStepState.status
    );

    this.currentState.actionBar = {
      previousButton: actionBarState.buttons.previous,
      nextButton: actionBarState.buttons.next
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      try {
        callback(this.getCurrentState());
      } catch (error) {
        console.error('UI状态订阅者回调错误:', error);
      }
    });
  }

  /**
   * 设置当前步骤
   */
  setCurrentStep(step: InstallStep): void {
    this.updateState({ currentStep: step });
  }

  /**
   * 强制更新UI状态
   */
  forceUpdate(): void {
    this.notifySubscribers();
  }

  /**
   * 通知所有订阅者
   */
  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.currentState));
  }
}

/**
 * ActionBar控制器实现 (T016)
 */
export class InstallationActionBarController implements ActionBarController {
  constructor(private uiStateManager: InstallationUIStateManager) {}

  computeActionBarState(installerState: InstallerState): ActionBarState {
    const stepIndex = this.getStepIndex(installerState.currentStep);
    const currentStepState = installerState.steps[installerState.currentStep];

    return UIStateCalculator.computeActionBarState(
      stepIndex,
      7, // 总步骤数
      currentStepState.status
    );
  }

  async handlePreviousStep(): Promise<boolean> {
    const currentState = this.uiStateManager.getCurrentState();
    const currentIndex = this.getStepIndex(currentState.currentStep);

    if (currentIndex > 0) {
      const steps = Object.values(InstallStep);
      const previousStep = steps[currentIndex - 1];
      return this.uiStateManager.navigateToStep(previousStep);
    }

    return false;
  }

  async handleNextStep(): Promise<boolean> {
    const currentState = this.uiStateManager.getCurrentState();
    const currentStepState = currentState.stepStates[currentState.currentStep];

    // 只有当前步骤成功时才能继续
    if (currentStepState.status === StepStatus.SUCCESS) {
      const currentIndex = this.getStepIndex(currentState.currentStep);
      const steps = Object.values(InstallStep);

      if (currentIndex < steps.length - 1) {
        const nextStep = steps[currentIndex + 1];
        return this.uiStateManager.navigateToStep(nextStep);
      } else {
        // 最后一步，完成安装
        return true;
      }
    }

    return false;
  }

  canNavigateToStep(targetStep: InstallStep): boolean {
    const currentState = this.uiStateManager.getCurrentState();
    const targetIndex = this.getStepIndex(targetStep);
    const currentIndex = this.getStepIndex(currentState.currentStep);

    // 可以向后导航，或向前导航到下一步（如果当前步骤成功）
    if (targetIndex < currentIndex) {
      return true;
    }

    if (targetIndex === currentIndex + 1) {
      const currentStepState = currentState.stepStates[currentState.currentStep];
      return currentStepState.status === StepStatus.SUCCESS;
    }

    return false;
  }

  private getStepIndex(step: InstallStep): number {
    const steps = Object.values(InstallStep);
    return steps.indexOf(step);
  }
}