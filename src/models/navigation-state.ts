/**
 * NavigationState实体定义和验证
 * 定义导航状态的数据结构和业务规则
 */

/**
 * 导航状态接口
 */
export interface NavigationState {
  currentStepId: string;           // 当前步骤ID
  completedSteps: string[];        // 已完成步骤列表
  availableSteps: string[];        // 可用步骤列表
  canGoBack: boolean;             // 是否可以返回
  canGoForward: boolean;          // 是否可以继续
  canSkipCurrent: boolean;        // 是否可以跳过当前步骤
  progressPercentage: number;     // 进度百分比 (0-100)
  navigationHistory: string[];    // 导航历史
  lastUpdated: string;            // 最后更新时间（ISO字符串）
  sessionId: string;              // 会话ID
}

/**
 * 导航操作接口
 */
export interface NavigationAction {
  from: string;                   // 源步骤ID
  to: string;                     // 目标步骤ID
  action: 'forward' | 'back' | 'skip'; // 操作类型
}

/**
 * 验证导航状态数据
 */
export function validateNavigationState(state: NavigationState): void {
  // 验证必需字段
  if (!state.currentStepId || state.currentStepId.trim() === '') {
    throw new Error('NavigationState.currentStepId 不能为空');
  }

  if (!Array.isArray(state.completedSteps)) {
    throw new Error('NavigationState.completedSteps 必须是字符串数组');
  }

  if (!Array.isArray(state.availableSteps)) {
    throw new Error('NavigationState.availableSteps 必须是字符串数组');
  }

  if (typeof state.canGoBack !== 'boolean') {
    throw new Error('NavigationState.canGoBack 必须是布尔值');
  }

  if (typeof state.canGoForward !== 'boolean') {
    throw new Error('NavigationState.canGoForward 必须是布尔值');
  }

  if (typeof state.canSkipCurrent !== 'boolean') {
    throw new Error('NavigationState.canSkipCurrent 必须是布尔值');
  }

  if (typeof state.progressPercentage !== 'number' || state.progressPercentage < 0 || state.progressPercentage > 100) {
    throw new Error('NavigationState.progressPercentage 必须是0-100之间的数字');
  }

  if (!Array.isArray(state.navigationHistory)) {
    throw new Error('NavigationState.navigationHistory 必须是字符串数组');
  }

  if (!state.lastUpdated || typeof state.lastUpdated !== 'string') {
    throw new Error('NavigationState.lastUpdated 必须是ISO时间字符串');
  }

  if (!state.sessionId || state.sessionId.trim() === '') {
    throw new Error('NavigationState.sessionId 不能为空');
  }

  // 验证时间格式
  try {
    new Date(state.lastUpdated);
  } catch (error) {
    throw new Error('NavigationState.lastUpdated 必须是有效的ISO时间字符串');
  }

  // 验证当前步骤在可用步骤中
  if (!state.availableSteps.includes(state.currentStepId)) {
    throw new Error('NavigationState.currentStepId 必须在 availableSteps 中');
  }
}

/**
 * 验证步骤顺序
 */
export function validateStepSequence(sequence: string[]): void {
  if (!Array.isArray(sequence)) {
    throw new Error('步骤序列必须是字符串数组');
  }

  if (sequence.length === 0) {
    throw new Error('步骤序列不能为空');
  }

  // 检查是否有重复步骤
  const uniqueSteps = new Set(sequence);
  if (uniqueSteps.size !== sequence.length) {
    throw new Error('步骤序列中不能有重复步骤');
  }

  // 检查步骤ID格式
  const stepIdRegex = /^[a-z][a-z0-9-]*$/;
  for (const stepId of sequence) {
    if (!stepIdRegex.test(stepId)) {
      throw new Error(`步骤ID格式无效: ${stepId}`);
    }
  }
}

/**
 * 验证导航权限
 */
export function validateNavigationPermission(action: NavigationAction): void {
  if (!action.from || !action.to) {
    throw new Error('导航操作必须指定源步骤和目标步骤');
  }

  if (!['forward', 'back', 'skip'].includes(action.action)) {
    throw new Error('导航操作类型必须是 forward、back 或 skip');
  }

  // TODO: 在实际实现中，这里需要检查具体的业务规则
  // 例如：是否允许从当前步骤跳转到目标步骤
}

/**
 * 计算进度百分比
 */
