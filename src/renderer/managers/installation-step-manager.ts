/**
 * 安装步骤管理器
 * 负责管理安装步骤的状态和执行流程
 */

/// <reference path="../types/global.d.ts" />

import { EventEmitter } from 'events';

/**
 * 安装步骤状态接口
 */
interface StepState {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  progress: number;
  message: string;
  details?: any;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  canRetry: boolean;
  canSkip: boolean;
}

/**
 * 安装会话状态接口
 */
interface InstallationSessionState {
  id: string;
  status: 'preparing' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  totalSteps: number;
  completedSteps: number;
  currentStepIndex: number;
  overallProgress: number;
  estimatedTimeRemaining?: number;
}

/**
 * 安装步骤管理器类
 */
class InstallationStepManager extends EventEmitter {
  private steps: Map<string, StepState> = new Map();
  private sessionState: InstallationSessionState | null = null;
  private isInitialized = false;

  /**
   * 初始化管理器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('安装步骤管理器已经初始化');
      return;
    }

    // 初始化步骤配置
    this.initializeSteps();

    // 加载会话状态
    await this.loadSessionState();

    this.isInitialized = true;
    console.log('安装步骤管理器初始化完成');
  }

  /**
   * 初始化步骤配置
   */
  private initializeSteps(): void {
    const stepConfigs = [
      {
        id: 'welcome',
        name: '欢迎',
        canRetry: false,
        canSkip: false
      },
      {
        id: 'prerequisites',
        name: '前置条件检查',
        canRetry: true,
        canSkip: false
      },
      {
        id: 'network-check',
        name: '网络环境检测',
        canRetry: true,
        canSkip: false
      },
      {
        id: 'nodejs-setup',
        name: 'Node.js环境配置',
        canRetry: true,
        canSkip: false
      },
      {
        id: 'google-setup',
        name: 'Google服务配置',
        canRetry: true,
        canSkip: true
      },
      {
        id: 'claude-install',
        name: 'Claude CLI安装',
        canRetry: true,
        canSkip: false
      },
      {
        id: 'api-config',
        name: 'API配置',
        canRetry: true,
        canSkip: true
      },
      {
        id: 'completion',
        name: '安装完成',
        canRetry: false,
        canSkip: false
      }
    ];

    stepConfigs.forEach(config => {
      const step: StepState = {
        ...config,
        status: 'pending',
        progress: 0,
        message: '等待执行'
      };
      this.steps.set(config.id, step);
    });

    console.log(`初始化了 ${stepConfigs.length} 个安装步骤`);
  }

  /**
   * 开始安装会话
   */
  async startInstallationSession(): Promise<string> {
    const sessionId = this.generateSessionId();

    this.sessionState = {
      id: sessionId,
      status: 'preparing',
      startTime: new Date(),
      totalSteps: this.steps.size,
      completedSteps: 0,
      currentStepIndex: 0,
      overallProgress: 0
    };

    // 重置所有步骤状态
    this.steps.forEach(step => {
      step.status = 'pending';
      step.progress = 0;
      step.message = '等待执行';
      step.startTime = undefined;
      step.endTime = undefined;
      step.duration = undefined;
    });

    this.emit('session-started', this.sessionState);
    await this.saveSessionState();

    console.log(`安装会话开始: ${sessionId}`);
    return sessionId;
  }

  /**
   * 开始执行步骤
   */
  async startStep(stepId: string): Promise<boolean> {
    const step = this.steps.get(stepId);
    if (!step) {
      console.error(`步骤不存在: ${stepId}`);
      return false;
    }

    if (step.status === 'running') {
      console.warn(`步骤已在运行: ${stepId}`);
      return false;
    }

    // 更新步骤状态
    step.status = 'running';
    step.progress = 0;
    step.message = '正在执行...';
    step.startTime = new Date();

    // 更新会话状态
    if (this.sessionState) {
      this.sessionState.status = 'running';
      this.sessionState.currentStepIndex = this.getStepIndex(stepId);
    }

    this.emit('step-started', step);
    this.updateOverallProgress();

    // 通知主进程开始执行步骤
    if (window.electronAPI) {
      try {
        await window.electronAPI.invoke('installer:step:start', {
          stepId,
          options: {}
        });
      } catch (error) {
        console.error(`启动步骤失败: ${stepId}`, error);
        await this.failStep(stepId, error instanceof Error ? error.message : String(error));
        return false;
      }
    }

    console.log(`步骤开始执行: ${stepId}`);
    return true;
  }

