/**
 * T028: 集成UI状态与安装器状态
 * 统一管理UI状态和安装器状态的同步
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { InstallStep, StepStatus, InstallerState, InstallerStatus } from '../../shared/types/installer';
import { InstallationUIState } from '../../shared/types/ui';
import { InstallationUIStateManager } from '../../shared/store/ui-state-manager';
import { StateValidator } from '../../shared/utils/state-validator';

/**
 * 安装状态集成配置
 */
export interface InstallationStateOptions {
  enableAutoSync?: boolean;
  syncInterval?: number;
  enableValidation?: boolean;
  onSyncError?: (error: Error) => void;
  onValidationError?: (errors: string[]) => void;
}

/**
 * 安装状态集成返回值
 */
export interface InstallationStateReturn {
  // UI状态
  uiState: InstallationUIState;
  uiStateManager: InstallationUIStateManager;

  // 安装器状态（模拟）
  installerState: InstallerState;
  installerStatus: InstallerStatus;

  // 同步状态
  isSynced: boolean;
  lastSyncTime: Date | null;
  syncErrors: string[];

  // 控制方法
  syncStates: () => Promise<boolean>;
  forceUIUpdate: () => void;
  forceInstallerUpdate: () => void;
  resetStates: () => void;

  // 验证方法
  validateSync: () => boolean;
  getSyncReport: () => string;
}

/**
 * 安装状态集成hook
 * 管理UI状态和安装器状态之间的同步
 */
