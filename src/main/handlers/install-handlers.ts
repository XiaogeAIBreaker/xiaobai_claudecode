/**
 * 安装相关的IPC处理器
 * 处理来自渲染进程的安装请求
 */

import { ipcMain, BrowserWindow } from 'electron';
import { NodeJSInstaller, InstallProgress } from '../services/nodejs-installer';

export function setupInstallHandlers() {
  const installer = new NodeJSInstaller();

  /**
   * 检查Node.js安装状态
   */
  ipcMain.handle('install:check-nodejs', async () => {
    try {
      const result = await installer.checkNodeJS();
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

  /**
   * 安装Node.js
   */
  ipcMain.handle('install:nodejs', async (event) => {
    try {
      // 设置进度回调，向渲染进程发送进度更新
      installer.setProgressCallback((progress: InstallProgress) => {
        event.sender.send('install:nodejs-progress', progress);
      });

      // 使用权限处理的安装方法
      const result = await installer.install();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  /**
   * 取消安装（如果支持）
   */
  ipcMain.handle('install:cancel-nodejs', async () => {
    // 这里可以实现安装取消逻辑
    // 目前我们的脚本不支持中途取消，但可以为将来扩展
    return { success: true };
  });
}

/**
 * 清理安装处理器
 */
export function cleanupInstallHandlers() {
  ipcMain.removeAllListeners('install:check-nodejs');
  ipcMain.removeAllListeners('install:nodejs');
  ipcMain.removeAllListeners('install:cancel-nodejs');
}