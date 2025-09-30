/**
 * T027: IPC通信处理器
 * 处理主进程和渲染进程之间的通信
 */

import { ipcMain, dialog, shell, app } from 'electron';
import { InstallStep, ProgressEvent } from '../shared/types/installer';
import { InstallResult } from '../shared/types/electron-api';
import { DetectionResult } from '../shared/types/environment';
import { UserConfig } from '../shared/types/config';
import { log } from '../shared/utils/logger';
import { configManager } from '../shared/utils/config';
import { networkDetector } from '../shared/detectors/network';
import { nodeJsDetector } from '../shared/detectors/nodejs';
import { googleDetector } from '../shared/detectors/google';
import { claudeCliDetector } from '../shared/detectors/claude-cli';
import { NodeJSInstaller } from './services/nodejs-installer';
import { GoogleAuthHelper } from './services/google-auth-helper';

/**
 * 应用状态接口（从main.ts导入的类型）
 */
interface AppState {
  mainWindow: Electron.BrowserWindow | null;
  installerState: any;
  uiState: any;
  isQuitting: boolean;
}

/**
 * 设置IPC处理器
 */
export function setupIpcHandlers(appState: AppState): void {
  log.info('设置IPC处理器');

  // 应用控制相关
  setupAppHandlers(appState);

  // 配置管理相关
  setupConfigHandlers();

  // 环境检测相关
  setupDetectionHandlers();

  // 安装相关
  setupInstallationHandlers(appState);

  // UI状态相关
  setupUIHandlers(appState);

  // 系统集成相关
  setupSystemHandlers();

  // Google 认证相关
  setupGoogleHandlers(appState);

  log.info('IPC处理器设置完成');
}

/**
 * 应用控制相关处理器
 */
function setupAppHandlers(appState: AppState): void {
  // 获取应用信息
  ipcMain.handle('app:get-info', async () => {
    return {
      name: app.getName(),
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch
    };
  });

  // 退出应用
  ipcMain.handle('app:quit', async () => {
    log.info('收到退出应用请求');
    app.quit();
  });

  // 重启应用
  ipcMain.handle('app:restart', async () => {
    log.info('收到重启应用请求');
    app.relaunch();
    app.quit();
  });

  // 最小化窗口
  ipcMain.handle('window:minimize', async () => {
    if (appState.mainWindow) {
      appState.mainWindow.minimize();
    }
  });

  // 最大化/还原窗口
  ipcMain.handle('window:toggle-maximize', async () => {
    if (appState.mainWindow) {
      if (appState.mainWindow.isMaximized()) {
        appState.mainWindow.unmaximize();
      } else {
        appState.mainWindow.maximize();
      }
    }
  });

  // 关闭窗口
  ipcMain.handle('window:close', async () => {
    if (appState.mainWindow) {
      appState.mainWindow.close();
    }
  });
}

/**
 * 配置管理相关处理器
 */
