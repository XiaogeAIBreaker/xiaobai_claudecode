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

// T004: UI组件测试配置扩展
// Mock ResizeObserver for UI component tests
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver for lazy loading components
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scroll methods for UI tests
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true
});

// Mock focus methods for accessibility tests
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: jest.fn(),
  writable: true
});

// Mock CSS animations for UI component tests
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
    animationDuration: '0s',
    transitionDuration: '0s',
  }),
  writable: true,
});

export default mockElectron;