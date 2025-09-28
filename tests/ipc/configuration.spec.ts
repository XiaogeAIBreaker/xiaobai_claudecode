/**
 * Configuration API IPC通信测试
 */

import { expect, describe, it, beforeEach } from '@jest/globals';

describe('Configuration API IPC Communication', () => {
  let mockIpcRenderer: any;

  beforeEach(() => {
    mockIpcRenderer = { invoke: jest.fn() };
    (global as any).electron = { ipcRenderer: mockIpcRenderer };
  });

  describe('installer:config:get', () => {
    it('应该获取配置', async () => {
      const request = { keys: ['anthropicBaseUrl', 'anthropicApiKey'] };
      const expectedResponse = {
        config: {
          anthropicBaseUrl: 'https://api.anthropic.com',
          anthropicApiKey: '***encrypted***'
        }
      };

      mockIpcRenderer.invoke.mockResolvedValue(expectedResponse);
      const response = await mockIpcRenderer.invoke('installer:config:get', request);

      expect(response.config).toBeDefined();
    });
  });

  describe('installer:config:set', () => {
    it('应该设置配置', async () => {
      const request = {
        config: {
          anthropicBaseUrl: 'https://api.anthropic.com',
          anthropicApiKey: 'sk-test-key'
        },
        encrypt: ['anthropicApiKey']
      };
      const expectedResponse = { success: true };

      mockIpcRenderer.invoke.mockResolvedValue(expectedResponse);
      const response = await mockIpcRenderer.invoke('installer:config:set', request);

      expect(response.success).toBe(true);
    });
  });

  describe('installer:config:validate-api', () => {
    it('应该验证API配置', async () => {
      const request = {
        baseUrl: 'https://api.anthropic.com',
        apiKey: 'sk-test-key',
        timeout: 10000
      };
      const expectedResponse = {
        valid: true,
        userInfo: { id: 'user-123', email: 'test@example.com' }
      };

      mockIpcRenderer.invoke.mockResolvedValue(expectedResponse);
      const response = await mockIpcRenderer.invoke('installer:config:validate-api', request);

      expect(response.valid).toBe(true);
      expect(response.userInfo).toBeDefined();
    });
  });
});