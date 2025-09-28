/**
 * Navigation API IPC处理器实现
 * 处理导航相关的IPC请求
 */

import { IpcMainInvokeEvent } from 'electron';
import { ipcRegistry, IpcHandler, createSuccessResponse, createErrorResponse } from '../ipc-handlers';
import {
  NavigationState,
  validateNavigationState,
  navigateToNext,
  goBack,
  createDefaultNavigationState
} from '../../models/navigation-state';

/**
 * 导航请求接口
 */
interface NextStepRequest {
  currentStepId: string;
  skipCurrent?: boolean;
}

interface PreviousStepRequest {
  currentStepId: string;
}

/**
 * 导航响应接口
 */
interface NextStepResponse {
  success: boolean;
  nextStepId?: string;
  error?: string;
}

interface PreviousStepResponse {
  success: boolean;
  previousStepId?: string;
  error?: string;
}

/**
 * 导航状态管理器
 */
class NavigationStateManager {
  private currentState: NavigationState | null = null;
  private availableSteps: string[] = [
    'welcome',
    'prerequisites',
    'network-check',
    'nodejs-setup',
    'google-setup',
    'claude-install',
    'api-config',
    'completion'
  ];

  /**
   * 初始化导航状态
   */
  initialize(): void {
    if (!this.currentState) {
      this.currentState = createDefaultNavigationState(this.availableSteps);
      console.log('导航状态已初始化:', this.currentState.currentStepId);
    }
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): NavigationState {
    if (!this.currentState) {
      this.initialize();
    }
    return this.currentState!;
  }

  /**
   * 更新状态
   */
  updateState(newState: NavigationState): void {
    validateNavigationState(newState);
    this.currentState = newState;

    // 广播状态变更事件
    this.broadcastStateChanged();
  }

