/**
 * 简化的Electron主进程 - 用于调试
 */

import { app, BrowserWindow } from 'electron';
import { join } from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  console.log('创建主窗口...');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/preload.js'),
      webSecurity: false
    },
    title: 'Claude CLI 安装程序 - Debug',
    show: true
  });

  // 检查是否存在构建文件来决定模式
  const indexPath = join(__dirname, '../renderer/index.html');
  const isDevelopment = !require('fs').existsSync(indexPath);

  if (isDevelopment) {
    console.log('加载开发服务器: http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000').catch(err => {
      console.error('加载开发服务器失败:', err);

      // 加载备用页面
      const fallbackHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Claude CLI 安装程序</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .container {
                text-align: center;
                padding: 40px;
                background: rgba(255,255,255,0.1);
                border-radius: 10px;
                backdrop-filter: blur(10px);
              }
              h1 { margin-bottom: 20px; }
              p { opacity: 0.9; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Claude CLI 安装程序</h1>
              <p>欢迎使用Claude Code CLI沉浸式安装程序！</p>
              <p>应用程序正在初始化...</p>
            </div>
          </body>
        </html>
      `;

      mainWindow?.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fallbackHtml)}`);
    });
  } else {
    // 生产环境加载构建文件
    const indexPath = join(__dirname, '../renderer/index.html');
    console.log('加载构建文件:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  // 开发工具
  if (isDevelopment) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  console.log('主窗口创建完成');
}

// 应用程序准备就绪
app.whenReady().then(() => {
  console.log('应用程序准备就绪');
  createWindow();
});

// 所有窗口关闭
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用程序激活
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

console.log('主进程脚本已加载');