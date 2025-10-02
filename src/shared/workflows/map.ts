import { WorkflowDefinition, WorkflowId } from '../types/workflows';
import { InstallStep } from '../types/installer';

export const workflowVersion = '2025.10.02';

const onboardingWorkflow: WorkflowDefinition = {
  flowId: 'onboarding',
  version: workflowVersion,
  steps: [
    {
      stepId: InstallStep.NETWORK_CHECK,
      title: '网络检查',
      description: '检测联网状态、代理配置与可访问性',
      guard: {
        id: 'requiresNetwork',
        description: '离线模式将阻塞后续下载与登录流程',
      },
    },
  ],
  successCriteria: [
    '网络检测通过，关键服务可访问',
    '已收集到必要的代理或镜像信息',
  ],
  rollbackActions: [
    '提示用户检查网络或切换镜像',
    '允许用户配置代理后重试',
  ],
};

const environmentWorkflow: WorkflowDefinition = {
  flowId: 'environment',
  version: workflowVersion,
  steps: [
    {
      stepId: InstallStep.NODEJS_INSTALL,
      title: 'Node.js 安装',
      description: '检测当前环境并在需要时安装或升级 Node.js',
      dependsOn: [InstallStep.NETWORK_CHECK],
      guard: {
        id: 'requiresPrivileges',
        description: '安装 Node.js 需要管理员权限',
      },
    },
  ],
  successCriteria: [
    '检测到受支持的 Node.js 版本',
    'npm 工具链可用并指向正确的缓存目录',
  ],
  rollbackActions: [
    '回滚 PATH 修改',
    '删除下载的临时安装包',
  ],
};

const cliInstallWorkflow: WorkflowDefinition = {
  flowId: 'cliInstall',
  version: workflowVersion,
  steps: [
    {
      stepId: InstallStep.CLAUDE_CLI_SETUP,
      title: 'Claude CLI 安装',
      description: '通过统一配置下载、安装并验证 Claude CLI 工具',
      dependsOn: [InstallStep.NODEJS_INSTALL],
      guard: {
        id: 'requiresNetwork',
        description: '需要可访问 npm registry 或镜像源',
      },
    },
  ],
  successCriteria: [
    '系统 PATH 中可调用 claude 命令',
    '默认配置文件写入成功',
  ],
  rollbackActions: [
    '清理 npm 全局安装目录中残留的包',
    '移除写入的配置文件和 PATH 记录',
  ],
};

const accountLinkWorkflow: WorkflowDefinition = {
  flowId: 'accountLink',
  version: workflowVersion,
  steps: [
    {
      stepId: InstallStep.GOOGLE_SETUP,
      title: 'Google 服务准备',
      description: '协助用户配置 Google 访问能力以完成登录或授权',
      dependsOn: [InstallStep.CLAUDE_CLI_SETUP],
    },
    {
      stepId: InstallStep.API_CONFIGURATION,
      title: 'API 配置',
      description: '引导输入 Claude API Key 并验证权限',
      dependsOn: [InstallStep.GOOGLE_SETUP],
    },
    {
      stepId: InstallStep.TESTING,
      title: '测试验证',
      description: '运行集成测试，确保 CLI 与 API 可用',
      dependsOn: [InstallStep.API_CONFIGURATION],
    },
    {
      stepId: InstallStep.COMPLETION,
      title: '完成向导',
      description: '总结结果并提供开始使用的引导',
      dependsOn: [InstallStep.TESTING],
    },
  ],
  successCriteria: [
    '用户完成账号登录与 API Key 配置',
    '集成测试通过且无高优先级警告',
  ],
  rollbackActions: [
    '撤销 API Key 写入',
    '关闭残留的授权窗口',
  ],
};

const workflowMap: Record<WorkflowId, WorkflowDefinition> = {
  onboarding: onboardingWorkflow,
  environment: environmentWorkflow,
  cliInstall: cliInstallWorkflow,
  accountLink: accountLinkWorkflow,
};

export const installerWorkflowMap = workflowMap;

export function getWorkflowById(flowId: WorkflowId): WorkflowDefinition | undefined {
  return workflowMap[flowId];
}

export function listWorkflows(): WorkflowDefinition[] {
  return Object.values(workflowMap);
}
