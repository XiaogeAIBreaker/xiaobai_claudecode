/**
 * Electron主进程入口
 * 负责应用程序的生命周期管理、窗口创建和安全配置
 */

import { app, BrowserWindow, dialog, shell, protocol } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';
import { registerAllHandlers, unregisterAllHandlers } from './ipc-handlers';
import { initializeNotificationSystem, cleanupNotificationSystem } from './notifications';

/**
 * 窗口配置接口
 */
interface WindowConfig {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  resizable: boolean;
  maximizable: boolean;
  minimizable: boolean;
  closable: boolean;
  title: string;
  icon?: string;
}

/**
 * 应用程序状态
 */
interface AppState {
  isQuitting: boolean;
  mainWindow: BrowserWindow | null;
  splashWindow: BrowserWindow | null;
  isDevelopment: boolean;
  isReady: boolean;
}

/**
 * 主应用程序类
 */
class MainApplication {
  private state: AppState = {
    isQuitting: false,
    mainWindow: null,
    splashWindow: null,
    isDevelopment: process.env.NODE_ENV === 'development',
    isReady: false
  };

  private readonly defaultWindowConfig: WindowConfig = {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    resizable: true,
    maximizable: true,
    minimizable: true,
    closable: true,
    title: 'Claude CLI 安装程序'
  };

  /**
   * 初始化应用程序
   */
  async initialize(): Promise<void> {
    console.log('初始化Claude CLI安装程序...');

    try {
      // 配置应用程序
      this.configureApp();

      // 注册协议
      this.registerProtocols();

      // 注册事件监听器
      this.registerEventListeners();

      // 初始化通知系统
      initializeNotificationSystem();

      // 注册IPC处理器
      registerAllHandlers();

      console.log('应用程序初始化完成');

    } catch (error) {
      console.error('应用程序初始化失败:', error);
      throw error;
    }
  }

  /**
   * 配置应用程序
   */
  private configureApp(): void {
    // 设置应用程序名称
    app.setName('Claude CLI Installer');

    // 配置安全策略
    app.commandLine.appendSwitch('--disable-features', 'OutOfBlinkCors');

    // 防止多实例运行
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
      console.log('应用程序已在运行，退出当前实例');
      app.quit();
      return;
    }

    // 处理第二个实例尝试启动
    app.on('second-instance', () => {
      if (this.state.mainWindow) {
        if (this.state.mainWindow.isMinimized()) {
          this.state.mainWindow.restore();
        }
        this.state.mainWindow.focus();
      }
    });

