/**
 * 安装步骤管理服务
 * 负责安装步骤的编排、执行状态管理和流程控制
 */

import { getStepExecutionManager } from '../main/ipc/step-handler';
import { InstallationStep, StepStatus, canExecuteStep, isStepCompleted } from '../models/installation-step';
import { networkService } from './network-service';
import { nodeJsService } from './nodejs-service';
import { claudeCliService } from './claude-cli-service';
import { configurationService } from './config-service';

/**
 * 安装流程配置接口
 */
interface InstallationFlowConfig {
  skipOptionalSteps: boolean;
  autoRetry: boolean;
  maxRetries: number;
  parallelExecution: boolean;
  continueOnError: boolean;
  customStepOrder?: string[];
}

/**
 * 安装进度接口
 */
interface InstallationProgress {
  totalSteps: number;
  completedSteps: number;
  currentStep?: InstallationStep;
  overallProgress: number; // 0-100
  estimatedTimeRemaining?: number; // 秒
  status: 'preparing' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
}

/**
 * 步骤执行结果接口
 */
interface StepExecutionResult {
  stepId: string;
  success: boolean;
  duration: number;
  error?: string;
  warnings?: string[];
  canRetry: boolean;
  autoFixAttempted?: boolean;
}

/**
 * 安装会话接口
 */
interface InstallationSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  config: InstallationFlowConfig;
  progress: InstallationProgress;
  stepResults: StepExecutionResult[];
  logs: string[];
  status: 'active' | 'completed' | 'failed' | 'cancelled';
}

/**
 * 步骤依赖关系接口
 */
interface StepDependency {
  stepId: string;
  dependsOn: string[];
  optional: boolean;
}

/**
 * 安装步骤管理服务类
 */
export class StepService {
  private stepExecutionManager = getStepExecutionManager();
  private currentSession: InstallationSession | null = null;
  private stepDependencies: StepDependency[] = [];
  private stepCallbacks = new Map<string, Function[]>();

  constructor() {
    this.initializeDependencies();
  }

  /**
   * 初始化步骤依赖关系
   */
  private initializeDependencies(): void {
    this.stepDependencies = [
      { stepId: 'welcome', dependsOn: [], optional: false },
      { stepId: 'prerequisites', dependsOn: ['welcome'], optional: false },
      { stepId: 'network-check', dependsOn: ['prerequisites'], optional: false },
      { stepId: 'nodejs-setup', dependsOn: ['network-check'], optional: false },
      { stepId: 'google-setup', dependsOn: ['nodejs-setup'], optional: true },
      { stepId: 'claude-install', dependsOn: ['nodejs-setup'], optional: false },
      { stepId: 'api-config', dependsOn: ['claude-install'], optional: true },
      { stepId: 'completion', dependsOn: ['claude-install'], optional: false }
    ];
  }

  /**
   * 开始安装流程
   */
  async startInstallation(config: Partial<InstallationFlowConfig> = {}): Promise<InstallationSession> {
    console.log('开始安装流程');

    // 如果已有活动会话，先结束它
    if (this.currentSession && this.currentSession.status === 'active') {
      await this.cancelInstallation();
    }

    const fullConfig: InstallationFlowConfig = {
      skipOptionalSteps: false,
      autoRetry: true,
      maxRetries: 3,
      parallelExecution: false,
      continueOnError: false,
      ...config
    };

    const session: InstallationSession = {
      id: this.generateSessionId(),
      startTime: new Date(),
      config: fullConfig,
      progress: {
        totalSteps: 0,
        completedSteps: 0,
        overallProgress: 0,
        status: 'preparing'
      },
      stepResults: [],
      logs: [],
      status: 'active'
    };

    this.currentSession = session;

    try {
      // 获取要执行的步骤
      const steps = await this.getExecutableSteps(fullConfig);
      session.progress.totalSteps = steps.length;
      session.progress.status = 'running';

      this.logMessage(session, `安装会话开始: ${session.id}`);
      this.logMessage(session, `总计 ${steps.length} 个步骤`);

      // 执行步骤
      await this.executeSteps(session, steps);

      // 完成会话
      session.endTime = new Date();
      session.status = 'completed';
      session.progress.status = 'completed';
      session.progress.overallProgress = 100;

      this.logMessage(session, '安装流程完成');
      console.log(`安装流程完成: ${session.id}`);

      return session;

    } catch (error) {
      console.error('安装流程失败:', error);

      session.endTime = new Date();
      session.status = 'failed';
      session.progress.status = 'failed';

      this.logMessage(session, `安装流程失败: ${error instanceof Error ? error.message : String(error)}`);

      throw error;
    }
  }

