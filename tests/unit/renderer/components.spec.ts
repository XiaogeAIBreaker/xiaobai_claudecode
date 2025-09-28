/**
 * 渲染进程组件单元测试
 * 测试导航、网络检查、安装步骤等UI组件
 */

import { NavigationComponent } from '../../../src/renderer/components/navigation';
import { NetworkCheckComponent } from '../../../src/renderer/components/network-check';
import { NodejsInstallComponent } from '../../../src/renderer/components/nodejs-install';
import { ProgressComponent } from '../../../src/renderer/components/progress';
import { ErrorHandlerComponent } from '../../../src/renderer/components/error-handler';

// Mock IPC API
const mockIpcApi = {
    navigation: {
        getCurrentStep: jest.fn(),
        goToStep: jest.fn(),
        goToPreviousStep: jest.fn(),
        goToNextStep: jest.fn(),
        onNavigationUpdate: jest.fn()
    },
    network: {
        checkConnectivity: jest.fn(),
        testDownloadSpeed: jest.fn(),
        onNetworkStatusUpdate: jest.fn()
    },
    nodejs: {
        detect: jest.fn(),
        install: jest.fn(),
        configure: jest.fn(),
        onInstallProgress: jest.fn()
    },
    progress: {
        getCurrentProgress: jest.fn(),
        onProgressUpdate: jest.fn()
    }
};

// 模拟window.claudeApi
Object.defineProperty(window, 'claudeApi', {
    value: mockIpcApi,
    writable: true
});

