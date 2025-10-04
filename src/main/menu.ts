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

    if (isMac) {
      template.push({
        label: app.getName(),
        submenu: [
          {
            label: `关于 ${app.getName()}`,
            click: () => this.showAboutDialog()
          },
          { type: 'separator' as const },
          {
            label: '偏好设置...',
            accelerator: 'CmdOrCtrl+,',
            click: () => this.openSettings()
          },
          { type: 'separator' as const },
          {
            label: '退出',
            accelerator: 'CmdOrCtrl+Q',
            click: () => app.quit()
          }
        ]
      });
    } else {
      template.push({
        label: '应用',
        submenu: [
          {
            label: `关于 ${app.getName()}`,
            click: () => this.showAboutDialog()
          },
          {
            label: '偏好设置...',
            accelerator: 'CmdOrCtrl+,',
            click: () => this.openSettings()
          },
          { type: 'separator' as const },
          {
            label: '退出',
            accelerator: 'CmdOrCtrl+Q',
            click: () => app.quit()
          }
        ]
      });
    }

    template.push({
      label: '安装',
      submenu: [
        {
          label: '重新开始安装',
          click: () => this.restartInstallation()
        },
        {
          label: '检查环境',
          click: () => this.checkEnvironment()
        }
      ]
    });

    const helpSubmenu: MenuTemplate[] = [
      {
        label: '查看文档',
        click: () => this.openDocumentation()
      },
      {
        label: '提交反馈',
        click: () => this.submitFeedback()
      }
    ];

    if (!isMac) {
      helpSubmenu.push({ type: 'separator' as const });
      helpSubmenu.push({
        label: `关于 ${app.getName()}`,
        click: () => this.showAboutDialog()
      });
    }

    template.push({
      label: '帮助',
      submenu: helpSubmenu
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
   * 打开文档中心
   */
  private openDocumentation(): void {
    shell.openExternal('https://docs.claude.com/user-guide');
    log.info('打开文档中心');
  }

  /**
   * 提交反馈
   */
  private submitFeedback(): void {
    shell.openExternal('https://support.claude.com/feedback');
    log.info('打开反馈渠道');
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

