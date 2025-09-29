/**
 * T019: UI事件处理器
 * 处理安装向导中的各种UI事件
 */

import { InstallStep, StepStatus } from '../types/installer';
import { InstallationUIState } from '../types/ui';

/**
 * UI事件类型定义
 */
export enum UIEventType {
  // 导航事件
  STEP_NAVIGATION = 'step-navigation',
  PREVIOUS_STEP = 'previous-step',
  NEXT_STEP = 'next-step',

  // 按钮事件
  BUTTON_CLICK = 'button-click',
  RETRY_STEP = 'retry-step',
  SKIP_STEP = 'skip-step',

  // 状态事件
  STATE_UPDATE = 'state-update',
  STEP_STATUS_CHANGE = 'step-status-change',

  // 系统事件
  ERROR_OCCURRED = 'error-occurred',
  WARNING_TRIGGERED = 'warning-triggered',

  // 用户交互事件
  USER_INPUT = 'user-input',
  KEYBOARD_SHORTCUT = 'keyboard-shortcut',

  // 进度事件
  PROGRESS_UPDATE = 'progress-update',
  INSTALLATION_COMPLETE = 'installation-complete'
}

/**
 * UI事件数据接口
 */
export interface UIEvent {
  type: UIEventType;
  source: 'action-bar' | 'step-component' | 'wizard-controller' | 'user';
  timestamp: Date;
  data: Record<string, any>;
  preventDefault?: () => void;
  stopPropagation?: () => void;
}

/**
 * 事件处理器函数类型
 */
export type EventHandler = (event: UIEvent) => Promise<void> | void;

/**
 * 事件处理结果
 */
export interface EventHandlingResult {
  success: boolean;
  preventDefault: boolean;
  stopPropagation: boolean;
  error?: Error;
  data?: any;
}

/**
 * UI事件处理器
 */
export class UIEventHandler {
  private eventListeners: Map<UIEventType, Set<EventHandler>> = new Map();
  private globalListeners: Set<EventHandler> = new Set();
  private eventHistory: UIEvent[] = [];
  private maxHistorySize = 100;

