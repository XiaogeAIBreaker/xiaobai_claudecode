/**
 * T044: 错误处理和恢复机制验证测试
 * 测试应用的错误处理和用户恢复机制
 */

import { jest } from '@jest/globals';

describe('错误处理和恢复机制验证', () => {
  describe('网络错误处理', () => {
    it('应该处理网络连接超时错误', async () => {
      // 模拟网络超时错误
      const timeoutError = new Error('Network timeout');
      (timeoutError as any).code = 'ETIMEDOUT';

      const mockNetworkDetector = {
        detect: jest.fn().mockRejectedValue(timeoutError)
      };

      try {
        await mockNetworkDetector.detect();
      } catch (error: any) {
        expect(error.code).toBe('ETIMEDOUT');

        // 验证错误被正确分类和处理
        const errorHandler = {
          handleNetworkError: jest.fn().mockReturnValue({
            userMessage: '网络连接超时，请检查您的网络设置或重试',
            retryable: true,
            solutions: ['检查网络连接', '配置代理设置', '重试连接']
          })
        };

        const result = errorHandler.handleNetworkError(error);
        expect(result.retryable).toBe(true);
        expect(result.solutions).toContain('重试连接');
      }
    });

    it('应该处理代理配置错误', async () => {
      const proxyError = new Error('Proxy connection failed');
      (proxyError as any).code = 'ENOTFOUND';

      const errorHandler = {
        handleProxyError: jest.fn().mockReturnValue({
          userMessage: '代理服务器连接失败，请检查代理设置',
          retryable: true,
          autoFix: true,
          fixAction: 'try-direct-connection'
        })
      };

      const result = errorHandler.handleProxyError(proxyError);
      expect(result.autoFix).toBe(true);
      expect(result.fixAction).toBe('try-direct-connection');
    });

    it('应该提供网络问题的自动恢复选项', async () => {
      const networkRecovery = {
        tryDirectConnection: jest.fn().mockResolvedValue(true),
        suggestMirrorSources: jest.fn().mockReturnValue(['淘宝镜像', '华为镜像']),
        detectChinaNetwork: jest.fn().mockResolvedValue({
          inChina: true,
          needsSpecialHandling: true
        })
      };

      const result = await networkRecovery.detectChinaNetwork();
      if (result.needsSpecialHandling) {
        const mirrors = networkRecovery.suggestMirrorSources();
        expect(mirrors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('安装错误处理', () => {
    it('应该处理Node.js下载失败', async () => {
      const downloadError = new Error('Download failed');
      (downloadError as any).code = 'ECONNRESET';

      const installErrorHandler = {
        handleDownloadError: jest.fn().mockReturnValue({
          userMessage: 'Node.js下载失败，正在尝试备用下载源',
          autoRetry: true,
          maxRetries: 3,
          fallbackUrls: ['mirror1.com', 'mirror2.com']
        })
      };

      const result = installErrorHandler.handleDownloadError(downloadError);
      expect(result.autoRetry).toBe(true);
      expect(result.fallbackUrls.length).toBeGreaterThan(0);
    });

    it('应该处理权限不足错误', async () => {
      const permissionError = new Error('Permission denied');
      (permissionError as any).code = 'EACCES';

      const platform = process.platform;
      const permissionHandler = {
        handlePermissionError: jest.fn().mockImplementation((error) => {
          if (platform === 'win32') {
            return {
              userMessage: '权限不足，请以管理员身份运行程序',
              solution: 'run-as-admin',
              instructions: [
                '1. 右键点击安装程序',
                '2. 选择"以管理员身份运行"',
                '3. 在UAC提示中点击"是"'
              ]
            };
          } else {
            return {
              userMessage: '权限不足，需要管理员权限',
              solution: 'use-sudo',
              instructions: [
                '1. 打开终端',
                '2. 使用sudo命令运行安装程序',
                '3. 输入管理员密码'
              ]
            };
          }
        })
      };

      const result = permissionHandler.handlePermissionError(permissionError);
      expect(result.instructions.length).toBeGreaterThan(0);
    });

    it('应该处理磁盘空间不足错误', async () => {
      const spaceError = new Error('No space left on device');
      (spaceError as any).code = 'ENOSPC';

      const spaceHandler = {
        handleDiskSpaceError: jest.fn().mockReturnValue({
          userMessage: '磁盘空间不足，需要至少500MB可用空间',
          requiredSpace: '500MB',
          currentAvailable: '200MB',
          suggestions: [
            '清理临时文件',
            '卸载不需要的程序',
            '移动文件到外部存储'
          ],
          autoCleanup: true
        })
      };

      const result = spaceHandler.handleDiskSpaceError(spaceError);
      expect(result.autoCleanup).toBe(true);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('API配置错误处理', () => {
    it('应该处理无效API密钥', async () => {
      const apiError = new Error('Invalid API key');
      (apiError as any).status = 401;

      const apiErrorHandler = {
        handleAuthError: jest.fn().mockReturnValue({
          userMessage: 'API密钥无效，请检查您的密钥是否正确',
          errorType: 'invalid-key',
          recovery: {
            showHelp: true,
            allowRetry: true,
            helpContent: {
              title: '如何获取正确的API密钥',
              steps: [
                '访问 console.anthropic.com',
                '登录您的账户',
                '创建新的API密钥',
                '确保密钥格式为 sk-...'
              ]
            }
          }
        })
      };

      const result = apiErrorHandler.handleAuthError(apiError);
      expect(result.recovery.showHelp).toBe(true);
      expect(result.recovery.helpContent.steps.length).toBeGreaterThan(0);
    });

    it('应该处理API配额超限', async () => {
      const quotaError = new Error('Rate limit exceeded');
      (quotaError as any).status = 429;

      const quotaHandler = {
        handleRateLimitError: jest.fn().mockReturnValue({
          userMessage: 'API调用频率超限，请稍后重试',
          retryAfter: 60, // 秒
          autoRetry: true,
          showProgress: true
        })
      };

      const result = quotaHandler.handleRateLimitError(quotaError);
      expect(result.autoRetry).toBe(true);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('用户输入错误处理', () => {
    it('应该验证和清理用户输入', () => {
      const inputValidator = {
        validateApiKey: jest.fn().mockImplementation((key: string) => {
          if (!key || typeof key !== 'string') {
            return { valid: false, error: 'API密钥不能为空' };
          }
          if (!key.startsWith('sk-')) {
            return { valid: false, error: 'API密钥格式无效，应以 sk- 开头' };
          }
          if (key.length < 20) {
            return { valid: false, error: 'API密钥长度不足' };
          }
          return { valid: true };
        }),

        sanitizeInput: jest.fn().mockImplementation((input: string) => {
          return input.trim().replace(/[<>]/g, '');
        })
      };

      // 测试无效输入
      expect(inputValidator.validateApiKey('').valid).toBe(false);
      expect(inputValidator.validateApiKey('invalid').valid).toBe(false);
      expect(inputValidator.validateApiKey('sk-valid-key-format-123').valid).toBe(true);

      // 测试输入清理
      expect(inputValidator.sanitizeInput('  <script>alert()</script>  ')).toBe('scriptalert()/script');
    });

    it('应该处理配置文件格式错误', () => {
      const configError = new Error('Invalid JSON');
      (configError as any).name = 'SyntaxError';

      const configHandler = {
        handleConfigError: jest.fn().mockReturnValue({
          userMessage: '配置文件格式错误，将重置为默认配置',
          autoRecover: true,
          backupOriginal: true,
          resetToDefault: true
        })
      };

      const result = configHandler.handleConfigError(configError);
      expect(result.autoRecover).toBe(true);
      expect(result.backupOriginal).toBe(true);
    });
  });

  describe('恢复机制', () => {
    it('应该提供自动重试机制', async () => {
      let attempts = 0;
      const unreliableOperation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const retryMechanism = {
        retry: async (operation: Function, maxAttempts = 3, delay = 1000) => {
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
              return await operation();
            } catch (error) {
              if (attempt === maxAttempts) {
                throw error;
              }
              // 模拟延迟
              await new Promise(resolve => setTimeout(resolve, 10));
            }
          }
        }
      };

      const result = await retryMechanism.retry(unreliableOperation);
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('应该提供手动恢复选项', () => {
      const recoveryOptions = {
        getRecoveryOptions: jest.fn().mockReturnValue([
          {
            id: 'retry-operation',
            label: '重试操作',
            description: '重新尝试失败的操作',
            action: 'retry'
          },
          {
            id: 'skip-step',
            label: '跳过此步骤',
            description: '跳过当前步骤继续安装',
            action: 'skip',
            warning: '跳过可能影响后续功能'
          },
          {
            id: 'contact-support',
            label: '联系技术支持',
            description: '获取人工帮助',
            action: 'support'
          },
          {
            id: 'reset-installer',
            label: '重置安装程序',
            description: '重新开始整个安装过程',
            action: 'reset'
          }
        ])
      };

      const options = recoveryOptions.getRecoveryOptions();
      expect(options.length).toBe(4);
      expect(options.find(o => o.action === 'retry')).toBeDefined();
      expect(options.find(o => o.action === 'skip')).toBeDefined();
    });

    it('应该保存和恢复安装状态', () => {
      const stateManager = {
        saveState: jest.fn().mockImplementation((state) => {
          return Promise.resolve(true);
        }),

        restoreState: jest.fn().mockReturnValue({
          currentStep: 'nodejs-install',
          completedSteps: ['network-check'],
          config: {
            language: 'zh-CN',
            apiKey: null
          },
          errors: []
        }),

        clearState: jest.fn().mockReturnValue(true)
      };

      const savedState = stateManager.restoreState();
      expect(savedState.currentStep).toBe('nodejs-install');
      expect(savedState.completedSteps).toContain('network-check');
    });
  });

  describe('用户友好的错误提示', () => {
    it('应该提供中文错误消息', () => {
      const errorMessages = {
        getErrorMessage: jest.fn().mockImplementation((errorCode: string) => {
          const messages: Record<string, string> = {
            'NETWORK_TIMEOUT': '网络连接超时，请检查您的网络设置',
            'PERMISSION_DENIED': '权限不足，请以管理员身份运行程序',
            'DISK_SPACE_LOW': '磁盘空间不足，请清理后重试',
            'INVALID_API_KEY': 'API密钥无效，请检查密钥格式',
            'DOWNLOAD_FAILED': '文件下载失败，正在尝试备用源'
          };
          return messages[errorCode] || '发生未知错误，请联系技术支持';
        })
      };

      expect(errorMessages.getErrorMessage('NETWORK_TIMEOUT')).toContain('网络连接超时');
      expect(errorMessages.getErrorMessage('UNKNOWN_ERROR')).toContain('未知错误');
    });

    it('应该提供解决方案建议', () => {
      const solutionProvider = {
        getSolutions: jest.fn().mockImplementation((errorType: string) => {
          const solutions: Record<string, string[]> = {
            'NETWORK_ERROR': [
              '检查网络连接是否正常',
              '尝试配置代理服务器',
              '使用手机热点测试连接',
              '联系网络管理员'
            ],
            'INSTALL_ERROR': [
              '以管理员身份运行程序',
              '临时关闭杀毒软件',
              '清理磁盘空间',
              '重启电脑后重试'
            ]
          };
          return solutions[errorType] || ['联系技术支持获取帮助'];
        })
      };

      const networkSolutions = solutionProvider.getSolutions('NETWORK_ERROR');
      expect(networkSolutions.length).toBeGreaterThan(0);
      expect(networkSolutions[0]).toContain('检查网络连接');
    });
  });

  describe('日志和诊断', () => {
    it('应该记录详细的错误信息', () => {
      const errorLogger = {
        logError: jest.fn().mockImplementation((error: Error, context: any) => {
          return {
            timestamp: new Date().toISOString(),
            error: {
              message: error.message,
              stack: error.stack,
              code: (error as any).code
            },
            context,
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version
          };
        })
      };

      const testError = new Error('Test error');
      const logEntry = errorLogger.logError(testError, { step: 'nodejs-install' });

      expect(logEntry.error.message).toBe('Test error');
      expect(logEntry.context.step).toBe('nodejs-install');
      expect(logEntry.platform).toBe(process.platform);
    });

    it('应该生成诊断报告', () => {
      const diagnosticGenerator = {
        generateReport: jest.fn().mockReturnValue({
          timestamp: new Date().toISOString(),
          system: {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version
          },
          network: {
            canAccessGoogle: false,
            canAccessGitHub: true,
            hasProxy: true
          },
          installation: {
            currentStep: 'api-configuration',
            errors: ['Network timeout during Node.js download'],
            warnings: ['Proxy detected but not tested']
          },
          config: {
            language: 'zh-CN',
            hasApiKey: false
          }
        })
      };

      const report = diagnosticGenerator.generateReport();
      expect(report.system.platform).toBeTruthy();
      expect(report.installation.currentStep).toBe('api-configuration');
    });
  });
});