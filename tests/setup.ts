import '@testing-library/jest-dom';
import { InstallStep } from '../src/shared/types/installer';
import { WorkflowDefinition, WorkflowId } from '../src/shared/types/workflows';
import { SharedConfigurationEntry } from '../src/shared/types/shared-config';

// 全局测试设置

// Mock Electron APIs
const mockElectron = {
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn(),
    send: jest.fn(),
  },
  contextBridge: {
    exposeInMainWorld: jest.fn(),
  },
  app: {
    getPath: jest.fn(),
    getVersion: jest.fn(),
    getName: jest.fn(),
  },
  BrowserWindow: jest.fn(),
  dialog: {
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn(),
    showMessageBox: jest.fn(),
  },
};

const workflowDefinitions: Record<WorkflowId, WorkflowDefinition> = {
  onboarding: {
    flowId: 'onboarding',
    version: 'test',
    steps: [
      {
        stepId: InstallStep.NETWORK_CHECK,
        title: '网络检查',
        description: '检测联网状态',
        dependsOn: [],
      },
    ],
    successCriteria: [],
    rollbackActions: [],
  },
  environment: {
    flowId: 'environment',
    version: 'test',
    steps: [
      {
        stepId: InstallStep.NODEJS_INSTALL,
        title: 'Node.js 安装',
        description: '安装或升级 Node.js 环境',
        dependsOn: [InstallStep.NETWORK_CHECK],
      },
    ],
    successCriteria: [],
    rollbackActions: [],
  },
  cliInstall: {
    flowId: 'cliInstall',
    version: 'test',
    steps: [
      {
        stepId: InstallStep.CLAUDE_CLI_SETUP,
        title: 'CLI 安装',
        description: '安装 Claude CLI 工具',
        dependsOn: [InstallStep.NODEJS_INSTALL],
      },
    ],
    successCriteria: [],
    rollbackActions: [],
  },
  accountLink: {
    flowId: 'accountLink',
    version: 'test',
    steps: [
      {
        stepId: InstallStep.GOOGLE_SETUP,
        title: 'Google 设置',
        description: '配置 Google 访问',
        dependsOn: [InstallStep.CLAUDE_CLI_SETUP],
      },
      {
        stepId: InstallStep.API_CONFIGURATION,
        title: 'API 配置',
        description: '配置 API Key',
        dependsOn: [InstallStep.GOOGLE_SETUP],
      },
      {
        stepId: InstallStep.TESTING,
        title: '测试验证',
        description: '验证安装结果',
        dependsOn: [InstallStep.API_CONFIGURATION],
      },
      {
        stepId: InstallStep.COMPLETION,
        title: '完成',
        description: '完成安装向导',
        dependsOn: [InstallStep.TESTING],
      },
    ],
    successCriteria: [],
    rollbackActions: [],
  },
};

const now = new Date().toISOString();

const sharedConfigEntries: Record<string, SharedConfigurationEntry<any>> = {
  'installer.workflow.supportedFlows': {
    id: 'installer.workflow.supportedFlows',
    value: Object.keys(workflowDefinitions),
    description: '测试环境使用的流程顺序',
    owner: 'tests',
    sourceModule: 'shared',
    lastValidatedAt: now,
  },
  'environment.node.versioning': {
    id: 'environment.node.versioning',
    value: {
      minimum: '16.0.0',
      recommended: '18.17.0',
      preferred: '20.11.1',
      ltsCandidate: '22.3.0',
    },
    description: '测试环境 Node.js 版本基线',
    owner: 'tests',
    sourceModule: 'shared',
    lastValidatedAt: now,
  },
};

const electronAPIMock = {
  platform: 'darwin',
  versions: {
    node: '18.0.0',
    chrome: '114.0.0',
    electron: '26.0.0',
  },
  app: {
    getInfo: jest.fn().mockResolvedValue({ name: 'Test', version: '0.0.0', platform: 'darwin', arch: 'arm64' }),
    quit: jest.fn(),
    restart: jest.fn(),
  },
  window: {
    minimize: jest.fn(),
    toggleMaximize: jest.fn(),
    close: jest.fn(),
  },
  config: {
    load: jest.fn().mockResolvedValue({} as any),
    save: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn().mockResolvedValue(undefined),
    export: jest.fn().mockResolvedValue(null),
    import: jest.fn().mockResolvedValue({} as any),
  },
  detect: {
    network: jest.fn().mockResolvedValue({} as any),
    nodejs: jest.fn().mockResolvedValue({} as any),
    google: jest.fn().mockResolvedValue({} as any),
    claudeCli: jest.fn().mockResolvedValue({} as any),
    all: jest.fn().mockResolvedValue({} as any),
  },
  install: {
    nodejs: jest.fn().mockResolvedValue({ success: true } as any),
    checkNodeJS: jest.fn().mockResolvedValue({
      success: true,
      data: {
        installed: true,
        version: 'v18.17.0',
        npmVersion: '9.0.0',
      },
    }),
    cancelNodeJS: jest.fn().mockResolvedValue({ success: true }),
    claudeCli: jest.fn().mockResolvedValue({ success: true } as any),
    checkClaudeCli: jest.fn().mockResolvedValue({ success: true, data: { installed: false } }),
    cancel: jest.fn().mockResolvedValue(undefined),
    getProgress: jest.fn().mockResolvedValue(0),
  },
  sharedConfig: {
    get: jest.fn().mockImplementation(async (id: string) => {
      if (sharedConfigEntries[id]) {
        return sharedConfigEntries[id];
      }
      return {
        id,
        value: null,
        description: '',
        owner: 'tests',
        sourceModule: 'shared',
        lastValidatedAt: now,
      } as SharedConfigurationEntry;
    }),
  },
  workflowMap: {
    sync: jest.fn().mockImplementation(async (flowId: WorkflowId) => ({
      status: 'updated',
      version: 'test',
      flowId,
      workflow: workflowDefinitions[flowId],
    })),
  },
  on: {
    menuEvent: jest.fn(),
  },
  off: {
    menuEvent: jest.fn(),
  },
  env: {
    get: jest.fn().mockResolvedValue({ success: true, data: {} }),
    set: jest.fn().mockResolvedValue({ success: true }),
    remove: jest.fn().mockResolvedValue({ success: true }),
  },
  google: {
    openRegistrationBrowser: jest.fn().mockResolvedValue(undefined),
    closeRegistrationBrowser: jest.fn().mockResolvedValue(undefined),
    cleanup: jest.fn().mockResolvedValue(undefined),
    onRegistrationProgress: jest.fn(),
    offRegistrationProgress: jest.fn(),
  },
  ui: {
    getState: jest.fn().mockResolvedValue({}),
    updateState: jest.fn().mockResolvedValue(undefined),
    showNotification: jest.fn(),
    showDialog: jest.fn(),
  },
  system: {
    openExternal: jest.fn(),
    showItemInFolder: jest.fn(),
    getInfo: jest.fn().mockResolvedValue({}),
    getPaths: jest.fn().mockResolvedValue({}),
  },
};

// Mock electronAPI global
Object.defineProperty(window, 'electronAPI', {
  value: electronAPIMock,
  writable: true,
});

// Mock process.platform
Object.defineProperty(process, 'platform', {
  value: 'darwin',
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // 保留error和warn用于调试
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};

// Increase timeout for integration tests
jest.setTimeout(30000);

export default mockElectron;