  /**
   * 处理步骤进度更新
   */
  handleStepProgress(progressData: any): void {
    const { stepId, progress, message, details } = progressData;
    const step = this.steps.get(stepId);

    if (!step) {
      console.warn(`收到未知步骤的进度更新: ${stepId}`);
      return;
    }

    // 更新步骤进度
    step.progress = Math.max(0, Math.min(100, progress));
    if (message) step.message = message;
    if (details) step.details = details;

    this.emit('step-progress', step);
    this.updateOverallProgress();

    console.log(`步骤进度更新: ${stepId} - ${progress}%`);
  }

  /**
   * 完成步骤
   */
  async completeStep(stepId: string, message?: string): Promise<void> {
    const step = this.steps.get(stepId);
    if (!step) return;

    step.status = 'success';
    step.progress = 100;
    step.message = message || '执行成功';
    step.endTime = new Date();

    if (step.startTime) {
      step.duration = step.endTime.getTime() - step.startTime.getTime();
    }

    // 更新会话状态
    if (this.sessionState) {
      this.sessionState.completedSteps++;
    }

    this.emit('step-completed', step);
    this.updateOverallProgress();
    await this.saveSessionState();

    console.log(`步骤完成: ${stepId}`);
  }

  /**
   * 步骤失败
   */
  async failStep(stepId: string, errorMessage: string): Promise<void> {
    const step = this.steps.get(stepId);
    if (!step) return;

    step.status = 'failed';
    step.message = errorMessage;
    step.endTime = new Date();

    if (step.startTime) {
      step.duration = step.endTime.getTime() - step.startTime.getTime();
    }

    this.emit('step-failed', step);
    await this.saveSessionState();

    console.log(`步骤失败: ${stepId} - ${errorMessage}`);
  }

  /**
   * 跳过步骤
   */
  async skipStep(stepId: string): Promise<boolean> {
    const step = this.steps.get(stepId);
    if (!step) return false;

    if (!step.canSkip) {
      console.warn(`步骤不能跳过: ${stepId}`);
      return false;
    }

    step.status = 'skipped';
    step.progress = 100;
    step.message = '已跳过';
    step.endTime = new Date();

    // 更新会话状态
    if (this.sessionState) {
      this.sessionState.completedSteps++;
    }

    this.emit('step-skipped', step);
    this.updateOverallProgress();
    await this.saveSessionState();

    console.log(`步骤跳过: ${stepId}`);
    return true;
  }

  /**
   * 重试步骤
   */
  async retryStep(stepId: string): Promise<boolean> {
    const step = this.steps.get(stepId);
    if (!step) return false;

    if (!step.canRetry) {
      console.warn(`步骤不能重试: ${stepId}`);
      return false;
    }

    // 重置步骤状态
    step.status = 'pending';
    step.progress = 0;
    step.message = '准备重试';
    step.startTime = undefined;
    step.endTime = undefined;
    step.duration = undefined;

    this.emit('step-reset', step);

    // 重新开始执行
    return this.startStep(stepId);
  }

  /**
   * 更新整体进度
   */
  private updateOverallProgress(): void {
    if (!this.sessionState) return;

    const totalSteps = this.sessionState.totalSteps;
    const completedSteps = this.sessionState.completedSteps;

    // 计算当前运行步骤的进度贡献
    let currentStepProgress = 0;
    for (const step of this.steps.values()) {
      if (step.status === 'running') {
        currentStepProgress = step.progress / 100 / totalSteps;
        break;
      }
    }

    this.sessionState.overallProgress = Math.round(
      ((completedSteps / totalSteps) + currentStepProgress) * 100
    );

    // 估算剩余时间
    this.estimateRemainingTime();

    this.emit('session-progress', this.sessionState);
  }

