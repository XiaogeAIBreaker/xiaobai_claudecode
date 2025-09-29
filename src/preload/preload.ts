/**
 * T029: Preload脚本
 * 为渲染进程提供安全的主进程API访问接口
 */

import { contextBridge, ipcRenderer } from 'electron';
import { DetectionResult } from '../shared/types/environment';
import { UserConfig } from '../shared/types/config';
import { ProgressEvent, InstallResult } from '../shared/types/installer';

/**
 * 暴露给渲染进程的API接口
 */
const electronAPI = {
  // 基础系统信息
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },

  // 应用控制
  app: {
    getInfo: () => ipcRenderer.invoke('app:get-info'),
    quit: () => ipcRenderer.invoke('app:quit'),
    restart: () => ipcRenderer.invoke('app:restart')
  },

  // 窗口控制
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
    close: () => ipcRenderer.invoke('window:close')
  },

  // 配置管理
  config: {
    load: (): Promise<UserConfig> => ipcRenderer.invoke('config:load'),
    save: (config: UserConfig): Promise<void> => ipcRenderer.invoke('config:save', config),
    reset: (): Promise<void> => ipcRenderer.invoke('config:reset'),
    export: (): Promise<string | null> => ipcRenderer.invoke('config:export'),
    import: (): Promise<UserConfig | null> => ipcRenderer.invoke('config:import')
  },

  // 环境检测
  detect: {
    network: (): Promise<DetectionResult> => ipcRenderer.invoke('detect:network'),
    nodejs: (): Promise<DetectionResult> => ipcRenderer.invoke('detect:nodejs'),
    google: (): Promise<DetectionResult> => ipcRenderer.invoke('detect:google'),
    claudeCli: (): Promise<DetectionResult> => ipcRenderer.invoke('detect:claude-cli'),
    all: (): Promise<{
      network: DetectionResult;
      nodejs: DetectionResult;
      google: DetectionResult;
      claudeCli: DetectionResult;
    }> => ipcRenderer.invoke('detect:all')
  },

  // 安装管理
  install: {
    nodejs: (progressCallback?: (event: ProgressEvent) => void): Promise<InstallResult> =>
      ipcRenderer.invoke('install:nodejs', progressCallback),
    claudeCli: (apiKey?: string, progressCallback?: (event: ProgressEvent) => void): Promise<InstallResult> =>
      ipcRenderer.invoke('install:claude-cli', apiKey, progressCallback),
    getProgress: (step: string): Promise<number> => ipcRenderer.invoke('install:get-progress', step),
    cancel: (): Promise<void> => ipcRenderer.invoke('install:cancel')
  },

  // T030: UI状态管理 - 添加UI状态相关API
  ui: {
    getState: () => ipcRenderer.invoke('ui:get-state'),
    updateState: (updates: any) => ipcRenderer.invoke('ui:update-state', updates),

    // T030: 步骤导航API
    navigateToStep: (step: string) => ipcRenderer.invoke('ui:navigate-to-step', step),
    updateStepState: (step: string, stepState: any) => ipcRenderer.invoke('ui:update-step-state', step, stepState),

    // T030: 按钮事件API
    buttonClick: (buttonType: 'previous' | 'next' | 'retry' | 'skip', context?: any) =>
      ipcRenderer.invoke('ui:button-click', buttonType, context),

    // T030: 状态同步API
    syncWithInstaller: () => ipcRenderer.invoke('ui:sync-with-installer'),
    validateState: () => ipcRenderer.invoke('ui:validate-state'),

    // T030: 键盘快捷键API
    keyboardShortcut: (shortcut: string, context?: any) =>
      ipcRenderer.invoke('ui:keyboard-shortcut', shortcut, context),

    // 原有API
    showNotification: (notification: {
      title: string;
      body: string;
      type?: 'info' | 'success' | 'warning' | 'error';
    }) => ipcRenderer.invoke('ui:show-notification', notification),
    showDialog: (options: {
      type: 'info' | 'warning' | 'error' | 'question';
      title: string;
      message: string;
      detail?: string;
      buttons?: string[];
    }) => ipcRenderer.invoke('ui:show-dialog', options)
  },

  // 系统集成
  system: {
    openExternal: (url: string) => ipcRenderer.invoke('system:open-external', url),
    showItemInFolder: (fullPath: string) => ipcRenderer.invoke('system:show-item-in-folder', fullPath),
    getInfo: () => ipcRenderer.invoke('system:get-info'),
    getPaths: () => ipcRenderer.invoke('system:get-paths')
  },

  // 事件监听
  on: {
    menuEvent: (callback: (event: string, data?: any) => void) => {
      // 菜单事件监听
      const menuEvents = [
        'menu:open-settings',
        'menu:new-configuration',
        'menu:open-configuration',
        'menu:save-configuration',
        'menu:save-configuration-as',
        'menu:import-configuration',
        'menu:export-configuration',
        'menu:start-installation',
        'menu:restart-installation',
        'menu:check-environment',
        'menu:test-connection',
        'menu:stop-installation',
        'menu:show-system-info',
        'menu:run-network-diagnostics',
        'menu:clear-cache',
        'menu:reset-application',
        'menu:check-for-updates'
      ];

      menuEvents.forEach(eventName => {
        ipcRenderer.on(eventName, (_, data) => callback(eventName, data));
      });
    },

    uiStateUpdate: (callback: (state: any) => void) => {
      ipcRenderer.on('ui:state-updated', (_, state) => callback(state));
    },

    notificationAdded: (callback: (notification: any) => void) => {
      ipcRenderer.on('ui:notification-added', (_, notification) => callback(notification));
    },

    // T030: 新增UI状态事件监听
    stepChanged: (callback: (step: string) => void) => {
      ipcRenderer.on('ui:step-changed', (_, step) => callback(step));
    },

    stepStateUpdated: (callback: (data: { step: string; stepState: any }) => void) => {
      ipcRenderer.on('ui:step-state-updated', (_, data) => callback(data));
    },

    buttonClicked: (callback: (data: { buttonType: string; context?: any }) => void) => {
      ipcRenderer.on('ui:button-clicked', (_, data) => callback(data));
    },

    syncCompleted: (callback: (result: any) => void) => {
      ipcRenderer.on('ui:sync-completed', (_, result) => callback(result));
    },

    cancelRequested: (callback: (context?: any) => void) => {
      ipcRenderer.on('ui:cancel-requested', (_, context) => callback(context));
    }
  },

  // 移除事件监听
  off: {
    menuEvent: () => {
      const menuEvents = [
        'menu:open-settings',
        'menu:new-configuration',
        'menu:open-configuration',
        'menu:save-configuration',
        'menu:save-configuration-as',
        'menu:import-configuration',
        'menu:export-configuration',
        'menu:start-installation',
        'menu:restart-installation',
        'menu:check-environment',
        'menu:test-connection',
        'menu:stop-installation',
        'menu:show-system-info',
        'menu:run-network-diagnostics',
        'menu:clear-cache',
        'menu:reset-application',
        'menu:check-for-updates'
      ];

      menuEvents.forEach(eventName => {
        ipcRenderer.removeAllListeners(eventName);
      });
    },

    uiStateUpdate: () => {
      ipcRenderer.removeAllListeners('ui:state-updated');
    },

    notificationAdded: () => {
      ipcRenderer.removeAllListeners('ui:notification-added');
    },

    // T030: 移除新增的UI状态事件监听
    stepChanged: () => {
      ipcRenderer.removeAllListeners('ui:step-changed');
    },

    stepStateUpdated: () => {
      ipcRenderer.removeAllListeners('ui:step-state-updated');
    },

    buttonClicked: () => {
      ipcRenderer.removeAllListeners('ui:button-clicked');
    },

    syncCompleted: () => {
      ipcRenderer.removeAllListeners('ui:sync-completed');
    },

    cancelRequested: () => {
      ipcRenderer.removeAllListeners('ui:cancel-requested');
    }
  }
};

/**
 * 类型定义导出
 */
export type ElectronAPI = typeof electronAPI;

/**
 * 在渲染进程中暴露API
 */
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  } catch (error) {
    // 在preload脚本中，使用console.error是合理的错误处理
    // eslint-disable-next-line no-console
    console.error('无法暴露electronAPI:', error);
  }
} else {
  // 如果没有启用上下文隔离，直接在window对象上设置
  (window as any).electronAPI = electronAPI;
}

/**
 * 全局类型声明
 */
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}