  /**
   * 获取可执行的步骤
   */
  private async getExecutableSteps(config: InstallationFlowConfig): Promise<InstallationStep[]> {
    const allSteps = this.stepExecutionManager.getAllSteps();

    let executableSteps = allSteps.filter(step => {
      // 跳过可选步骤（如果配置要求）
      if (config.skipOptionalSteps && step.isOptional) {
        return false;
      }

      // 检查步骤是否可以执行
      return canExecuteStep(step);
    });

    // 应用自定义步骤顺序
    if (config.customStepOrder && config.customStepOrder.length > 0) {
      executableSteps = this.reorderSteps(executableSteps, config.customStepOrder);
    }

    return executableSteps;
  }

  /**
   * 执行步骤列表
   */
  private async executeSteps(session: InstallationSession, steps: InstallationStep[]): Promise<void> {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      // 检查会话状态
      if (session.status !== 'active') {
        throw new Error('安装会话已被取消或失败');
      }

      // 检查依赖关系
      const dependencyResult = await this.checkDependencies(step, session);
      if (!dependencyResult.canExecute) {
        this.logMessage(session, `跳过步骤 ${step.name}: ${dependencyResult.reason}`);
        continue;
      }

      // 更新进度
      session.progress.currentStep = step;
      this.updateProgress(session);

      // 执行步骤
      const result = await this.executeStep(session, step);

      // 处理执行结果
      session.stepResults.push(result);

      if (result.success) {
        session.progress.completedSteps++;
        this.logMessage(session, `步骤 ${step.name} 完成 (${result.duration}ms)`);
      } else {
        this.logMessage(session, `步骤 ${step.name} 失败: ${result.error}`);

        // 决定是否继续
        if (!session.config.continueOnError) {
          throw new Error(`步骤 ${step.name} 失败: ${result.error}`);
        }
      }

      // 触发步骤完成回调
      await this.triggerStepCallbacks(step.id, result);
    }
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(session: InstallationSession, step: InstallationStep): Promise<StepExecutionResult> {
    const startTime = Date.now();
    let retries = 0;
    let lastError: string | undefined;

    this.logMessage(session, `开始执行步骤: ${step.name}`);

    while (retries <= session.config.maxRetries) {
      try {
        // 根据步骤类型执行相应的逻辑
        await this.executeStepLogic(session, step);

        const duration = Date.now() - startTime;
        return {
          stepId: step.id,
          success: true,
          duration,
          canRetry: false
        };

      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        this.logMessage(session, `步骤 ${step.name} 失败 (尝试 ${retries + 1}/${session.config.maxRetries + 1}): ${lastError}`);

        if (session.config.autoRetry && retries < session.config.maxRetries) {
          retries++;
          // 等待一段时间后重试
          await this.sleep(1000 * retries);
          continue;
        } else {
          break;
        }
      }
    }

    const duration = Date.now() - startTime;
    return {
      stepId: step.id,
      success: false,
      duration,
      error: lastError,
      canRetry: retries <= session.config.maxRetries
    };
  }

  /**
   * 执行步骤具体逻辑
   */
  private async executeStepLogic(session: InstallationSession, step: InstallationStep): Promise<void> {
    switch (step.id) {
      case 'welcome':
        // 欢迎步骤不需要实际操作
        await this.sleep(500);
        break;

      case 'prerequisites':
        await this.executePrerequisitesStep(session);
        break;

      case 'network-check':
        await this.executeNetworkCheckStep(session);
        break;

      case 'nodejs-setup':
        await this.executeNodeJsSetupStep(session);
        break;

      case 'google-setup':
        await this.executeGoogleSetupStep(session);
        break;

      case 'claude-install':
        await this.executeClaudeInstallStep(session);
        break;

      case 'api-config':
        await this.executeApiConfigStep(session);
        break;

      case 'completion':
        await this.executeCompletionStep(session);
        break;

      default:
        throw new Error(`未知步骤: ${step.id}`);
    }
  }

