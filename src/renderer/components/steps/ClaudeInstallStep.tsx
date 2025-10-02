/**
 * T035: Claude CLI安装步骤组件
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  LinearProgress,
  CircularProgress
} from '@mui/material';
import { Download, CheckCircle } from '@mui/icons-material';
import { ProgressEvent, InstallResult } from '../../../shared/types/installer';

interface ClaudeInstallStepProps {
  onComplete: (data?: any) => void;
  onError: (error: string) => void;
  onNext: () => void;
  canGoNext: boolean;
}

const ClaudeInstallStep: React.FC<ClaudeInstallStepProps> = ({
  onComplete,
  onError,
  onNext,
  canGoNext
}) => {
  const [checking, setChecking] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [installMessage, setInstallMessage] = useState('');
  const [installed, setInstalled] = useState(false);
  const [version, setVersion] = useState<string | undefined>();

  /**
   * 检查 Claude CLI 是否已安装
   */
  const checkClaudeInstallation = async () => {
    try {
      setChecking(true);
      const result = await window.electronAPI.install.checkClaudeCli();

      if (result.success && result.data) {
        if (result.data.installed) {
          setInstalled(true);
          setVersion(result.data.version);
          onComplete({ installed: true, version: result.data.version });
        }
      }
    } catch (error) {
      console.error('检查 Claude CLI 失败:', error);
    } finally {
      setChecking(false);
    }
  };

  /**
   * 启动 Claude CLI 安装
   */
  const startClaudeInstallation = async () => {
    try {
      setInstalling(true);
      setInstallProgress(0);

      const progressCallback = (event: ProgressEvent) => {
        setInstallProgress(event.progress);
        setInstallMessage(event.message);
      };

      const result: InstallResult = await window.electronAPI.install.claudeCli(progressCallback);

      if (result.success) {
        setInstalled(true);
        setVersion(result.message?.match(/版本\s+(.+?)\)/)?.[1]);
        onComplete(result);
      } else {
        onError(result.errors?.[0]?.message || 'Claude CLI安装失败');
      }
    } catch (error: any) {
      onError(error instanceof Error ? error.message : 'Claude CLI安装过程中发生错误');
    } finally {
      setInstalling(false);
    }
  };

  /**
   * 组件挂载时自动检查
   */
  useEffect(() => {
    checkClaudeInstallation();
  }, []);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" gutterBottom>
        Claude CLI 安装
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        正在安装Claude命令行工具，这是使用Claude API的核心组件。
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          {checking ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={24} />
              <Typography variant="body1">正在检测 Claude CLI 安装状态...</Typography>
            </Box>
          ) : installing ? (
            <>
              <Typography variant="h6" gutterBottom>
                安装进度
              </Typography>
              <LinearProgress variant="determinate" value={installProgress} sx={{ mb: 1 }} />
              <Typography variant="body2">
                {installMessage} ({Math.round(installProgress)}%)
              </Typography>
            </>
          ) : installed ? (
            <Alert severity="success" icon={<CheckCircle />}>
              Claude CLI 已安装{version ? ` (版本 ${version})` : ''}
            </Alert>
          ) : (
            <Alert severity="info">
              点击下方按钮开始安装Claude CLI。安装过程将通过npm自动完成。
            </Alert>
          )}
        </CardContent>
      </Card>

      <Box sx={{ mt: 'auto', pt: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Box />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!installed && !checking && (
            <Button
              variant="contained"
              onClick={startClaudeInstallation}
              disabled={installing}
              startIcon={<Download />}
            >
              安装 Claude CLI
            </Button>
          )}
          {installed && (
            <Alert severity="success">
              Claude CLI 已安装完成，请点击下方"下一步"按钮继续。
            </Alert>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ClaudeInstallStep;