function setupConfigHandlers(): void {
  // 加载配置
  ipcMain.handle('config:load', async (): Promise<UserConfig> => {
    try {
      return await configManager.load();
    } catch (error) {
      log.error('加载配置失败', error as Error);
      throw error;
    }
  });

  // 保存配置
  ipcMain.handle('config:save', async (_, config: UserConfig): Promise<void> => {
    try {
      await configManager.save(config);
      log.info('配置保存成功');
    } catch (error) {
      log.error('保存配置失败', error as Error);
      throw error;
    }
  });

  // 重置配置
  ipcMain.handle('config:reset', async (): Promise<void> => {
    try {
      await configManager.reset();
      log.info('配置重置成功');
    } catch (error) {
      log.error('重置配置失败', error as Error);
      throw error;
    }
  });

  // 导出配置
  ipcMain.handle('config:export', async (): Promise<string | null> => {
    try {
      const result = await dialog.showSaveDialog({
        title: '导出配置',
        defaultPath: 'claude-installer-config.json',
        filters: [
          { name: 'JSON配置文件', extensions: ['json'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });

      if (!result.canceled && result.filePath) {
        await configManager.export(result.filePath);
        log.info('配置导出成功', { path: result.filePath });
        return result.filePath;
      }

      return null;
    } catch (error) {
      log.error('导出配置失败', error as Error);
      throw error;
    }
  });

  // 导入配置
  ipcMain.handle('config:import', async (): Promise<UserConfig | null> => {
    try {
      const result = await dialog.showOpenDialog({
        title: '导入配置',
        filters: [
          { name: 'JSON配置文件', extensions: ['json'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const config = await configManager.import(result.filePaths[0]);
        log.info('配置导入成功', { path: result.filePaths[0] });
        return config;
      }

      return null;
    } catch (error) {
      log.error('导入配置失败', error as Error);
      throw error;
    }
  });
}

/**
 * 环境检测相关处理器
 */
function setupDetectionHandlers(): void {
  // 网络环境检测
  ipcMain.handle('detect:network', async (): Promise<DetectionResult> => {
    try {
      log.info('开始网络环境检测');
      return await networkDetector.detect();
    } catch (error) {
      log.error('网络环境检测失败', error as Error);
      throw error;
    }
  });

  // Node.js环境检测
  ipcMain.handle('detect:nodejs', async (): Promise<DetectionResult> => {
    try {
      log.info('开始Node.js环境检测');
      return await nodeJsDetector.detect();
    } catch (error) {
      log.error('Node.js环境检测失败', error as Error);
      throw error;
    }
  });

  // Google服务检测
  ipcMain.handle('detect:google', async (): Promise<DetectionResult> => {
    try {
      log.info('开始Google服务检测');
      return await googleDetector.detect();
    } catch (error) {
      log.error('Google服务检测失败', error as Error);
      throw error;
    }
  });

  // Claude CLI检测
  ipcMain.handle('detect:claude-cli', async (): Promise<DetectionResult> => {
    try {
      log.info('开始Claude CLI检测');
      return await claudeCliDetector.detect();
    } catch (error) {
      log.error('Claude CLI检测失败', error as Error);
      throw error;
    }
  });

  // 全面环境检测
  ipcMain.handle('detect:all', async (): Promise<{
    network: DetectionResult;
    nodejs: DetectionResult;
    google: DetectionResult;
    claudeCli: DetectionResult;
  }> => {
    try {
      log.info('开始全面环境检测');
      
      const [network, nodejs, google, claudeCli] = await Promise.all([
        networkDetector.detect(),
        nodeJsDetector.detect(),
        googleDetector.detect(),
        claudeCliDetector.detect()
      ]);

      return { network, nodejs, google, claudeCli };
    } catch (error) {
      log.error('全面环境检测失败', error as Error);
      throw error;
    }
  });
}

/**
 * 安装相关处理器
 */
function setupInstallationHandlers(appState: AppState): void {
  const nodeInstaller = new NodeJSInstaller();

  // 检查Node.js安装状态
  ipcMain.handle('install:check-nodejs', async () => {
    try {
      const result = await nodeInstaller.checkNodeJS();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  // Node.js安装
  ipcMain.handle('install:nodejs', async (event): Promise<InstallResult> => {
    try {
      log.info('开始Node.js安装');

      // 设置进度回调，向渲染进程发送进度更新
      nodeInstaller.setProgressCallback((progress) => {
        event.sender.send('install:nodejs-progress', progress);
      });

      const result = await nodeInstaller.install();
      if (result.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      log.error('Node.js安装失败', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  // 取消Node.js安装
  ipcMain.handle('install:cancel-nodejs', async () => {
    // 这里可以实现安装取消逻辑
    // 目前我们的脚本不支持中途取消，但可以为将来扩展
    return { success: true };
  });

  // TODO: Claude CLI安装 (暂未实现)
  ipcMain.handle('install:claude-cli', async (_, apiKey?: string, progressCallback?: (event: ProgressEvent) => void): Promise<InstallResult> => {
    return {
      success: false,
      error: 'Claude CLI安装功能暂未实现'
    };
  });

  // 获取安装进度
  ipcMain.handle('install:get-progress', async (_, step: InstallStep): Promise<number> => {
    switch (step) {
      case InstallStep.NODEJS_INSTALL:
        // 这里应该从安装器获取进度，暂时返回默认值
        return 0;
      case InstallStep.CLAUDE_CLI_SETUP:
        // 这里应该从安装器获取进度，暂时返回默认值
        return 0;
      default:
        return 0;
    }
  });

  // 取消安装
  ipcMain.handle('install:cancel', async (): Promise<void> => {
    try {
      log.info('取消安装请求');
      // 这里应该实现取消安装的逻辑
      // 暂时只记录日志
    } catch (error) {
      log.error('取消安装失败', error as Error);
      throw error;
    }
  });
}

/**
 * UI状态相关处理器
 */
function setupUIHandlers(appState: AppState): void {
  // 获取UI状态
  ipcMain.handle('ui:get-state', async () => {
    return appState.uiState;
  });

  // 更新UI状态
  ipcMain.handle('ui:update-state', async (_, updates: any) => {
    Object.assign(appState.uiState, updates);
    appState.uiState.lastUpdated = new Date();
    
    // 通知渲染进程状态已更新
    if (appState.mainWindow) {
      appState.mainWindow.webContents.send('ui:state-updated', appState.uiState);
    }
  });

  // 显示通知
  ipcMain.handle('ui:show-notification', async (_, notification: {
    title: string;
    body: string;
    type?: 'info' | 'success' | 'warning' | 'error';
  }) => {
    // 添加到通知列表
    const newNotification = {
      id: Date.now().toString(),
      type: notification.type || 'info',
      title: notification.title,
      message: notification.body,
      closable: true,
      timestamp: new Date(),
      read: false
    };
    
    appState.uiState.notifications.notifications.unshift(newNotification);
    
    // 限制通知数量
    if (appState.uiState.notifications.notifications.length > appState.uiState.notifications.maxVisible) {
      appState.uiState.notifications.notifications = appState.uiState.notifications.notifications.slice(0, appState.uiState.notifications.maxVisible);
    }
    
    // 通知渲染进程
    if (appState.mainWindow) {
      appState.mainWindow.webContents.send('ui:notification-added', newNotification);
    }
  });

  // 显示对话框
  ipcMain.handle('ui:show-dialog', async (_, options: {
    type: 'info' | 'warning' | 'error' | 'question';
    title: string;
    message: string;
    detail?: string;
    buttons?: string[];
  }) => {
    if (appState.mainWindow) {
      const result = await dialog.showMessageBox(appState.mainWindow, {
        type: options.type,
        title: options.title,
        message: options.message,
        detail: options.detail,
        buttons: options.buttons || ['确定']
      });
      
      return result;
    }
    
    return { response: 0, checkboxChecked: false };
  });
}

/**
 * 系统集成相关处理器
 */
function setupSystemHandlers(): void {
  // 打开外部链接
  ipcMain.handle('system:open-external', async (_, url: string) => {
    try {
      await shell.openExternal(url);
      log.info('打开外部链接', { url });
    } catch (error) {
      log.error('打开外部链接失败', { url, error });
      throw error;
    }
  });

  // 显示文件夹
  ipcMain.handle('system:show-item-in-folder', async (_, fullPath: string) => {
    try {
      shell.showItemInFolder(fullPath);
      log.info('显示文件夹', { path: fullPath });
    } catch (error) {
      log.error('显示文件夹失败', { path: fullPath, error });
      throw error;
    }
  });

  // 获取系统信息
  ipcMain.handle('system:get-info', async () => {
    const os = require('os');
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.version,
      osType: os.type(),
      osRelease: os.release(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCount: os.cpus().length,
      uptime: os.uptime()
    };
  });

  // 获取路径信息
  ipcMain.handle('system:get-paths', async () => {
    return {
      home: app.getPath('home'),
      appData: app.getPath('appData'),
      userData: app.getPath('userData'),
      temp: app.getPath('temp'),
      downloads: app.getPath('downloads'),
      documents: app.getPath('documents'),
      desktop: app.getPath('desktop')
    };
  });
}

/**
 * Google 认证相关处理器
 */
function setupGoogleHandlers(appState: AppState): void {
  let googleAuthHelper: GoogleAuthHelper | null = null;

  // 初始化 Google 认证助手
  const initGoogleAuthHelper = () => {
    if (!googleAuthHelper && appState.mainWindow) {
      googleAuthHelper = new GoogleAuthHelper(appState.mainWindow);

      // 设置进度回调
      googleAuthHelper.setProgressCallback((step: number) => {
        if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
          appState.mainWindow.webContents.send('google:registration-progress', step);
        }
      });
    }
    return googleAuthHelper;
  };

  // 打开 Google 注册浏览器
  ipcMain.handle('google:open-registration-browser', async () => {
    try {
      log.info('收到打开 Google 注册浏览器请求');
      const helper = initGoogleAuthHelper();
      if (helper) {
        await helper.openRegistrationBrowser();
        return { success: true };
      }
      throw new Error('无法初始化 Google 认证助手');
    } catch (error) {
      log.error('打开 Google 注册浏览器失败', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  // 关闭 Google 注册浏览器
  ipcMain.handle('google:close-registration-browser', async () => {
    try {
      log.info('收到关闭 Google 注册浏览器请求');
      if (googleAuthHelper) {
        await googleAuthHelper.closeRegistrationBrowser();
      }
      return { success: true };
    } catch (error) {
      log.error('关闭 Google 注册浏览器失败', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  // 清理 Google 认证助手
  ipcMain.handle('google:cleanup', async () => {
    try {
      if (googleAuthHelper) {
        googleAuthHelper.cleanup();
        googleAuthHelper = null;
      }
      return { success: true };
    } catch (error) {
      log.error('清理 Google 认证助手失败', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
}

/**
 * 清理IPC处理器
 */
export function cleanupIpcHandlers(): void {
  log.info('清理IPC处理器');
  ipcMain.removeAllListeners();
}