export function calculateProgress(completedSteps: string[], totalSteps: number): number {
  if (totalSteps <= 0) {
    return 0;
  }

  const progress = (completedSteps.length / totalSteps) * 100;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

/**
 * 更新进度状态
 */
export function updateProgressStatus(stepId: string, status: 'completed' | 'current' | 'pending'): void {
  // TODO: 在实际实现中，这里需要更新状态存储
  console.log(`步骤 ${stepId} 状态更新为: ${status}`);
}

/**
 * 验证状态转换
 */
export function validateStateTransition(from: NavigationState, to: NavigationState): void {
  // 会话ID不能改变
  if (from.sessionId !== to.sessionId) {
    throw new Error('会话ID不能在状态转换中改变');
  }

  // 更新时间必须递增
  if (new Date(to.lastUpdated) <= new Date(from.lastUpdated)) {
    throw new Error('状态转换的更新时间必须递增');
  }

  // 已完成步骤只能增加，不能减少
  const fromCompleted = new Set(from.completedSteps);
  const toCompleted = new Set(to.completedSteps);

  for (const step of fromCompleted) {
    if (!toCompleted.has(step)) {
      throw new Error('已完成的步骤不能在状态转换中被移除');
    }
  }
}

/**
 * 处理跳过操作
 */
export function handleSkipStep(stepId: string): void {
  // TODO: 在实际实现中，这里需要处理跳过步骤的逻辑
  console.log(`跳过步骤: ${stepId}`);
}

/**
 * 添加到导航历史
 */
export function addToNavigationHistory(state: NavigationState, stepId: string): NavigationState {
  const updatedHistory = [...state.navigationHistory, stepId];

  // 限制历史记录长度，保留最近的50个
  if (updatedHistory.length > 50) {
    updatedHistory.splice(0, updatedHistory.length - 50);
  }

  return {
    ...state,
    navigationHistory: updatedHistory,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * 返回上一步
 */
export function goBack(state: NavigationState): NavigationState | null {
  if (!state.canGoBack || state.navigationHistory.length < 2) {
    return null;
  }

  // 获取上一步的步骤ID（倒数第二个）
  const previousStepId = state.navigationHistory[state.navigationHistory.length - 2];
  const updatedHistory = state.navigationHistory.slice(0, -1);

  return {
    ...state,
    currentStepId: previousStepId,
    navigationHistory: updatedHistory,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * 清理导航历史
 */
export function clearNavigationHistory(state: NavigationState): NavigationState {
  return {
    ...state,
    navigationHistory: [state.currentStepId],
    lastUpdated: new Date().toISOString()
  };
}

/**
 * 生成唯一会话ID
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `session-${timestamp}-${randomStr}`;
}

/**
 * 持久化导航状态
 */
export function persistNavigationState(state: NavigationState): void {
  // TODO: 在实际实现中，这里需要将状态保存到本地存储
  console.log('持久化导航状态:', state.sessionId);
}

/**
 * 恢复导航状态
 */
export function restoreNavigationState(sessionId: string): NavigationState | null {
  // TODO: 在实际实现中，这里需要从本地存储恢复状态
  console.log('恢复导航状态:', sessionId);
  return null;
}

/**
 * 创建默认的导航状态
 */
export function createDefaultNavigationState(availableSteps: string[]): NavigationState {
  validateStepSequence(availableSteps);

  const sessionId = generateSessionId();
  const currentStepId = availableSteps[0];
  const now = new Date().toISOString();

  const state: NavigationState = {
    currentStepId,
    completedSteps: [],
    availableSteps,
    canGoBack: false,
    canGoForward: true,
    canSkipCurrent: false,
    progressPercentage: 0,
    navigationHistory: [currentStepId],
    lastUpdated: now,
    sessionId
  };

  validateNavigationState(state);
  return state;
}

/**
 * 更新导航状态到下一步
 */
export function navigateToNext(state: NavigationState, nextStepId: string): NavigationState {
  if (!state.canGoForward) {
    throw new Error('当前状态不允许前进');
  }

  if (!state.availableSteps.includes(nextStepId)) {
    throw new Error(`目标步骤不在可用步骤列表中: ${nextStepId}`);
  }

  const updatedCompletedSteps = [...state.completedSteps];
  if (!updatedCompletedSteps.includes(state.currentStepId)) {
    updatedCompletedSteps.push(state.currentStepId);
  }

  const currentIndex = state.availableSteps.indexOf(nextStepId);
  const progressPercentage = calculateProgress(updatedCompletedSteps, state.availableSteps.length);

  const updatedState: NavigationState = {
    ...state,
    currentStepId: nextStepId,
    completedSteps: updatedCompletedSteps,
    canGoBack: true,
    canGoForward: currentIndex < state.availableSteps.length - 1,
    progressPercentage,
    navigationHistory: [...state.navigationHistory, nextStepId],
    lastUpdated: new Date().toISOString()
  };

  validateNavigationState(updatedState);
  return updatedState;
}

/**
 * 检查步骤是否已完成
 */
export function isStepCompleted(state: NavigationState, stepId: string): boolean {
  return state.completedSteps.includes(stepId);
}

/**
 * 获取当前步骤索引
 */
export function getCurrentStepIndex(state: NavigationState): number {
  return state.availableSteps.indexOf(state.currentStepId);
}

/**
 * 获取下一个可用步骤
 */
export function getNextAvailableStep(state: NavigationState): string | null {
  const currentIndex = getCurrentStepIndex(state);
  if (currentIndex >= 0 && currentIndex < state.availableSteps.length - 1) {
    return state.availableSteps[currentIndex + 1];
  }
  return null;
}

/**
 * 获取上一个可用步骤
 */
export function getPreviousAvailableStep(state: NavigationState): string | null {
  const currentIndex = getCurrentStepIndex(state);
  if (currentIndex > 0) {
    return state.availableSteps[currentIndex - 1];
  }
  return null;
}