import '@testing-library/jest-dom';

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

// Mock electronAPI global
Object.defineProperty(window, 'electronAPI', {
  value: {
    platform: 'darwin',
    versions: {
      node: '18.0.0',
      chrome: '114.0.0',
      electron: '26.0.0',
    },
    invoke: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn(),
  },
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