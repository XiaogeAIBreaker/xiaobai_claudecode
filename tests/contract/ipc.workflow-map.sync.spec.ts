import type { IpcMainInvokeEvent } from 'electron';
import { setupIpcHandlers } from '@main/ipc-handlers';

jest.mock('@shared/workflows/map', () => {
  const onboardingWorkflow = {
    flowId: 'onboarding',
    version: '2025.10.02',
    steps: [
      {
        stepId: 'welcome',
        title: '欢迎使用 Claude Installer',
        description: '介绍安装流程并收集初始信息',
        dependsOn: [],
      },
      {
        stepId: 'account-link',
        title: '账号关联',
        description: '引导用户完成 Claude 账号绑定',
        dependsOn: ['welcome'],
      },
    ],
    successCriteria: ['用户成功登录', '完成权限授权'],
    rollbackActions: ['清理临时登录状态'],
  } as const;

  const environmentWorkflow = {
    flowId: 'environment',
    version: '2025.10.02',
    steps: [
      {
        stepId: 'detect-node',
        title: '检测 Node.js 环境',
        description: '检查 Node.js / npm 版本与可用性',
        dependsOn: [],
      },
    ],
    successCriteria: ['检测结果为成功或已经提示升级'],
    rollbackActions: ['提示用户手动安装'],
  } as const;

  return {
    workflowVersion: '2025.10.02',
    installerWorkflowMap: {
      onboarding: onboardingWorkflow,
      environment: environmentWorkflow,
    },
    getWorkflowById: (flowId: string) => {
      return flowId === 'onboarding'
        ? onboardingWorkflow
        : flowId === 'environment'
        ? environmentWorkflow
        : undefined;
    },
  };
}, { virtual: true });

const handlerRegistry = new Map<string, (...args: any[]) => any>();
jest.mock('electron', () => {
  const ipcMainMock = {
    handle: jest.fn((channel: string, handler: (...args: any[]) => any) => {
      handlerRegistry.set(channel, handler);
      return undefined;
    }),
    on: jest.fn(),
    removeAllListeners: jest.fn(() => handlerRegistry.clear()),
  };

  return {
    ipcMain: ipcMainMock,
    dialog: {
      showSaveDialog: jest.fn().mockResolvedValue({ canceled: true }),
      showOpenDialog: jest.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
    },
    shell: {
      openExternal: jest.fn(),
    },
    app: {
      getName: jest.fn(() => 'Claude Installer'),
      getVersion: jest.fn(() => '0.0.0-test'),
      relaunch: jest.fn(),
      quit: jest.fn(),
      isPackaged: false,
    },
    BrowserWindow: {
      getAllWindows: jest.fn(() => []),
    },
  };
});

jest.mock('@shared/utils/logger', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@shared/utils/config', () => ({
  configManager: {
    load: jest.fn().mockResolvedValue({}),
    save: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn().mockResolvedValue(undefined),
    export: jest.fn().mockResolvedValue(undefined),
    import: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('@shared/detectors/network', () => ({
  networkDetector: {
    detect: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('@shared/detectors/nodejs', () => ({
  nodeJsDetector: {
    detect: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('@shared/detectors/google', () => ({
  googleDetector: {
    detect: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('@shared/detectors/claude-cli', () => ({
  claudeCliDetector: {
    detect: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('@main/services/nodejs-installer', () => ({
  NodeJSInstaller: jest.fn().mockImplementation(() => ({
    setProgressCallback: jest.fn(),
    install: jest.fn().mockResolvedValue({ success: true }),
  })),
}));

jest.mock('@main/services/google-auth-helper', () => ({
  GoogleAuthHelper: jest.fn().mockImplementation(() => ({
    openAuthWindow: jest.fn(),
  })),
}));

jest.mock('@main/services/claude-cli-installer', () => ({
  ClaudeCliInstaller: jest.fn().mockImplementation(() => ({
    install: jest.fn().mockResolvedValue({ success: true }),
    setProgressCallback: jest.fn(),
  })),
}));

jest.mock('@main/services/env-manager', () => ({
  EnvManager: jest.fn().mockImplementation(() => ({
    getEnvVars: jest.fn().mockResolvedValue({}),
    setEnvVars: jest.fn().mockResolvedValue(undefined),
    removeEnvVars: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('Contract: ipc.workflow-map.sync', () => {
  beforeEach(() => {
    handlerRegistry.clear();
    jest.clearAllMocks();
  });

  function registerHandlers(): void {
    const appState = {
      mainWindow: null,
      installerState: {},
      uiState: {},
      isQuitting: false,
    } as const;

    setupIpcHandlers(appState as any);
  }

  function invoke(channel: string, event: Partial<IpcMainInvokeEvent>, payload: unknown) {
    registerHandlers();
    const handler = handlerRegistry.get(channel);
    if (!handler) {
      throw new Error(`未注册 ${channel} handler`);
    }
    return handler(event, payload);
  }

  it('版本一致时返回 unchanged', async () => {
    await expect(
      invoke('ipc.workflow-map.sync', {
        senderFrame: { url: 'app://renderer/index.html' } as any,
      }, { flowId: 'onboarding', version: '2025.10.02' })
    ).resolves.toEqual({
      status: 'unchanged',
      version: '2025.10.02',
      flowId: 'onboarding',
    });
  });

  it('版本落后时返回最新 workflow 数据', async () => {
    await expect(
      invoke('ipc.workflow-map.sync', {
        senderFrame: { url: 'app://renderer/index.html' } as any,
      }, { flowId: 'environment', version: '2024.09.30' })
    ).resolves.toEqual({
      status: 'updated',
      version: '2025.10.02',
      flowId: 'environment',
      workflow: {
        flowId: 'environment',
        version: '2025.10.02',
        steps: [
          {
            stepId: 'detect-node',
            title: '检测 Node.js 环境',
            description: '检查 Node.js / npm 版本与可用性',
            dependsOn: [],
          },
        ],
        successCriteria: ['检测结果为成功或已经提示升级'],
        rollbackActions: ['提示用户手动安装'],
      },
    });
  });

  it('未知 flowId 时抛出 not-found 错误', async () => {
    await expect(
      invoke('ipc.workflow-map.sync', {
        senderFrame: { url: 'app://renderer/index.html' } as any,
      }, { flowId: 'unknown', version: '0.0.0' })
    ).rejects.toThrowErrorMatchingInlineSnapshot('"workflow/not-found"');
  });
});
