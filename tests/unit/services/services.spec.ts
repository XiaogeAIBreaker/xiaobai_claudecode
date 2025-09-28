/**
 * 服务层单元测试
 * 测试网络服务、Node.js服务、Claude CLI服务等核心业务逻辑
 */

import { NetworkService } from '../../../src/services/network-service';
import { NodejsService } from '../../../src/services/nodejs-service';
import { ClaudeCliService } from '../../../src/services/claude-cli-service';
import { ConfigService } from '../../../src/services/config-service';
import { StepService } from '../../../src/services/step-service';

// 模拟依赖
jest.mock('child_process');
jest.mock('fs/promises');
jest.mock('https');
jest.mock('os');

describe('Services - NetworkService', () => {
    let networkService: NetworkService;

    beforeEach(() => {
        networkService = new NetworkService();
        jest.clearAllMocks();
    });

    describe('网络连接检测', () => {
        it('应该检测互联网连接', async () => {
            // 模拟成功的网络请求
            const mockHttps = require('https');
            mockHttps.request.mockImplementation((options, callback) => {
                const mockResponse = {
                    statusCode: 200,
                    on: jest.fn()
                };
                callback(mockResponse);
                return {
                    on: jest.fn(),
                    end: jest.fn(),
                    setTimeout: jest.fn()
                };
            });

            const result = await networkService.checkInternetConnection();

            expect(result.isConnected).toBe(true);
            expect(result.latency).toBeGreaterThan(0);
        });

        it('应该处理网络连接失败', async () => {
            const mockHttps = require('https');
            mockHttps.request.mockImplementation(() => {
                return {
                    on: jest.fn((event, handler) => {
                        if (event === 'error') {
                            handler(new Error('Network unreachable'));
                        }
                    }),
                    end: jest.fn(),
                    setTimeout: jest.fn()
                };
            });

            const result = await networkService.checkInternetConnection();

            expect(result.isConnected).toBe(false);
            expect(result.error).toContain('Network unreachable');
        });
    });

    describe('服务可达性检测', () => {
        it('应该检测npm注册表可达性', async () => {
            const mockHttps = require('https');
            mockHttps.request.mockImplementation((options, callback) => {
                const mockResponse = {
                    statusCode: 200,
                    on: jest.fn()
                };
                callback(mockResponse);
                return {
                    on: jest.fn(),
                    end: jest.fn(),
                    setTimeout: jest.fn()
                };
            });

            const result = await networkService.checkNpmRegistry();

            expect(result.isAccessible).toBe(true);
            expect(result.url).toContain('registry.npmjs.org');
        });

        it('应该检测GitHub可达性', async () => {
            const mockHttps = require('https');
            mockHttps.request.mockImplementation((options, callback) => {
                const mockResponse = {
                    statusCode: 200,
                    headers: { 'x-github-media-type': 'github.v3' },
                    on: jest.fn()
                };
                callback(mockResponse);
                return {
                    on: jest.fn(),
                    end: jest.fn(),
                    setTimeout: jest.fn()
                };
            });

            const result = await networkService.checkGithubAccess();

            expect(result.isAccessible).toBe(true);
            expect(result.apiVersion).toBeDefined();
        });

        it('应该检测Anthropic API可达性', async () => {
            const mockHttps = require('https');
            mockHttps.request.mockImplementation((options, callback) => {
                const mockResponse = {
                    statusCode: 200,
                    on: jest.fn()
                };
                callback(mockResponse);
                return {
                    on: jest.fn(),
                    end: jest.fn(),
                    setTimeout: jest.fn()
                };
            });

            const result = await networkService.checkAnthropicApi();

            expect(result.isAccessible).toBe(true);
        });
    });

    describe('网络诊断', () => {
        it('应该执行全面的网络诊断', async () => {
            // 模拟所有网络检查都成功
            const mockHttps = require('https');
            mockHttps.request.mockImplementation((options, callback) => {
                const mockResponse = {
                    statusCode: 200,
                    headers: {},
                    on: jest.fn()
                };
                callback(mockResponse);
                return {
                    on: jest.fn(),
                    end: jest.fn(),
                    setTimeout: jest.fn()
                };
            });

            const diagnosis = await networkService.runDiagnostics();

            expect(diagnosis.overallStatus).toBe('healthy');
            expect(diagnosis.checks).toHaveProperty('internet');
            expect(diagnosis.checks).toHaveProperty('npm');
            expect(diagnosis.checks).toHaveProperty('github');
            expect(diagnosis.checks).toHaveProperty('anthropic');
        });

        it('应该提供网络问题的解决建议', async () => {
            // 模拟网络连接失败
            const mockHttps = require('https');
            mockHttps.request.mockImplementation(() => {
                return {
                    on: jest.fn((event, handler) => {
                        if (event === 'error') {
                            handler(new Error('ECONNREFUSED'));
                        }
                    }),
                    end: jest.fn(),
                    setTimeout: jest.fn()
                };
            });

            const diagnosis = await networkService.runDiagnostics();

            expect(diagnosis.overallStatus).toBe('failed');
            expect(diagnosis.recommendations).toBeDefined();
            expect(diagnosis.recommendations.length).toBeGreaterThan(0);
        });
    });
});

