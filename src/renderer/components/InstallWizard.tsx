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
import { InstallStep, InstallerStatus } from '../../shared/types/installer';
import { WorkflowDefinition, WorkflowId } from '../../shared/types/workflows';
import useSharedConfig from '../hooks/useSharedConfig';
import { DetectionResult } from '../../shared/types/environment';
import { UserConfig } from '../../shared/types/config';
import { usePerformance } from '../hooks/usePerformance';

// 导入步骤组件
import NetworkCheckStep from './steps/NetworkCheckStep';
import NodeInstallStep from './steps/NodeInstallStep';
import GoogleSetupStep from './steps/GoogleSetupStep';
import ClaudeInstallStep from './steps/ClaudeInstallStep';
import ApiConfigStep from './steps/ApiConfigStep';
import TestingStep from './steps/TestingStep';
import CompletionStep from './steps/CompletionStep';

type StepDefinition = {
  key: InstallStep;
  label: string;
  description: string;
  flowId: WorkflowId;
};

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

  const {
    value: supportedFlows,
    loading: flowsLoading,
    error: flowsError,
  } = useSharedConfig<WorkflowId[]>('installer.workflow.supportedFlows');

  const [workflowDefinitions, setWorkflowDefinitions] = useState<Record<WorkflowId, WorkflowDefinition>>(
    () => ({}) as Record<WorkflowId, WorkflowDefinition>
  );
  const [workflowLoading, setWorkflowLoading] = useState<boolean>(false);
  const [workflowError, setWorkflowError] = useState<Error | null>(null);

  // 状态管理
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: InstallStep.NETWORK_CHECK,
    status: InstallerStatus.INITIALIZING,
    progress: 0,
    canGoBack: false,
    canGoForward: false,
    errors: [],
    warnings: [],
    config: null,
    detectionResults: {}
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supportedFlows || supportedFlows.length === 0) {
      return;
    }

    let cancelled = false;
    setWorkflowLoading(true);

    Promise.all(
      supportedFlows.map(async (flowId) => {
        const response = await window.electronAPI.workflowMap.sync(flowId as WorkflowId);
        return { flowId: flowId as WorkflowId, workflow: response.workflow };
      })
    )
      .then((results) => {
        if (cancelled) {
          return;
        }

        const nextDefinitions: Record<WorkflowId, WorkflowDefinition> = { ...workflowDefinitions };
        results.forEach(({ flowId, workflow }) => {
          if (workflow) {
            nextDefinitions[flowId] = workflow;
          }
        });
        setWorkflowDefinitions(nextDefinitions);
        setWorkflowError(null);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        const normalized = err instanceof Error ? err : new Error(String(err));
        setWorkflowError(normalized);
      })
      .finally(() => {
        if (!cancelled) {
          setWorkflowLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [supportedFlows]);

  const stepDefinitions = useMemo<StepDefinition[]>(() => {
    if (!supportedFlows || supportedFlows.length === 0) {
      return [];
    }

    const definitions: StepDefinition[] = [];

    supportedFlows.forEach((flowId) => {
      const typedFlowId = flowId as WorkflowId;
      const workflow = workflowDefinitions[typedFlowId];

      if (!workflow) {
        return;
      }

      workflow.steps.forEach((step) => {
        definitions.push({
          key: step.stepId as InstallStep,
          label: step.title,
          description: step.description,
          flowId: typedFlowId,
        });
      });
    });

    return definitions;
  }, [supportedFlows, workflowDefinitions]);

  /**
   * 更新向导状态
   */
  const updateWizardState = useCallback((updates: Partial<WizardState>) => {
    setWizardState(prev => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    if (stepDefinitions.length === 0) {
      return;
    }

    const currentIndex = stepDefinitions.findIndex(step => step.key === wizardState.currentStep);

    if (currentIndex === -1) {
      const firstStep = stepDefinitions[0];
      if (wizardState.currentStep !== firstStep.key) {
        updateWizardState({
          currentStep: firstStep.key,
          canGoBack: false,
          canGoForward: stepDefinitions.length > 1,
          progress: 0,
        });
      }
      return;
    }

    const nextCanGoBack = currentIndex > 0;
    const nextCanGoForward = currentIndex < stepDefinitions.length - 1;

    if (wizardState.canGoBack !== nextCanGoBack || wizardState.canGoForward !== nextCanGoForward) {
      updateWizardState({
        canGoBack: nextCanGoBack,
        canGoForward: nextCanGoForward,
      });
    }
  }, [stepDefinitions, updateWizardState, wizardState.canGoBack, wizardState.canGoForward, wizardState.currentStep]);

  /**
   * 获取当前步骤索引
   */
  const getCurrentStepIndex = useCallback(() => {
    return stepDefinitions.findIndex(step => step.key === wizardState.currentStep);
  }, [stepDefinitions, wizardState.currentStep]);

  /**
   * 前往下一步
   */
  const goToNextStep = useCallback(() => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex === -1) {
      return;
    }
    if (currentIndex < stepDefinitions.length - 1) {
      const nextStep = stepDefinitions[currentIndex + 1];
      updateWizardState({
        currentStep: nextStep.key,
        canGoBack: true,
        canGoForward: false
      });
    }
  }, [getCurrentStepIndex, stepDefinitions, updateWizardState]);

  /**
   * 返回上一步
   */
  const goToPreviousStep = useCallback(() => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      const previousStep = stepDefinitions[currentIndex - 1];
      updateWizardState({
        currentStep: previousStep.key,
        canGoBack: currentIndex > 1,
        canGoForward: true
      });
    }
  }, [getCurrentStepIndex, stepDefinitions, updateWizardState]);

  /**
   * 跳转到指定步骤
   */
  const goToStep = useCallback((step: InstallStep) => {
    const stepIndex = stepDefinitions.findIndex(s => s.key === step);
    if (stepIndex !== -1) {
      updateWizardState({
        currentStep: step,
        canGoBack: stepIndex > 0,
        canGoForward: false
      });
    }
  }, [stepDefinitions, updateWizardState]);

  /**
   * 步骤完成处理
   */
  const handleStepComplete = useCallback((stepData?: any) => {
    const currentIndex = getCurrentStepIndex();

    if (stepDefinitions.length === 0 || currentIndex === -1) {
      return;
    }

    // 更新进度
    const newProgress = ((currentIndex + 1) / stepDefinitions.length) * 100;
    updateWizardState({
      progress: newProgress,
      canGoForward: currentIndex < stepDefinitions.length - 1
    });

    // 如果是最后一步，调用完成回调
    if (currentIndex === stepDefinitions.length - 1) {
      updateWizardState({ status: InstallerStatus.COMPLETED });
      onComplete?.();
    }
  }, [getCurrentStepIndex, onComplete, stepDefinitions, updateWizardState]);

  /**
   * 步骤错误处理
   */
  const handleStepError = useCallback((error: string) => {
    updateWizardState({
      errors: [...wizardState.errors, error],
      status: InstallerStatus.FAILED
    });
  }, [wizardState.errors, updateWizardState]);

  /**
   * 清除错误
   */
  const clearErrors = useCallback(() => {
    updateWizardState({ errors: [] });
  }, [updateWizardState]);

  /**
   * 重试当前步骤
   */
  const retryCurrentStep = useCallback(() => {
    updateWizardState({
      errors: [],
      status: InstallerStatus.INSTALLING
    });
  }, [updateWizardState]);

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
        const config = await window.electronAPI.config.load();
        updateWizardState({ config });
      } catch (error) {
        console.error('加载配置失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [updateWizardState]);

  /**
   * 监听菜单事件
   */
  useEffect(() => {
    const handleMenuEvent = (event: string) => {
      switch (event) {
        case 'menu:start-installation':
          if (wizardState.currentStep === InstallStep.NETWORK_CHECK) {
            updateWizardState({ status: InstallerStatus.INSTALLING });
          }
          break;
        case 'menu:restart-installation':
          updateWizardState({
            currentStep: InstallStep.NETWORK_CHECK,
            status: InstallerStatus.INITIALIZING,
            progress: 0,
            errors: [],
            warnings: []
          });
          break;
        case 'menu:stop-installation':
          updateWizardState({ status: InstallerStatus.CANCELLED });
          onCancel?.();
          break;
      }
    };

    window.electronAPI.on.menuEvent(handleMenuEvent);

    return () => {
      window.electronAPI.off.menuEvent();
    };
  }, [wizardState.currentStep, updateWizardState, onCancel]);

  const currentStepIndex = getCurrentStepIndex();
  const isLastStep = stepDefinitions.length > 0 && currentStepIndex === stepDefinitions.length - 1;
  const isBootstrapping = loading || flowsLoading || workflowLoading || stepDefinitions.length === 0;

  if (isBootstrapping) {
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
        <Stepper activeStep={Math.max(currentStepIndex, 0)} alternativeLabel>
          {stepDefinitions.map((step) => (
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

      {(flowsError || workflowError) && (
        <Box sx={{ p: 2 }}>
          <Alert severity="error">
            {flowsError?.message || workflowError?.message || '无法加载安装流程配置，请稍后重试。'}
          </Alert>
        </Box>
      )}

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

      {/* 导航按钮 */}
      <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
        <Button
          onClick={goToPreviousStep}
          disabled={!wizardState.canGoBack || wizardState.status === InstallerStatus.INSTALLING}
          variant="outlined"
        >
          上一步
        </Button>

        <Button
          onClick={goToNextStep}
          disabled={!wizardState.canGoForward || wizardState.status === InstallerStatus.INSTALLING}
          variant="contained"
        >
          {isLastStep ? '完成' : '下一步'}
        </Button>
      </Box>
    </Box>
  );
};

export default InstallWizard;
