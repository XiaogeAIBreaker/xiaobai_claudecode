/**
 * T026: 主进程入口和窗口管理
 * Electron主进程，负责窗口管理、应用生命周期和系统集成
 */

import { app, BrowserWindow, dialog, shell } from 'electron';
import * as path from 'path';
import * as os from 'os';
import { GlobalUIState, Theme, WindowState, AnimationState, DialogType } from '../shared/types/ui';
import { InstallerState, InstallStep, InstallerStatus } from '../shared/types/installer';
import { log } from '../shared/utils/logger';
import { performanceMonitor } from '../shared/utils/performance';
import { setupIpcHandlers } from './ipc-handlers';
import { createApplicationMenu } from './menu';

/**
 * 应用状态接口
 */
interface AppState {
  mainWindow: BrowserWindow | null;
  installerState: InstallerState;
  uiState: GlobalUIState;
  isQuitting: boolean;
}

/**
 * 全局应用状态
 */
const appState: AppState = {
  mainWindow: null,
  installerState: {
    status: InstallerStatus.INITIALIZING,
    currentStep: InstallStep.NETWORK_CHECK,
    steps: {} as any, // 将在初始化时填充
    overallProgress: 0,
    allowBackward: true,
    autoRetry: true,
    maxRetries: 3,
    currentRetries: 0
  },
  uiState: {
    ui: {
      theme: Theme.AUTO,
      language: 'zh-CN',
      window: WindowState.NORMAL,
      windowSize: { width: 900, height: 700 },
      windowPosition: { x: -1, y: -1 },
      loading: false,
      sidebarVisible: true,
      detailsVisible: false,
      activePanel: 'installer',
      animations: { enabled: true, speed: 1, state: AnimationState.IDLE }
    },
    wizard: {
      currentStep: InstallStep.NETWORK_CHECK,
      stepHistory: [],
      canGoBack: false,
      canGoForward: false,
      navigation: {
        showStepNumbers: true,
        showStepTitles: true,
        highlightCurrent: true,
        showProgress: true
      },
      autoPlay: { enabled: false, delay: 2000, pauseOnError: true }
    },
    progress: {
      overall: 0,
      current: 0,
      type: 'linear',
      showPercentage: true,
      showSpeed: true,
      showETA: true,
      currentOperation: '准备开始安装...'
    },
    notifications: {
      notifications: [],
      maxVisible: 5,
      defaultDuration: 5000,
      soundEnabled: true,
      desktopNotifications: true
    },
    dialog: {
      visible: false,
      type: DialogType.INFO,
      title: '',
      content: '',
      modal: true,
      draggable: false,
      resizable: false,
      buttons: []
    },
    qrCode: {
      visible: false,
      data: '',
      size: 200,
      errorCorrectionLevel: 'M',
      foregroundColor: '#000000',
      backgroundColor: '#ffffff',
      includeMargin: true
    },
    errors: [],
    shortcuts: [],
    accessibility: {
      screenReader: false,
      highContrast: false,
      reducedMotion: false,
      largeText: false,
      keyboardNavigation: true,
      focusIndicator: true,
      audioFeedback: false
    },
    lastUpdated: new Date()
  },
  isQuitting: false
};

/**
 * 创建主窗口
 */
function createMainWindow(): BrowserWindow {
  performanceMonitor.checkpoint('window-creation-start');
  log.info('创建主窗口');

  const window = new BrowserWindow({
    width: appState.uiState.ui.windowSize.width,
    height: appState.uiState.ui.windowSize.height,
    minWidth: 800,
    minHeight: 600,
    center: true,
    show: false, // 初始不显示，等待内容加载完成
    titleBarStyle: 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
    icon: getAppIcon()
  });

  // 窗口事件处理
  window.once('ready-to-show', () => {
    performanceMonitor.markWindowCreated();
    window.show();
    log.info('主窗口已显示');

    // 开发模式下打开开发者工具
    if (process.env.NODE_ENV === 'development') {
      window.webContents.openDevTools({ mode: 'detach' });
    }
  });

  window.on('closed', () => {
    appState.mainWindow = null;
    log.info('主窗口已关闭');
  });

  window.on('resize', () => {
    const [width, height] = window.getSize();
    appState.uiState.ui.windowSize = { width, height };
  });

  window.on('move', () => {
    const [x, y] = window.getPosition();
    appState.uiState.ui.windowPosition = { x, y };
  });

  // 阻止导航到外部链接
  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 加载应用
  if (process.env.NODE_ENV === 'development') {
    window.loadURL('http://localhost:3000');
  } else {
    window.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return window;
}

/**
 * 获取应用图标
 */
function getAppIcon(): string | undefined {
  const platform = os.platform();

  switch (platform) {
    case 'win32':
      return path.join(__dirname, '../../assets/icons/icon.ico');
    case 'darwin':
      return path.join(__dirname, '../../assets/icons/icon.icns');
    case 'linux':
      return path.join(__dirname, '../../assets/icons/icon.png');
    default:
      return undefined;
  }
}

/**
 * 初始化应用
 */
async function initializeApp(): Promise<void> {
  log.info('初始化应用', {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch
  });

  // 设置应用用户模型ID（Windows）
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.claude.installer');
  }

  // 设置IPC处理器
  setupIpcHandlers(appState);

  // 创建应用菜单
  createApplicationMenu();

  // 安全设置
  app.on('web-contents-created', (_, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  });
}

