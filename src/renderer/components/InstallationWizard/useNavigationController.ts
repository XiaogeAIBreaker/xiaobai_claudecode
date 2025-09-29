/**
 * T027: 实现导航控制逻辑
 * 为安装向导提供统一的导航控制和状态管理
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { InstallStep, StepStatus, InstallerStatus } from '../../../shared/types/installer';
import { InstallationUIState } from '../../../shared/types/ui';
import { InstallationUIStateManager } from '../../../shared/store/ui-state-manager';
import { StateValidator } from '../../../shared/utils/state-validator';

/**
 * 导航控制器配置选项
 */
export interface NavigationControllerOptions {
  uiStateManager?: InstallationUIStateManager;
  onStepChange?: (step: InstallStep) => void;
  onComplete?: () => void;
  onCancel?: () => void;
  enableValidation?: boolean;
}

/**
 * 导航控制器返回值
 */
export interface NavigationControllerReturn {
  // 当前状态
  currentStep: InstallStep;
  currentStepIndex: number;
  totalSteps: number;
  uiState: InstallationUIState;

  // 导航能力
  canGoBack: boolean;
  canGoForward: boolean;
  canCancel: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;

  // 步骤状态
  isStepCompleted: (step: InstallStep) => boolean;
  isStepFailed: (step: InstallStep) => boolean;
  isStepRunning: (step: InstallStep) => boolean;
  getCurrentStepStatus: () => StepStatus;

  // 导航方法
  goToNextStep: () => Promise<boolean>;
  goToPreviousStep: () => Promise<boolean>;
  goToStep: (step: InstallStep) => Promise<boolean>;
  resetToStep: (step: InstallStep) => Promise<boolean>;

  // 步骤控制
  startStep: (step: InstallStep) => Promise<boolean>;
  completeStep: (step: InstallStep, data?: any) => Promise<boolean>;
  failStep: (step: InstallStep, error?: string) => Promise<boolean>;
  skipStep: (step: InstallStep, reason?: string) => Promise<boolean>;

  // 工具方法
  getStepIndex: (step: InstallStep) => number;
  getStepByIndex: (index: number) => InstallStep | undefined;
  getAllSteps: () => InstallStep[];
  getCompletedSteps: () => InstallStep[];
  getFailedSteps: () => InstallStep[];
}

/**
 * 安装向导导航控制器hook
 * 提供完整的导航控制和步骤状态管理功能
 */
