/**
 * T018: 状态转换验证器
 * 验证UI状态转换的合法性和一致性
 */

import { StepStatus, InstallStep, InstallerState } from '../types/installer';
import { InstallationUIState, StepUIState } from '../types/ui';

/**
 * 状态转换验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

/**
 * 状态转换规则
 */
export interface StateTransitionRule {
  from: StepStatus;
  to: StepStatus;
  condition?: (context: any) => boolean;
  description: string;
}

/**
 * 状态转换验证器
 */
export class StateValidator {
  /**
   * 允许的步骤状态转换规则
   */
  private static readonly STEP_STATUS_TRANSITIONS: StateTransitionRule[] = [
    // 从PENDING开始的转换
    { from: StepStatus.PENDING, to: StepStatus.RUNNING, description: '开始执行步骤' },
    { from: StepStatus.PENDING, to: StepStatus.SKIPPED, description: '跳过步骤' },

    // 从RUNNING开始的转换
    { from: StepStatus.RUNNING, to: StepStatus.SUCCESS, description: '步骤执行成功' },
    { from: StepStatus.RUNNING, to: StepStatus.FAILED, description: '步骤执行失败' },

    // 从FAILED开始的转换
    { from: StepStatus.FAILED, to: StepStatus.RUNNING, description: '重试步骤' },
    { from: StepStatus.FAILED, to: StepStatus.SKIPPED, description: '跳过失败的步骤' },

    // 从SUCCESS开始的转换（一般不允许，除非重置）
    { from: StepStatus.SUCCESS, to: StepStatus.PENDING, description: '重置成功的步骤' },

    // 从SKIPPED开始的转换
    { from: StepStatus.SKIPPED, to: StepStatus.RUNNING, description: '重新执行跳过的步骤' },
    { from: StepStatus.SKIPPED, to: StepStatus.PENDING, description: '重置跳过的步骤' }
  ];

