import type { IpcMainInvokeEvent } from 'electron';
import { setupIpcHandlers } from '@main/ipc-handlers';

// 将 virtual mock 用于尚未落地的共享配置模块
jest.mock('@shared/config/catalog', () => {
  const entry = {
    id: 'network.proxy',
    value: {
      primary: 'https://proxy.internal/api',
      fallback: 'https://proxy.backup/api',
    },
    description: '安装器联网检测代理与回退地址',
    owner: 'platform-network',
    sourceModule: 'shared',
    lastValidatedAt: '2024-09-30T08:00:00.000Z',
  } as const;

  return {
    sharedConfigurationCatalog: {
      'network.proxy': entry,
    },
    getSharedConfigEntry: (id: string) => (id === 'network.proxy' ? entry : undefined),
    allowedSharedConfigOrigins: ['app://renderer/index.html'],
  };
}, { virtual: true });

// Electron 依赖 mock
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

// 其余依赖统一 stub
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

describe('Contract: ipc.shared-config.get', () => {
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

  it('返回配置条目当 id 存在时', async () => {
    await expect(
      invoke('ipc.shared-config.get', {
        senderFrame: { url: 'app://renderer/index.html' } as any,
      }, { id: 'network.proxy' })
    ).resolves.toEqual({
      id: 'network.proxy',
      value: {
        primary: 'https://proxy.internal/api',
        fallback: 'https://proxy.backup/api',
      },
      description: '安装器联网检测代理与回退地址',
      owner: 'platform-network',
      sourceModule: 'shared',
      lastValidatedAt: '2024-09-30T08:00:00.000Z',
    });
  });

  it('当 id 不存在时抛出 not-found 错误', async () => {
    await expect(
      invoke('ipc.shared-config.get', {
        senderFrame: { url: 'app://renderer/index.html' } as any,
      }, { id: 'unknown.key' })
    ).rejects.toThrowErrorMatchingInlineSnapshot('"shared-config/not-found"');
  });

  it('拒绝未授权来源访问', async () => {
    await expect(
      invoke('ipc.shared-config.get', {
        senderFrame: { url: 'app://untrusted.local' } as any,
      }, { id: 'network.proxy' })
    ).rejects.toThrowErrorMatchingInlineSnapshot('"shared-config/forbidden"');
  });
});