  /**
   * 估算剩余时间
   */
  private estimateRemainingTime(): void {
    if (!this.sessionState) return;

    const elapsed = Date.now() - this.sessionState.startTime.getTime();
    const completed = this.sessionState.completedSteps;
    const total = this.sessionState.totalSteps;

    if (completed > 0) {
      const avgTimePerStep = elapsed / completed;
      const remainingSteps = total - completed;
      this.sessionState.estimatedTimeRemaining = Math.round(
        (avgTimePerStep * remainingSteps) / 1000
      );
    }
  }

  /**
   * 暂停安装会话
   */
  pauseSession(): void {
    if (this.sessionState && this.sessionState.status === 'running') {
      this.sessionState.status = 'paused';
      this.emit('session-paused', this.sessionState);
      console.log('安装会话已暂停');
    }
  }

  /**
   * 恢复安装会话
   */
  resumeSession(): void {
    if (this.sessionState && this.sessionState.status === 'paused') {
      this.sessionState.status = 'running';
      this.emit('session-resumed', this.sessionState);
      console.log('安装会话已恢复');
    }
  }

  /**
   * 取消安装会话
   */
  async cancelSession(): Promise<void> {
    if (this.sessionState && this.sessionState.status !== 'completed') {
      this.sessionState.status = 'cancelled';
      this.sessionState.endTime = new Date();
      this.emit('session-cancelled', this.sessionState);
      await this.saveSessionState();
      console.log('安装会话已取消');
    }
  }

  /**
   * 完成安装会话
   */
  async completeSession(): Promise<void> {
    if (this.sessionState) {
      this.sessionState.status = 'completed';
      this.sessionState.endTime = new Date();
      this.sessionState.overallProgress = 100;
      this.emit('session-completed', this.sessionState);
      await this.saveSessionState();
      console.log('安装会话已完成');
    }
  }

  /**
   * 获取步骤状态
   */
  getStep(stepId: string): StepState | null {
    return this.steps.get(stepId) || null;
  }

  /**
   * 获取所有步骤
   */
  getAllSteps(): StepState[] {
    return Array.from(this.steps.values());
  }

  /**
   * 获取会话状态
   */
  getSessionState(): InstallationSessionState | null {
    return this.sessionState;
  }

  /**
   * 获取步骤索引
   */
  private getStepIndex(stepId: string): number {
    const stepIds = Array.from(this.steps.keys());
    return stepIds.indexOf(stepId);
  }

  /**
   * 加载会话状态
   */
  private async loadSessionState(): Promise<void> {
    try {
      if (window.electronAPI) {
        const savedState = await window.electronAPI.invoke('installation-session:load');
        if (savedState) {
          this.sessionState = {
            ...savedState,
            startTime: new Date(savedState.startTime),
            endTime: savedState.endTime ? new Date(savedState.endTime) : undefined
          };
        }
      }
    } catch (error) {
      console.warn('加载安装会话状态失败:', error);
    }
  }

  /**
   * 保存会话状态
   */
  private async saveSessionState(): Promise<void> {
    try {
      if (window.electronAPI && this.sessionState) {
        await window.electronAPI.invoke('installation-session:save', this.sessionState);
      }
    } catch (error) {
      console.warn('保存安装会话状态失败:', error);
    }
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.removeAllListeners();
    this.steps.clear();
    this.sessionState = null;
    this.isInitialized = false;
    console.log('安装步骤管理器已销毁');
  }
}

/**
 * 全局安装步骤管理器实例
 */
export const installationStepManager = new InstallationStepManager();

/**
 * 导出类型定义
 */
export type { StepState, InstallationSessionState };