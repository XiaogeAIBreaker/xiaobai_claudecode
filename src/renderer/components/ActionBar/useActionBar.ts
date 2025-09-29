/**
 * T022: 实现ActionBar hooks
 * 为ActionBar组件提供状态管理和行为逻辑
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { InstallStep, StepStatus } from '../../../shared/types/installer';
import { ButtonState, InstallationUIState } from '../../../shared/types/ui';
import { InstallationUIStateManager } from '../../../shared/store/ui-state-manager';
import { ButtonStateCalculator } from '../../../shared/utils/button-state-calculator';
import { UIEventHandler } from '../../../shared/utils/ui-event-handler';

/**
 * ActionBar hook的配置选项
 */
export interface UseActionBarOptions {
  uiStateManager?: InstallationUIStateManager;
  onCancel?: () => void;
  onComplete?: () => void;
  enableKeyboardShortcuts?: boolean;
}

/**
 * ActionBar hook的返回值
 */
export interface UseActionBarReturn {
  // 状态
  uiState: InstallationUIState;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  currentStepIndex: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;

  // 按钮状态
  previousButton: ButtonState;
  nextButton: ButtonState;

  // 事件处理器
  handlePreviousClick: () => void;
  handleNextClick: () => void;
  handleKeyPress: (event: KeyboardEvent) => void;

  // 工具方法
  getStepLabel: (step: InstallStep) => string;
  getStepIndex: (step: InstallStep) => number;
  isStepCompleted: (step: InstallStep) => boolean;
}

/**
 * ActionBar组件的主要hook
 * 管理ActionBar的状态和行为逻辑
 */
export const useActionBar = (options: UseActionBarOptions = {}): UseActionBarReturn => {
  const {
    uiStateManager: providedManager,
    onCancel,
    onComplete,
    enableKeyboardShortcuts = true
  } = options;

  // 获取或创建UI状态管理器实例
  const uiStateManager = useMemo(() => {
    return providedManager || InstallationUIStateManager.getInstance();
  }, [providedManager]);

  // 订阅UI状态变化
  const [uiState, setUIState] = useState<InstallationUIState>(
    () => uiStateManager.getCurrentState()
  );

  useEffect(() => {
    const unsubscribe = uiStateManager.subscribe(setUIState);
    return unsubscribe;
  }, [uiStateManager]);

  // 计算派生状态
  const stepsList = Object.values(InstallStep);
  const currentStepIndex = stepsList.indexOf(uiState.currentStep);
  const totalSteps = stepsList.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  const currentStepState = uiState.stepStates[uiState.currentStep];
  const isLoading = currentStepState?.status === StepStatus.RUNNING;

  // 计算导航能力
  const canGoBack = useMemo(() => {
    if (isFirstStep || isLoading) return false;

    // 检查是否有前置步骤已完成
    for (let i = 0; i < currentStepIndex; i++) {
      const stepStatus = uiState.stepStates[stepsList[i]]?.status;
      if (stepStatus === StepStatus.SUCCESS || stepStatus === StepStatus.SKIPPED) {
        return true;
      }
    }
    return false;
  }, [isFirstStep, isLoading, currentStepIndex, uiState.stepStates, stepsList]);

  const canGoForward = useMemo(() => {
    if (isLoading) return false;

    // 当前步骤必须成功才能前进
    const currentStatus = currentStepState?.status;
    return currentStatus === StepStatus.SUCCESS;
  }, [isLoading, currentStepState?.status]);

  // 计算按钮状态
  const { previous: previousButton, next: nextButton } = useMemo(() => {
    return ButtonStateCalculator.computeActionBarButtons(
      currentStepIndex,
      totalSteps,
      currentStepState?.status || StepStatus.PENDING
    );
  }, [currentStepIndex, totalSteps, currentStepState?.status]);

  // 事件处理器
  const handlePreviousClick = useCallback(() => {
    if (!canGoBack) return;

    try {
      UIEventHandler.handleButtonClick('previous', uiStateManager);
    } catch (error) {
      console.error('处理上一步点击事件时出错:', error);
    }
  }, [canGoBack, uiStateManager]);

  const handleNextClick = useCallback(() => {
    if (!canGoForward) return;

    try {
      if (isLastStep && onComplete) {
        onComplete();
      } else {
        UIEventHandler.handleButtonClick('next', uiStateManager);
      }
    } catch (error) {
      console.error('处理下一步点击事件时出错:', error);
    }
  }, [canGoForward, isLastStep, onComplete, uiStateManager]);

  // 键盘事件处理
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (!enableKeyboardShortcuts) return;

    try {
      switch (event.key) {
        case 'ArrowLeft':
        case 'Backspace':
          if (event.altKey && canGoBack) {
            event.preventDefault();
            handlePreviousClick();
          }
          break;

        case 'ArrowRight':
        case 'Enter':
          if (event.altKey && canGoForward) {
            event.preventDefault();
            handleNextClick();
          }
          break;

        case 'Escape':
          if (onCancel) {
            event.preventDefault();
            onCancel();
          }
          break;
      }
    } catch (error) {
      console.error('处理键盘事件时出错:', error);
    }
  }, [enableKeyboardShortcuts, canGoBack, canGoForward, handlePreviousClick, handleNextClick, onCancel]);

  // 注册键盘事件监听器
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => handleKeyPress(event);

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress, enableKeyboardShortcuts]);

  // 工具方法
  const getStepLabel = useCallback((step: InstallStep): string => {
    const labels: Record<InstallStep, string> = {
      [InstallStep.NETWORK_CHECK]: '网络检测',
      [InstallStep.NODEJS_INSTALL]: 'Node.js安装',
      [InstallStep.GOOGLE_SETUP]: 'Google设置',
      [InstallStep.CLAUDE_CLI_SETUP]: 'Claude CLI设置',
      [InstallStep.API_CONFIGURATION]: 'API配置',
      [InstallStep.TESTING]: '测试验证',
      [InstallStep.COMPLETION]: '安装完成'
    };
    return labels[step] || step;
  }, []);

  const getStepIndex = useCallback((step: InstallStep): number => {
    return stepsList.indexOf(step);
  }, [stepsList]);

  const isStepCompleted = useCallback((step: InstallStep): boolean => {
    const stepState = uiState.stepStates[step];
    return stepState?.status === StepStatus.SUCCESS || stepState?.status === StepStatus.SKIPPED;
  }, [uiState.stepStates]);

  return {
    // 状态
    uiState,
    isLoading,
    canGoBack,
    canGoForward,
    currentStepIndex,
    totalSteps,
    isFirstStep,
    isLastStep,

    // 按钮状态
    previousButton,
    nextButton,

    // 事件处理器
    handlePreviousClick,
    handleNextClick,
    handleKeyPress,

    // 工具方法
    getStepLabel,
    getStepIndex,
    isStepCompleted
  };
};

/**
 * 简化的ActionBar hook，提供基本功能
 */
export const useSimpleActionBar = () => {
  return useActionBar({
    enableKeyboardShortcuts: true
  });
};

/**
 * 带有取消和完成回调的ActionBar hook
 */
export const useActionBarWithCallbacks = (
  onCancel?: () => void,
  onComplete?: () => void
) => {
  return useActionBar({
    onCancel,
    onComplete,
    enableKeyboardShortcuts: true
  });
};

export default useActionBar;