/**
 * T035: Claude CLI安装步骤组件
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  LinearProgress
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
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [installMessage, setInstallMessage] = useState('');
  const [installed, setInstalled] = useState(false);

  const startClaudeInstallation = async () => {
    try {
      setInstalling(true);
      setInstallProgress(0);

      const progressCallback = (event: ProgressEvent) => {
        setInstallProgress(event.progress);
        setInstallMessage(event.message);
      };

      const result: InstallResult = await window.electronAPI.install.claudeCli(undefined, progressCallback);

      if (result.success) {
        setInstalled(true);
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
          {installing ? (
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
              Claude CLI 安装成功！
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
        <Box>
          {!installed && (
            <Button
              variant="contained"
              onClick={startClaudeInstallation}
              disabled={installing}
              startIcon={<Download />}
              sx={{ mr: 1 }}
            >
              安装 Claude CLI
            </Button>
          )}
          {/* T023: 移除"继续"按钮，导航逻辑已移至底部ActionBar */}
        </Box>
      </Box>
    </Box>
  );
};

export default ClaudeInstallStep;