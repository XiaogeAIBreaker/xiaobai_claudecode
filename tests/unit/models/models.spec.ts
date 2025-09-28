/**
 * 数据模型单元测试
 * 测试所有核心数据模型的验证、序列化等功能
 */

import {
    InstallationStep,
    DetectionResult,
    UserConfiguration,
    NavigationState,
    NetworkConfiguration,
    validateInstallationStep,
    validateDetectionResult,
    validateUserConfiguration,
    validateNavigationState,
    validateNetworkConfiguration
} from '../../../src/models';

describe('Models - InstallationStep', () => {
    describe('数据验证', () => {
        it('应该验证有效的安装步骤', () => {
            const validStep: InstallationStep = {
                id: 'step_1',
                name: '网络检查',
                description: '检查网络连接状态',
                status: 'pending',
                order: 1,
                isRequired: true,
                estimatedDuration: 30000,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = validateInstallationStep(validStep);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('应该拒绝无效的步骤状态', () => {
            const invalidStep = {
                id: 'step_1',
                name: '测试步骤',
                status: 'invalid_status', // 无效状态
                order: 1
            } as InstallationStep;

            const result = validateInstallationStep(invalidStep);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('invalid_status');
        });

        it('应该要求必需的字段', () => {
            const incompleteStep = {
                name: '不完整步骤'
                // 缺少id和order
            } as InstallationStep;

            const result = validateInstallationStep(incompleteStep);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('missing_id');
            expect(result.errors).toContain('missing_order');
        });

        it('应该验证步骤顺序', () => {
            const invalidOrderStep = {
                id: 'step_1',
                name: '测试步骤',
                status: 'pending',
                order: -1 // 无效顺序
            } as InstallationStep;

            const result = validateInstallationStep(invalidOrderStep);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('invalid_order');
        });
    });

    describe('状态转换', () => {
        it('应该允许有效的状态转换', () => {
            const step: InstallationStep = {
                id: 'step_1',
                name: '测试步骤',
                description: '测试描述',
                status: 'pending',
                order: 1,
                isRequired: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // pending -> in_progress
            const updatedStep = { ...step, status: 'in_progress' as const };
            expect(validateInstallationStep(updatedStep).isValid).toBe(true);

            // in_progress -> completed
            const completedStep = { ...step, status: 'completed' as const };
            expect(validateInstallationStep(completedStep).isValid).toBe(true);

            // in_progress -> failed
            const failedStep = { ...step, status: 'failed' as const };
            expect(validateInstallationStep(failedStep).isValid).toBe(true);
        });
    });

    describe('时间戳处理', () => {
        it('应该验证时间戳', () => {
            const now = new Date();
            const step: InstallationStep = {
                id: 'step_1',
                name: '测试步骤',
                description: '测试描述',
                status: 'pending',
                order: 1,
                isRequired: true,
                createdAt: now,
                updatedAt: now
            };

            const result = validateInstallationStep(step);
            expect(result.isValid).toBe(true);
        });

        it('应该拒绝未来的创建时间', () => {
            const futureDate = new Date(Date.now() + 86400000); // 明天
            const step: InstallationStep = {
                id: 'step_1',
                name: '测试步骤',
                description: '测试描述',
                status: 'pending',
                order: 1,
                isRequired: true,
                createdAt: futureDate,
                updatedAt: new Date()
            };

            const result = validateInstallationStep(step);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('future_created_date');
        });
    });
});

describe('Models - DetectionResult', () => {
    describe('检测结果验证', () => {
        it('应该验证有效的检测结果', () => {
            const validResult: DetectionResult = {
                id: 'detection_1',
                type: 'nodejs',
                isDetected: true,
                version: 'v18.16.0',
                path: '/usr/local/bin/node',
                metadata: {
                    npmVersion: '9.6.0',
                    architecture: 'x64'
                },
                timestamp: new Date(),
                duration: 150
            };

            const result = validateDetectionResult(validResult);
            expect(result.isValid).toBe(true);
        });

        it('应该验证检测类型', () => {
            const validTypes = ['nodejs', 'npm', 'claude-cli', 'network', 'system'];

            validTypes.forEach(type => {
                const detection: DetectionResult = {
                    id: `detection_${type}`,
                    type: type as any,
                    isDetected: true,
                    timestamp: new Date(),
                    duration: 100
                };

                const result = validateDetectionResult(detection);
                expect(result.isValid).toBe(true);
            });
        });

        it('应该拒绝无效的检测类型', () => {
            const invalidDetection = {
                id: 'detection_1',
                type: 'invalid_type',
                isDetected: true,
                timestamp: new Date()
            } as DetectionResult;

            const result = validateDetectionResult(invalidDetection);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('invalid_detection_type');
        });
    });

    describe('元数据验证', () => {
        it('应该验证Node.js检测元数据', () => {
            const nodejsDetection: DetectionResult = {
                id: 'nodejs_detection',
                type: 'nodejs',
                isDetected: true,
                version: 'v18.16.0',
                path: '/usr/local/bin/node',
                metadata: {
                    npmVersion: '9.6.0',
                    architecture: 'x64',
                    platform: 'linux'
                },
                timestamp: new Date(),
                duration: 200
            };

            const result = validateDetectionResult(nodejsDetection);
            expect(result.isValid).toBe(true);
        });

        it('应该验证网络检测元数据', () => {
            const networkDetection: DetectionResult = {
                id: 'network_detection',
                type: 'network',
                isDetected: true,
                metadata: {
                    latency: 50,
                    downloadSpeed: 25.6,
                    uploadSpeed: 12.3,
                    provider: 'example-isp'
                },
                timestamp: new Date(),
                duration: 5000
            };

            const result = validateDetectionResult(networkDetection);
            expect(result.isValid).toBe(true);
        });
    });

    describe('错误信息处理', () => {
        it('应该包含检测失败的错误信息', () => {
            const failedDetection: DetectionResult = {
                id: 'failed_detection',
                type: 'claude-cli',
                isDetected: false,
                error: 'Command not found',
                errorCode: 'ENOENT',
                timestamp: new Date(),
                duration: 100
            };

            const result = validateDetectionResult(failedDetection);
            expect(result.isValid).toBe(true);
        });
    });
});

describe('Models - UserConfiguration', () => {
    describe('配置验证', () => {
        it('应该验证有效的用户配置', () => {
            const validConfig: UserConfiguration = {
                id: 'user_config_1',
                language: 'zh-CN',
                theme: 'dark',
                installationPath: '/usr/local/bin',
                preferences: {
                    autoUpdate: true,
                    sendTelemetry: false,
                    showAdvancedOptions: false
                },
                apiConfiguration: {
                    apiKeyEncrypted: 'encrypted_key_data',
                    baseUrl: 'https://api.anthropic.com',
                    timeout: 30000
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = validateUserConfiguration(validConfig);
            expect(result.isValid).toBe(true);
        });

        it('应该验证语言设置', () => {
            const supportedLanguages = ['zh-CN', 'en-US', 'ja-JP'];

            supportedLanguages.forEach(lang => {
                const config: UserConfiguration = {
                    id: 'config_test',
                    language: lang,
                    theme: 'light',
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const result = validateUserConfiguration(config);
                expect(result.isValid).toBe(true);
            });
        });

        it('应该拒绝不支持的语言', () => {
            const invalidConfig = {
                id: 'config_test',
                language: 'invalid-lang',
                theme: 'light',
                createdAt: new Date(),
                updatedAt: new Date()
            } as UserConfiguration;

            const result = validateUserConfiguration(invalidConfig);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('unsupported_language');
        });

        it('应该验证主题设置', () => {
            const themes = ['light', 'dark', 'auto'];

            themes.forEach(theme => {
                const config: UserConfiguration = {
                    id: 'config_test',
                    language: 'zh-CN',
                    theme: theme as any,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const result = validateUserConfiguration(config);
                expect(result.isValid).toBe(true);
            });
        });
    });

    describe('安装路径验证', () => {
        it('应该验证有效的安装路径', () => {
            const validPaths = [
                '/usr/local/bin',
                'C:\\Program Files\\Claude',
                '/home/user/claude',
                'C:\\Users\\User\\AppData\\Local\\Claude'
            ];

            validPaths.forEach(path => {
                const config: UserConfiguration = {
                    id: 'config_test',
                    language: 'zh-CN',
                    theme: 'light',
                    installationPath: path,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const result = validateUserConfiguration(config);
                expect(result.isValid).toBe(true);
            });
        });

        it('应该拒绝不安全的路径', () => {
            const unsafePaths = [
                '../../../etc/passwd',
                'C:\\Windows\\System32',
                '/tmp/../../../root'
            ];

            unsafePaths.forEach(path => {
                const config: UserConfiguration = {
                    id: 'config_test',
                    language: 'zh-CN',
                    theme: 'light',
                    installationPath: path,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const result = validateUserConfiguration(config);
                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('unsafe_installation_path');
            });
        });
    });

    describe('API配置验证', () => {
        it('应该验证API配置', () => {
            const config: UserConfiguration = {
                id: 'config_test',
                language: 'zh-CN',
                theme: 'light',
                apiConfiguration: {
                    apiKeyEncrypted: 'encrypted_key_data',
                    baseUrl: 'https://api.anthropic.com',
                    timeout: 30000,
                    retries: 3
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = validateUserConfiguration(config);
            expect(result.isValid).toBe(true);
        });

        it('应该拒绝不安全的API URL', () => {
            const config: UserConfiguration = {
                id: 'config_test',
                language: 'zh-CN',
                theme: 'light',
                apiConfiguration: {
                    apiKeyEncrypted: 'encrypted_key_data',
                    baseUrl: 'http://insecure-api.com', // HTTP 而非 HTTPS
                    timeout: 30000
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = validateUserConfiguration(config);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('insecure_api_url');
        });
    });
});

describe('Models - NavigationState', () => {
    describe('导航状态验证', () => {
        it('应该验证有效的导航状态', () => {
            const validState: NavigationState = {
                id: 'nav_state_1',
                currentStepId: 'step_2',
                currentStepIndex: 1,
                totalSteps: 6,
                canGoBack: true,
                canGoForward: true,
                completedSteps: ['step_1'],
                availableSteps: ['step_1', 'step_2', 'step_3'],
                navigationHistory: [
                    { stepId: 'step_1', timestamp: new Date(Date.now() - 60000) },
                    { stepId: 'step_2', timestamp: new Date() }
                ],
                timestamp: new Date()
            };

            const result = validateNavigationState(validState);
            expect(result.isValid).toBe(true);
        });

        it('应该验证步骤索引一致性', () => {
            const inconsistentState: NavigationState = {
                id: 'nav_state_1',
                currentStepId: 'step_2',
                currentStepIndex: 5, // 不一致：step_2应该是索引1
                totalSteps: 6,
                canGoBack: true,
                canGoForward: true,
                completedSteps: [],
                availableSteps: ['step_1', 'step_2'],
                navigationHistory: [],
                timestamp: new Date()
            };

            const result = validateNavigationState(inconsistentState);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('inconsistent_step_index');
        });

        it('应该验证导航权限逻辑', () => {
            // 在第一步时不能后退
            const firstStepState: NavigationState = {
                id: 'nav_state_1',
                currentStepId: 'step_1',
                currentStepIndex: 0,
                totalSteps: 6,
                canGoBack: true, // 这应该是false
                canGoForward: true,
                completedSteps: [],
                availableSteps: ['step_1'],
                navigationHistory: [],
                timestamp: new Date()
            };

            const result = validateNavigationState(firstStepState);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('invalid_back_permission');
        });
    });

    describe('导航历史验证', () => {
        it('应该验证导航历史的时间顺序', () => {
            const now = new Date();
            const invalidState: NavigationState = {
                id: 'nav_state_1',
                currentStepId: 'step_2',
                currentStepIndex: 1,
                totalSteps: 6,
                canGoBack: true,
                canGoForward: true,
                completedSteps: ['step_1'],
                availableSteps: ['step_1', 'step_2'],
                navigationHistory: [
                    { stepId: 'step_1', timestamp: now }, // 后面的时间
                    { stepId: 'step_2', timestamp: new Date(now.getTime() - 60000) } // 前面的时间
                ],
                timestamp: new Date()
            };

            const result = validateNavigationState(invalidState);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('invalid_history_order');
        });
    });
});

describe('Models - NetworkConfiguration', () => {
    describe('网络配置验证', () => {
        it('应该验证有效的网络配置', () => {
            const validConfig: NetworkConfiguration = {
                id: 'network_config_1',
                useProxy: false,
                proxySettings: undefined,
                dnsServers: ['8.8.8.8', '1.1.1.1'],
                timeout: 30000,
                retries: 3,
                mirrors: {
                    npm: 'https://registry.npmmirror.com/',
                    github: 'https://github.com',
                    anthropic: 'https://api.anthropic.com'
                },
                testUrls: [
                    'https://www.google.com',
                    'https://registry.npmjs.org',
                    'https://api.github.com'
                ],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = validateNetworkConfiguration(validConfig);
            expect(result.isValid).toBe(true);
        });

        it('应该验证代理配置', () => {
            const proxyConfig: NetworkConfiguration = {
                id: 'network_config_1',
                useProxy: true,
                proxySettings: {
                    host: 'proxy.example.com',
                    port: 8080,
                    protocol: 'http',
                    auth: {
                        username: 'user',
                        passwordEncrypted: 'encrypted_password'
                    }
                },
                dnsServers: ['8.8.8.8'],
                timeout: 30000,
                retries: 3,
                mirrors: {},
                testUrls: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = validateNetworkConfiguration(proxyConfig);
            expect(result.isValid).toBe(true);
        });

        it('应该验证DNS服务器格式', () => {
            const invalidDnsConfig: NetworkConfiguration = {
                id: 'network_config_1',
                useProxy: false,
                dnsServers: ['invalid-dns', '999.999.999.999'], // 无效的DNS
                timeout: 30000,
                retries: 3,
                mirrors: {},
                testUrls: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = validateNetworkConfiguration(invalidDnsConfig);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('invalid_dns_server');
        });

        it('应该验证镜像URL格式', () => {
            const invalidMirrorConfig: NetworkConfiguration = {
                id: 'network_config_1',
                useProxy: false,
                dnsServers: ['8.8.8.8'],
                timeout: 30000,
                retries: 3,
                mirrors: {
                    npm: 'invalid-url', // 无效URL
                    github: 'ftp://unsupported-protocol.com' // 不支持的协议
                },
                testUrls: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = validateNetworkConfiguration(invalidMirrorConfig);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('invalid_mirror_url');
        });
    });

    describe('代理设置验证', () => {
        it('应该要求代理设置当useProxy为true时', () => {
            const incompleteProxyConfig: NetworkConfiguration = {
                id: 'network_config_1',
                useProxy: true,
                proxySettings: undefined, // 缺少代理设置
                dnsServers: ['8.8.8.8'],
                timeout: 30000,
                retries: 3,
                mirrors: {},
                testUrls: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = validateNetworkConfiguration(incompleteProxyConfig);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('missing_proxy_settings');
        });

        it('应该验证代理端口范围', () => {
            const invalidPortConfig: NetworkConfiguration = {
                id: 'network_config_1',
                useProxy: true,
                proxySettings: {
                    host: 'proxy.example.com',
                    port: 99999, // 无效端口
                    protocol: 'http'
                },
                dnsServers: ['8.8.8.8'],
                timeout: 30000,
                retries: 3,
                mirrors: {},
                testUrls: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = validateNetworkConfiguration(invalidPortConfig);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('invalid_proxy_port');
        });
    });
});