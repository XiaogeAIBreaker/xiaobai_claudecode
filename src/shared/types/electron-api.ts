/**
 * Electron API类型定义
 * 定义渲染进程可以调用的主进程API
 */

export interface NodeJSCheckResult {
  installed: boolean;
  version?: string;
  npmVersion?: string;
}

export interface InstallProgress {
  step: string;
  progress: number;
  message: string;
  status: 'running' | 'success' | 'error';
  nodeVersion?: string;
  npmVersion?: string;
}

export interface InstallResult {
  success: boolean;
  error?: string;
}

export interface ElectronAPI {
  // 安装相关API
  install: {
    checkNodeJS(): Promise<{ success: boolean; data?: NodeJSCheckResult; error?: string }>;
    nodejs(progressCallback?: (progress: InstallProgress) => void): Promise<InstallResult>;
    cancelNodeJS(): Promise<{ success: boolean }>;
  };

  // 事件监听
  on: {
    installProgress(callback: (progress: InstallProgress) => void): void;
  };

  // 事件取消监听
  off: {
    installProgress(): void;
  };
}

// 删除重复的全局声明，因为在preload.ts中已经有了