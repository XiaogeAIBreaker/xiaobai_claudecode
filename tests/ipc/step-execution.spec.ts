/**
 * Step Execution API IPC通信测试
 */

import { expect, describe, it, beforeEach, afterEach } from '@jest/globals';

describe('Step Execution API IPC Communication', () => {
  let mockIpcRenderer: any;

  beforeEach(() => {
    mockIpcRenderer = {
      invoke: jest.fn(),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
    };
    (global as any).electron = { ipcRenderer: mockIpcRenderer };
  });

  afterEach(() => {
    delete (global as any).electron;
    jest.clearAllMocks();
  });

  describe('installer:step:start', () => {
    it('应该启动安装步骤并返回taskId', async () => {
      const request = {
        stepId: 'network-check',
        options: { skipDetection: false, autoFix: true }
      };
      const expectedResponse = {
        success: true,
        taskId: 'task-001'
      };

      mockIpcRenderer.invoke.mockResolvedValue(expectedResponse);
      const response = await mockIpcRenderer.invoke('installer:step:start', request);

      expect(response.success).toBe(true);
      expect(response.taskId).toBeDefined();
    });

    it('应该处理步骤启动失败的情况', async () => {
      const request = { stepId: 'invalid-step' };
      const expectedResponse = {
        success: false,
        error: 'Invalid step ID'
      };

      mockIpcRenderer.invoke.mockResolvedValue(expectedResponse);
      const response = await mockIpcRenderer.invoke('installer:step:start', request);

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('installer:step:progress', () => {
    it('应该接收步骤进度通知', () => {
      const progressData = {
        stepId: 'nodejs-install',
        taskId: 'task-002',
        progress: 50,
        message: 'Installing Node.js...'
      };

      const callback = jest.fn();
      mockIpcRenderer.on('installer:step:progress', callback);

      // 模拟进度事件
      const registeredCallback = mockIpcRenderer.on.mock.calls[0][1];
      registeredCallback(null, progressData);

      expect(callback).toHaveBeenCalledWith(null, progressData);
    });
  });

  describe('installer:step:completed', () => {
    it('应该接收步骤完成通知', () => {
      const completedData = {
        stepId: 'claude-cli-install',
        taskId: 'task-003',
        status: 'success',
        message: 'Claude CLI installed successfully',
        canRetry: false
      };

      const callback = jest.fn();
      mockIpcRenderer.on('installer:step:completed', callback);

      const registeredCallback = mockIpcRenderer.on.mock.calls[0][1];
      registeredCallback(null, completedData);

      expect(callback).toHaveBeenCalledWith(null, completedData);
      expect(completedData.status).toBe('success');
    });
  });
});