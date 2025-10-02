export type WorkflowId = 'onboarding' | 'environment' | 'cliInstall' | 'accountLink';

export interface WorkflowStepGuard {
  /** 逻辑条件描述，例如 "requiresNetwork" */
  id: string;
  /** 触发说明，帮助前端展示提示 */
  description: string;
}

export interface WorkflowStep {
  stepId: string;
  title: string;
  description: string;
  /** 依赖的前置步骤 ID 列表 */
  dependsOn?: string[];
  /** 可选守卫，决定是否跳过 */
  guard?: WorkflowStepGuard;
  /** 当步骤执行失败时的提示 */
  failureMessage?: string;
}

export interface WorkflowDefinition {
  flowId: WorkflowId;
  version: string;
  steps: WorkflowStep[];
  successCriteria: string[];
  rollbackActions: string[];
}

export interface WorkflowSyncResponse {
  status: 'unchanged' | 'updated';
  version: string;
  flowId: WorkflowId;
  workflow?: WorkflowDefinition;
}