  /**
   * 执行前置条件检查步骤
   */
  private async executePrerequisitesStep(session: InstallationSession): Promise<void> {
    this.logMessage(session, '检查系统前置条件...');

    // 检查操作系统
    const platform = process.platform;
    const arch = process.arch;
    this.logMessage(session, `操作系统: ${platform} (${arch})`);

    // 检查Node.js环境（如果已安装）
    const nodeEnv = await nodeJsService.checkEnvironment();
    if (nodeEnv.node.installed) {
      this.logMessage(session, `发现已安装的Node.js: ${nodeEnv.node.version}`);
    }

    // 检查网络基础连接
    const networkResult = await networkService.detectNetwork({
      timeout: 5000,
      skipCache: true
    });

    if (networkResult.overall === 'failed') {
      throw new Error('网络连接检查失败，无法继续安装');
    }

    this.logMessage(session, '前置条件检查完成');
  }

  /**
   * 执行网络检查步骤
   */
  private async executeNetworkCheckStep(session: InstallationSession): Promise<void> {
    this.logMessage(session, '执行网络环境检测...');

    const networkResult = await networkService.detectNetwork({
      checkAll: true,
      skipCache: true
    });

    if (networkResult.overall === 'failed') {
      throw new Error('网络环境检测失败');
    }

    // 应用网络优化
    if (networkResult.optimizedConfig) {
      await networkService.applyOptimization({
        enabled: true,
        chinaMirrors: networkResult.optimizedConfig.preferredRegistry.includes('npmmirror'),
        customDns: networkResult.optimizedConfig.dnsServers || [],
        timeout: networkResult.optimizedConfig.timeout,
        retryCount: networkResult.optimizedConfig.retryCount,
        userAgent: networkResult.optimizedConfig.userAgent
      });
    }

    this.logMessage(session, `网络检测完成: ${networkResult.overall}`);
  }

  /**
   * 执行Node.js安装步骤
   */
  private async executeNodeJsSetupStep(session: InstallationSession): Promise<void> {
    this.logMessage(session, '配置Node.js环境...');

    const environment = await nodeJsService.checkEnvironment();

    if (!environment.node.installed || !environment.node.compatible) {
      this.logMessage(session, 'Node.js需要安装或更新');

      const installResult = await nodeJsService.installNodeJs({
        setupMirrors: true,
        force: false
      });

      if (!installResult.success) {
        throw new Error(`Node.js安装失败: ${installResult.error}`);
      }

      this.logMessage(session, `Node.js安装成功: ${installResult.installedVersion}`);
    } else {
      this.logMessage(session, `Node.js环境良好: ${environment.node.version}`);
    }

    // 配置npm镜像源
    const mirrorsResult = await nodeJsService.setupMirrors();
    if (mirrorsResult.success) {
      this.logMessage(session, `npm镜像源配置完成: ${mirrorsResult.changes.length} 项设置`);
    } else {
      this.logMessage(session, `npm镜像源配置失败: ${mirrorsResult.errors.join(', ')}`);
    }
  }

  /**
   * 执行Google设置步骤
   */
  private async executeGoogleSetupStep(session: InstallationSession): Promise<void> {
    this.logMessage(session, '配置Google服务（可选）...');

    // Google设置通常需要用户交互，这里只是记录
    this.logMessage(session, 'Google设置已准备，用户可稍后配置');
  }

  /**
   * 执行Claude CLI安装步骤
   */
  private async executeClaudeInstallStep(session: InstallationSession): Promise<void> {
    this.logMessage(session, '安装Claude CLI...');

    const installResult = await claudeCliService.installWithFullFlow({
      checkPrerequisites: true,
      installCli: true,
      configureCli: false, // 配置在下一步
      verifyCli: true
    });

    if (!installResult.success) {
      throw new Error(`Claude CLI安装失败: ${installResult.error}`);
    }

    this.logMessage(session, 'Claude CLI安装成功');
  }

  /**
   * 执行API配置步骤
   */
  private async executeApiConfigStep(session: InstallationSession): Promise<void> {
    this.logMessage(session, '配置API设置（可选）...');

    // API配置通常需要用户提供密钥，这里只是记录
    this.logMessage(session, 'API配置已准备，用户可稍后配置');
  }

  /**
   * 执行完成步骤
   */
  private async executeCompletionStep(session: InstallationSession): Promise<void> {
    this.logMessage(session, '完成安装配置...');

    // 最终配置同步
    await configurationService.syncConfiguration();

    // 清理临时文件和缓存
    await this.performCleanup(session);

    this.logMessage(session, '安装流程完成');
  }

