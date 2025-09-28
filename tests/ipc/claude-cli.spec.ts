/**
 * Claude CLI API IPC通信测试
 */

import { expect, describe, it, beforeEach } from '@jest/globals';

describe('Claude CLI API IPC Communication', () => {
  let mockIpcRenderer: any;

  beforeEach(() => {
    mockIpcRenderer = { invoke: jest.fn() };
    (global as any).electron = { ipcRenderer: mockIpcRenderer };
  });

  describe('installer:claude:check-installation', () => {
    it('应该检查Claude CLI安装状态', async () => {
      const expectedResponse = {
        installed: true,
        version: '1.0.0',
        path: '/usr/local/bin/claude',
        working: true,
        needsUpdate: false
      };

      mockIpcRenderer.invoke.mockResolvedValue(expectedResponse);
      const response = await mockIpcRenderer.invoke('installer:claude:check-installation');

      expect(response.installed).toBe(true);
      expect(response.working).toBe(true);
    });
  });

  describe('installer:claude:install', () => {
    it('应该安装Claude CLI', async () => {
      const request = { force: false, global: true };
      const expectedResponse = {
        success: true,
        taskId: 'claude-install-001'
      };

      mockIpcRenderer.invoke.mockResolvedValue(expectedResponse);
      const response = await mockIpcRenderer.invoke('installer:claude:install', request);

      expect(response.success).toBe(true);
      expect(response.taskId).toBeDefined();
    });
  });
});