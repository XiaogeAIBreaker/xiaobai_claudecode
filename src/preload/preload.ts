/**
 * T029: Preload脚本
 * 为渲染进程提供安全的主进程API访问接口
 */

import { contextBridge, ipcRenderer } from 'electron';
import { DetectionResult } from '../shared/types/environment';
import { UserConfig } from '../shared/types/config';
import { ProgressEvent, InstallResult } from '../shared/types/installer';
import { SharedConfigurationEntry } from '../shared/types/shared-config';
import { WorkflowSyncResponse, WorkflowId } from '../shared/types/workflows';

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

  // 共享配置
  sharedConfig: {
    get: <TValue = unknown>(id: string): Promise<SharedConfigurationEntry<TValue>> =>
      ipcRenderer.invoke('ipc.shared-config.get', { id }),
  },

  // Workflow 映射
  workflowMap: {
    sync: (flowId: WorkflowId, version?: string): Promise<WorkflowSyncResponse> =>
      ipcRenderer.invoke('ipc.workflow-map.sync', { flowId, version }),
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
    // Node.js安装 - 支持一键安装模式
    nodejs: (progressCallback?: (event: ProgressEvent) => void): Promise<InstallResult> => {
      if (progressCallback) {
        // 监听进度更新
        const progressHandler = (_: any, progress: any) => progressCallback(progress);
        ipcRenderer.on('install:nodejs-progress', progressHandler);

        // 在安装完成或失败后清理监听器
        const cleanup = () => {
          ipcRenderer.removeListener('install:nodejs-progress', progressHandler);
        };

        return ipcRenderer.invoke('install:nodejs')
          .then(result => {
            cleanup();
            return result;
          })
          .catch(error => {
            cleanup();
            throw error;
          });
      }

      return ipcRenderer.invoke('install:nodejs');
    },

    // 检查Node.js安装状态
    checkNodeJS: (): Promise<{ success: boolean; data?: any; error?: string; errors?: Array<{ message: string }> }> =>
      ipcRenderer.invoke('install:check-nodejs'),

    // 取消安装
    cancelNodeJS: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('install:cancel-nodejs'),

    // 检查 Claude CLI 安装状态
    checkClaudeCli: (): Promise<{ success: boolean; data?: { installed: boolean; version?: string }; error?: string }> =>
      ipcRenderer.invoke('install:check-claude-cli'),

    // Claude CLI 安装
    claudeCli: (progressCallback?: (event: ProgressEvent) => void): Promise<InstallResult> => {
      if (progressCallback) {
        const progressHandler = (_: any, progress: any) => progressCallback(progress);
        ipcRenderer.on('install:claude-cli-progress', progressHandler);

        const cleanup = () => {
          ipcRenderer.removeListener('install:claude-cli-progress', progressHandler);
        };

        return ipcRenderer.invoke('install:claude-cli')
          .then(result => {
            cleanup();
            return result;
          })
          .catch(error => {
            cleanup();
            throw error;
          });
      }

      return ipcRenderer.invoke('install:claude-cli');
    },

    getProgress: (step: string): Promise<number> => ipcRenderer.invoke('install:get-progress', step),
    cancel: (): Promise<void> => ipcRenderer.invoke('install:cancel')
  },

  // UI状态管理
  ui: {
    getState: () => ipcRenderer.invoke('ui:get-state'),
    updateState: (updates: any) => ipcRenderer.invoke('ui:update-state', updates),
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

  // Google 认证
  google: {
    openRegistrationBrowser: () => ipcRenderer.invoke('google:open-registration-browser'),
    closeRegistrationBrowser: () => ipcRenderer.invoke('google:close-registration-browser'),
    cleanup: () => ipcRenderer.invoke('google:cleanup'),
    onRegistrationProgress: (callback: (step: number) => void) => {
      ipcRenderer.on('google:registration-progress', (_, step) => callback(step));
    },
    offRegistrationProgress: () => {
      ipcRenderer.removeAllListeners('google:registration-progress');
    }
  },

  // 环境变量管理
  env: {
    get: (keys: string[]): Promise<{ success: boolean; data?: Record<string, string | undefined>; error?: string }> =>
      ipcRenderer.invoke('env:get', keys),
    set: (vars: Record<string, string>): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('env:set', vars),
    remove: (keys: string[]): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('env:remove', keys)
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
