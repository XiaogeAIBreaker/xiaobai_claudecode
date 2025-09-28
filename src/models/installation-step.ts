/**
 * InstallationStep实体定义和验证
 * 定义安装程序的步骤数据结构和业务规则
 */

/**
 * 安装步骤状态枚举
 */
export enum StepStatus {
  PENDING = 'pending',     // 待执行
  RUNNING = 'running',     // 执行中
  SUCCESS = 'success',     // 成功
  FAILED = 'failed',       // 失败
  SKIPPED = 'skipped'      // 已跳过
}

/**
 * 安装步骤接口
 */
export interface InstallationStep {
  id: string;                    // 步骤唯一标识
  name: string;                  // 步骤名称
  description: string;           // 步骤描述
  order: number;                 // 执行顺序
  status: StepStatus;           // 当前状态
  isOptional: boolean;          // 是否可选
  canSkip: boolean;             // 是否可跳过
  hasAutoDetection: boolean;    // 是否支持自动检测
  estimatedDuration: number;    // 预估耗时(秒)
}

/**
 * 验证安装步骤数据
 */
export function validateInstallationStep(step: InstallationStep): void {
  if (!step.id || step.id.trim() === '') {
    throw new Error('InstallationStep.id 不能为空');
  }

  if (!step.name || step.name.trim() === '') {
    throw new Error('InstallationStep.name 不能为空');
  }

  if (!step.description || step.description.trim() === '') {
    throw new Error('InstallationStep.description 不能为空');
  }

  if (typeof step.order !== 'number' || step.order < 0) {
    throw new Error('InstallationStep.order 必须是非负数');
  }

  if (!Object.values(StepStatus).includes(step.status)) {
    throw new Error(`InstallationStep.status 必须是有效的状态值: ${Object.values(StepStatus).join(', ')}`);
  }

  if (typeof step.isOptional !== 'boolean') {
    throw new Error('InstallationStep.isOptional 必须是布尔值');
  }

  if (typeof step.canSkip !== 'boolean') {
    throw new Error('InstallationStep.canSkip 必须是布尔值');
  }

  if (typeof step.hasAutoDetection !== 'boolean') {
    throw new Error('InstallationStep.hasAutoDetection 必须是布尔值');
  }

  if (typeof step.estimatedDuration !== 'number' || step.estimatedDuration < 0) {
    throw new Error('InstallationStep.estimatedDuration 必须是非负数');
  }
}

/**
 * 验证步骤顺序的唯一性
 */
export function validateUniqueOrder(steps: InstallationStep[]): void {
  const orders = steps.map(step => step.order);
  const uniqueOrders = new Set(orders);

  if (orders.length !== uniqueOrders.size) {
    throw new Error('InstallationStep.order 必须唯一');
  }

  // 检查顺序是否连续（从1开始）
  const sortedOrders = orders.sort((a, b) => a - b);
  for (let i = 0; i < sortedOrders.length; i++) {
    if (sortedOrders[i] !== i + 1) {
      throw new Error('InstallationStep.order 必须从1开始连续');
    }
  }
}

/**
 * 验证可选步骤逻辑
 */
export function validateOptionalStepLogic(step: InstallationStep): void {
  // 可选步骤必须允许跳过
  if (step.isOptional && !step.canSkip) {
    throw new Error('可选步骤必须允许跳过');
  }
}

/**
 * 验证状态转换是否有效
 */
export function validateStatusTransition(fromStatus: StepStatus, toStatus: StepStatus): void {
  const validTransitions: Record<StepStatus, StepStatus[]> = {
    [StepStatus.PENDING]: [StepStatus.RUNNING, StepStatus.SKIPPED],
    [StepStatus.RUNNING]: [StepStatus.SUCCESS, StepStatus.FAILED],
    [StepStatus.SUCCESS]: [], // 成功状态不能转换到其他状态
    [StepStatus.FAILED]: [StepStatus.RUNNING], // 失败可以重试
    [StepStatus.SKIPPED]: [] // 跳过状态不能转换到其他状态
  };

  const allowedTransitions = validTransitions[fromStatus];
  if (!allowedTransitions.includes(toStatus)) {
    throw new Error(`无效的状态转换: ${fromStatus} → ${toStatus}`);
  }
}

/**
 * 创建默认的安装步骤
 */
export function createDefaultInstallationStep(
  id: string,
  name: string,
  description: string,
  order: number,
  options: Partial<Pick<InstallationStep, 'isOptional' | 'canSkip' | 'hasAutoDetection' | 'estimatedDuration'>> = {}
): InstallationStep {
  const step: InstallationStep = {
    id,
    name,
    description,
    order,
    status: StepStatus.PENDING,
    isOptional: options.isOptional ?? false,
    canSkip: options.canSkip ?? false,
    hasAutoDetection: options.hasAutoDetection ?? true,
    estimatedDuration: options.estimatedDuration ?? 30
  };

  validateInstallationStep(step);
  return step;
}

/**
 * 更新步骤状态
 */
export function updateStepStatus(step: InstallationStep, newStatus: StepStatus): InstallationStep {
  validateStatusTransition(step.status, newStatus);

  return {
    ...step,
    status: newStatus
  };
}

/**
 * 检查步骤是否可以执行
 */
export function canExecuteStep(step: InstallationStep): boolean {
  return step.status === StepStatus.PENDING || step.status === StepStatus.FAILED;
}

/**
 * 检查步骤是否已完成
 */
export function isStepCompleted(step: InstallationStep): boolean {
  return step.status === StepStatus.SUCCESS || step.status === StepStatus.SKIPPED;
}

/**
 * 检查步骤是否正在运行
 */
export function isStepRunning(step: InstallationStep): boolean {
  return step.status === StepStatus.RUNNING;
}