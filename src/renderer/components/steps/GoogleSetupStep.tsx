/**
 * T034: Google账号设置步骤组件
 * 引导用户登录或注册Google账号
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Divider
} from '@mui/material';
import { CheckCircle, Email, AccountCircle } from '@mui/icons-material';

interface GoogleSetupStepProps {
  onComplete: (data?: any) => void;
  onError: (error: string) => void;
  onNext: () => void;
  canGoNext: boolean;
}

/**
 * 组件状态枚举
 */
enum SetupState {
  CHOOSING = 'choosing',           // 选择是否有账号
  HAS_ACCOUNT = 'has_account',     // 已有账号
  REGISTERING = 'registering',     // 注册流程
  COMPLETED = 'completed'          // 完成
}

/**
 * 注册步骤枚举
 */
enum RegistrationStep {
  BASIC_INFO = 0,      // 基本信息
  PASSWORD = 1,        // 设置密码
  PHONE_VERIFY = 2,    // 手机验证
  COMPLETE = 3         // 完成注册
}

const GoogleSetupStep: React.FC<GoogleSetupStepProps> = ({
  onComplete,
  onError,
  onNext,
  canGoNext
}) => {
  const [state, setState] = useState<SetupState>(SetupState.CHOOSING);
  const [registrationStep, setRegistrationStep] = useState<RegistrationStep>(RegistrationStep.BASIC_INFO);
  const [browserViewOpen, setBrowserViewOpen] = useState(false);

  /**
   * 处理"已有账号"选择
   */
  const handleHasAccount = () => {
    setState(SetupState.HAS_ACCOUNT);
    setState(SetupState.COMPLETED);
    onComplete({ hasGoogleAccount: true });
  };

  /**
   * 处理"没有账号"选择
   */
  const handleNoAccount = async () => {
    setState(SetupState.REGISTERING);
    try {
      // 检查 API 是否存在
      if (!window.electronAPI || !window.electronAPI.google) {
        throw new Error('Google API 未初始化');
      }

      // 打开内嵌浏览器
      const result = await window.electronAPI.google.openRegistrationBrowser();

      // 检查返回结果
      if (result && !result.success) {
        throw new Error(result.error || '打开注册窗口失败');
      }

      setBrowserViewOpen(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('打开注册页面失败:', errorMessage, error);
      onError(`打开注册页面失败: ${errorMessage}`);
      // 失败后返回选择界面
      setState(SetupState.CHOOSING);
    }
  };

  /**
   * 关闭浏览器
   */
  const handleCloseBrowser = async () => {
    try {
      await window.electronAPI.google?.closeRegistrationBrowser();
      setBrowserViewOpen(false);
      setState(SetupState.CHOOSING);
    } catch (error) {
      console.error('关闭浏览器失败:', error);
    }
  };

  /**
   * 注册完成
   */
  const handleRegistrationComplete = () => {
    setState(SetupState.COMPLETED);
    setBrowserViewOpen(false);
    onComplete({ hasGoogleAccount: true, justRegistered: true });
  };

  /**
   * 监听注册进度变化
   */
  useEffect(() => {
    if (!window.electronAPI.google?.onRegistrationProgress) return;

    const handleProgress = (step: number) => {
      setRegistrationStep(step as RegistrationStep);
      if (step === RegistrationStep.COMPLETE) {
        handleRegistrationComplete();
      }
    };

    window.electronAPI.google.onRegistrationProgress(handleProgress);

    return () => {
      // 清理监听器
      if (window.electronAPI.google?.offRegistrationProgress) {
        window.electronAPI.google.offRegistrationProgress();
      }
    };
  }, []);

  /**
   * 渲染选择界面
   */
  const renderChoosing = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Email sx={{ fontSize: 80, color: 'primary.main', mb: 3 }} />

      <Typography variant="h5" gutterBottom align="center">
        Google 账号确认
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph align="center" sx={{ maxWidth: 500 }}>
        Claude CLI 需要使用 Google 邮箱进行登录。
      </Typography>

      <Card sx={{ mt: 4, width: '100%', maxWidth: 600 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            您是否已有 Google 邮箱账号？
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<CheckCircle />}
              onClick={handleHasAccount}
              sx={{ py: 2 }}
            >
              我已有 Google 账号
            </Button>

            <Button
              variant="outlined"
              size="large"
              fullWidth
              startIcon={<AccountCircle />}
              onClick={handleNoAccount}
              sx={{ py: 2 }}
            >
              我还没有 Google 账号
            </Button>
          </Box>

          <Alert severity="info" sx={{ mt: 3 }}>
            如果您已有 Google 账号（如 Gmail 邮箱），请点击"我已有 Google 账号"继续。
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );

  /**
   * 渲染注册引导界面
   */
  const renderRegistering = () => {
    const steps = ['填写基本信息', '设置密码', '验证手机号', '完成注册'];

    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h5" gutterBottom>
          Google 账号注册引导
        </Typography>

        <Typography variant="body2" color="text.secondary" paragraph>
          我们将引导您完成 Google 账号的注册流程
        </Typography>

        <Paper sx={{ p: 3, mb: 2 }}>
          <Stepper activeStep={registrationStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        <Alert severity="info" sx={{ mb: 2 }}>
          {registrationStep === RegistrationStep.BASIC_INFO && '请在浏览器窗口中填写您的姓名、用户名等基本信息'}
          {registrationStep === RegistrationStep.PASSWORD && '请设置一个强密码来保护您的账号'}
          {registrationStep === RegistrationStep.PHONE_VERIFY && '请输入您的手机号码接收验证码'}
          {registrationStep === RegistrationStep.COMPLETE && '恭喜！您已成功注册 Google 账号'}
        </Alert>

        <Card sx={{ flex: 1, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5' }}>
          <CardContent>
            <Typography variant="body1" color="text.secondary" align="center">
              {browserViewOpen ? '注册页面已在新窗口中打开' : '正在加载注册页面...'}
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
              请在打开的浏览器窗口中完成注册流程
            </Typography>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" onClick={handleCloseBrowser}>
            取消注册
          </Button>

          <Button
            variant="contained"
            onClick={handleRegistrationComplete}
            sx={{ ml: 'auto' }}
          >
            我已完成注册
          </Button>
        </Box>
      </Box>
    );
  };

  /**
   * 渲染完成界面
   */
  const renderCompleted = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 3 }} />

      <Typography variant="h5" gutterBottom align="center">
        Google 账号确认完成
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph align="center">
        您已确认拥有 Google 账号，可以继续下一步安装流程
      </Typography>

      <Alert severity="success" sx={{ mt: 2, maxWidth: 500 }}>
        请点击下方"下一步"按钮继续安装 Claude CLI
      </Alert>
    </Box>
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {state === SetupState.CHOOSING && renderChoosing()}
      {state === SetupState.REGISTERING && renderRegistering()}
      {state === SetupState.COMPLETED && renderCompleted()}
    </Box>
  );
};

export default GoogleSetupStep;