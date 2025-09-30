/**
 * Google 认证助手服务
 * 管理 Google 账号注册的内嵌浏览器窗口
 */

import { BrowserWindow, BrowserView } from 'electron';
import { log } from '../../shared/utils/logger';

/**
 * Google 认证助手类
 */
export class GoogleAuthHelper {
  private mainWindow: BrowserWindow | null = null;
  private authWindow: BrowserWindow | null = null;
  private progressCallback?: (step: number) => void;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  /**
   * 打开 Google 注册浏览器窗口
   */
  async openRegistrationBrowser(): Promise<void> {
    try {
      log.info('打开 Google 注册浏览器窗口');

      // 如果窗口已存在，先关闭
      if (this.authWindow && !this.authWindow.isDestroyed()) {
        this.authWindow.close();
      }

      // 计算窗口位置（相对主窗口偏移，确保可见）
      let x: number | undefined;
      let y: number | undefined;

      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        const mainBounds = this.mainWindow.getBounds();
        x = mainBounds.x + 100;
        y = mainBounds.y + 50;
      }

      // 创建新的浏览器窗口
      this.authWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        x: x,
        y: y,
        // 移除 parent 属性，让窗口完全独立，更容易被看到
        modal: false,
        show: true,  // 立即显示，不等待页面加载
        alwaysOnTop: true,  // 初始化时置顶
        title: 'Google 账号注册',
        minimizable: true,
        maximizable: true,
        closable: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          webSecurity: true
        }
      });

      log.info('浏览器窗口已创建', {
        isVisible: this.authWindow.isVisible(),
        isMinimized: this.authWindow.isMinimized(),
        bounds: this.authWindow.getBounds()
      });

      // 聚焦窗口
      this.authWindow.focus();
      this.authWindow.moveTop();

      // 闪烁窗口以吸引注意（macOS 会在 Dock 中跳动）
      this.authWindow.flashFrame(true);

      // 设置 30 秒加载超时
      const loadTimeout = setTimeout(() => {
        if (this.authWindow && !this.authWindow.isDestroyed()) {
          log.error('Google 注册页面加载超时（30秒）');
          // 不关闭窗口，让用户看到加载失败的页面
        }
      }, 30000);

      // 监听加载完成
      this.authWindow.webContents.on('did-finish-load', () => {
        clearTimeout(loadTimeout);
        log.info('Google 注册页面加载成功');

        // 加载成功后取消始终置顶
        if (this.authWindow && !this.authWindow.isDestroyed()) {
          this.authWindow.setAlwaysOnTop(false);
        }
      });

      // 监听加载失败
      this.authWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        clearTimeout(loadTimeout);
        log.error('Google 注册页面加载失败', {
          errorCode,
          errorDescription,
          url: validatedURL
        });
      });

      // 监听页面导航，判断注册进度
      this.authWindow.webContents.on('did-navigate', (event, url) => {
        this.handleNavigationChange(url);
      });

      this.authWindow.webContents.on('did-navigate-in-page', (event, url) => {
        this.handleNavigationChange(url);
      });

      // 窗口关闭时清理
      this.authWindow.on('closed', () => {
        clearTimeout(loadTimeout);
        log.info('Google 注册窗口已关闭');
        this.authWindow = null;
      });

      // 开始加载 Google 注册页面
      log.info('开始加载 Google 注册页面');
      await this.authWindow.loadURL('https://accounts.google.com/signup');
      log.info('loadURL 调用完成');

    } catch (error) {
      log.error('打开 Google 注册浏览器失败', error as Error);
      throw error;
    }
  }

  /**
   * 关闭注册浏览器窗口
   */
  async closeRegistrationBrowser(): Promise<void> {
    try {
      if (this.authWindow && !this.authWindow.isDestroyed()) {
        this.authWindow.close();
        this.authWindow = null;
        log.info('已关闭 Google 注册浏览器窗口');
      }
    } catch (error) {
      log.error('关闭 Google 注册浏览器失败', error as Error);
      throw error;
    }
  }

  /**
   * 设置进度回调
   */
  setProgressCallback(callback: (step: number) => void): void {
    this.progressCallback = callback;
  }

  /**
   * 处理页面导航变化，判断注册进度
   */
  private handleNavigationChange(url: string): void {
    log.info('【进度检测】Google 注册页面导航', { url });

    try {
      // 步骤 0: 填写基本信息（姓名、生日性别、用户名）
      if (url.includes('/lifecycle/steps/signup/name') ||
          url.includes('/lifecycle/steps/signup/birthdaygender') ||
          url.includes('/lifecycle/steps/signup/username')) {
        log.info('【进度更新】步骤 0: 填写基本信息');
        this.notifyProgress(0);
      }
      // 步骤 1: 设置密码
      else if (url.includes('/lifecycle/steps/signup/password')) {
        log.info('【进度更新】步骤 1: 设置密码');
        this.notifyProgress(1);
      }
      // 步骤 2: 手机验证
      else if (url.includes('/lifecycle/steps/signup/startmtsmsidv') ||
               url.includes('/lifecycle/steps/signup/phoneverification') ||
               url.includes('/lifecycle/steps/signup/challenge')) {
        log.info('【进度更新】步骤 2: 验证手机号');
        this.notifyProgress(2);
      }
      // 步骤 3: 注册完成
      else if (url.includes('/lifecycle/steps/signup/finish') ||
               url.includes('/lifecycle/steps/signup/complete') ||
               url.includes('myaccount.google.com')) {
        log.info('【进度更新】步骤 3: 完成注册');
        this.notifyProgress(3);

        // 延迟关闭窗口，让用户看到成功消息
        setTimeout(() => {
          this.closeRegistrationBrowser();
        }, 2000);
      }
    } catch (error) {
      log.error('处理页面导航失败', error as Error);
    }
  }

  /**
   * 通知进度变化
   */
  private notifyProgress(step: number): void {
    if (this.progressCallback) {
      this.progressCallback(step);
    }

    // 向主窗口发送进度更新
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('google:registration-progress', step);
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.closeRegistrationBrowser();
    this.progressCallback = undefined;
  }
}