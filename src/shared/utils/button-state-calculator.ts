/**
 * T017: 按钮状态计算器
 * 专门负责计算各种按钮状态的工具类
 */

import { StepStatus } from '../types/installer';
import { ButtonState } from '../types/ui';

/**
 * 按钮状态计算器
 * 提供各种按钮状态计算的静态方法
 */
export class ButtonStateCalculator {
  /**
   * 基于步骤状态计算按钮状态
   * @param baseState 基础按钮状态
   * @param stepStatus 当前步骤状态
   * @param context 计算上下文
   * @returns 计算后的按钮状态
   */
  static computeButtonState(
    baseState: ButtonState,
    stepStatus: StepStatus,
    context?: {
      isFirstStep?: boolean;
      isLastStep?: boolean;
      canNavigate?: boolean;
    }
  ): ButtonState {
    const computed: ButtonState = { ...baseState };

    // 根据步骤状态调整按钮
    switch (stepStatus) {
      case StepStatus.SUCCESS:
        computed.enabled = true;
        computed.variant = 'primary';
        computed.loading = false;
        break;

      case StepStatus.FAILED:
        computed.enabled = false;
        computed.variant = 'disabled';
        computed.loading = false;
        break;

      case StepStatus.RUNNING:
        computed.enabled = false;
        computed.variant = 'disabled';
        computed.loading = true;
        break;

      case StepStatus.PENDING:
      case StepStatus.SKIPPED:
        computed.enabled = false;
        computed.variant = 'disabled';
        computed.loading = false;
        break;
    }

    // 应用上下文相关的调整
    if (context) {
      if (context.isFirstStep && baseState.label === '上一步') {
        computed.visible = false;
        computed.enabled = false;
      }

      if (context.isLastStep && baseState.label === '下一步') {
        computed.label = '完成安装';
      }

      if (context.canNavigate !== undefined) {
        computed.enabled = computed.enabled && context.canNavigate;
      }
    }

    return computed;
  }

  /**
   * 计算ActionBar的按钮组状态
   * @param stepIndex 当前步骤索引
   * @param totalSteps 总步骤数
   * @param currentStepStatus 当前步骤状态
   * @returns ActionBar按钮组状态
   */
  static computeActionBarButtons(
    stepIndex: number,
    totalSteps: number,
    currentStepStatus: StepStatus
  ): { previous: ButtonState; next: ButtonState } {
    const isFirstStep = stepIndex === 0;
    const isLastStep = stepIndex === totalSteps - 1;

    // 基础的上一步按钮状态
    const basePreviousState: ButtonState = {
      visible: !isFirstStep,
      enabled: !isFirstStep,
      label: '上一步',
      variant: 'secondary'
    };

    // 基础的下一步按钮状态
    const baseNextState: ButtonState = {
      visible: true,
      enabled: false, // 将根据步骤状态动态设置
      label: isLastStep ? '完成安装' : '下一步',
      variant: 'primary'
    };

    // 计算上一步按钮（上一步按钮一般不受当前步骤状态影响，除非正在运行）
    const previousButton = this.computeButtonState(
      basePreviousState,
      currentStepStatus === StepStatus.RUNNING ? StepStatus.RUNNING : StepStatus.SUCCESS,
      { isFirstStep }
    );

    // 计算下一步按钮
    const nextButton = this.computeButtonState(
      baseNextState,
      currentStepStatus,
      { isLastStep }
    );

    return {
      previous: previousButton,
      next: nextButton
    };
  }

  /**
   * 计算步骤内重试按钮状态
   * @param stepStatus 步骤状态
   * @param retryCount 当前重试次数
   * @param maxRetries 最大重试次数
   * @returns 重试按钮状态
   */
  static computeRetryButtonState(
    stepStatus: StepStatus,
    retryCount: number = 0,
    maxRetries: number = 3
  ): ButtonState {
    return {
      visible: stepStatus === StepStatus.FAILED,
      enabled: stepStatus === StepStatus.FAILED && retryCount < maxRetries,
      label: retryCount > 0 ? `重试 (${retryCount}/${maxRetries})` : '重试',
      variant: stepStatus === StepStatus.FAILED ? 'secondary' : 'disabled'
    };
  }

  /**
   * 计算步骤内跳过按钮状态
   * @param stepStatus 步骤状态
   * @param isSkippable 是否允许跳过
   * @returns 跳过按钮状态
   */
  static computeSkipButtonState(
    stepStatus: StepStatus,
    isSkippable: boolean
  ): ButtonState | undefined {
    if (!isSkippable) {
      return undefined;
    }

    return {
      visible: true,
      enabled: stepStatus !== StepStatus.RUNNING && stepStatus !== StepStatus.SUCCESS,
      label: '跳过',
      variant: 'secondary'
    };
  }