  /**
   * 导航到下一步
   */
  navigateNext(currentStepId: string, skipCurrent?: boolean): NextStepResponse {
    try {
      const state = this.getCurrentState();

      // 验证当前步骤
      if (state.currentStepId !== currentStepId) {
        return {
          success: false,
          error: `当前步骤不匹配: 期望 ${currentStepId}, 实际 ${state.currentStepId}`
        };
      }

      // 检查是否可以前进
      if (!state.canGoForward) {
        return {
          success: false,
          error: '当前步骤不允许前进'
        };
      }

      // 获取下一步
      const currentIndex = this.availableSteps.indexOf(currentStepId);
      if (currentIndex >= this.availableSteps.length - 1) {
        return {
          success: false,
          error: '已经是最后一步'
        };
      }

      const nextStepId = this.availableSteps[currentIndex + 1];

      // 如果跳过当前步骤，标记为已跳过
      if (skipCurrent) {
        // TODO: 在实际实现中，这里需要更新步骤状态为SKIPPED
        console.log(`跳过步骤: ${currentStepId}`);
      }

      // 更新导航状态
      const newState = navigateToNext(state, nextStepId);
      this.updateState(newState);

      return {
        success: true,
        nextStepId
      };

    } catch (error) {
      console.error('导航到下一步失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 导航到上一步
   */
  navigatePrevious(currentStepId: string): PreviousStepResponse {
    try {
      const state = this.getCurrentState();

      // 验证当前步骤
      if (state.currentStepId !== currentStepId) {
        return {
          success: false,
          error: `当前步骤不匹配: 期望 ${currentStepId}, 实际 ${state.currentStepId}`
        };
      }

      // 检查是否可以返回
      if (!state.canGoBack) {
        return {
          success: false,
          error: '当前步骤不允许返回'
        };
      }

      // 执行返回操作
      const previousState = goBack(state);
      if (!previousState) {
        return {
          success: false,
          error: '无法返回上一步'
        };
      }

      this.updateState(previousState);

      return {
        success: true,
        previousStepId: previousState.currentStepId
      };

    } catch (error) {
      console.error('导航到上一步失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 广播状态变更事件
   */
  private broadcastStateChanged(): void {
    if (this.currentState) {
      // TODO: 在实际实现中，这里需要向所有渲染进程发送事件
      console.log('导航状态已变更:', {
        currentStepIndex: this.getCurrentStepIndex(),
        canGoBack: this.currentState.canGoBack,
        canGoNext: this.currentState.canGoForward,
        progressPercentage: this.currentState.progressPercentage
      });
    }
  }

  /**
   * 获取当前步骤索引
   */
  private getCurrentStepIndex(): number {
    if (!this.currentState) return 0;
    return this.availableSteps.indexOf(this.currentState.currentStepId);
  }
}

/**
 * 全局导航状态管理器实例
 */
const navigationManager = new NavigationStateManager();

/**
 * 处理导航到下一步的请求
 */
async function handleNavigationNext(
  event: IpcMainInvokeEvent,
  request: NextStepRequest
): Promise<NextStepResponse> {
  console.log('处理导航下一步请求:', request);

  try {
    // 验证请求参数
    if (!request.currentStepId || typeof request.currentStepId !== 'string') {
      throw new Error('currentStepId 是必需的字符串参数');
    }

    // 执行导航
    const result = navigationManager.navigateNext(request.currentStepId, request.skipCurrent);

    console.log('导航下一步结果:', result);
    return result;

  } catch (error) {
    console.error('处理导航下一步请求失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 处理导航到上一步的请求
 */
async function handleNavigationPrevious(
  event: IpcMainInvokeEvent,
  request: PreviousStepRequest
): Promise<PreviousStepResponse> {
  console.log('处理导航上一步请求:', request);

  try {
    // 验证请求参数
    if (!request.currentStepId || typeof request.currentStepId !== 'string') {
      throw new Error('currentStepId 是必需的字符串参数');
    }

    // 执行导航
    const result = navigationManager.navigatePrevious(request.currentStepId);

    console.log('导航上一步结果:', result);
    return result;

  } catch (error) {
    console.error('处理导航上一步请求失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 获取当前导航状态
 */
async function handleGetNavigationState(event: IpcMainInvokeEvent): Promise<any> {
  console.log('获取导航状态请求');

  try {
    const state = navigationManager.getCurrentState();

    return createSuccessResponse({
      currentStepId: state.currentStepId,
      currentStepIndex: navigationManager['getCurrentStepIndex'](),
      canGoBack: state.canGoBack,
      canGoForward: state.canGoForward,
      canSkipCurrent: state.canSkipCurrent,
      progressPercentage: state.progressPercentage,
      totalSteps: state.availableSteps.length,
      completedSteps: state.completedSteps
    });

  } catch (error) {
    console.error('获取导航状态失败:', error);
    return createErrorResponse(
      'NAVIGATION_STATE_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 重置导航状态
 */
async function handleResetNavigation(event: IpcMainInvokeEvent): Promise<any> {
  console.log('重置导航状态请求');

  try {
    navigationManager['currentState'] = null;
    navigationManager.initialize();

    return createSuccessResponse({
      message: '导航状态已重置',
      currentStepId: navigationManager.getCurrentState().currentStepId
    });

  } catch (error) {
    console.error('重置导航状态失败:', error);
    return createErrorResponse(
      'NAVIGATION_RESET_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Navigation API IPC处理器定义
 */
const navigationHandlers: IpcHandler[] = [
  {
    channel: 'installer:navigation:next',
    handler: handleNavigationNext
  },
  {
    channel: 'installer:navigation:previous',
    handler: handleNavigationPrevious
  },
  {
    channel: 'installer:navigation:get-state',
    handler: handleGetNavigationState
  },
  {
    channel: 'installer:navigation:reset',
    handler: handleResetNavigation
  }
];

/**
 * 注册Navigation API处理器
 */
export function registerNavigationHandlers(): void {
  console.log('注册Navigation API处理器...');

  navigationHandlers.forEach(handler => {
    try {
      ipcRegistry.register(handler);
    } catch (error) {
      console.error(`注册Navigation API处理器失败 [${handler.channel}]:`, error);
    }
  });

  // 初始化导航状态
  navigationManager.initialize();

  console.log('Navigation API处理器注册完成');
}

/**
 * 注销Navigation API处理器
 */
export function unregisterNavigationHandlers(): void {
  console.log('注销Navigation API处理器...');

  navigationHandlers.forEach(handler => {
    try {
      ipcRegistry.unregister(handler.channel);
    } catch (error) {
      console.error(`注销Navigation API处理器失败 [${handler.channel}]:`, error);
    }
  });

  console.log('Navigation API处理器注销完成');
}

/**
 * 获取导航管理器实例（用于其他模块）
 */
export function getNavigationManager(): NavigationStateManager {
  return navigationManager;
}

/**
 * 导出类型定义
 */
export type { NextStepRequest, PreviousStepRequest, NextStepResponse, PreviousStepResponse };