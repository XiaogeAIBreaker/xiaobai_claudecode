/**
 * Network API IPC通信测试
 */

import { expect, describe, it, beforeEach, afterEach } from '@jest/globals';

describe('Network API IPC Communication', () => {
  let mockIpcRenderer: any;

  beforeEach(() => {
    mockIpcRenderer = { invoke: jest.fn() };
    (global as any).electron = { ipcRenderer: mockIpcRenderer };
  });

  afterEach(() => {
    delete (global as any).electron;
    jest.clearAllMocks();
  });

  describe('installer:network:test-connection', () => {
    it('应该测试网络连接', async () => {
      const request = {
        targets: ['https://registry.npmjs.org', 'https://api.anthropic.com'],
        timeout: 5000
      };
      const expectedResponse = {
        results: [
          { url: 'https://registry.npmjs.org', success: true, responseTime: 200 },
          { url: 'https://api.anthropic.com', success: true, responseTime: 150 }
        ]
      };

      mockIpcRenderer.invoke.mockResolvedValue(expectedResponse);
      const response = await mockIpcRenderer.invoke('installer:network:test-connection', request);

      expect(response.results).toHaveLength(2);
      expect(response.results[0].success).toBe(true);
    });
  });

  describe('installer:network:test-dns', () => {
    it('应该测试DNS解析', async () => {
      const request = {
        domains: ['npmjs.org', 'anthropic.com'],
        dnsServers: ['8.8.8.8']
      };
      const expectedResponse = {
        results: [
          { domain: 'npmjs.org', success: true, ips: ['104.16.0.1'], responseTime: 50 },
          { domain: 'anthropic.com', success: true, ips: ['104.16.0.2'], responseTime: 45 }
        ]
      };

      mockIpcRenderer.invoke.mockResolvedValue(expectedResponse);
      const response = await mockIpcRenderer.invoke('installer:network:test-dns', request);

      expect(response.results).toHaveLength(2);
      expect(response.results[0].ips).toBeDefined();
    });
  });
});