/**
 * T025: 实现步骤UI状态hooks
 * 为步骤组件提供统一的UI状态管理
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { InstallStep, StepStatus } from '../../../shared/types/installer';
import { StepUIState, ButtonState } from '../../../shared/types/ui';
import { InstallationUIStateManager } from '../../../shared/store/ui-state-manager';
import { ButtonStateCalculator } from '../../../shared/utils/button-state-calculator';

/**
 * 步骤UI hook的配置选项
 */
export interface UseStepUIOptions {
  step: InstallStep;
  uiStateManager?: InstallationUIStateManager;
  onRetry?: () => void;
  onSkip?: () => void;
  maxRetries?: number;
  isSkippable?: boolean;
}

/**
 * 步骤UI hook的返回值
 */
export interface UseStepUIReturn {
  // 步骤状态
  stepState: StepUIState;
  status: StepStatus;
  progress: number;
  isActive: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  isRunning: boolean;
  isPending: boolean;
  isSkipped: boolean;

  // UI指示器状态
  showSpinner: boolean;
  showCheckmark: boolean;
  showErrorIcon: boolean;
  showWarningIcon: boolean;

  // 内联按钮状态
  retryButton: ButtonState;
  skipButton: ButtonState | undefined;
  continueButton: ButtonState; // 已禁用，为了向后兼容

  // 事件处理器
  handleRetry: () => void;
  handleSkip: () => void;

  // 工具方法
  updateProgress: (progress: number) => void;
  updateMessage: (message: string) => void;
  setStatus: (status: StepStatus) => void;
}

/**
 * 步骤UI状态管理hook
 * 为步骤组件提供统一的状态管理和UI逻辑
 */
export const useStepUI = (options: UseStepUIOptions): UseStepUIReturn => {
  const {
    step,
    uiStateManager: providedManager,
    onRetry,
    onSkip,
    maxRetries = 3,
    isSkippable = false
  } = options;

  // 获取或创建UI状态管理器实例
  const uiStateManager = useMemo(() => {
    return providedManager || InstallationUIStateManager.getInstance();
  }, [providedManager]);

  // 获取当前步骤的UI状态
  const [stepState, setStepState] = useState<StepUIState>(() => {
    const currentState = uiStateManager.getCurrentState();
    return currentState.stepStates[step] || createDefaultStepState();
  });

  // 订阅UI状态变化
  useEffect(() => {
    const unsubscribe = uiStateManager.subscribe((state) => {
      const newStepState = state.stepStates[step];
      if (newStepState) {
        setStepState(newStepState);
      }
    });

    return unsubscribe;
  }, [uiStateManager, step]);

  // 计算派生状态
  const status = stepState.status;
  const progress = stepState.progress;

  const isActive = useMemo(() => {
    const currentState = uiStateManager.getCurrentState();
    return currentState.currentStep === step;
  }, [uiStateManager, step]);

  const isCompleted = status === StepStatus.SUCCESS;
  const isFailed = status === StepStatus.FAILED;
  const isRunning = status === StepStatus.RUNNING;
  const isPending = status === StepStatus.PENDING;
  const isSkipped = status === StepStatus.SKIPPED;

  // UI指示器状态
  const showSpinner = stepState.uiIndicators.showSpinner;
  const showCheckmark = stepState.uiIndicators.showCheckmark;
  const showErrorIcon = stepState.uiIndicators.showErrorIcon;
  const showWarningIcon = stepState.uiIndicators.showWarningIcon;

  // 计算按钮状态
  const retryButton = useMemo(() => {
    return ButtonStateCalculator.computeRetryButtonState(
      status,
      stepState.retryCount || 0,
      maxRetries
    );
  }, [status, stepState.retryCount, maxRetries]);

  const skipButton = useMemo(() => {
    return ButtonStateCalculator.computeSkipButtonState(status, isSkippable);
  }, [status, isSkippable]);

  // 继续安装按钮（已禁用）
  const continueButton = useMemo(() => {
    return ButtonStateCalculator.computeContinueInstallButtonState();
  }, []);

  // 事件处理器
  const handleRetry = useCallback(() => {
    if (!retryButton.enabled || !onRetry) return;

    try {
      onRetry();
      // 更新重试次数
      uiStateManager.updateStepState(step, {
        retryCount: (stepState.retryCount || 0) + 1
      });
    } catch (error) {
      console.error(`步骤 ${step} 重试时出错:`, error);
    }
  }, [retryButton.enabled, onRetry, uiStateManager, step, stepState.retryCount]);

  const handleSkip = useCallback(() => {
    if (!skipButton?.enabled || !onSkip) return;

    try {
      onSkip();
      // 更新步骤状态为跳过
      uiStateManager.updateStepState(step, {
        status: StepStatus.SKIPPED,
        message: '用户选择跳过此步骤'
      });
    } catch (error) {
      console.error(`步骤 ${step} 跳过时出错:`, error);
    }
  }, [skipButton?.enabled, onSkip, uiStateManager, step]);

  // 工具方法
  const updateProgress = useCallback((newProgress: number) => {
    uiStateManager.updateStepState(step, { progress: newProgress });
  }, [uiStateManager, step]);

  const updateMessage = useCallback((message: string) => {
    uiStateManager.updateStepState(step, { message });
  }, [uiStateManager, step]);

  const setStatus = useCallback((newStatus: StepStatus) => {
    uiStateManager.updateStepState(step, { status: newStatus });
  }, [uiStateManager, step]);

  return {
    // 步骤状态
    stepState,
    status,
    progress,
    isActive,
    isCompleted,
    isFailed,
    isRunning,
    isPending,
    isSkipped,

    // UI指示器状态
    showSpinner,
    showCheckmark,
    showErrorIcon,
    showWarningIcon,

    // 内联按钮状态
    retryButton,
    skipButton,
    continueButton,

    // 事件处理器
    handleRetry,
    handleSkip,

    // 工具方法
    updateProgress,
    updateMessage,
    setStatus
  };
};