describe('Services - NodejsService', () => {
    let nodejsService: NodejsService;

    beforeEach(() => {
        nodejsService = new NodejsService();
        jest.clearAllMocks();
    });

    describe('Node.js 检测', () => {
        it('应该检测已安装的Node.js', async () => {
            const mockExec = require('child_process').exec;
            mockExec.mockImplementation((command, callback) => {
                if (command.includes('node --version')) {
                    callback(null, { stdout: 'v18.16.0\n' });
                } else if (command.includes('npm --version')) {
                    callback(null, { stdout: '9.6.0\n' });
                }
            });

            const result = await nodejsService.detectNodejs();

            expect(result.isInstalled).toBe(true);
            expect(result.version).toBe('v18.16.0');
            expect(result.npmVersion).toBe('9.6.0');
        });

        it('应该处理Node.js未安装的情况', async () => {
            const mockExec = require('child_process').exec;
            mockExec.mockImplementation((command, callback) => {
                callback(new Error('Command not found'), null);
            });

            const result = await nodejsService.detectNodejs();

            expect(result.isInstalled).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('应该验证Node.js版本兼容性', async () => {
            const mockExec = require('child_process').exec;
            mockExec.mockImplementation((command, callback) => {
                callback(null, { stdout: 'v16.14.0\n' });
            });

            const result = await nodejsService.detectNodejs();

            expect(result.isInstalled).toBe(true);
            expect(result.isCompatible).toBe(false); // v16 < v18 最低要求
            expect(result.warnings).toContain('version_outdated');
        });
    });

    describe('Node.js 安装', () => {
        it('应该下载和安装Node.js', async () => {
            const mockFs = require('fs/promises');
            const mockExec = require('child_process').exec;

            // 模拟下载成功
            mockFs.access.mockRejectedValue(new Error('File not found'));
            mockFs.writeFile.mockResolvedValue(undefined);

            // 模拟安装成功
            mockExec.mockImplementation((command, callback) => {
                if (command.includes('node --version')) {
                    callback(null, { stdout: 'v18.16.0\n' });
                } else {
                    callback(null, { stdout: 'Installation completed\n' });
                }
            });

            const progressCallback = jest.fn();
            const result = await nodejsService.installNodejs(progressCallback);

            expect(result.success).toBe(true);
            expect(result.version).toBe('v18.16.0');
            expect(progressCallback).toHaveBeenCalledWith(expect.objectContaining({
                stage: 'downloading',
                progress: expect.any(Number)
            }));
        });

        it('应该处理安装失败', async () => {
            const mockExec = require('child_process').exec;
            mockExec.mockImplementation((command, callback) => {
                callback(new Error('Installation failed'), null);
            });

            const result = await nodejsService.installNodejs();

            expect(result.success).toBe(false);
            expect(result.error).toContain('Installation failed');
        });
    });

    describe('npm 配置', () => {
        it('应该配置npm镜像源', async () => {
            const mockExec = require('child_process').exec;
            mockExec.mockImplementation((command, callback) => {
                callback(null, { stdout: 'registry set successfully\n' });
            });

            const result = await nodejsService.configureNpmRegistry('https://registry.npmmirror.com/');

            expect(result.success).toBe(true);
            expect(mockExec).toHaveBeenCalledWith(
                expect.stringContaining('npm config set registry'),
                expect.any(Function)
            );
        });

        it('应该验证npm配置', async () => {
            const mockExec = require('child_process').exec;
            mockExec.mockImplementation((command, callback) => {
                if (command.includes('npm config get registry')) {
                    callback(null, { stdout: 'https://registry.npmmirror.com/\n' });
                }
            });

            const result = await nodejsService.verifyNpmConfiguration();

            expect(result.isConfigured).toBe(true);
            expect(result.registry).toBe('https://registry.npmmirror.com/');
        });
    });
});

describe('Services - ClaudeCliService', () => {
    let claudeCliService: ClaudeCliService;

    beforeEach(() => {
        claudeCliService = new ClaudeCliService();
        jest.clearAllMocks();
    });

    describe('Claude CLI 检测', () => {
        it('应该检测已安装的Claude CLI', async () => {
            const mockExec = require('child_process').exec;
            mockExec.mockImplementation((command, callback) => {
                if (command.includes('claude --version')) {
                    callback(null, { stdout: 'claude version 1.2.3\n' });
                }
            });

            const result = await claudeCliService.detectClaudeCli();

            expect(result.isInstalled).toBe(true);
            expect(result.version).toBe('1.2.3');
        });

        it('应该处理Claude CLI未安装的情况', async () => {
            const mockExec = require('child_process').exec;
            mockExec.mockImplementation((command, callback) => {
                callback(new Error('command not found: claude'), null);
            });

            const result = await claudeCliService.detectClaudeCli();

            expect(result.isInstalled).toBe(false);
        });
    });

    describe('Claude CLI 安装', () => {
        it('应该安装Claude CLI', async () => {
            const mockExec = require('child_process').exec;
            mockExec.mockImplementation((command, callback) => {
                if (command.includes('npm install -g @anthropic-ai/claude-cli')) {
                    callback(null, { stdout: 'Installation completed\n' });
                } else if (command.includes('claude --version')) {
                    callback(null, { stdout: 'claude version 1.2.3\n' });
                }
            });

            const progressCallback = jest.fn();
            const result = await claudeCliService.installClaudeCli(progressCallback);

            expect(result.success).toBe(true);
            expect(result.version).toBe('1.2.3');
            expect(progressCallback).toHaveBeenCalled();
        });

        it('应该处理安装权限问题', async () => {
            const mockExec = require('child_process').exec;
            mockExec.mockImplementation((command, callback) => {
                callback(new Error('EACCES: permission denied'), null);
            });

            const result = await claudeCliService.installClaudeCli();

            expect(result.success).toBe(false);
            expect(result.error).toContain('permission denied');
            expect(result.suggestions).toContain('run_as_administrator');
        });
    });

    describe('Claude CLI 配置', () => {
        it('应该配置API密钥', async () => {
            const mockExec = require('child_process').exec;
            mockExec.mockImplementation((command, callback) => {
                callback(null, { stdout: 'API key configured successfully\n' });
            });

            const result = await claudeCliService.configureApiKey('sk-test1234567890abcdef');

            expect(result.success).toBe(true);
            expect(mockExec).toHaveBeenCalledWith(
                expect.stringContaining('claude config set api-key'),
                expect.any(Function)
            );
        });

        it('应该验证API密钥', async () => {
            const mockExec = require('child_process').exec;
            mockExec.mockImplementation((command, callback) => {
                if (command.includes('claude auth check')) {
                    callback(null, { stdout: 'Authentication successful\n' });
                }
            });

            const result = await claudeCliService.verifyApiKey();

            expect(result.isValid).toBe(true);
        });
    });
});

describe('Services - ConfigService', () => {
    let configService: ConfigService;

    beforeEach(() => {
        configService = new ConfigService();
        jest.clearAllMocks();
    });

    describe('配置存储', () => {
        it('应该保存用户配置', async () => {
            const mockFs = require('fs/promises');
            mockFs.writeFile.mockResolvedValue(undefined);

            const config = {
                language: 'zh-CN',
                theme: 'dark',
                installPath: '/usr/local/bin'
            };

            const result = await configService.saveConfig(config);

            expect(result.success).toBe(true);
            expect(mockFs.writeFile).toHaveBeenCalled();
        });

        it('应该加载用户配置', async () => {
            const mockFs = require('fs/promises');
            const configData = {
                language: 'zh-CN',
                theme: 'light',
                apiKey: 'encrypted_key_data'
            };

            mockFs.readFile.mockResolvedValue(JSON.stringify(configData));

            const result = await configService.loadConfig();

            expect(result.success).toBe(true);
            expect(result.config).toEqual(configData);
        });

        it('应该处理配置文件不存在的情况', async () => {
            const mockFs = require('fs/promises');
            mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file'));

            const result = await configService.loadConfig();

            expect(result.success).toBe(true);
            expect(result.config).toEqual({}); // 返回默认配置
        });
    });

    describe('安全存储', () => {
        it('应该加密敏感数据', async () => {
            const sensitiveData = 'sk-1234567890abcdef';
            const encrypted = await configService.encryptSensitiveData(sensitiveData);

            expect(encrypted).not.toBe(sensitiveData);
            expect(encrypted.length).toBeGreaterThan(sensitiveData.length);
        });

        it('应该解密敏感数据', async () => {
            const originalData = 'sk-1234567890abcdef';
            const encrypted = await configService.encryptSensitiveData(originalData);
            const decrypted = await configService.decryptSensitiveData(encrypted);

            expect(decrypted).toBe(originalData);
        });
    });
});

describe('Services - StepService', () => {
    let stepService: StepService;

    beforeEach(() => {
        stepService = new StepService();
        jest.clearAllMocks();
    });

    describe('步骤管理', () => {
        it('应该初始化安装步骤', () => {
            const steps = stepService.initializeSteps();

            expect(Array.isArray(steps)).toBe(true);
            expect(steps.length).toBeGreaterThan(0);
            expect(steps[0]).toHaveProperty('id');
            expect(steps[0]).toHaveProperty('name');
            expect(steps[0]).toHaveProperty('status');
        });

        it('应该获取当前步骤', () => {
            stepService.initializeSteps();
            const currentStep = stepService.getCurrentStep();

            expect(currentStep).toBeDefined();
            expect(currentStep.status).toBe('pending');
        });

        it('应该切换到下一步', () => {
            stepService.initializeSteps();
            const result = stepService.goToNextStep();

            expect(result.success).toBe(true);
            expect(result.currentStep).toBeGreaterThan(1);
        });

        it('应该切换到上一步', () => {
            stepService.initializeSteps();
            stepService.goToNextStep(); // 先前进一步

            const result = stepService.goToPreviousStep();

            expect(result.success).toBe(true);
            expect(result.currentStep).toBe(1);
        });
    });

    describe('步骤状态', () => {
        it('应该更新步骤状态', () => {
            stepService.initializeSteps();

            const result = stepService.updateStepStatus(1, 'completed');

            expect(result.success).toBe(true);

            const step = stepService.getStep(1);
            expect(step?.status).toBe('completed');
        });

        it('应该标记步骤为失败', () => {
            stepService.initializeSteps();

            const result = stepService.markStepFailed(1, 'Network error');

            expect(result.success).toBe(true);

            const step = stepService.getStep(1);
            expect(step?.status).toBe('failed');
            expect(step?.error).toBe('Network error');
        });
    });

    describe('进度计算', () => {
        it('应该计算总体进度', () => {
            stepService.initializeSteps();
            stepService.updateStepStatus(1, 'completed');
            stepService.updateStepStatus(2, 'completed');

            const progress = stepService.calculateProgress();

            expect(progress.percentage).toBeGreaterThan(0);
            expect(progress.completedSteps).toBe(2);
            expect(progress.totalSteps).toBeGreaterThan(2);
        });

        it('应该生成进度报告', () => {
            stepService.initializeSteps();
            stepService.updateStepStatus(1, 'completed');
            stepService.updateStepStatus(2, 'failed');

            const report = stepService.generateProgressReport();

            expect(report).toHaveProperty('overallStatus');
            expect(report).toHaveProperty('completedSteps');
            expect(report).toHaveProperty('failedSteps');
            expect(report).toHaveProperty('estimatedTimeRemaining');
        });
    });
});