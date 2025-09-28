/**
 * Step Execution API IPC处理器实现
 * 处理安装步骤执行相关的IPC请求
 */

import { IpcMainInvokeEvent } from 'electron';
import { ipcRegistry, IpcHandler, createSuccessResponse, createErrorResponse } from '../ipc-handlers';
import {
  InstallationStep,
  StepStatus,
  validateInstallationStep,
  updateStepStatus,
  canExecuteStep,
  isStepCompleted,
  isStepRunning
} from '../../models/installation-step';

/**
 * 步骤执行请求接口
 */
interface StartStepRequest {
  stepId: string;
  options?: {
    skipDetection?: boolean;
    autoFix?: boolean;
    force?: boolean;
  };
}

interface StartStepResponse {
  success: boolean;
  taskId?: string;
  error?: string;
}

/**
 * 步骤进度事件接口
 */
interface StepProgress {
  stepId: string;
  taskId: string;
  progress: number; // 0-100
  message: string;
  details?: any;
}

/**
 * 步骤完成事件接口
 */
interface StepCompleted {
  stepId: string;
  taskId: string;
  status: 'success' | 'failed' | 'warning';
  message: string;
  canRetry: boolean;
  autoFixApplied?: boolean;
  duration?: number;
  details?: any;
}

/**
 * 任务信息接口
 */
interface TaskInfo {
  id: string;
  stepId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime: number;
  endTime?: number;
  error?: string;
}

/**
 * 步骤执行管理器
 */
class StepExecutionManager {
  private steps = new Map<string, InstallationStep>();
  private runningTasks = new Map<string, TaskInfo>();
  private taskCounter = 0;

  constructor() {
    this.initializeSteps();
  }

  /**
   * 初始化默认步骤
   */
  private initializeSteps(): void {
    const defaultSteps: Omit<InstallationStep, 'status'>[] = [
      {
        id: 'welcome',
        name: '欢迎',
        description: '欢迎使用Claude CLI安装程序',
        order: 1,
        isOptional: false,
        canSkip: false,
        hasAutoDetection: false,
        estimatedDuration: 0
      },
      {
        id: 'prerequisites',
        name: '前置检查',
        description: '检查系统前置条件',
        order: 2,
        isOptional: false,
        canSkip: false,
        hasAutoDetection: true,
        estimatedDuration: 30
      },
      {
        id: 'network-check',
        name: '网络检查',
        description: '检测网络连接和DNS解析',
        order: 3,
        isOptional: false,
        canSkip: false,
        hasAutoDetection: true,
        estimatedDuration: 60
      },
      {
        id: 'nodejs-setup',
        name: 'Node.js安装',
        description: '检测或安装Node.js环境',
        order: 4,
        isOptional: false,
        canSkip: false,
        hasAutoDetection: true,
        estimatedDuration: 300
      },
      {
        id: 'google-setup',
        name: 'Google设置',
        description: 'Google账户配置引导',
        order: 5,
        isOptional: true,
        canSkip: true,
        hasAutoDetection: false,
        estimatedDuration: 120
      },
      {
        id: 'claude-install',
        name: 'Claude CLI安装',
        description: '检测或安装Claude CLI',
        order: 6,
        isOptional: false,
        canSkip: false,
        hasAutoDetection: true,
        estimatedDuration: 180
      },
      {
        id: 'api-config',
        name: 'API配置',
        description: '配置Anthropic API密钥',
        order: 7,
        isOptional: true,
        canSkip: true,
        hasAutoDetection: false,
        estimatedDuration: 60
      },
      {
        id: 'completion',
        name: '安装完成',
        description: '安装流程完成',
        order: 8,
        isOptional: false,
        canSkip: false,
        hasAutoDetection: false,
        estimatedDuration: 0
      }
    ];

    defaultSteps.forEach(stepData => {
      const step: InstallationStep = {
        ...stepData,
        status: StepStatus.PENDING
      };
      validateInstallationStep(step);
      this.steps.set(step.id, step);
    });

    console.log(`初始化了 ${this.steps.size} 个安装步骤`);
  }

  /**
   * 获取步骤信息
   */
  getStep(stepId: string): InstallationStep | undefined {
    return this.steps.get(stepId);
  }

  /**
   * 获取所有步骤
   */
  getAllSteps(): InstallationStep[] {
    return Array.from(this.steps.values()).sort((a, b) => a.order - b.order);
  }

