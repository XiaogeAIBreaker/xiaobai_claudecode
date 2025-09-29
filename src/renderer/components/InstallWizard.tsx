/**
 * T031: 安装向导主组件
 * 管理整个安装流程的状态和导航
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Button,
  Alert,
  LinearProgress,
  Typography,
  Fade
} from '@mui/material';
import { InstallStep, InstallerStatus, StepStatus } from '../../shared/types/installer';
import { DetectionResult } from '../../shared/types/environment';
import { UserConfig } from '../../shared/types/config';
import { usePerformance } from '../hooks/usePerformance';

// 导入ActionBar组件
import { ConnectedActionBar } from './ActionBar/ActionBar';

// 导入导航控制器
import { useNavigationController } from './InstallationWizard/useNavigationController';

// 导入步骤组件
import NetworkCheckStep from './steps/NetworkCheckStep';
import NodeInstallStep from './steps/NodeInstallStep';
import GoogleSetupStep from './steps/GoogleSetupStep';
import ClaudeInstallStep from './steps/ClaudeInstallStep';
import ApiConfigStep from './steps/ApiConfigStep';
import TestingStep from './steps/TestingStep';
import CompletionStep from './steps/CompletionStep';

/**
 * 安装步骤定义
 */
const INSTALL_STEPS = [
  {
    key: InstallStep.NETWORK_CHECK,
    label: '网络检查',
    description: '检测网络连接和代理设置'
  },
  {
    key: InstallStep.NODEJS_INSTALL,
    label: 'Node.js安装',
    description: '下载并安装Node.js运行环境'
  },
  {
    key: InstallStep.GOOGLE_SETUP,
    label: 'Google设置',
    description: '配置Google服务访问方式'
  },
  {
    key: InstallStep.CLAUDE_CLI_SETUP,
    label: 'Claude CLI安装',
    description: '安装Claude命令行工具'
  },
  {
    key: InstallStep.API_CONFIGURATION,
    label: 'API配置',
    description: '配置Claude API密钥'
  },
  {
    key: InstallStep.TESTING,
    label: '测试验证',
    description: '验证安装和配置是否正确'
  },
  {
    key: InstallStep.COMPLETION,
    label: '完成',
    description: '安装完成，开始使用'
  }
];

/**
 * 向导状态接口
 */
interface WizardState {
  currentStep: InstallStep;
  status: InstallerStatus;
  progress: number;
  canGoBack: boolean;
  canGoForward: boolean;
  errors: string[];
  warnings: string[];
  config: UserConfig | null;
  detectionResults: Record<string, DetectionResult>;
}

/**
 * 安装向导组件属性
 */
interface InstallWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

/**
 * 安装向导主组件
 */