  /**
   * 计算继续安装按钮状态 (将被逐步移除)
   * @returns 继续安装按钮状态
   */
  static computeContinueInstallButtonState(): ButtonState {
    // 核心改动：无论什么状态都不显示"继续安装"按钮
    return {
      visible: false,
      enabled: false,
      label: '继续安装',
      variant: 'disabled'
    };
  }

  /**
   * 基于安装进度计算按钮状态
   * @param progress 进度百分比 (0-100)
   * @param baseState 基础按钮状态
   * @returns 更新后的按钮状态
   */
  static computeProgressBasedButtonState(
    progress: number,
    baseState: ButtonState
  ): ButtonState {
    const computed = { ...baseState };

    if (progress > 0 && progress < 100) {
      computed.loading = true;
      computed.enabled = false;
      computed.variant = 'disabled';
    } else if (progress === 100) {
      computed.loading = false;
      computed.enabled = true;
      computed.variant = 'primary';
    } else {
      computed.loading = false;
      computed.enabled = false;
      computed.variant = 'disabled';
    }

    return computed;
  }

  /**
   * 验证按钮状态的一致性
   * @param buttonState 按钮状态
   * @returns 验证结果
   */
  static validateButtonState(buttonState: ButtonState): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 检查逻辑一致性
    if (!buttonState.visible && buttonState.enabled) {
      errors.push('不可见的按钮不应该被启用');
    }

    if (buttonState.loading && buttonState.enabled) {
      errors.push('加载状态的按钮不应该被启用');
    }

    if (buttonState.variant === 'disabled' && buttonState.enabled) {
      errors.push('禁用样式的按钮不应该被启用');
    }

    if (!buttonState.label || buttonState.label.trim() === '') {
      errors.push('按钮必须有标签');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取按钮状态的调试信息
   * @param buttonState 按钮状态
   * @returns 调试信息字符串
   */
  static getButtonStateDebugInfo(buttonState: ButtonState): string {
    return `Button[${buttonState.label}]: visible=${buttonState.visible}, enabled=${buttonState.enabled}, variant=${buttonState.variant}, loading=${buttonState.loading || false}`;
  }

  /**
   * 比较两个按钮状态的差异
   * @param oldState 旧状态
   * @param newState 新状态
   * @returns 状态变化描述
   */
  static compareButtonStates(oldState: ButtonState, newState: ButtonState): string[] {
    const changes: string[] = [];

    if (oldState.visible !== newState.visible) {
      changes.push(`visible: ${oldState.visible} → ${newState.visible}`);
    }
    if (oldState.enabled !== newState.enabled) {
      changes.push(`enabled: ${oldState.enabled} → ${newState.enabled}`);
    }
    if (oldState.label !== newState.label) {
      changes.push(`label: "${oldState.label}" → "${newState.label}"`);
    }
    if (oldState.variant !== newState.variant) {
      changes.push(`variant: ${oldState.variant} → ${newState.variant}`);
    }
    if (oldState.loading !== newState.loading) {
      changes.push(`loading: ${oldState.loading} → ${newState.loading}`);
    }

    return changes;
  }
}

/**
 * 按钮状态预设配置
 */
export const ButtonStatePresets = {
  // 标准的"上一步"按钮
  PREVIOUS_DEFAULT: {
    visible: true,
    enabled: true,
    label: '上一步',
    variant: 'secondary' as const
  },

  // 禁用的"上一步"按钮（第一步）
  PREVIOUS_DISABLED: {
    visible: false,
    enabled: false,
    label: '上一步',
    variant: 'disabled' as const
  },

  // 标准的"下一步"按钮
  NEXT_DEFAULT: {
    visible: true,
    enabled: false,
    label: '下一步',
    variant: 'primary' as const
  },

  // 启用的"下一步"按钮
  NEXT_ENABLED: {
    visible: true,
    enabled: true,
    label: '下一步',
    variant: 'primary' as const
  },

  // "完成安装"按钮
  COMPLETE_INSTALL: {
    visible: true,
    enabled: false,
    label: '完成安装',
    variant: 'primary' as const
  },

  // 加载中的按钮
  LOADING: {
    visible: true,
    enabled: false,
    label: '处理中...',
    variant: 'disabled' as const,
    loading: true
  },

  // 重试按钮
  RETRY: {
    visible: true,
    enabled: true,
    label: '重试',
    variant: 'secondary' as const
  },

  // 跳过按钮
  SKIP: {
    visible: true,
    enabled: true,
    label: '跳过',
    variant: 'secondary' as const
  }
} as const;