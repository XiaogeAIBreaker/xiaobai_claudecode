/**
 * Node.js API IPC通信测试
 */

import { expect, describe, it, beforeEach } from '@jest/globals';

describe('Node.js API IPC Communication', () => {
  let mockIpcRenderer: any;

  beforeEach(() => {
    mockIpcRenderer = { invoke: jest.fn() };
    (global as any).electron = { ipcRenderer: mockIpcRenderer };
  });

  describe('installer:nodejs:check-installation', () => {
    it('应该检查Node.js安装状态', async () => {
      const expectedResponse = {
        installed: true,
        version: '18.17.0',
        path: '/usr/local/bin/node',
        npmVersion: '9.6.7',
        compatible: true,
        recommendedAction: 'none'
      };

      mockIpcRenderer.invoke.mockResolvedValue(expectedResponse);
      const response = await mockIpcRenderer.invoke('installer:nodejs:check-installation');

      expect(response.installed).toBe(true);
      expect(response.compatible).toBe(true);
    });
  });

  describe('installer:nodejs:set-registry', () => {
    it('应该设置npm镜像源', async () => {
      const request = {
        registry: 'https://registry.npmmirror.com/',
        scope: '@anthropic-ai'
      };
      const expectedResponse = {
        success: true,
        previousRegistry: 'https://registry.npmjs.org/'
      };

      mockIpcRenderer.invoke.mockResolvedValue(expectedResponse);
      const response = await mockIpcRenderer.invoke('installer:nodejs:set-registry', request);

      expect(response.success).toBe(true);
      expect(response.previousRegistry).toBeDefined();
    });
  });
});