  /**
   * 注册事件监听器
   * @param eventType 事件类型
   * @param handler 处理器函数
   * @returns 取消监听的函数
   */
  addEventListener(eventType: UIEventType, handler: EventHandler): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }

    this.eventListeners.get(eventType)!.add(handler);

    return () => {
      this.removeEventListener(eventType, handler);
    };
  }

  /**
   * 移除事件监听器
   * @param eventType 事件类型
   * @param handler 处理器函数
   */
  removeEventListener(eventType: UIEventType, handler: EventHandler): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(handler);
      if (listeners.size === 0) {
        this.eventListeners.delete(eventType);
      }
    }
  }

  /**
   * 添加全局事件监听器
   * @param handler 处理器函数
   * @returns 取消监听的函数
   */
  addGlobalEventListener(handler: EventHandler): () => void {
    this.globalListeners.add(handler);
    return () => {
      this.globalListeners.delete(handler);
    };
  }

  /**
   * 触发事件
   * @param event 事件对象
   * @returns 事件处理结果
   */
  async dispatchEvent(event: UIEvent): Promise<EventHandlingResult> {
    let preventDefault = false;
    let stopPropagation = false;
    const errors: Error[] = [];

    // 添加事件控制方法
    event.preventDefault = () => { preventDefault = true; };
    event.stopPropagation = () => { stopPropagation = true; };

    // 记录事件历史
    this.addToHistory(event);

    try {
      // 执行全局监听器
      for (const handler of this.globalListeners) {
        try {
          await handler(event);
          if (stopPropagation) break;
        } catch (error) {
          errors.push(error instanceof Error ? error : new Error(String(error)));
        }
      }

      // 执行特定类型的监听器
      if (!stopPropagation) {
        const listeners = this.eventListeners.get(event.type);
        if (listeners) {
          for (const handler of listeners) {
            try {
              await handler(event);
              if (stopPropagation) break;
            } catch (error) {
              errors.push(error instanceof Error ? error : new Error(String(error)));
            }
          }
        }
      }

      return {
        success: errors.length === 0,
        preventDefault,
        stopPropagation,
        error: errors.length > 0 ? errors[0] : undefined
      };
    } catch (error) {
      return {
        success: false,
        preventDefault,
        stopPropagation,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * 创建并触发事件
   * @param type 事件类型
   * @param source 事件源
   * @param data 事件数据
   * @returns 事件处理结果
   */
  async emit(
    type: UIEventType,
    source: UIEvent['source'],
    data: Record<string, any> = {}
  ): Promise<EventHandlingResult> {
    const event: UIEvent = {
      type,
      source,
      timestamp: new Date(),
      data
    };

    return this.dispatchEvent(event);
  }

  /**
   * 获取事件历史
   * @param eventType 可选的事件类型过滤
   * @param limit 返回的最大数量
   * @returns 事件历史列表
   */
  getEventHistory(eventType?: UIEventType, limit?: number): UIEvent[] {
    let history = this.eventHistory;

    if (eventType) {
      history = history.filter(event => event.type === eventType);
    }

    if (limit) {
      history = history.slice(-limit);
    }

    return [...history];
  }

  /**
   * 清空事件历史
   */
  clearEventHistory(): void {
    this.eventHistory = [];
  }

  /**
   * 添加事件到历史记录
   * @param event 事件对象
   */
  private addToHistory(event: UIEvent): void {
    this.eventHistory.push({ ...event });

    // 限制历史记录大小
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * 移除所有监听器
   */
  removeAllListeners(): void {
    this.eventListeners.clear();
    this.globalListeners.clear();
  }

  /**
   * 获取监听器统计信息
   */
  getListenerStats(): {
    typeListeners: Record<string, number>;
    globalListeners: number;
    totalListeners: number;
  } {
    const typeListeners: Record<string, number> = {};
    let totalListeners = this.globalListeners.size;

    this.eventListeners.forEach((listeners, type) => {
      typeListeners[type] = listeners.size;
      totalListeners += listeners.size;
    });

    return {
      typeListeners,
      globalListeners: this.globalListeners.size,
      totalListeners
    };
  }
}

/**
 * 预定义的UI事件处理器
 */
export class InstallationEventHandlers {
  constructor(
    private uiStateManager: any, // 将在集成时正确类型化
    private eventHandler: UIEventHandler
  ) {
    this.registerDefaultHandlers();
  }

  /**
   * 注册默认的事件处理器
   */
  private registerDefaultHandlers(): void {
    // 步骤导航事件处理
    this.eventHandler.addEventListener(UIEventType.NEXT_STEP, this.handleNextStep.bind(this));
    this.eventHandler.addEventListener(UIEventType.PREVIOUS_STEP, this.handlePreviousStep.bind(this));

    // 步骤操作事件处理
    this.eventHandler.addEventListener(UIEventType.RETRY_STEP, this.handleRetryStep.bind(this));
    this.eventHandler.addEventListener(UIEventType.SKIP_STEP, this.handleSkipStep.bind(this));

    // 状态更新事件处理
    this.eventHandler.addEventListener(UIEventType.STATE_UPDATE, this.handleStateUpdate.bind(this));

    // 错误处理
    this.eventHandler.addEventListener(UIEventType.ERROR_OCCURRED, this.handleError.bind(this));

    // 键盘快捷键处理
    this.eventHandler.addEventListener(UIEventType.KEYBOARD_SHORTCUT, this.handleKeyboardShortcut.bind(this));
  }

  /**
   * 处理"下一步"事件
   */
  private async handleNextStep(event: UIEvent): Promise<void> {
    const { data } = event;
    const currentState = this.uiStateManager.getCurrentState();
    const currentStepState = currentState.stepStates[currentState.currentStep];

    // 验证是否可以继续
    if (currentStepState.status !== StepStatus.SUCCESS) {
      await this.eventHandler.emit(UIEventType.WARNING_TRIGGERED, 'action-bar', {
        message: '当前步骤未完成，无法继续到下一步',
        stepStatus: currentStepState.status
      });
      event.preventDefault?.();
      return;
    }

    // 执行导航
    const actionBarController = this.uiStateManager.getActionBarController();
    const success = await actionBarController.handleNextStep();

    if (!success) {
      await this.eventHandler.emit(UIEventType.ERROR_OCCURRED, 'action-bar', {
        message: '无法导航到下一步',
        currentStep: currentState.currentStep
      });
    } else {
      await this.eventHandler.emit(UIEventType.STEP_NAVIGATION, 'action-bar', {
        direction: 'next',
        fromStep: currentState.currentStep,
        success: true
      });
    }
  }

  /**
   * 处理"上一步"事件
   */
  private async handlePreviousStep(event: UIEvent): Promise<void> {
    const currentState = this.uiStateManager.getCurrentState();
    const actionBarController = this.uiStateManager.getActionBarController();

    const success = await actionBarController.handlePreviousStep();

    if (!success) {
      await this.eventHandler.emit(UIEventType.ERROR_OCCURRED, 'action-bar', {
        message: '无法导航到上一步',
        currentStep: currentState.currentStep
      });
    } else {
      await this.eventHandler.emit(UIEventType.STEP_NAVIGATION, 'action-bar', {
        direction: 'previous',
        fromStep: currentState.currentStep,
        success: true
      });
    }
  }

  /**
   * 处理重试步骤事件
   */
  private async handleRetryStep(event: UIEvent): Promise<void> {
    const { step } = event.data;

    if (!step) {
      await this.eventHandler.emit(UIEventType.ERROR_OCCURRED, 'step-component', {
        message: '重试事件缺少步骤信息'
      });
      return;
    }

    // 更新步骤状态为运行中
    this.uiStateManager.updateStepState(step, {
      status: StepStatus.RUNNING,
      uiIndicators: {
        showSpinner: true,
        showCheckmark: false,
        showErrorIcon: false,
        progressPercent: 0,
        statusColor: 'info'
      },
      inlineButtons: {
        continueInstall: { visible: false, enabled: false },
        retry: { visible: false, enabled: false }
      }
    });

    await this.eventHandler.emit(UIEventType.STATE_UPDATE, 'step-component', {
      step,
      action: 'retry',
      newStatus: StepStatus.RUNNING
    });
  }

  /**
   * 处理跳过步骤事件
   */
  private async handleSkipStep(event: UIEvent): Promise<void> {
    const { step } = event.data;

    if (!step) {
      await this.eventHandler.emit(UIEventType.ERROR_OCCURRED, 'step-component', {
        message: '跳过事件缺少步骤信息'
      });
      return;
    }

    // 更新步骤状态为跳过
    this.uiStateManager.updateStepState(step, {
      status: StepStatus.SKIPPED,
      uiIndicators: {
        showSpinner: false,
        showCheckmark: false,
        showErrorIcon: false,
        progressPercent: 100,
        statusColor: 'warning'
      },
      inlineButtons: {
        continueInstall: { visible: false, enabled: false },
        retry: { visible: false, enabled: false }
      }
    });

    await this.eventHandler.emit(UIEventType.STATE_UPDATE, 'step-component', {
      step,
      action: 'skip',
      newStatus: StepStatus.SKIPPED
    });
  }

  /**
   * 处理状态更新事件
   */
  private async handleStateUpdate(event: UIEvent): Promise<void> {
    const { step, newStatus, progress } = event.data;

    // 记录状态变更
    console.log(`步骤 ${step} 状态更新: ${newStatus}${progress !== undefined ? `, 进度: ${progress}%` : ''}`);

    // 触发进度更新事件
    if (progress !== undefined) {
      await this.eventHandler.emit(UIEventType.PROGRESS_UPDATE, 'step-component', {
        step,
        progress,
        status: newStatus
      });
    }
  }

  /**
   * 处理错误事件
   */
  private async handleError(event: UIEvent): Promise<void> {
    const { message, step, error } = event.data;

    console.error('UI事件处理器错误:', {
      message,
      step,
      error: error?.message || error,
      timestamp: event.timestamp
    });

    // 如果是步骤相关的错误，更新步骤状态
    if (step) {
      this.uiStateManager.updateStepState(step, {
        status: StepStatus.FAILED,
        error: message,
        uiIndicators: {
          showSpinner: false,
          showCheckmark: false,
          showErrorIcon: true,
          progressPercent: 0,
          statusColor: 'error'
        },
        inlineButtons: {
          continueInstall: { visible: false, enabled: false },
          retry: { visible: true, enabled: true }
        }
      });
    }
  }

  /**
   * 处理键盘快捷键事件
   */
  private async handleKeyboardShortcut(event: UIEvent): Promise<void> {
    const { key, ctrlKey, altKey, metaKey } = event.data;

    // Alt + Left Arrow: 上一步
    if (altKey && key === 'ArrowLeft') {
      await this.eventHandler.emit(UIEventType.PREVIOUS_STEP, 'user', {
        triggeredBy: 'keyboard'
      });
      event.preventDefault?.();
    }

    // Alt + Right Arrow: 下一步
    else if (altKey && key === 'ArrowRight') {
      await this.eventHandler.emit(UIEventType.NEXT_STEP, 'user', {
        triggeredBy: 'keyboard'
      });
      event.preventDefault?.();
    }

    // Enter: 下一步（如果当前步骤完成）
    else if (key === 'Enter' && !ctrlKey && !altKey && !metaKey) {
      const currentState = this.uiStateManager.getCurrentState();
      const currentStepState = currentState.stepStates[currentState.currentStep];

      if (currentStepState.status === StepStatus.SUCCESS) {
        await this.eventHandler.emit(UIEventType.NEXT_STEP, 'user', {
          triggeredBy: 'keyboard'
        });
        event.preventDefault?.();
      }
    }
  }
}

/**
 * 事件工厂类
 * 用于创建标准化的UI事件
 */
export class UIEventFactory {
  /**
   * 创建按钮点击事件
   */
  static createButtonClickEvent(
    buttonType: 'previous' | 'next' | 'retry' | 'skip',
    source: UIEvent['source'],
    additionalData: Record<string, any> = {}
  ): UIEvent {
    return {
      type: UIEventType.BUTTON_CLICK,
      source,
      timestamp: new Date(),
      data: {
        buttonType,
        ...additionalData
      }
    };
  }

  /**
   * 创建步骤状态变更事件
   */
  static createStepStatusChangeEvent(
    step: InstallStep,
    oldStatus: StepStatus,
    newStatus: StepStatus,
    source: UIEvent['source']
  ): UIEvent {
    return {
      type: UIEventType.STEP_STATUS_CHANGE,
      source,
      timestamp: new Date(),
      data: {
        step,
        oldStatus,
        newStatus
      }
    };
  }

  /**
   * 创建进度更新事件
   */
  static createProgressUpdateEvent(
    step: InstallStep,
    progress: number,
    message?: string
  ): UIEvent {
    return {
      type: UIEventType.PROGRESS_UPDATE,
      source: 'step-component',
      timestamp: new Date(),
      data: {
        step,
        progress,
        message
      }
    };
  }

  /**
   * 创建错误事件
   */
  static createErrorEvent(
    message: string,
    source: UIEvent['source'],
    error?: Error,
    step?: InstallStep
  ): UIEvent {
    return {
      type: UIEventType.ERROR_OCCURRED,
      source,
      timestamp: new Date(),
      data: {
        message,
        error: error?.message || error,
        step
      }
    };
  }

  /**
   * 创建键盘事件
   */
  static createKeyboardEvent(
    key: string,
    modifiers: {
      ctrlKey?: boolean;
      altKey?: boolean;
      shiftKey?: boolean;
      metaKey?: boolean;
    } = {}
  ): UIEvent {
    return {
      type: UIEventType.KEYBOARD_SHORTCUT,
      source: 'user',
      timestamp: new Date(),
      data: {
        key,
        ...modifiers
      }
    };
  }

  /**
   * 处理按钮点击事件的静态方法
   */
  static handleButtonClick(buttonType: 'previous' | 'next' | 'retry' | 'skip', uiStateManager: any): void {
    console.log(`处理${buttonType}按钮点击事件`);

    switch (buttonType) {
      case 'previous':
      case 'next':
        // 导航按钮点击暂时只记录日志
        console.log(`导航按钮点击: ${buttonType}`);
        break;
      case 'retry':
      case 'skip':
        // 步骤操作按钮点击暂时只记录日志
        console.log(`步骤操作按钮点击: ${buttonType}`);
        break;
    }
  }
}