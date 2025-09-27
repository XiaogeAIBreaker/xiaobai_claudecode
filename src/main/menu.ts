/**
 * T028: 应用菜单模块
 * 创建跨平台应用菜单，提供完整的菜单功能和快捷键支持
 */

import { Menu, MenuItem, app, dialog, shell, BrowserWindow } from 'electron';
import { log } from '../shared/utils/logger';

/**
 * 菜单模板接口
 */
interface MenuTemplate {
  label?: string;
  submenu?: MenuItem[] | MenuTemplate[];
  role?: string;
  accelerator?: string;
  type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio';
  checked?: boolean;
  enabled?: boolean;
  visible?: boolean;
  click?: (menuItem: MenuItem, browserWindow?: BrowserWindow, event?: KeyboardEvent) => void;
}

/**
 * 应用菜单管理器
 */
export class ApplicationMenu {
  private menu: Menu | null = null;

  constructor() {
    this.createMenu();
  }

  /**
   * 创建应用菜单
   */
  createMenu(): void {
    const template = this.getMenuTemplate();
    this.menu = Menu.buildFromTemplate(template as any);

    // 设置应用菜单
    Menu.setApplicationMenu(this.menu);

    log.info('应用菜单创建完成');
  }

  /**
   * 获取菜单模板
   */
  private getMenuTemplate(): MenuTemplate[] {
    const isMac = process.platform === 'darwin';

    const template: MenuTemplate[] = [];

    // macOS 应用菜单
    if (isMac) {
      template.push({
        label: app.getName(),
        submenu: [
          {
            label: '关于 ' + app.getName(),
            click: () => this.showAboutDialog()
          },
          { type: 'separator' as const },
          {
            label: '设置...',
            accelerator: 'CmdOrCtrl+,',
            click: () => this.openSettings()
          },
          { type: 'separator' as const },
          {
            label: '服务',
            role: 'services' as any,
            submenu: []
          },
          { type: 'separator' as const },
          {
            label: '隐藏 ' + app.getName(),
            accelerator: 'Command+H',
            role: 'hide' as any
          },
          {
            label: '隐藏其他',
            accelerator: 'Command+Shift+H',
            role: 'hideothers' as any
          },
          {
            label: '显示全部',
            role: 'unhide' as any
          },
          { type: 'separator' as const },
          {
            label: '退出',
            accelerator: 'Command+Q',
            click: () => app.quit()
          }
        ]
      });
    }

    // 文件菜单
    template.push({
      label: '文件',
      submenu: [
        {
          label: '新建配置',
          accelerator: 'CmdOrCtrl+N',
          click: () => this.newConfiguration()
        },
        {
          label: '打开配置...',
          accelerator: 'CmdOrCtrl+O',
          click: () => this.openConfiguration()
        },
        {
          label: '保存配置',
          accelerator: 'CmdOrCtrl+S',
          click: () => this.saveConfiguration()
        },
        {
          label: '另存为...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => this.saveConfigurationAs()
        },
        { type: 'separator' as const },
        {
          label: '导入配置...',
          click: () => this.importConfiguration()
        },
        {
          label: '导出配置...',
          click: () => this.exportConfiguration()
        },
        { type: 'separator' as const },
        ...(!isMac ? [
          {
            label: '设置...',
            accelerator: 'CmdOrCtrl+,',
            click: () => this.openSettings()
          },
          { type: 'separator' as const },
          {
            label: '退出',
            accelerator: 'CmdOrCtrl+Q',
            click: () => app.quit()
          }
        ] : [])
      ]
    });

    // 编辑菜单
    template.push({
      label: '编辑',
      submenu: [
        {
          label: '撤销',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo' as any
        },
        {
          label: '重做',
          accelerator: 'Shift+CmdOrCtrl+Z',
          role: 'redo' as any
        },
        { type: 'separator' as const },
        {
          label: '剪切',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut' as any
        },
        {
          label: '复制',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy' as any
        },
        {
          label: '粘贴',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste' as any
        },
        {
          label: '全选',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectall' as any
        }
      ]
    });

    // 安装菜单
    template.push({
      label: '安装',
      submenu: [
        {
          label: '开始安装',
          accelerator: 'CmdOrCtrl+I',
          click: () => this.startInstallation()
        },
        {
          label: '重新开始',
          click: () => this.restartInstallation()
        },
        { type: 'separator' as const },
        {
          label: '检查环境',
          click: () => this.checkEnvironment()
        },
        {
          label: '测试连接',
          click: () => this.testConnection()
        },
        { type: 'separator' as const },
        {
          label: '停止安装',
          enabled: false,
          click: () => this.stopInstallation()
        }
      ]
    });

    // 工具菜单
    template.push({
      label: '工具',
      submenu: [
        {
          label: '系统信息',
          click: () => this.showSystemInfo()
        },
        {
          label: '网络诊断',
          click: () => this.runNetworkDiagnostics()
        },
        {
          label: '清除缓存',
          click: () => this.clearCache()
        },
        { type: 'separator' as const },
        {
          label: '日志文件夹',
          click: () => this.openLogFolder()
        },
        {
          label: '配置文件夹',
          click: () => this.openConfigFolder()
        },
        { type: 'separator' as const },
        {
          label: '重置应用',
          click: () => this.resetApplication()
        }
      ]
    });

    // 视图菜单
    template.push({
      label: '视图',
      submenu: [
        {
          label: '重新加载',
          accelerator: 'CmdOrCtrl+R',
          click: (_, focusedWindow) => {
            if (focusedWindow) focusedWindow.reload();
          }
        },
        {
          label: '强制重新加载',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: (_, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.reloadIgnoringCache();
            }
          }
        },
        {
          label: '开发者工具',
          accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: (_, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.toggleDevTools();
            }
          }
        },
        { type: 'separator' as const },
        {
          label: '实际大小',
          accelerator: 'CmdOrCtrl+0',
          click: (_, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.setZoomLevel(0);
            }
          }
        },
        {
          label: '放大',
          accelerator: 'CmdOrCtrl+Plus',
          click: (_, focusedWindow) => {
            if (focusedWindow) {
              const currentZoom = focusedWindow.webContents.getZoomLevel();
              focusedWindow.webContents.setZoomLevel(currentZoom + 1);
            }
          }
        },
        {
          label: '缩小',
          accelerator: 'CmdOrCtrl+-',
          click: (_, focusedWindow) => {
            if (focusedWindow) {
              const currentZoom = focusedWindow.webContents.getZoomLevel();
              focusedWindow.webContents.setZoomLevel(currentZoom - 1);
            }
          }
        },
        { type: 'separator' as const },
        {
          label: '切换全屏',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Command+F' : 'F11',
          click: (_, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
            }
          }
        }
      ]
    });

    // 窗口菜单
    template.push({
      label: '窗口',
      submenu: [
        {
          label: '最小化',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize' as any
        },
        {
          label: '关闭',
          accelerator: 'CmdOrCtrl+W',
          role: 'close' as any
        },
        ...(isMac ? [
          { type: 'separator' as const },
          {
            label: '前置全部窗口',
            role: 'front' as any
          }
        ] : [])
      ]
    });

    // 帮助菜单
    template.push({
      label: '帮助',
      submenu: [
        {
          label: '用户指南',
          click: () => this.openUserGuide()
        },
        {
          label: 'FAQ',
          click: () => this.openFAQ()
        },
        {
          label: '技术支持',
          click: () => this.openTechnicalSupport()
        },
        { type: 'separator' as const },
        {
          label: '检查更新',
          click: () => this.checkForUpdates()
        },
        { type: 'separator' as const },
        ...(!isMac ? [
          {
            label: '关于',
            click: () => this.showAboutDialog()
          }
        ] : [])
      ]
    });

    return template;
  }

  /**
   * 显示关于对话框
   */
  private async showAboutDialog(): Promise<void> {
    const focusedWindow = BrowserWindow.getFocusedWindow();

    await dialog.showMessageBox(focusedWindow!, {
      type: 'info',
      title: '关于',
      message: app.getName(),
      detail: `版本: ${app.getVersion()}\n\nClaude Code CLI 沉浸式安装程序\n专为中国地区0基础用户设计的友好安装体验\n\n© 2024 Claude Installer Project`,
      buttons: ['确定'],
      defaultId: 0
    });
  }

  /**
   * 打开设置
   */
  private openSettings(): void {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.send('menu:open-settings');
    }
    log.info('打开设置页面');
  }

  /**
   * 新建配置
   */
  private newConfiguration(): void {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.send('menu:new-configuration');
    }
    log.info('新建配置');
  }

  /**
   * 打开配置
   */
  private async openConfiguration(): Promise<void> {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.send('menu:open-configuration');
    }
    log.info('打开配置');
  }

  /**
   * 保存配置
   */
  private saveConfiguration(): void {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.send('menu:save-configuration');
    }
    log.info('保存配置');
  }

  /**
   * 另存为配置
   */
  private saveConfigurationAs(): void {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.send('menu:save-configuration-as');
    }
    log.info('另存为配置');
  }

  /**
   * 导入配置
   */
  private importConfiguration(): void {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.send('menu:import-configuration');
    }
    log.info('导入配置');
  }

  /**
   * 导出配置
   */
  private exportConfiguration(): void {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.send('menu:export-configuration');
    }
    log.info('导出配置');
  }

  /**
   * 开始安装
   */
  private startInstallation(): void {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.send('menu:start-installation');
    }
    log.info('开始安装');
  }

  /**
   * 重新开始安装
   */
  private async restartInstallation(): Promise<void> {
    const focusedWindow = BrowserWindow.getFocusedWindow();

    const choice = await dialog.showMessageBox(focusedWindow!, {
      type: 'question',
      title: '确认重新开始',
      message: '确定要重新开始安装吗？',
      detail: '这将清除当前的安装进度。',
      buttons: ['取消', '重新开始'],
      defaultId: 0,
      cancelId: 0
    });

    if (choice.response === 1) {
      focusedWindow?.webContents.send('menu:restart-installation');
      log.info('重新开始安装');
    }
  }

  /**
   * 检查环境
   */
  private checkEnvironment(): void {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.send('menu:check-environment');
    }
    log.info('检查环境');
  }

  /**
   * 测试连接
   */
  private testConnection(): void {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.send('menu:test-connection');
    }
    log.info('测试连接');
  }

  /**
   * 停止安装
   */
  private async stopInstallation(): Promise<void> {
    const focusedWindow = BrowserWindow.getFocusedWindow();

    const choice = await dialog.showMessageBox(focusedWindow!, {
      type: 'warning',
      title: '确认停止',
      message: '确定要停止安装吗？',
      detail: '停止安装可能导致系统状态不一致。',
      buttons: ['取消', '停止'],
      defaultId: 0,
      cancelId: 0
    });

    if (choice.response === 1) {
      focusedWindow?.webContents.send('menu:stop-installation');
      log.info('停止安装');
    }
  }

  /**
   * 显示系统信息
   */
  private showSystemInfo(): void {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.send('menu:show-system-info');
    }
    log.info('显示系统信息');
  }

  /**
   * 运行网络诊断
   */
  private runNetworkDiagnostics(): void {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.send('menu:run-network-diagnostics');
    }
    log.info('运行网络诊断');
  }

  /**
   * 清除缓存
   */
  private async clearCache(): Promise<void> {
    const focusedWindow = BrowserWindow.getFocusedWindow();

    const choice = await dialog.showMessageBox(focusedWindow!, {
      type: 'question',
      title: '清除缓存',
      message: '确定要清除所有缓存数据吗？',
      detail: '这将删除临时文件和下载缓存。',
      buttons: ['取消', '清除'],
      defaultId: 0,
      cancelId: 0
    });

    if (choice.response === 1) {
      focusedWindow?.webContents.send('menu:clear-cache');
      log.info('清除缓存');
    }
  }

  /**
   * 打开日志文件夹
   */
  private async openLogFolder(): Promise<void> {
    try {
      const logPath = app.getPath('logs');
      await shell.openPath(logPath);
      log.info('打开日志文件夹', { path: logPath });
    } catch (error) {
      log.error('打开日志文件夹失败', error as Error);
    }
  }

  /**
   * 打开配置文件夹
   */
  private async openConfigFolder(): Promise<void> {
    try {
      const configPath = app.getPath('userData');
      await shell.openPath(configPath);
      log.info('打开配置文件夹', { path: configPath });
    } catch (error) {
      log.error('打开配置文件夹失败', error as Error);
    }
  }

  /**
   * 重置应用
   */
  private async resetApplication(): Promise<void> {
    const focusedWindow = BrowserWindow.getFocusedWindow();

    const choice = await dialog.showMessageBox(focusedWindow!, {
      type: 'warning',
      title: '重置应用',
      message: '确定要重置应用到初始状态吗？',
      detail: '这将删除所有配置、缓存和日志文件。此操作不可撤销。',
      buttons: ['取消', '重置'],
      defaultId: 0,
      cancelId: 0
    });

    if (choice.response === 1) {
      focusedWindow?.webContents.send('menu:reset-application');
      log.info('重置应用');
    }
  }

  /**
   * 打开用户指南
   */
  private openUserGuide(): void {
    shell.openExternal('https://docs.claude.com/user-guide');
    log.info('打开用户指南');
  }

  /**
   * 打开FAQ
   */
  private openFAQ(): void {
    shell.openExternal('https://docs.claude.com/faq');
    log.info('打开FAQ');
  }

  /**
   * 打开技术支持
   */
  private openTechnicalSupport(): void {
    shell.openExternal('https://support.claude.com');
    log.info('打开技术支持');
  }

  /**
   * 检查更新
   */
  private checkForUpdates(): void {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.send('menu:check-for-updates');
    }
    log.info('检查更新');
  }

  /**
   * 更新菜单状态
   */
  updateMenuState(state: {
    installationRunning?: boolean;
    canSave?: boolean;
    hasConfiguration?: boolean;
  }): void {
    if (!this.menu) return;

    // 更新安装相关菜单项状态
    const installMenu = this.menu.items.find(item => item.label === '安装');
    if (installMenu && installMenu.submenu) {
      const stopInstallItem = installMenu.submenu.items.find(item =>
        item.label === '停止安装'
      );
      if (stopInstallItem) {
        stopInstallItem.enabled = !!state.installationRunning;
      }

      const startInstallItem = installMenu.submenu.items.find(item =>
        item.label === '开始安装'
      );
      if (startInstallItem) {
        startInstallItem.enabled = !state.installationRunning;
      }
    }

    // 更新文件菜单状态
    const fileMenu = this.menu.items.find(item => item.label === '文件');
    if (fileMenu && fileMenu.submenu) {
      const saveItem = fileMenu.submenu.items.find(item =>
        item.label === '保存配置'
      );
      if (saveItem) {
        saveItem.enabled = !!state.canSave;
      }

      const saveAsItem = fileMenu.submenu.items.find(item =>
        item.label === '另存为...'
      );
      if (saveAsItem) {
        saveAsItem.enabled = !!state.hasConfiguration;
      }
    }

    log.debug('菜单状态已更新', state);
  }

  /**
   * 获取菜单实例
   */
  getMenu(): Menu | null {
    return this.menu;
  }

  /**
   * 销毁菜单
   */
  destroy(): void {
    if (this.menu) {
      // Electron会自动处理菜单的清理
      this.menu = null;
      log.info('应用菜单已销毁');
    }
  }
}

/**
 * 创建应用菜单
 */
export function createApplicationMenu(): ApplicationMenu {
  log.info('创建应用菜单');
  return new ApplicationMenu();
}

/**
 * 更新菜单状态的快捷函数
 */
export function updateApplicationMenuState(state: {
  installationRunning?: boolean;
  canSave?: boolean;
  hasConfiguration?: boolean;
}): void {
  const menu = Menu.getApplicationMenu();
  if (menu) {
    // 这里可以添加菜单状态更新逻辑
    log.debug('应用菜单状态更新请求', state);
  }
}