  /**
   * 验证步骤状态转换是否合法
   * @param fromStatus 源状态
   * @param toStatus 目标状态
   * @param context 转换上下文
   * @returns 验证结果
   */
  static validateStepStatusTransition(
    fromStatus: StepStatus,
    toStatus: StepStatus,
    context?: any
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 如果状态没有变化，直接通过
    if (fromStatus === toStatus) {
      return { isValid: true, errors, warnings };
    }

    // 查找匹配的转换规则
    const validTransition = this.STEP_STATUS_TRANSITIONS.find(
      rule => rule.from === fromStatus && rule.to === toStatus
    );

    if (!validTransition) {
      errors.push(`不允许的状态转换: ${fromStatus} → ${toStatus}`);
      suggestions.push(`允许的转换: ${this.getAllowedTransitions(fromStatus).join(', ')}`);
    } else {
      // 检查转换条件
      if (validTransition.condition && !validTransition.condition(context)) {
        errors.push(`状态转换条件不满足: ${validTransition.description}`);
      }
    }

    // 特殊验证规则
    this.addSpecialValidationRules(fromStatus, toStatus, errors, warnings, suggestions);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * 验证UI状态的一致性
   * @param uiState UI状态
   * @returns 验证结果
   */
  static validateUIState(uiState: InstallationUIState): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 验证当前步骤存在于步骤状态中
    if (!uiState.stepStates[uiState.currentStep]) {
      errors.push(`当前步骤 ${uiState.currentStep} 在步骤状态中不存在`);
    }

    // 验证ActionBar状态与当前步骤的一致性
    const currentStepState = uiState.stepStates[uiState.currentStep];
    if (currentStepState) {
      this.validateActionBarConsistency(
        uiState.actionBar,
        currentStepState,
        uiState.currentStep,
        errors,
        warnings
      );
    }

    // 验证所有步骤状态的一致性
    this.validateAllStepStatesConsistency(uiState.stepStates, errors, warnings);

    // 验证设置的合理性
    this.validateUISettings(uiState.settings, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * 验证状态转换的业务逻辑
   * @param oldState 旧状态
   * @param newState 新状态
   * @returns 验证结果
   */
  static validateStateTransition(
    oldState: InstallationUIState,
    newState: InstallationUIState
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 验证步骤导航的合法性
    if (oldState.currentStep !== newState.currentStep) {
      const navigationResult = this.validateStepNavigation(
        oldState.currentStep,
        newState.currentStep,
        oldState.stepStates
      );
      errors.push(...navigationResult.errors);
      warnings.push(...navigationResult.warnings);
    }

    // 验证步骤状态变化的合法性
    Object.keys(newState.stepStates).forEach(stepKey => {
      const step = stepKey as InstallStep;
      const oldStepState = oldState.stepStates[step];
      const newStepState = newState.stepStates[step];

      if (oldStepState && newStepState && oldStepState.status !== newStepState.status) {
        const transitionResult = this.validateStepStatusTransition(
          oldStepState.status,
          newStepState.status
        );
        errors.push(...transitionResult.errors.map(err => `步骤 ${step}: ${err}`));
        warnings.push(...transitionResult.warnings.map(warn => `步骤 ${step}: ${warn}`));
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * 验证安装器状态和UI状态的同步性
   * @param installerState 安装器状态
   * @param uiState UI状态
   * @returns 验证结果
   */
  static validateInstallerUISync(
    installerState: InstallerState,
    uiState: InstallationUIState
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证当前步骤一致性
    if (installerState.currentStep !== uiState.currentStep) {
      errors.push(
        `当前步骤不同步: 安装器=${installerState.currentStep}, UI=${uiState.currentStep}`
      );
    }

    // 验证步骤状态同步
    Object.keys(installerState.steps).forEach(stepKey => {
      const step = stepKey as InstallStep;
      const installerStepState = installerState.steps[step];
      const uiStepState = uiState.stepStates[step];

      if (installerStepState && uiStepState) {
        if (installerStepState.status !== uiStepState.status) {
          warnings.push(
            `步骤 ${step} 状态不同步: 安装器=${installerStepState.status}, UI=${uiStepState.status}`
          );
        }

        if (Math.abs(installerStepState.progress - uiStepState.progress) > 5) {
          warnings.push(
            `步骤 ${step} 进度不同步: 安装器=${installerStepState.progress}%, UI=${uiStepState.progress}%`
          );
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 获取允许的状态转换
   * @param fromStatus 源状态
   * @returns 允许的目标状态列表
   */
  private static getAllowedTransitions(fromStatus: StepStatus): StepStatus[] {
    return this.STEP_STATUS_TRANSITIONS
      .filter(rule => rule.from === fromStatus)
      .map(rule => rule.to);
  }

  /**
   * 添加特殊的验证规则
   */
  private static addSpecialValidationRules(
    fromStatus: StepStatus,
    toStatus: StepStatus,
    errors: string[],
    warnings: string[],
    suggestions: string[]
  ): void {
    // 警告：从SUCCESS回到PENDING可能表示重置操作
    if (fromStatus === StepStatus.SUCCESS && toStatus === StepStatus.PENDING) {
      warnings.push('将成功的步骤重置为待执行状态');
    }

    // 建议：失败后直接跳过可能不是最佳选择
    if (fromStatus === StepStatus.FAILED && toStatus === StepStatus.SKIPPED) {
      suggestions.push('考虑重试失败的步骤而不是跳过');
    }

    // 错误：不应该从RUNNING直接跳到SKIPPED
    if (fromStatus === StepStatus.RUNNING && toStatus === StepStatus.SKIPPED) {
      errors.push('正在运行的步骤不能直接跳过，请先停止执行');
    }
  }

  /**
   * 验证ActionBar与当前步骤的一致性
   */
  private static validateActionBarConsistency(
    actionBar: any,
    currentStepState: StepUIState,
    currentStep: InstallStep,
    errors: string[],
    warnings: string[]
  ): void {
    const stepIndex = this.getStepIndex(currentStep);

    // 验证"上一步"按钮在第一步时应该隐藏或禁用
    if (stepIndex === 0 && actionBar.previousButton.visible && actionBar.previousButton.enabled) {
      errors.push('第一步时"上一步"按钮不应该可用');
    }

    // 验证"下一步"按钮状态与步骤状态的一致性
    if (currentStepState.status === StepStatus.SUCCESS && !actionBar.nextButton.enabled) {
      warnings.push('步骤成功时"下一步"按钮应该可用');
    }

    if (currentStepState.status !== StepStatus.SUCCESS && actionBar.nextButton.enabled) {
      warnings.push('步骤未成功时"下一步"按钮不应该可用');
    }

    // 验证最后一步的按钮标签
    if (stepIndex === 6 && actionBar.nextButton.label !== '完成安装') {
      warnings.push('最后一步时"下一步"按钮应该显示为"完成安装"');
    }
  }

  /**
   * 验证所有步骤状态的一致性
   */
  private static validateAllStepStatesConsistency(
    stepStates: Record<InstallStep, StepUIState>,
    errors: string[],
    warnings: string[]
  ): void {
    const steps = Object.values(InstallStep);

    // 检查是否所有步骤都存在
    steps.forEach(step => {
      if (!stepStates[step]) {
        errors.push(`缺少步骤状态: ${step}`);
      }
    });

    // 检查步骤状态的逻辑一致性
    Object.entries(stepStates).forEach(([stepKey, stepState]) => {
      // 验证"继续安装"按钮应该隐藏（核心需求）
      if (stepState.inlineButtons.continueInstall.visible) {
        errors.push(`步骤 ${stepKey}: "继续安装"按钮应该隐藏`);
      }

      // 验证重试按钮只在失败时显示
      if (stepState.inlineButtons.retry.visible && stepState.status !== StepStatus.FAILED) {
        warnings.push(`步骤 ${stepKey}: 重试按钮只应在失败时显示`);
      }

      // 验证UI指示器与状态的一致性
      this.validateStepUIIndicators(stepKey, stepState, warnings);
    });
  }

  /**
   * 验证步骤UI指示器的一致性
   */
  private static validateStepUIIndicators(
    stepKey: string,
    stepState: StepUIState,
    warnings: string[]
  ): void {
    const { status, uiIndicators } = stepState;

    switch (status) {
      case StepStatus.RUNNING:
        if (!uiIndicators.showSpinner) {
          warnings.push(`步骤 ${stepKey}: 运行状态应显示旋转器`);
        }
        break;

      case StepStatus.SUCCESS:
        if (!uiIndicators.showCheckmark) {
          warnings.push(`步骤 ${stepKey}: 成功状态应显示勾选标记`);
        }
        break;

      case StepStatus.FAILED:
        if (!uiIndicators.showErrorIcon) {
          warnings.push(`步骤 ${stepKey}: 失败状态应显示错误图标`);
        }
        break;
    }
  }

  /**
   * 验证UI设置的合理性
   */
  private static validateUISettings(
    settings: any,
    _errors: string[],
    warnings: string[]
  ): void {
    // 验证设置对象的完整性
    const requiredSettings = ['showProgress', 'enableAnimations', 'showDetailedLogs'];
    requiredSettings.forEach(setting => {
      if (settings[setting] === undefined) {
        warnings.push(`缺少UI设置: ${setting}`);
      }
    });
  }

  /**
   * 验证步骤导航的合法性
   */
  private static validateStepNavigation(
    fromStep: InstallStep,
    toStep: InstallStep,
    stepStates: Record<InstallStep, StepUIState>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const fromIndex = this.getStepIndex(fromStep);
    const toIndex = this.getStepIndex(toStep);

    // 向前导航：只能到下一步，且当前步骤必须成功
    if (toIndex > fromIndex) {
      if (toIndex !== fromIndex + 1) {
        errors.push(`不能跳跃导航: ${fromStep} → ${toStep}`);
      } else {
        const currentStepState = stepStates[fromStep];
        if (currentStepState && currentStepState.status !== StepStatus.SUCCESS) {
          errors.push(`当前步骤未成功，不能导航到下一步: ${fromStep} (${currentStepState.status})`);
        }
      }
    }

    // 向后导航：一般允许，但给出警告
    if (toIndex < fromIndex) {
      warnings.push(`向后导航可能丢失当前进度: ${fromStep} → ${toStep}`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * 获取步骤索引
   */
  private static getStepIndex(step: InstallStep): number {
    const steps = Object.values(InstallStep);
    return steps.indexOf(step);
  }

  /**
   * 获取验证报告摘要
   * @param result 验证结果
   * @returns 格式化的报告摘要
   */
  static getValidationSummary(result: ValidationResult): string {
    const parts: string[] = [];

    if (result.isValid) {
      parts.push('✅ 验证通过');
    } else {
      parts.push('❌ 验证失败');
    }

    if (result.errors.length > 0) {
      parts.push(`错误: ${result.errors.length}个`);
    }

    if (result.warnings.length > 0) {
      parts.push(`警告: ${result.warnings.length}个`);
    }

    return parts.join(', ');
  }

  /**
   * 获取详细的验证报告
   * @param result 验证结果
   * @returns 格式化的详细报告
   */
  static getDetailedValidationReport(result: ValidationResult): string {
    const lines: string[] = [];

    lines.push(`验证结果: ${result.isValid ? '通过' : '失败'}`);
    lines.push('');

    if (result.errors.length > 0) {
      lines.push('❌ 错误:');
      result.errors.forEach(error => lines.push(`  - ${error}`));
      lines.push('');
    }

    if (result.warnings.length > 0) {
      lines.push('⚠️ 警告:');
      result.warnings.forEach(warning => lines.push(`  - ${warning}`));
      lines.push('');
    }

    if (result.suggestions && result.suggestions.length > 0) {
      lines.push('💡 建议:');
      result.suggestions.forEach(suggestion => lines.push(`  - ${suggestion}`));
    }

    return lines.join('\n');
  }
}