describe('Renderer Components - NavigationComponent', () => {
    let component: NavigationComponent;
    let mockContainer: HTMLElement;

    beforeEach(() => {
        mockContainer = document.createElement('div');
        document.body.appendChild(mockContainer);

        component = new NavigationComponent(mockContainer);

        // 重置模拟函数
        jest.clearAllMocks();
    });

    afterEach(() => {
        component.destroy();
        document.body.removeChild(mockContainer);
    });

    describe('组件初始化', () => {
        it('应该正确初始化', () => {
            expect(component).toBeDefined();
            expect(mockContainer.children.length).toBeGreaterThan(0);
        });

        it('应该设置正确的DOM结构', () => {
            const navigationElement = mockContainer.querySelector('.navigation');
            expect(navigationElement).toBeTruthy();

            const stepIndicator = mockContainer.querySelector('.step-indicator');
            expect(stepIndicator).toBeTruthy();

            const navigationButtons = mockContainer.querySelector('.navigation-buttons');
            expect(navigationButtons).toBeTruthy();
        });
    });

    describe('步骤导航', () => {
        it('应该显示当前步骤', async () => {
            mockIpcApi.navigation.getCurrentStep.mockResolvedValue({
                currentStep: 2,
                totalSteps: 6,
                stepName: 'network-check'
            });

            await component.updateCurrentStep();

            const stepInfo = mockContainer.querySelector('.current-step');
            expect(stepInfo?.textContent).toContain('2');
            expect(stepInfo?.textContent).toContain('6');
        });

        it('应该正确处理步骤切换', async () => {
            mockIpcApi.navigation.goToStep.mockResolvedValue({ success: true });

            await component.goToStep(3);

            expect(mockIpcApi.navigation.goToStep).toHaveBeenCalledWith(3);
        });

        it('应该在第一步禁用后退按钮', async () => {
            mockIpcApi.navigation.getCurrentStep.mockResolvedValue({
                currentStep: 1,
                totalSteps: 6,
                stepName: 'welcome'
            });

            await component.updateCurrentStep();

            const prevButton = mockContainer.querySelector('.btn-previous') as HTMLButtonElement;
            expect(prevButton?.disabled).toBe(true);
        });

        it('应该在最后一步禁用前进按钮', async () => {
            mockIpcApi.navigation.getCurrentStep.mockResolvedValue({
                currentStep: 6,
                totalSteps: 6,
                stepName: 'complete'
            });

            await component.updateCurrentStep();

            const nextButton = mockContainer.querySelector('.btn-next') as HTMLButtonElement;
            expect(nextButton?.disabled).toBe(true);
        });
    });

    describe('用户交互', () => {
        it('应该响应前进按钮点击', async () => {
            mockIpcApi.navigation.goToNextStep.mockResolvedValue({ success: true });

            const nextButton = mockContainer.querySelector('.btn-next') as HTMLButtonElement;
            nextButton.click();

            await new Promise(resolve => setTimeout(resolve, 0));
            expect(mockIpcApi.navigation.goToNextStep).toHaveBeenCalled();
        });

        it('应该响应后退按钮点击', async () => {
            mockIpcApi.navigation.goToPreviousStep.mockResolvedValue({ success: true });

            const prevButton = mockContainer.querySelector('.btn-previous') as HTMLButtonElement;
            prevButton.click();

            await new Promise(resolve => setTimeout(resolve, 0));
            expect(mockIpcApi.navigation.goToPreviousStep).toHaveBeenCalled();
        });
    });

    describe('错误处理', () => {
        it('应该处理导航失败', async () => {
            mockIpcApi.navigation.goToStep.mockRejectedValue(new Error('Navigation failed'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await component.goToStep(999);

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});

describe('Renderer Components - NetworkCheckComponent', () => {
    let component: NetworkCheckComponent;
    let mockContainer: HTMLElement;

    beforeEach(() => {
        mockContainer = document.createElement('div');
        document.body.appendChild(mockContainer);

        component = new NetworkCheckComponent(mockContainer);
        jest.clearAllMocks();
    });

    afterEach(() => {
        component.destroy();
        document.body.removeChild(mockContainer);
    });

    describe('网络检测', () => {
        it('应该执行网络连接检查', async () => {
            const mockResult = {
                success: true,
                details: {
                    internetAccess: true,
                    npmRegistry: true,
                    githubAccess: true,
                    anthropicApi: true
                },
                latency: 50,
                downloadSpeed: 10.5
            };

            mockIpcApi.network.checkConnectivity.mockResolvedValue(mockResult);

            await component.runNetworkCheck();

            expect(mockIpcApi.network.checkConnectivity).toHaveBeenCalled();

            const statusElement = mockContainer.querySelector('.network-status');
            expect(statusElement?.classList.contains('success')).toBe(true);
        });

        it('应该处理网络检查失败', async () => {
            const mockResult = {
                success: false,
                details: {
                    internetAccess: false,
                    npmRegistry: false,
                    githubAccess: false,
                    anthropicApi: false
                },
                error: 'No internet connection'
            };

            mockIpcApi.network.checkConnectivity.mockResolvedValue(mockResult);

            await component.runNetworkCheck();

            const statusElement = mockContainer.querySelector('.network-status');
            expect(statusElement?.classList.contains('error')).toBe(true);
        });

        it('应该显示检查进度', async () => {
            // 模拟检查过程
            let progressCallback: (progress: any) => void;
            mockIpcApi.network.onNetworkStatusUpdate.mockImplementation((callback) => {
                progressCallback = callback;
            });

            component.startNetworkCheck();

            // 模拟进度更新
            progressCallback!({
                stage: 'checking_internet',
                progress: 25,
                message: '检查互联网连接...'
            });

            const progressElement = mockContainer.querySelector('.check-progress');
            expect(progressElement?.textContent).toContain('25%');
        });
    });

    describe('下载速度测试', () => {
        it('应该测试下载速度', async () => {
            mockIpcApi.network.testDownloadSpeed.mockResolvedValue({
                success: true,
                speedMbps: 25.6,
                latency: 30
            });

            await component.testDownloadSpeed();

            expect(mockIpcApi.network.testDownloadSpeed).toHaveBeenCalled();

            const speedElement = mockContainer.querySelector('.download-speed');
            expect(speedElement?.textContent).toContain('25.6');
        });
    });
});

describe('Renderer Components - NodejsInstallComponent', () => {
    let component: NodejsInstallComponent;
    let mockContainer: HTMLElement;

    beforeEach(() => {
        mockContainer = document.createElement('div');
        document.body.appendChild(mockContainer);

        component = new NodejsInstallComponent(mockContainer);
        jest.clearAllMocks();
    });

    afterEach(() => {
        component.destroy();
        document.body.removeChild(mockContainer);
    });

    describe('Node.js 检测', () => {
        it('应该检测已安装的 Node.js', async () => {
            mockIpcApi.nodejs.detect.mockResolvedValue({
                isInstalled: true,
                version: 'v18.16.0',
                path: '/usr/local/bin/node',
                npmVersion: '9.6.0'
            });

            await component.detectNodejs();

            expect(mockIpcApi.nodejs.detect).toHaveBeenCalled();

            const statusElement = mockContainer.querySelector('.nodejs-status');
            expect(statusElement?.textContent).toContain('v18.16.0');
        });

        it('应该处理未安装的情况', async () => {
            mockIpcApi.nodejs.detect.mockResolvedValue({
                isInstalled: false,
                error: 'Node.js not found'
            });

            await component.detectNodejs();

            const installButton = mockContainer.querySelector('.btn-install');
            expect(installButton).toBeTruthy();
            expect(installButton?.hasAttribute('disabled')).toBe(false);
        });
    });

    describe('Node.js 安装', () => {
        it('应该执行安装过程', async () => {
            mockIpcApi.nodejs.install.mockResolvedValue({
                success: true,
                version: 'v18.16.0',
                installPath: '/usr/local/bin/node'
            });

            await component.installNodejs();

            expect(mockIpcApi.nodejs.install).toHaveBeenCalled();

            const statusElement = mockContainer.querySelector('.install-status');
            expect(statusElement?.classList.contains('success')).toBe(true);
        });

        it('应该显示安装进度', async () => {
            let progressCallback: (progress: any) => void;
            mockIpcApi.nodejs.onInstallProgress.mockImplementation((callback) => {
                progressCallback = callback;
            });

            component.installNodejs();

            // 模拟安装进度
            progressCallback!({
                stage: 'downloading',
                progress: 50,
                message: '下载 Node.js...'
            });

            const progressBar = mockContainer.querySelector('.progress-bar');
            expect(progressBar?.getAttribute('style')).toContain('50%');
        });

        it('应该处理安装错误', async () => {
            mockIpcApi.nodejs.install.mockRejectedValue(new Error('Installation failed'));

            await component.installNodejs();

            const statusElement = mockContainer.querySelector('.install-status');
            expect(statusElement?.classList.contains('error')).toBe(true);
        });
    });
});

describe('Renderer Components - ProgressComponent', () => {
    let component: ProgressComponent;
    let mockContainer: HTMLElement;

    beforeEach(() => {
        mockContainer = document.createElement('div');
        document.body.appendChild(mockContainer);

        component = new ProgressComponent(mockContainer);
        jest.clearAllMocks();
    });

    afterEach(() => {
        component.destroy();
        document.body.removeChild(mockContainer);
    });

    describe('进度显示', () => {
        it('应该更新进度值', () => {
            component.updateProgress(65, '安装中...');

            const progressBar = mockContainer.querySelector('.progress-bar') as HTMLElement;
            const progressText = mockContainer.querySelector('.progress-text');

            expect(progressBar.style.width).toBe('65%');
            expect(progressText?.textContent).toContain('65%');
            expect(progressText?.textContent).toContain('安装中...');
        });

        it('应该处理完成状态', () => {
            component.updateProgress(100, '安装完成');

            const progressContainer = mockContainer.querySelector('.progress-container');
            expect(progressContainer?.classList.contains('completed')).toBe(true);
        });

        it('应该处理错误状态', () => {
            component.showError('安装失败：网络错误');

            const progressContainer = mockContainer.querySelector('.progress-container');
            expect(progressContainer?.classList.contains('error')).toBe(true);

            const errorMessage = mockContainer.querySelector('.error-message');
            expect(errorMessage?.textContent).toContain('网络错误');
        });
    });

    describe('步骤进度', () => {
        it('应该显示多步骤进度', () => {
            const steps = [
                { name: '检查环境', completed: true },
                { name: '下载文件', completed: false, current: true },
                { name: '安装程序', completed: false }
            ];

            component.updateSteps(steps);

            const stepElements = mockContainer.querySelectorAll('.step-item');
            expect(stepElements).toHaveLength(3);

            expect(stepElements[0].classList.contains('completed')).toBe(true);
            expect(stepElements[1].classList.contains('current')).toBe(true);
            expect(stepElements[2].classList.contains('pending')).toBe(true);
        });
    });
});

describe('Renderer Components - ErrorHandlerComponent', () => {
    let component: ErrorHandlerComponent;
    let mockContainer: HTMLElement;

    beforeEach(() => {
        mockContainer = document.createElement('div');
        document.body.appendChild(mockContainer);

        component = new ErrorHandlerComponent(mockContainer);
        jest.clearAllMocks();
    });

    afterEach(() => {
        component.destroy();
        document.body.removeChild(mockContainer);
    });

    describe('错误显示', () => {
        it('应该显示错误消息', () => {
            const error = new Error('测试错误');
            component.showError(error);

            const errorElement = mockContainer.querySelector('.error-message');
            expect(errorElement?.textContent).toContain('测试错误');

            const errorContainer = mockContainer.querySelector('.error-container');
            expect(errorContainer?.classList.contains('visible')).toBe(true);
        });

        it('应该显示不同类型的错误', () => {
            component.showError('网络连接失败', 'network');

            const errorContainer = mockContainer.querySelector('.error-container');
            expect(errorContainer?.classList.contains('error-network')).toBe(true);
        });

        it('应该提供重试按钮', () => {
            const retryCallback = jest.fn();
            component.showError('操作失败', 'general', retryCallback);

            const retryButton = mockContainer.querySelector('.btn-retry') as HTMLButtonElement;
            expect(retryButton).toBeTruthy();

            retryButton.click();
            expect(retryCallback).toHaveBeenCalled();
        });
    });

    describe('错误恢复', () => {
        it('应该清除错误状态', () => {
            component.showError('测试错误');
            component.clearError();

            const errorContainer = mockContainer.querySelector('.error-container');
            expect(errorContainer?.classList.contains('visible')).toBe(false);
        });

        it('应该支持自动隐藏', () => {
            jest.useFakeTimers();

            component.showError('临时错误', 'general', null, 3000);

            expect(mockContainer.querySelector('.error-container')?.classList.contains('visible')).toBe(true);

            jest.advanceTimersByTime(3000);

            expect(mockContainer.querySelector('.error-container')?.classList.contains('visible')).toBe(false);

            jest.useRealTimers();
        });
    });

    describe('用户反馈', () => {
        it('应该收集错误反馈', () => {
            component.showError('安装失败');

            const feedbackButton = mockContainer.querySelector('.btn-feedback') as HTMLButtonElement;
            expect(feedbackButton).toBeTruthy();

            // 模拟点击反馈按钮
            feedbackButton.click();

            const feedbackForm = mockContainer.querySelector('.feedback-form');
            expect(feedbackForm?.classList.contains('visible')).toBe(true);
        });

        it('应该提交反馈信息', () => {
            component.showError('测试错误');

            const feedbackButton = mockContainer.querySelector('.btn-feedback') as HTMLButtonElement;
            feedbackButton.click();

            const feedbackTextarea = mockContainer.querySelector('.feedback-textarea') as HTMLTextAreaElement;
            const submitButton = mockContainer.querySelector('.btn-submit-feedback') as HTMLButtonElement;

            feedbackTextarea.value = '这是一个测试反馈';
            submitButton.click();

            // 验证反馈已被处理
            expect(feedbackTextarea.value).toBe('');
        });
    });
});