  /**
   * 检查步骤依赖关系
   */
  private async checkDependencies(step: InstallationStep, session: InstallationSession): Promise<{
    canExecute: boolean;
    reason?: string;
  }> {
    const dependency = this.stepDependencies.find(d => d.stepId === step.id);
    if (!dependency) {
      return { canExecute: true };
    }

    // 检查依赖步骤是否完成
    for (const depId of dependency.dependsOn) {
      const depResult = session.stepResults.find(r => r.stepId === depId);

      if (!depResult) {
        return {
          canExecute: false,
          reason: `依赖步骤 ${depId} 尚未执行`
        };
      }

      if (!depResult.success && !dependency.optional) {
        return {
          canExecute: false,
          reason: `依赖步骤 ${depId} 执行失败`
        };
      }
    }

    return { canExecute: true };
  }

  /**
   * 更新安装进度
   */
  private updateProgress(session: InstallationSession): void {
    const progress = session.progress;
    progress.overallProgress = Math.round((progress.completedSteps / progress.totalSteps) * 100);

    // 估算剩余时间
    if (progress.completedSteps > 0) {
      const elapsed = Date.now() - session.startTime.getTime();
      const avgTimePerStep = elapsed / progress.completedSteps;
      const remainingSteps = progress.totalSteps - progress.completedSteps;
      progress.estimatedTimeRemaining = Math.round((avgTimePerStep * remainingSteps) / 1000);
    }
  }

  /**
   * 取消安装
   */
  async cancelInstallation(): Promise<boolean> {
    if (!this.currentSession || this.currentSession.status !== 'active') {
      return false;
    }

    console.log(`取消安装会话: ${this.currentSession.id}`);

    this.currentSession.status = 'cancelled';
    this.currentSession.progress.status = 'cancelled';
    this.currentSession.endTime = new Date();

    this.logMessage(this.currentSession, '安装已被用户取消');

    return true;
  }

  /**
   * 暂停安装
   */
  async pauseInstallation(): Promise<boolean> {
    if (!this.currentSession || this.currentSession.status !== 'active') {
      return false;
    }

    this.currentSession.progress.status = 'paused';
    this.logMessage(this.currentSession, '安装已暂停');

    return true;
  }

  /**
   * 恢复安装
   */
  async resumeInstallation(): Promise<boolean> {
    if (!this.currentSession || this.currentSession.progress.status !== 'paused') {
      return false;
    }

    this.currentSession.progress.status = 'running';
    this.logMessage(this.currentSession, '安装已恢复');

    return true;
  }

  /**
   * 获取当前安装会话
   */
  getCurrentSession(): InstallationSession | null {
    return this.currentSession;
  }

  /**
   * 注册步骤回调
   */
  onStepComplete(stepId: string, callback: (result: StepExecutionResult) => void): void {
    if (!this.stepCallbacks.has(stepId)) {
      this.stepCallbacks.set(stepId, []);
    }
    this.stepCallbacks.get(stepId)!.push(callback);
  }

  /**
   * 触发步骤回调
   */
  private async triggerStepCallbacks(stepId: string, result: StepExecutionResult): Promise<void> {
    const callbacks = this.stepCallbacks.get(stepId);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          await callback(result);
        } catch (error) {
          console.error(`步骤回调执行失败 [${stepId}]:`, error);
        }
      }
    }
  }

  /**
   * 重新排序步骤
   */
  private reorderSteps(steps: InstallationStep[], customOrder: string[]): InstallationStep[] {
    const orderedSteps: InstallationStep[] = [];
    const stepMap = new Map(steps.map(step => [step.id, step]));

    // 按自定义顺序添加步骤
    for (const stepId of customOrder) {
      const step = stepMap.get(stepId);
      if (step) {
        orderedSteps.push(step);
        stepMap.delete(stepId);
      }
    }

    // 添加剩余步骤
    orderedSteps.push(...Array.from(stepMap.values()));

    return orderedSteps;
  }

  /**
   * 执行清理工作
   */
  private async performCleanup(session: InstallationSession): Promise<void> {
    this.logMessage(session, '执行清理工作...');

    try {
      // 清理临时文件
      // 这里应该实现实际的清理逻辑

      // 清理缓存
      networkService.clearCache();

      this.logMessage(session, '清理工作完成');
    } catch (error) {
      this.logMessage(session, `清理工作失败: ${error}`);
    }
  }

  /**
   * 记录消息
   */
  private logMessage(session: InstallationSession, message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    session.logs.push(logEntry);
    console.log(logEntry);
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `session_${timestamp}_${random}`;
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 导出安装步骤管理服务单例
 */
export const stepService = new StepService();

/**
 * 导出类型定义
 */
export type {
  InstallationFlowConfig,
  InstallationProgress,
  StepExecutionResult,
  InstallationSession,
  StepDependency
};