    // macOS特定配置
    if (process.platform === 'darwin') {
      app.setAboutPanelOptions({
        applicationName: 'Claude CLI Installer',
        applicationVersion: app.getVersion(),
        copyright: '© 2024 Anthropic',
        website: 'https://claude.ai'
      });
    }
  }

  /**
   * 注册自定义协议
   */
  private registerProtocols(): void {
    // 注册文件协议
    protocol.registerSchemesAsPrivileged([
      {
        scheme: 'app',
        privileges: {
          standard: true,
          secure: true,
          supportFetchAPI: true,
          corsEnabled: true
        }
      }
    ]);
  }

  /**
   * 注册事件监听器
   */
  private registerEventListeners(): void {
    // 应用程序准备就绪
    app.whenReady().then(async () => {
      console.log('Electron应用程序准备就绪');
      this.state.isReady = true;

      // 创建启动画面
      await this.createSplashWindow();

      // 延迟创建主窗口
      setTimeout(async () => {
        await this.createMainWindow();
        this.closeSplashWindow();
      }, 2000);
    });

    // 所有窗口关闭
    app.on('window-all-closed', () => {
      console.log('所有窗口已关闭');

      // macOS上不立即退出应用
      if (process.platform !== 'darwin') {
        this.quit();
      }
    });

    // 应用程序激活（macOS）
    app.on('activate', async () => {
      if (this.state.mainWindow === null && this.state.isReady) {
        await this.createMainWindow();
      }
    });

    // 应用程序退出前
    app.on('before-quit', (event) => {
      console.log('应用程序准备退出');
      this.state.isQuitting = true;

      // 执行清理工作
      this.performCleanup();
    });

    // Web内容安全检查
    app.on('web-contents-created', (_, contents) => {
      // 阻止导航到外部网站
      contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);

        if (parsedUrl.origin !== 'http://localhost:3000' &&
            parsedUrl.origin !== 'file://') {
          console.warn('阻止导航到外部URL:', navigationUrl);
          event.preventDefault();
        }
      });

      // 阻止打开新窗口
      contents.setWindowOpenHandler(({ url }) => {
        console.log('拦截窗口打开请求:', url);
        shell.openExternal(url);
        return { action: 'deny' };
      });
    });

    // 证书错误处理
    app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
      if (this.state.isDevelopment) {
        // 开发环境忽略证书错误
        event.preventDefault();
        callback(true);
      } else {
        callback(false);
      }
    });
  }

  /**
   * 创建启动画面
   */
  private async createSplashWindow(): Promise<void> {
    console.log('创建启动画面');

    try {
      this.state.splashWindow = new BrowserWindow({
        width: 400,
        height: 300,
        frame: false,
        alwaysOnTop: true,
        transparent: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true
        },
        show: false
      });

      // 加载启动画面内容
      const splashHtml = this.createSplashHTML();
      await this.state.splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);

      // 显示启动画面
      this.state.splashWindow.show();

      console.log('启动画面创建完成');

    } catch (error) {
      console.error('创建启动画面失败:', error);
    }
  }

  /**
   * 创建主窗口
   */
  private async createMainWindow(): Promise<void> {
    console.log('创建主窗口');

    try {
      const config = this.getWindowConfig();

      this.state.mainWindow = new BrowserWindow({
        ...config,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          preload: join(__dirname, '../preload/preload.js'),
          webSecurity: !this.state.isDevelopment
        },
        show: false // 延迟显示，等内容加载完成
      });

      // 设置窗口图标
      if (config.icon && existsSync(config.icon)) {
        this.state.mainWindow.setIcon(config.icon);
      }

      // 加载应用内容
      await this.loadMainContent();

      // 配置窗口事件
      this.setupWindowEvents();

      // 显示窗口
      this.state.mainWindow.show();

      // 开发环境打开开发者工具
      if (this.state.isDevelopment) {
        this.state.mainWindow.webContents.openDevTools();
      }

      console.log('主窗口创建完成');

    } catch (error) {
      console.error('创建主窗口失败:', error);
      throw error;
    }
  }

  /**
   * 获取窗口配置
   */
  private getWindowConfig(): WindowConfig {
    // 可以从配置文件或环境变量读取自定义配置
    const config = { ...this.defaultWindowConfig };

    // 根据屏幕尺寸调整窗口大小
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    if (screenWidth < config.width) {
      config.width = Math.floor(screenWidth * 0.9);
    }

    if (screenHeight < config.height) {
      config.height = Math.floor(screenHeight * 0.9);
    }

    return config;
  }

  /**
   * 加载主应用内容
   */
  private async loadMainContent(): Promise<void> {
    if (!this.state.mainWindow) return;

    try {
      if (this.state.isDevelopment) {
        // 开发环境加载开发服务器
        await this.state.mainWindow.loadURL('http://localhost:3000');
      } else {
        // 生产环境加载打包后的文件
        const indexPath = join(__dirname, '../renderer/index.html');

        if (existsSync(indexPath)) {
          await this.state.mainWindow.loadFile(indexPath);
        } else {
          // 尝试从src目录加载（开发期间）
          const srcIndexPath = join(__dirname, '../../src/renderer/index.html');
          if (existsSync(srcIndexPath)) {
            await this.state.mainWindow.loadFile(srcIndexPath);
          } else {
            // 如果没有文件，加载基础HTML
            const basicHtml = this.createBasicHTML();
            await this.state.mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(basicHtml)}`);
          }
        }
      }

      console.log('主应用内容加载完成');

    } catch (error) {
      console.error('加载主应用内容失败:', error);

      // 加载错误页面
      const errorHtml = this.createErrorHTML(error);
      await this.state.mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
    }
  }

  /**
   * 设置窗口事件
   */
  private setupWindowEvents(): void {
    if (!this.state.mainWindow) return;

    // 窗口关闭事件
    this.state.mainWindow.on('close', (event) => {
      if (!this.state.isQuitting) {
        console.log('主窗口关闭');

        // macOS上隐藏窗口而不是关闭
        if (process.platform === 'darwin') {
          event.preventDefault();
          this.state.mainWindow?.hide();
        }
      }
    });

    // 窗口关闭后
    this.state.mainWindow.on('closed', () => {
      console.log('主窗口已销毁');
      this.state.mainWindow = null;
    });

    // 页面加载完成
    this.state.mainWindow.webContents.on('did-finish-load', () => {
      console.log('页面加载完成');

      // 注入初始化脚本
      this.injectInitializationScript();
    });

    // 页面加载失败
    this.state.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('页面加载失败:', errorCode, errorDescription);
    });

    // 控制台消息
    this.state.mainWindow.webContents.on('console-message', (event, level, message) => {
      if (this.state.isDevelopment) {
        console.log(`[Renderer ${level}]:`, message);
      }
    });
  }

  /**
   * 注入初始化脚本
   */
  private injectInitializationScript(): void {
    if (!this.state.mainWindow) return;

    const initScript = `
      // 应用程序初始化
      console.log('Claude CLI Installer 已加载');

      // 设置全局错误处理
      window.addEventListener('error', (event) => {
        console.error('全局错误:', event.error);
      });

      // 设置未捕获的Promise拒绝处理
      window.addEventListener('unhandledrejection', (event) => {
        console.error('未处理的Promise拒绝:', event.reason);
      });
    `;

    this.state.mainWindow.webContents.executeJavaScript(initScript).catch(error => {
      console.error('注入初始化脚本失败:', error);
    });
  }

  /**
   * 关闭启动画面
   */
  private closeSplashWindow(): void {
    if (this.state.splashWindow) {
      console.log('关闭启动画面');
      this.state.splashWindow.close();
      this.state.splashWindow = null;
    }
  }

  /**
   * 创建启动画面HTML
   */
  private createSplashHTML(): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Claude CLI Installer</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              height: 100vh;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              color: white;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .spinner {
              width: 40px;
              height: 40px;
              border: 4px solid rgba(255,255,255,0.3);
              border-radius: 50%;
              border-top-color: white;
              animation: spin 1s ease-in-out infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            .message {
              margin-top: 20px;
              font-size: 14px;
              opacity: 0.8;
            }
          </style>
        </head>
        <body>
          <div class="logo">Claude CLI</div>
          <div class="spinner"></div>
          <div class="message">正在启动安装程序...</div>
        </body>
      </html>
    `;
  }

  /**
   * 创建基础HTML页面
   */
  private createBasicHTML(): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Claude CLI 安装程序</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              background: #f5f5f5;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
              color: #333;
              text-align: center;
              margin-bottom: 30px;
            }
            .message {
              text-align: center;
              color: #666;
              font-size: 16px;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Claude CLI 安装程序</h1>
            <div class="message">
              <p>欢迎使用Claude CLI安装程序</p>
              <p>程序正在加载中，请稍候...</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * 创建错误页面HTML
   */
  private createErrorHTML(error: any): string {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>加载错误 - Claude CLI 安装程序</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              background: #f5f5f5;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
              color: #d73a49;
              text-align: center;
              margin-bottom: 30px;
            }
            .error {
              background: #ffeef0;
              border: 1px solid #fdaeb7;
              padding: 20px;
              border-radius: 6px;
              color: #86181d;
              font-family: monospace;
              white-space: pre-wrap;
            }
            .actions {
              text-align: center;
              margin-top: 30px;
            }
            button {
              background: #0366d6;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
            }
            button:hover {
              background: #0256cc;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>应用程序加载失败</h1>
            <div class="error">${errorMessage}</div>
            <div class="actions">
              <button onclick="location.reload()">重新加载</button>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * 执行清理工作
   */
  private performCleanup(): void {
    console.log('执行应用程序清理工作');

    try {
      // 清理通知系统
      cleanupNotificationSystem();

      // 注销IPC处理器
      unregisterAllHandlers();

      // 清理临时文件
      // 这里可以添加具体的清理逻辑

      console.log('清理工作完成');

    } catch (error) {
      console.error('清理工作失败:', error);
    }
  }

  /**
   * 退出应用程序
   */
  quit(): void {
    console.log('退出应用程序');
    this.state.isQuitting = true;
    app.quit();
  }

  /**
   * 获取主窗口
   */
  getMainWindow(): BrowserWindow | null {
    return this.state.mainWindow;
  }

  /**
   * 获取应用状态
   */
  getState(): Readonly<AppState> {
    return { ...this.state };
  }
}

/**
 * 全局应用实例
 */
const mainApplication = new MainApplication();

/**
 * 启动应用程序
 */
async function startApplication(): Promise<void> {
  try {
    await mainApplication.initialize();
    console.log('Claude CLI安装程序启动成功');
  } catch (error) {
    console.error('应用程序启动失败:', error);
    process.exit(1);
  }
}

// 如果是主模块，直接启动应用
if (require.main === module) {
  startApplication();
}

/**
 * 导出应用实例和工具函数
 */
export { mainApplication, startApplication };
export type { WindowConfig, AppState };