const InstallWizard: React.FC<InstallWizardProps> = ({
  onComplete,
  onCancel
}) => {
  // 性能监控
  const { measureInteraction } = usePerformance({
    componentName: 'InstallWizard',
    trackRender: true,
    trackInteraction: true,
    threshold: 1000
  });

  // T026: 使用新的导航控制器替代原有状态管理
  const navigationController = useNavigationController({
    onStepChange: (step) => {
      measureInteraction(`step-navigation-${step}`);
    },
    onComplete,
    onCancel
  });

  // 向后兼容的状态映射
  const wizardState: WizardState = useMemo(() => ({
    currentStep: navigationController.currentStep,
    status: navigationController.getCurrentStepStatus() === StepStatus.RUNNING
      ? InstallerStatus.INSTALLING
      : InstallerStatus.INITIALIZING,
    progress: navigationController.uiState.stepStates[navigationController.currentStep]?.progress || 0,
    canGoBack: navigationController.canGoBack,
    canGoForward: navigationController.canGoForward,
    errors: [],
    warnings: [],
    config: null,
    detectionResults: {}
  }), [navigationController]);

  const [loading, setLoading] = useState(false);

  /**
   * 获取当前步骤索引
   */
  const getCurrentStepIndex = useCallback(() => {
    return navigationController.currentStepIndex;
  }, [navigationController.currentStepIndex]);

  /**
   * T026: 使用导航控制器的导航方法
   */
  const goToNextStep = useCallback(async () => {
    await navigationController.goToNextStep();
  }, [navigationController]);

  // 导航方法现在由ActionBar组件通过导航控制器直接处理

  /**
   * T026: 使用导航控制器的步骤处理方法
   */
  const handleStepComplete = useCallback(async (stepData?: any) => {
    const currentStep = navigationController.currentStep;
    await navigationController.completeStep(currentStep, stepData);

    // 如果是最后一步，调用完成回调
    if (navigationController.isLastStep && onComplete) {
      onComplete();
    }
  }, [navigationController, onComplete]);

  const handleStepError = useCallback(async (error: string) => {
    const currentStep = navigationController.currentStep;
    await navigationController.failStep(currentStep, error);
  }, [navigationController]);

  const clearErrors = useCallback(() => {
    // 错误清除逻辑现在由导航控制器处理
    console.log('清除错误');
  }, []);

  const retryCurrentStep = useCallback(async () => {
    const currentStep = navigationController.currentStep;
    await navigationController.startStep(currentStep);
  }, [navigationController]);

  /**
   * 渲染当前步骤组件
   */
  const renderCurrentStep = () => {
    const stepProps = {
      onComplete: handleStepComplete,
      onError: handleStepError,
      config: wizardState.config,
      detectionResults: wizardState.detectionResults,
      canGoNext: wizardState.canGoForward,
      onNext: goToNextStep
    };

    switch (wizardState.currentStep) {
      case InstallStep.NETWORK_CHECK:
        return <NetworkCheckStep {...stepProps} />;
      case InstallStep.NODEJS_INSTALL:
        return <NodeInstallStep {...stepProps} />;
      case InstallStep.GOOGLE_SETUP:
        return <GoogleSetupStep {...stepProps} />;
      case InstallStep.CLAUDE_CLI_SETUP:
        return <ClaudeInstallStep {...stepProps} />;
      case InstallStep.API_CONFIGURATION:
        return <ApiConfigStep {...stepProps} />;
      case InstallStep.TESTING:
        return <TestingStep {...stepProps} />;
      case InstallStep.COMPLETION:
        return <CompletionStep {...stepProps} />;
      default:
        return null;
    }
  };

  /**
   * 加载配置
   */
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        await window.electronAPI.config.load();
        // 配置加载成功，现在由导航控制器管理状态
      } catch (error) {
        console.error('加载配置失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  /**
   * 监听菜单事件
   */
  useEffect(() => {
    const handleMenuEvent = (event: string) => {
      switch (event) {
        case 'menu:start-installation':
          if (wizardState.currentStep === InstallStep.NETWORK_CHECK) {
            navigationController.startStep(InstallStep.NETWORK_CHECK);
          }
          break;
        case 'menu:restart-installation':
          navigationController.resetToStep(InstallStep.NETWORK_CHECK);
          break;
        case 'menu:stop-installation':
          onCancel?.();
          break;
      }
    };

    window.electronAPI.on.menuEvent(handleMenuEvent);

    return () => {
      window.electronAPI.off.menuEvent();
    };
  }, [wizardState.currentStep, navigationController, onCancel]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <LinearProgress sx={{ width: '300px' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 进度条 */}
      <LinearProgress
        variant="determinate"
        value={wizardState.progress}
        sx={{ height: 4 }}
      />

      {/* 步骤指示器 */}
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Stepper activeStep={getCurrentStepIndex()} alternativeLabel>
          {INSTALL_STEPS.map((step) => (
            <Step key={step.key}>
              <StepLabel>
                <Typography variant="caption" display="block">
                  {step.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {step.description}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* 错误显示 */}
      {wizardState.errors.length > 0 && (
        <Box sx={{ p: 2 }}>
          {wizardState.errors.map((error, index) => (
            <Alert
              key={index}
              severity="error"
              onClose={clearErrors}
              action={
                <Button color="inherit" size="small" onClick={retryCurrentStep}>
                  重试
                </Button>
              }
              sx={{ mb: 1 }}
            >
              {error}
            </Alert>
          ))}
        </Box>
      )}

      {/* 警告显示 */}
      {wizardState.warnings.length > 0 && (
        <Box sx={{ p: 2 }}>
          {wizardState.warnings.map((warning, index) => (
            <Alert key={index} severity="warning" sx={{ mb: 1 }}>
              {warning}
            </Alert>
          ))}
        </Box>
      )}

      {/* 主要内容区域 */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Fade in={true} timeout={300}>
          <Card sx={{ m: 3, height: 'calc(100% - 48px)' }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {renderCurrentStep()}
            </CardContent>
          </Card>
        </Fade>
      </Box>

      {/* 新的ActionBar组件 - 整合所有导航逻辑 */}
      <ConnectedActionBar />
    </Box>
  );
};

export default InstallWizard;