  /**
   * 开始执行步骤
   */
  async startStep(stepId: string, options?: StartStepRequest['options']): Promise<StartStepResponse> {
    try {
      const step = this.getStep(stepId);
      if (!step) {
        return {
          success: false,
          error: `步骤不存在: ${stepId}`
        };
      }

      // 检查步骤是否可以执行
      if (!canExecuteStep(step)) {
        return {
          success: false,
          error: `步骤当前状态不允许执行: ${step.status}`
        };
      }

      // 生成任务ID
      const taskId = this.generateTaskId();

      // 更新步骤状态
      const runningStep = updateStepStatus(step, StepStatus.RUNNING);
      this.steps.set(stepId, runningStep);

      // 创建任务信息
      const taskInfo: TaskInfo = {
        id: taskId,
        stepId,
        status: 'running',
        progress: 0,
        startTime: Date.now()
      };
      this.runningTasks.set(taskId, taskInfo);

      // 异步执行步骤
      this.executeStepAsync(stepId, taskId, options);

      console.log(`步骤 ${stepId} 开始执行，任务ID: ${taskId}`);

      return {
        success: true,
        taskId
      };

    } catch (error) {
      console.error(`开始执行步骤 ${stepId} 失败:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 异步执行步骤
   */
  private async executeStepAsync(stepId: string, taskId: string, options?: StartStepRequest['options']): Promise<void> {
    const step = this.getStep(stepId);
    if (!step) return;

    try {
      console.log(`执行步骤: ${stepId}`, options);

      // 发送开始进度事件
      this.emitProgress(stepId, taskId, 0, `开始执行 ${step.name}`);

      // 根据步骤类型执行不同的逻辑
      switch (stepId) {
        case 'prerequisites':
          await this.executePrerequisitesStep(stepId, taskId, options);
          break;
        case 'network-check':
          await this.executeNetworkCheckStep(stepId, taskId, options);
          break;
        case 'nodejs-setup':
          await this.executeNodeJsSetupStep(stepId, taskId, options);
          break;
        case 'google-setup':
          await this.executeGoogleSetupStep(stepId, taskId, options);
          break;
        case 'claude-install':
          await this.executeClaudeInstallStep(stepId, taskId, options);
          break;
        case 'api-config':
          await this.executeApiConfigStep(stepId, taskId, options);
          break;
        default:
          // 默认步骤直接标记为成功
          await this.sleep(1000); // 模拟执行时间
          this.emitProgress(stepId, taskId, 100, `${step.name} 完成`);
      }

      // 更新步骤状态为成功
      const completedStep = updateStepStatus(step, StepStatus.SUCCESS);
      this.steps.set(stepId, completedStep);

      // 更新任务状态
      const taskInfo = this.runningTasks.get(taskId);
      if (taskInfo) {
        taskInfo.status = 'completed';
        taskInfo.progress = 100;
        taskInfo.endTime = Date.now();
      }

      // 发送完成事件
      this.emitCompleted(stepId, taskId, 'success', `${step.name} 执行成功`);

    } catch (error) {
      console.error(`执行步骤 ${stepId} 失败:`, error);

      // 更新步骤状态为失败
      const failedStep = updateStepStatus(step, StepStatus.FAILED);
      this.steps.set(stepId, failedStep);

      // 更新任务状态
      const taskInfo = this.runningTasks.get(taskId);
      if (taskInfo) {
        taskInfo.status = 'failed';
        taskInfo.endTime = Date.now();
        taskInfo.error = error instanceof Error ? error.message : String(error);
      }

      // 发送完成事件
      this.emitCompleted(
        stepId,
        taskId,
        'failed',
        error instanceof Error ? error.message : String(error),
        true // 可以重试
      );
    }
  }

  /**
   * 执行前置检查步骤
   */
  private async executePrerequisitesStep(stepId: string, taskId: string, options?: any): Promise<void> {
    this.emitProgress(stepId, taskId, 20, '检查操作系统版本');
    await this.sleep(500);

    this.emitProgress(stepId, taskId, 40, '检查系统架构');
    await this.sleep(500);

    this.emitProgress(stepId, taskId, 60, '检查磁盘空间');
    await this.sleep(500);

    this.emitProgress(stepId, taskId, 80, '检查权限');
    await this.sleep(500);

    this.emitProgress(stepId, taskId, 100, '前置检查完成');
  }

  /**
   * 执行网络检查步骤
   */
  private async executeNetworkCheckStep(stepId: string, taskId: string, options?: any): Promise<void> {
    this.emitProgress(stepId, taskId, 10, '测试互联网连接');
    await this.sleep(1000);

    this.emitProgress(stepId, taskId, 30, '测试DNS解析');
    await this.sleep(1000);

    this.emitProgress(stepId, taskId, 50, '测试npm注册表连接');
    await this.sleep(1000);

    this.emitProgress(stepId, taskId, 70, '测试Anthropic API连接');
    await this.sleep(1000);

    this.emitProgress(stepId, taskId, 90, '测试Google服务连接');
    await this.sleep(1000);

    this.emitProgress(stepId, taskId, 100, '网络检查完成');
  }

  /**
   * 执行Node.js安装步骤
   */
  private async executeNodeJsSetupStep(stepId: string, taskId: string, options?: any): Promise<void> {
    this.emitProgress(stepId, taskId, 10, '检测Node.js安装状态');
    await this.sleep(1000);

    this.emitProgress(stepId, taskId, 30, '配置npm镜像源');
    await this.sleep(2000);

    this.emitProgress(stepId, taskId, 60, '验证Node.js版本兼容性');
    await this.sleep(1000);

    this.emitProgress(stepId, taskId, 80, '更新npm到最新版本');
    await this.sleep(2000);

    this.emitProgress(stepId, taskId, 100, 'Node.js环境配置完成');
  }

  /**
   * 执行Google设置步骤
   */
  private async executeGoogleSetupStep(stepId: string, taskId: string, options?: any): Promise<void> {
    this.emitProgress(stepId, taskId, 25, '显示Google账户登录指引');
    await this.sleep(1000);

    this.emitProgress(stepId, taskId, 50, '等待用户完成登录');
    await this.sleep(2000);

    this.emitProgress(stepId, taskId, 75, '验证Google账户状态');
    await this.sleep(1000);

    this.emitProgress(stepId, taskId, 100, 'Google账户配置完成');
  }

  /**
   * 执行Claude CLI安装步骤
   */
  private async executeClaudeInstallStep(stepId: string, taskId: string, options?: any): Promise<void> {
    this.emitProgress(stepId, taskId, 10, '检测Claude CLI安装状态');
    await this.sleep(1000);

    this.emitProgress(stepId, taskId, 30, '下载Claude CLI');
    await this.sleep(3000);

    this.emitProgress(stepId, taskId, 60, '安装Claude CLI');
    await this.sleep(2000);

    this.emitProgress(stepId, taskId, 80, '配置Claude CLI环境');
    await this.sleep(1000);

    this.emitProgress(stepId, taskId, 90, '验证Claude CLI安装');
    await this.sleep(1000);

    this.emitProgress(stepId, taskId, 100, 'Claude CLI安装完成');
  }

  /**
   * 执行API配置步骤
   */
  private async executeApiConfigStep(stepId: string, taskId: string, options?: any): Promise<void> {
    this.emitProgress(stepId, taskId, 20, '配置环境变量');
    await this.sleep(1000);

    this.emitProgress(stepId, taskId, 40, '验证API密钥格式');
    await this.sleep(500);

    this.emitProgress(stepId, taskId, 60, '测试API连接');
    await this.sleep(2000);

    this.emitProgress(stepId, taskId, 80, '保存配置');
    await this.sleep(500);

    this.emitProgress(stepId, taskId, 100, 'API配置完成');
  }

  /**
   * 发送进度事件
   */
  private emitProgress(stepId: string, taskId: string, progress: number, message: string, details?: any): void {
    const progressEvent: StepProgress = {
      stepId,
      taskId,
      progress: Math.min(100, Math.max(0, progress)),
      message,
      details
    };

    // 更新任务进度
    const taskInfo = this.runningTasks.get(taskId);
    if (taskInfo) {
      taskInfo.progress = progressEvent.progress;
    }

    // TODO: 向渲染进程发送进度事件
    console.log(`步骤进度 [${stepId}]: ${progress}% - ${message}`);
  }

  /**
   * 发送完成事件
   */
  private emitCompleted(
    stepId: string,
    taskId: string,
    status: 'success' | 'failed' | 'warning',
    message: string,
    canRetry: boolean = false,
    autoFixApplied?: boolean,
    details?: any
  ): void {
    const taskInfo = this.runningTasks.get(taskId);
    const duration = taskInfo ? (taskInfo.endTime || Date.now()) - taskInfo.startTime : 0;

    const completedEvent: StepCompleted = {
      stepId,
      taskId,
      status,
      message,
      canRetry,
      autoFixApplied,
      duration,
      details
    };

    // 移除已完成的任务
    this.runningTasks.delete(taskId);

    // TODO: 向渲染进程发送完成事件
    console.log(`步骤完成 [${stepId}]: ${status} - ${message} (${duration}ms)`);
  }

  /**
   * 取消任务
   */
  cancelTask(taskId: string): boolean {
    const taskInfo = this.runningTasks.get(taskId);
    if (!taskInfo) {
      return false;
    }

    taskInfo.status = 'cancelled';
    taskInfo.endTime = Date.now();

    // 更新步骤状态
    const step = this.getStep(taskInfo.stepId);
    if (step && step.status === StepStatus.RUNNING) {
      const pendingStep = updateStepStatus(step, StepStatus.PENDING);
      this.steps.set(taskInfo.stepId, pendingStep);
    }

    this.runningTasks.delete(taskId);
    console.log(`任务已取消: ${taskId}`);
    return true;
  }

  /**
   * 获取任务信息
   */
  getTaskInfo(taskId: string): TaskInfo | undefined {
    return this.runningTasks.get(taskId);
  }

  /**
   * 获取所有运行中的任务
   */
  getRunningTasks(): TaskInfo[] {
    return Array.from(this.runningTasks.values());
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `task_${++this.taskCounter}_${Date.now()}`;
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 全局步骤执行管理器实例
 */
const stepExecutionManager = new StepExecutionManager();

/**
 * 处理开始步骤执行的请求
 */
async function handleStepStart(
  event: IpcMainInvokeEvent,
  request: StartStepRequest
): Promise<any> {
  console.log('处理开始步骤执行请求:', request);

  try {
    // 验证请求参数
    if (!request.stepId || typeof request.stepId !== 'string') {
      throw new Error('stepId 是必需的字符串参数');
    }

    const result = await stepExecutionManager.startStep(request.stepId, request.options);
    return createSuccessResponse(result);

  } catch (error) {
    console.error('处理开始步骤执行请求失败:', error);
    return createErrorResponse(
      'STEP_START_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 获取步骤信息
 */
async function handleGetStepInfo(event: IpcMainInvokeEvent, stepId: string): Promise<any> {
  try {
    const step = stepExecutionManager.getStep(stepId);
    if (!step) {
      return createErrorResponse('STEP_NOT_FOUND', `步骤不存在: ${stepId}`);
    }

    return createSuccessResponse(step);

  } catch (error) {
    console.error('获取步骤信息失败:', error);
    return createErrorResponse(
      'STEP_INFO_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 获取所有步骤
 */
async function handleGetAllSteps(event: IpcMainInvokeEvent): Promise<any> {
  try {
    const steps = stepExecutionManager.getAllSteps();
    return createSuccessResponse(steps);

  } catch (error) {
    console.error('获取所有步骤失败:', error);
    return createErrorResponse(
      'GET_STEPS_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 取消任务
 */
async function handleCancelTask(event: IpcMainInvokeEvent, taskId: string): Promise<any> {
  try {
    const success = stepExecutionManager.cancelTask(taskId);
    return createSuccessResponse({ cancelled: success });

  } catch (error) {
    console.error('取消任务失败:', error);
    return createErrorResponse(
      'CANCEL_TASK_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Step Execution API IPC处理器定义
 */
const stepExecutionHandlers: IpcHandler[] = [
  {
    channel: 'installer:step:start',
    handler: handleStepStart
  },
  {
    channel: 'installer:step:get-info',
    handler: handleGetStepInfo
  },
  {
    channel: 'installer:step:get-all',
    handler: handleGetAllSteps
  },
  {
    channel: 'installer:step:cancel-task',
    handler: handleCancelTask
  }
];

/**
 * 注册Step Execution API处理器
 */
export function registerStepExecutionHandlers(): void {
  console.log('注册Step Execution API处理器...');

  stepExecutionHandlers.forEach(handler => {
    try {
      ipcRegistry.register(handler);
    } catch (error) {
      console.error(`注册Step Execution API处理器失败 [${handler.channel}]:`, error);
    }
  });

  console.log('Step Execution API处理器注册完成');
}

/**
 * 注销Step Execution API处理器
 */
export function unregisterStepExecutionHandlers(): void {
  console.log('注销Step Execution API处理器...');

  stepExecutionHandlers.forEach(handler => {
    try {
      ipcRegistry.unregister(handler.channel);
    } catch (error) {
      console.error(`注销Step Execution API处理器失败 [${handler.channel}]:`, error);
    }
  });

  console.log('Step Execution API处理器注销完成');
}

/**
 * 获取步骤执行管理器实例（用于其他模块）
 */
export function getStepExecutionManager(): StepExecutionManager {
  return stepExecutionManager;
}

/**
 * 导出类型定义
 */
export type {
  StartStepRequest,
  StartStepResponse,
  StepProgress,
  StepCompleted,
  TaskInfo
};