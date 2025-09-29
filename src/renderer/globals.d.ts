/**
 * 全局类型声明
 * 修复TypeScript类型错误
 */

import { ElectronAPI } from '../preload/preload';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    global: typeof globalThis;
  }

  var global: typeof globalThis;
}

export {};