/**
 * 处理应用关闭前的清理工作
 */
async function handleAppBeforeQuit(): Promise<void> {
  if (appState.isQuitting) {
    return;
  }

  appState.isQuitting = true;
  log.info('应用准备退出');

  // 如果安装正在进行中，询问用户是否确认退出
  if (appState.installerState.status !== 'completed' && appState.installerState.status !== 'failed') {
    const choice = await dialog.showMessageBox(appState.mainWindow!, {
      type: 'question',
      buttons: ['继续安装', '退出应用'],
      defaultId: 0,
      title: '确认退出',
      message: '安装程序正在运行，确定要退出吗？',
      detail: '退出可能会导致安装失败或系统状态不一致。'
    });

    if (choice.response === 0) {
      appState.isQuitting = false;
      return;
    }
  }

  // 执行清理工作
  try {
    // 保存当前状态
    // 清理临时文件
    // 关闭日志系统
    log.info('应用清理完成');
  } catch (error) {
    log.error('应用清理时发生错误', error as Error);
  }
}

// Electron应用事件处理

/**
 * 当Electron完成初始化时触发
 */
app.whenReady().then(async () => {
  performanceMonitor.checkpoint('app-start');
  log.info('Electron应用已准备就绪');

  try {
    // 初始化应用
    await initializeApp();

    // 创建主窗口
    appState.mainWindow = createMainWindow();

    // 标记启动完成
    performanceMonitor.markStartupComplete();
    log.info('应用初始化完成', {
      performance: performanceMonitor.generateReport()
    });
  } catch (error) {
    log.error('应用初始化失败', error as Error);

    // 显示错误对话框
    dialog.showErrorBox(
      '初始化失败',
      `应用初始化时发生错误：${error instanceof Error ? error.message : '未知错误'}`
    );

    app.quit();
  }
});

/**
 * 当所有窗口都被关闭时触发
 */
app.on('window-all-closed', () => {
  log.info('所有窗口已关闭');

  // macOS上，应用通常保持活动状态直到用户明确退出
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * 当应用被激活时触发（macOS）
 */
app.on('activate', () => {
  log.info('应用被激活');

  // macOS上，当dock图标被点击且没有其他窗口打开时，
  // 重新创建窗口
  if (BrowserWindow.getAllWindows().length === 0) {
    appState.mainWindow = createMainWindow();
  }
});

/**
 * 当应用即将退出时触发
 */
app.on('before-quit', async (event) => {
  if (!appState.isQuitting) {
    event.preventDefault();
    await handleAppBeforeQuit();

    if (appState.isQuitting) {
      app.quit();
    }
  }
});

/**
 * 当应用即将关闭时触发
 */
app.on('will-quit', (event) => {
  log.info('应用即将退出');
});

/**
 * 当应用完全关闭时触发
 */
app.on('quit', () => {
  log.info('应用已退出');
});

/**
 * 处理未捕获的异常
 */
process.on('uncaughtException', (error) => {
  log.error('未捕获的异常', error);

  // 显示错误对话框
  if (appState.mainWindow) {
    dialog.showErrorBox(
      '程序错误',
      `发生了未预期的错误：${error.message}\n\n请重启应用程序。`
    );
  }

  // 优雅地退出应用
  app.quit();
});

/**
 * 处理未处理的Promise拒绝
 */
process.on('unhandledRejection', (reason, promise) => {
  log.error('未处理的Promise拒绝', { reason, promise });

  // 在开发模式下，可以选择不退出应用
  if (process.env.NODE_ENV !== 'development') {
    if (appState.mainWindow) {
      dialog.showErrorBox(
        '程序错误',
        `发生了未预期的错误：${reason}\n\n请重启应用程序。`
      );
    }
    app.quit();
  }
});

// 安全设置：防止新窗口打开
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    log.warn('阻止打开新窗口', { url });
    return { action: 'deny' };
  });

  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    // 只允许本地开发服务器和file协议
    if (
      parsedUrl.origin !== 'http://localhost:3000' &&
      parsedUrl.protocol !== 'file:'
    ) {
      event.preventDefault();
      log.warn('阻止导航到外部URL', { url: navigationUrl });
    }
  });
});

// 导出状态访问器（用于测试和调试）
export { appState };