/**
 * 简化的步骤状态hook，只提供状态查询功能
 */
export const useStepStatus = (step: InstallStep) => {
  const { status, isActive, isCompleted, isFailed, isRunning } = useStepUI({
    step,
    isSkippable: false
  });

  return {
    status,
    isActive,
    isCompleted,
    isFailed,
    isRunning
  };
};

/**
 * 带重试功能的步骤UI hook
 */
export const useRetryableStepUI = (
  step: InstallStep,
  onRetry: () => void,
  maxRetries: number = 3
) => {
  return useStepUI({
    step,
    onRetry,
    maxRetries,
    isSkippable: false
  });
};

/**
 * 可跳过的步骤UI hook
 */
export const useSkippableStepUI = (
  step: InstallStep,
  onSkip: () => void,
  onRetry?: () => void
) => {
  return useStepUI({
    step,
    onRetry,
    onSkip,
    isSkippable: true
  });
};

/**
 * 创建默认的步骤状态
 */
function createDefaultStepState(): StepUIState {
  return {
    status: StepStatus.PENDING,
    progress: 0,
    message: '',
    uiIndicators: {
      showSpinner: false,
      showCheckmark: false,
      showErrorIcon: false,
      showWarningIcon: false
    },
    inlineButtons: {
      retry: {
        visible: false,
        enabled: false,
        label: '重试',
        variant: 'secondary'
      },
      skip: {
        visible: false,
        enabled: false,
        label: '跳过',
        variant: 'secondary'
      },
      continueInstall: {
        visible: false, // 核心要求：禁用继续安装按钮
        enabled: false,
        label: '继续安装',
        variant: 'disabled'
      }
    },
    retryCount: 0,
    maxRetries: 3,
    isSkippable: false
  };
}

export default useStepUI;