/**
 * Detection API IPC通信测试
 */

import { expect, describe, it, beforeEach, afterEach } from '@jest/globals';

describe('Detection API IPC Communication', () => {
  let mockIpcRenderer: any;

  beforeEach(() => {
    mockIpcRenderer = { invoke: jest.fn(), on: jest.fn() };
    (global as any).electron = { ipcRenderer: mockIpcRenderer };
  });

  afterEach(() => {
    delete (global as any).electron;
    jest.clearAllMocks();
  });

  describe('installer:detection:start', () => {
    it('应该启动检测并返回detectionId', async () => {
      const request = {
        detectionType: 'NETWORK_CONNECTION',
        options: { timeout: 5000 }
      };
      const expectedResponse = {
        success: true,
        detectionId: 'detection-001'
      };

      mockIpcRenderer.invoke.mockResolvedValue(expectedResponse);
      const response = await mockIpcRenderer.invoke('installer:detection:start', request);

      expect(response.success).toBe(true);
      expect(response.detectionId).toBeDefined();
    });
  });

  describe('installer:detection:result', () => {
    it('应该接收检测结果通知', () => {
      const resultData = {
        detectionId: 'detection-001',
        type: 'NETWORK_CONNECTION',
        status: 'SUCCESS',
        message: 'Network connection successful',
        details: { duration: 1500, canRetry: true }
      };

      const callback = jest.fn();
      mockIpcRenderer.on('installer:detection:result', callback);

      const registeredCallback = mockIpcRenderer.on.mock.calls[0][1];
      registeredCallback(null, resultData);

      expect(callback).toHaveBeenCalledWith(null, resultData);
    });
  });
});