export const useNavigationController = (
  options: NavigationControllerOptions = {}
): NavigationControllerReturn => {
  const {
    uiStateManager: providedManager,
    onStepChange,
    onComplete,
    onCancel,
    enableValidation = true
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

  // 步骤定义和计算
  const allSteps = Object.values(InstallStep);
  const totalSteps = allSteps.length;
  const currentStep = uiState.currentStep;
  const currentStepIndex = allSteps.indexOf(currentStep);

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  // 计算导航能力
  const canGoBack = useMemo(() => {
    if (isFirstStep) return false;

    // 检查是否有步骤正在运行
    const currentStepState = uiState.stepStates[currentStep];
    if (currentStepState?.status === StepStatus.RUNNING) return false;

    // 检查是否有前置步骤可以返回
    for (let i = currentStepIndex - 1; i >= 0; i--) {
      const stepStatus = uiState.stepStates[allSteps[i]]?.status;
      if (stepStatus === StepStatus.SUCCESS || stepStatus === StepStatus.SKIPPED) {
        return true;
      }
    }

    return false;
  }, [isFirstStep, currentStepIndex, uiState.stepStates, currentStep, allSteps]);

  const canGoForward = useMemo(() => {
    if (isLastStep) return false;

    // 检查当前步骤是否已完成
    const currentStepState = uiState.stepStates[currentStep];
    return currentStepState?.status === StepStatus.SUCCESS;
  }, [isLastStep, currentStep, uiState.stepStates]);

  const canCancel = useMemo(() => {
    // 正在运行的步骤通常不能取消
    const currentStepState = uiState.stepStates[currentStep];
    return currentStepState?.status !== StepStatus.RUNNING;
  }, [currentStep, uiState.stepStates]);

  // 步骤状态查询方法
  const isStepCompleted = useCallback((step: InstallStep): boolean => {
    const stepState = uiState.stepStates[step];
    return stepState?.status === StepStatus.SUCCESS;
  }, [uiState.stepStates]);

  const isStepFailed = useCallback((step: InstallStep): boolean => {
    const stepState = uiState.stepStates[step];
    return stepState?.status === StepStatus.FAILED;
  }, [uiState.stepStates]);

  const isStepRunning = useCallback((step: InstallStep): boolean => {
    const stepState = uiState.stepStates[step];
    return stepState?.status === StepStatus.RUNNING;
  }, [uiState.stepStates]);

  const getCurrentStepStatus = useCallback((): StepStatus => {
    return uiState.stepStates[currentStep]?.status || StepStatus.PENDING;
  }, [uiState.stepStates, currentStep]);

  // 验证步骤转换
  const validateStepTransition = useCallback(
    (fromStep: InstallStep, toStep: InstallStep): boolean => {
      if (!enableValidation) return true;

      const fromIndex = allSteps.indexOf(fromStep);
      const toIndex = allSteps.indexOf(toStep);

      // 验证导航合法性
      const result = StateValidator.validateStepNavigation(
        fromStep,
        toStep,
        uiState.stepStates
      );

      if (!result.isValid) {
        console.warn('步骤导航验证失败:', result.errors);
        return false;
      }

      return true;
    },
    [enableValidation, allSteps, uiState.stepStates]
  );

  // 导航方法
  const goToNextStep = useCallback(async (): Promise<boolean> => {
    if (!canGoForward) return false;

    const nextStepIndex = currentStepIndex + 1;
    const nextStep = allSteps[nextStepIndex];

    if (!nextStep) return false;

    // 验证转换
    if (!validateStepTransition(currentStep, nextStep)) {
      return false;
    }

    try {
      // 如果是最后一步，触发完成回调
      if (nextStepIndex === totalSteps - 1 && onComplete) {
        await onComplete();
      }

      // 更新当前步骤
      uiStateManager.setCurrentStep(nextStep);

      // 触发步骤变化回调
      if (onStepChange) {
        onStepChange(nextStep);
      }

      return true;
    } catch (error) {
      console.error('导航到下一步时出错:', error);
      return false;
    }
  }, [
    canGoForward,
    currentStepIndex,
    allSteps,
    totalSteps,
    validateStepTransition,
    currentStep,
    uiStateManager,
    onStepChange,
    onComplete
  ]);

  const goToPreviousStep = useCallback(async (): Promise<boolean> => {
    if (!canGoBack) return false;

    const previousStepIndex = currentStepIndex - 1;
    const previousStep = allSteps[previousStepIndex];

    if (!previousStep) return false;

    // 验证转换
    if (!validateStepTransition(currentStep, previousStep)) {
      return false;
    }

    try {
      // 更新当前步骤
      uiStateManager.setCurrentStep(previousStep);

      // 触发步骤变化回调
      if (onStepChange) {
        onStepChange(previousStep);
      }

      return true;
    } catch (error) {
      console.error('导航到上一步时出错:', error);
      return false;
    }
  }, [
    canGoBack,
    currentStepIndex,
    allSteps,
    validateStepTransition,
    currentStep,
    uiStateManager,
    onStepChange
  ]);

  const goToStep = useCallback(
    async (targetStep: InstallStep): Promise<boolean> => {
      if (targetStep === currentStep) return true;

      // 验证转换
      if (!validateStepTransition(currentStep, targetStep)) {
        return false;
      }

      try {
        // 更新当前步骤
        uiStateManager.setCurrentStep(targetStep);

        // 触发步骤变化回调
        if (onStepChange) {
          onStepChange(targetStep);
        }

        return true;
      } catch (error) {
        console.error(`导航到步骤 ${targetStep} 时出错:`, error);
        return false;
      }
    },
    [currentStep, validateStepTransition, uiStateManager, onStepChange]
  );

  const resetToStep = useCallback(
    async (targetStep: InstallStep): Promise<boolean> => {
      try {
        // 重置目标步骤及其后续步骤的状态
        const targetIndex = allSteps.indexOf(targetStep);
        for (let i = targetIndex; i < allSteps.length; i++) {
          uiStateManager.updateStepState(allSteps[i], {
            status: StepStatus.PENDING,
            progress: 0,
            message: ''
          });
        }

        // 导航到目标步骤
        return await goToStep(targetStep);
      } catch (error) {
        console.error(`重置到步骤 ${targetStep} 时出错:`, error);
        return false;
      }
    },
    [allSteps, uiStateManager, goToStep]
  );

  // 步骤控制方法
  const startStep = useCallback(
    async (step: InstallStep): Promise<boolean> => {
      try {
        uiStateManager.updateStepState(step, {
          status: StepStatus.RUNNING,
          progress: 0
        });
        return true;
      } catch (error) {
        console.error(`启动步骤 ${step} 时出错:`, error);
        return false;
      }
    },
    [uiStateManager]
  );

  const completeStep = useCallback(
    async (step: InstallStep, data?: any): Promise<boolean> => {
      try {
        uiStateManager.updateStepState(step, {
          status: StepStatus.SUCCESS,
          progress: 100,
          data
        });
        return true;
      } catch (error) {
        console.error(`完成步骤 ${step} 时出错:`, error);
        return false;
      }
    },
    [uiStateManager]
  );

  const failStep = useCallback(
    async (step: InstallStep, error?: string): Promise<boolean> => {
      try {
        uiStateManager.updateStepState(step, {
          status: StepStatus.FAILED,
          message: error || '步骤执行失败'
        });
        return true;
      } catch (error) {
        console.error(`标记步骤 ${step} 失败时出错:`, error);
        return false;
      }
    },
    [uiStateManager]
  );

  const skipStep = useCallback(
    async (step: InstallStep, reason?: string): Promise<boolean> => {
      try {
        uiStateManager.updateStepState(step, {
          status: StepStatus.SKIPPED,
          message: reason || '用户跳过此步骤'
        });
        return true;
      } catch (error) {
        console.error(`跳过步骤 ${step} 时出错:`, error);
        return false;
      }
    },
    [uiStateManager]
  );

  // 工具方法
  const getStepIndex = useCallback(
    (step: InstallStep): number => {
      return allSteps.indexOf(step);
    },
    [allSteps]
  );

  const getStepByIndex = useCallback(
    (index: number): InstallStep | undefined => {
      return allSteps[index];
    },
    [allSteps]
  );

  const getAllSteps = useCallback(() => allSteps, [allSteps]);

  const getCompletedSteps = useCallback(() => {
    return allSteps.filter(step => isStepCompleted(step));
  }, [allSteps, isStepCompleted]);

  const getFailedSteps = useCallback(() => {
    return allSteps.filter(step => isStepFailed(step));
  }, [allSteps, isStepFailed]);

  return {
    // 当前状态
    currentStep,
    currentStepIndex,
    totalSteps,
    uiState,

    // 导航能力
    canGoBack,
    canGoForward,
    canCancel,
    isFirstStep,
    isLastStep,

    // 步骤状态
    isStepCompleted,
    isStepFailed,
    isStepRunning,
    getCurrentStepStatus,

    // 导航方法
    goToNextStep,
    goToPreviousStep,
    goToStep,
    resetToStep,

    // 步骤控制
    startStep,
    completeStep,
    failStep,
    skipStep,

    // 工具方法
    getStepIndex,
    getStepByIndex,
    getAllSteps,
    getCompletedSteps,
    getFailedSteps
  };
};

export default useNavigationController;