export const useInstallationState = (
  options: InstallationStateOptions = {}
): InstallationStateReturn => {
  const {
    enableAutoSync = true,
    syncInterval = 1000, // 1秒同步一次
    enableValidation = true,
    onSyncError,
    onValidationError
  } = options;

  // 获取UI状态管理器
  const uiStateManager = useMemo(() => {
    return InstallationUIStateManager.getInstance();
  }, []);

  // UI状态
  const [uiState, setUIState] = useState<InstallationUIState>(
    () => uiStateManager.getCurrentState()
  );

  // 模拟的安装器状态
  const [installerState, setInstallerState] = useState<InstallerState>(() => {
    return createDefaultInstallerState(uiState);
  });

  // 同步状态
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);

  // 订阅UI状态变化
  useEffect(() => {
    const unsubscribe = uiStateManager.subscribe(setUIState);
    return unsubscribe;
  }, [uiStateManager]);

  // 计算安装器状态
  const installerStatus = useMemo((): InstallerStatus => {
    const currentStepState = uiState.stepStates[uiState.currentStep];

    if (!currentStepState) {
      return InstallerStatus.INITIALIZING;
    }

    switch (currentStepState.status) {
      case StepStatus.RUNNING:
        return InstallerStatus.INSTALLING;
      case StepStatus.FAILED:
        return InstallerStatus.ERROR;
      case StepStatus.SUCCESS:
        // 检查是否是最后一步
        const allSteps = Object.values(InstallStep);
        const isLastStep = uiState.currentStep === allSteps[allSteps.length - 1];
        return isLastStep ? InstallerStatus.COMPLETED : InstallerStatus.READY;
      default:
        return InstallerStatus.READY;
    }
  }, [uiState]);

  // 检查同步状态
  const isSynced = useMemo(() => {
    if (!enableValidation) return true;

    const validationResult = StateValidator.validateInstallerUISync(
      installerState,
      uiState
    );

    return validationResult.isValid;
  }, [installerState, uiState, enableValidation]);

  // 同步状态的核心方法
  const syncStates = useCallback(async (): Promise<boolean> => {
    try {
      // 将UI状态同步到安装器状态
      const newInstallerState: InstallerState = {
        currentStep: uiState.currentStep,
        status: installerStatus,
        progress: uiState.stepStates[uiState.currentStep]?.progress || 0,
        steps: {},
        config: null,
        error: null,
        warnings: []
      };

      // 同步所有步骤状态
      Object.keys(uiState.stepStates).forEach(stepKey => {
        const step = stepKey as InstallStep;
        const uiStepState = uiState.stepStates[step];

        newInstallerState.steps[step] = {
          status: uiStepState.status,
          progress: uiStepState.progress,
          message: uiStepState.message || '',
          error: uiStepState.status === StepStatus.FAILED ? uiStepState.message : undefined,
          startTime: new Date(), // 模拟时间
          endTime: uiStepState.status === StepStatus.SUCCESS || uiStepState.status === StepStatus.FAILED
            ? new Date()
            : undefined,
          data: {},
          ui: {
            userMessage: uiStepState.message || '',
            technicalMessage: '',
            showDetails: false,
            retryCount: uiStepState.retryCount || 0,
            maxRetries: uiStepState.maxRetries || 3,
            userTriggered: false
          }
        };
      });

      setInstallerState(newInstallerState);
      setLastSyncTime(new Date());
      setSyncErrors([]);

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '同步失败';
      setSyncErrors(prev => [...prev, errorMessage]);

      if (onSyncError) {
        onSyncError(error instanceof Error ? error : new Error(errorMessage));
      }

      return false;
    }
  }, [uiState, installerStatus, onSyncError]);

  // 自动同步
  useEffect(() => {
    if (!enableAutoSync) return;

    const interval = setInterval(() => {
      syncStates();
    }, syncInterval);

    // 立即执行一次同步
    syncStates();

    return () => clearInterval(interval);
  }, [enableAutoSync, syncInterval, syncStates]);

  // 验证同步状态
  const validateSync = useCallback((): boolean => {
    if (!enableValidation) return true;

    const result = StateValidator.validateInstallerUISync(installerState, uiState);

    if (!result.isValid && onValidationError) {
      onValidationError(result.errors);
    }

    return result.isValid;
  }, [installerState, uiState, enableValidation, onValidationError]);

  // 强制更新方法
  const forceUIUpdate = useCallback(() => {
    uiStateManager.forceUpdate();
  }, [uiStateManager]);

  const forceInstallerUpdate = useCallback(() => {
    syncStates();
  }, [syncStates]);

  const resetStates = useCallback(() => {
    // 重置UI状态
    uiStateManager.reset();

    // 重置安装器状态
    const resetInstallerState = createDefaultInstallerState(uiStateManager.getCurrentState());
    setInstallerState(resetInstallerState);

    // 清除同步状态
    setLastSyncTime(null);
    setSyncErrors([]);
  }, [uiStateManager]);

  // 获取同步报告
  const getSyncReport = useCallback((): string => {
    const lines: string[] = [];

    lines.push('=== 安装状态同步报告 ===');
    lines.push(`同步状态: ${isSynced ? '已同步' : '未同步'}`);
    lines.push(`最后同步时间: ${lastSyncTime ? lastSyncTime.toLocaleString() : '未同步'}`);

    if (syncErrors.length > 0) {
      lines.push('同步错误:');
      syncErrors.forEach(error => lines.push(`  - ${error}`));
    }

    lines.push('');
    lines.push('UI状态:');
    lines.push(`  当前步骤: ${uiState.currentStep}`);
    lines.push(`  步骤数量: ${Object.keys(uiState.stepStates).length}`);

    lines.push('');
    lines.push('安装器状态:');
    lines.push(`  当前步骤: ${installerState.currentStep}`);
    lines.push(`  状态: ${installerState.status}`);
    lines.push(`  进度: ${installerState.progress}%`);

    if (enableValidation) {
      lines.push('');
      const validationResult = StateValidator.validateInstallerUISync(installerState, uiState);
      lines.push(StateValidator.getDetailedValidationReport(validationResult));
    }

    return lines.join('\n');
  }, [isSynced, lastSyncTime, syncErrors, uiState, installerState, enableValidation]);

  return {
    // UI状态
    uiState,
    uiStateManager,

    // 安装器状态
    installerState,
    installerStatus,

    // 同步状态
    isSynced,
    lastSyncTime,
    syncErrors,

    // 控制方法
    syncStates,
    forceUIUpdate,
    forceInstallerUpdate,
    resetStates,

    // 验证方法
    validateSync,
    getSyncReport
  };
};

/**
 * 创建默认的安装器状态
 */
function createDefaultInstallerState(uiState: InstallationUIState): InstallerState {
  const installerState: InstallerState = {
    currentStep: uiState.currentStep,
    status: InstallerStatus.READY,
    progress: 0,
    steps: {},
    config: null,
    error: null,
    warnings: []
  };

  // 基于UI状态创建步骤状态
  Object.keys(uiState.stepStates).forEach(stepKey => {
    const step = stepKey as InstallStep;
    const uiStepState = uiState.stepStates[step];

    installerState.steps[step] = {
      status: uiStepState.status,
      progress: uiStepState.progress,
      message: uiStepState.message || '',
      startTime: new Date(),
      data: {},
      ui: {
        userMessage: '',
        technicalMessage: '',
        showDetails: false,
        retryCount: 0,
        maxRetries: 3,
        userTriggered: false
      }
    };
  });

  return installerState;
}

/**
 * 简化版本的安装状态hook
 */
export const useSimpleInstallationState = () => {
  return useInstallationState({
    enableAutoSync: true,
    enableValidation: false
  });
};

export default useInstallationState;