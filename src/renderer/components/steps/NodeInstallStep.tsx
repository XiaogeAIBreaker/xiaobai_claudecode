/**
 * T033: Node.js安装步骤组件
 * 检测和安装Node.js运行环境
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Download,
  Refresh,
  Info
} from '@mui/icons-material';
import { DetectionResult, DetectionStatus, NodeEnvironment } from '../../../shared/types/environment';
import { ProgressEvent, InstallResult } from '../../../shared/types/installer';


/**
 * 步骤组件属性
 */
interface NodeInstallStepProps {
  onComplete: (data?: any) => void;
  onNext: () => void;
  canGoNext: boolean;
}

/**
 * Node.js安装步骤组件
 */
const NodeInstallStep: React.FC<NodeInstallStepProps> = ({
  onComplete,
  onNext: _onNext,
  canGoNext: _canGoNext
}) => {
  // 状态管理
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [nodeData, setNodeData] = useState<NodeEnvironment | null>(null);
  const [installProgress, setInstallProgress] = useState(0);
  const [installMessage, setInstallMessage] = useState('');

  /**
   * 检查版本兼容性
   */
  const checkVersionCompatibility = useCallback((version: string): {
    compatible: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning';
  } => {
    // 移除版本字符串中的"v"前缀，然后解析主版本号
    const cleanVersion = version.replace(/^v/, '');
    const major = parseInt(cleanVersion.split('.')[0]);

    if (major >= 22) {
      return {
        compatible: true,
        message: `当前版本 ${version} 是最新的LTS版本，完全兼容`,
        severity: 'success'
      };
    } else if (major >= 18) {
      return {
        compatible: true,
        message: `当前版本 ${version} 兼容，建议保持`,
        severity: 'success'
      };
    } else if (major >= 16) {
      return {
        compatible: true,
        message: `当前版本 ${version} 兼容，可考虑升级到更新版本`,
        severity: 'info'
      };
    }
    return {
      compatible: false,
      message: '版本过低，建议升级到16.0.0或更高版本',
      severity: 'warning'
    };
  }, []);

  /**
   * 检查Node.js安装状态
   */
  const checkNodeInstallation = useCallback(async () => {
    try {
      setChecking(true);

      // 使用新的安装检查API
      const installResult = await window.electronAPI.install.checkNodeJS();

      if (installResult.success && installResult.data) {
        const { installed, version, npmVersion } = installResult.data;

        // 构造NodeEnvironment对象以保持兼容性
        const nodeData: NodeEnvironment = {
          installed,
          currentVersion: version,
          npmVersion,
          recommendedVersion: '18.0.0', // 默认推荐版本
          needsUpdate: false,
          supportedArchs: [],
          environmentVars: { PATH: [] }
        };

        setNodeData(nodeData);

        // 构造检测结果
        setDetectionResult({
          status: installed ? DetectionStatus.SUCCESS : DetectionStatus.FAILED,
          message: installed ? '检测成功' : '未检测到Node.js',
          data: nodeData,
          timestamp: new Date(),
          duration: 0
        });

        // 检查版本兼容性，如果已安装且兼容，调用完成回调
        if (installed && version) {
          const versionCheck = checkVersionCompatibility(version);
          if (versionCheck.compatible) {
            onComplete({ nodeVersion: version, npmVersion });
          }
        }
      } else {
        // 安装检查失败
        setDetectionResult({
          status: DetectionStatus.FAILED,
          message: installResult.error || '检测失败',
          timestamp: new Date(),
          duration: 0
        });
        setNodeData(null);
      }
    } catch (error: any) {
      console.error('检查Node.js安装状态失败:', error);
      setDetectionResult({
        status: DetectionStatus.FAILED,
        message: '检测失败',
        timestamp: new Date(),
        duration: 0
      });
      setNodeData(null);
    } finally {
      setChecking(false);
    }
  }, [onComplete, checkVersionCompatibility]);

  /**
   * 开始安装Node.js
   */
  const startNodeInstallation = useCallback(async () => {
    try {
      setInstalling(true);
      setInstallProgress(0);
      setInstallMessage('准备下载Node.js...');

      // 设置进度回调
      const progressCallback = (progress: any) => {
        setInstallProgress(progress.progress);
        setInstallMessage(progress.message);

        // 如果安装成功，自动完成步骤
        if (progress.status === 'success') {
          setInstallMessage('Node.js安装成功！');
          setTimeout(async () => {
            await checkNodeInstallation();
          }, 1000);
        }
      };

      // 执行安装
      const result: InstallResult = await window.electronAPI.install.nodejs(progressCallback);

      if (result.success) {
        setInstallMessage('Node.js安装成功！');
        // 重新检查安装状态
        await checkNodeInstallation();
        onComplete(result);
      } else {
        const errorMessage = result.error || '未知错误';
        console.error('Node.js安装失败:', errorMessage);
        setInstallMessage(`安装失败: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error('Node.js安装过程中发生错误:', error);
    } finally {
      setInstalling(false);
    }
  }, [checkNodeInstallation, onComplete]);

  /**
   * 获取状态图标
   */
  const getStatusIcon = (installed: boolean, hasError: boolean) => {
    if (hasError) return <Error color="error" />;
    if (installed) return <CheckCircle color="success" />;
    return <Download color="action" />;
  };

  /**
   * 获取状态文本
   */
  const getStatusText = (installed: boolean, hasError: boolean) => {
    if (hasError) return '检测失败';
    if (installed) return '已安装';
    return '未安装';
  };

  /**
   * 获取状态颜色
   */
  const getStatusColor = (installed: boolean, hasError: boolean) => {
    if (hasError) return 'error';
    if (installed) return 'success';
    return 'default';
  };


  /**
   * 组件挂载时检查Node.js
   */
  useEffect(() => {
    checkNodeInstallation();
  }, [checkNodeInstallation]);

  const isNodeInstalled = nodeData?.installed || false;
  const hasError = detectionResult?.status === DetectionStatus.FAILED;
  const versionCheck = nodeData?.currentVersion ?
    checkVersionCompatibility(nodeData.currentVersion) :
    { compatible: false, message: '未检测到版本' };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 标题 */}
      <Typography variant="h5" gutterBottom>
        Node.js 环境
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Node.js是运行Claude CLI的必要环境。我们将检查您的系统并在需要时进行安装。
      </Typography>

      {/* 检查状态 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            安装状态
          </Typography>

          {checking ? (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LinearProgress sx={{ flex: 1, mr: 2 }} />
              <Typography variant="body2">检查中...</Typography>
            </Box>
          ) : (
            <List>
              <ListItem>
                <ListItemIcon>
                  {getStatusIcon(isNodeInstalled, hasError)}
                </ListItemIcon>
                <ListItemText
                  primary="Node.js"
                  secondary={isNodeInstalled ? `版本: ${nodeData?.currentVersion}` : '未检测到Node.js'}
                />
                <Chip
                  label={getStatusText(isNodeInstalled, hasError)}
                  color={getStatusColor(isNodeInstalled, hasError) as any}
                  size="small"
                />
              </ListItem>

              {nodeData?.npmVersion && (
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="npm"
                    secondary={`版本: ${nodeData.npmVersion}`}
                  />
                  <Chip label="已安装" color="success" size="small" />
                </ListItem>
              )}
            </List>
          )}

          {/* 版本兼容性检查 */}
          {isNodeInstalled && (
            <Alert
              severity={versionCheck.severity}
              sx={{ mt: 2 }}
              icon={<Info />}
            >
              {versionCheck.message}
            </Alert>
          )}

        </CardContent>
      </Card>

      {/* 安装进度 */}
      {installing && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              安装进度
            </Typography>
            <LinearProgress
              variant="determinate"
              value={installProgress}
              sx={{ mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              {installMessage} ({Math.round(installProgress)}%)
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* 操作按钮 */}
      <Box sx={{ mt: 'auto', pt: 2, display: 'flex', justifyContent: 'space-between' }}>
        {/* 只在检测失败或未安装时显示重新检查按钮 */}
        {(hasError || !isNodeInstalled) && (
          <Button
            variant="outlined"
            onClick={checkNodeInstallation}
            disabled={checking || installing}
            startIcon={<Refresh />}
          >
            重新检查
          </Button>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* 未安装时显示一键安装按钮 */}
          {!isNodeInstalled && (
            <Button
              variant="contained"
              onClick={startNodeInstallation}
              disabled={checking || installing}
              startIcon={<Download />}
            >
              一键安装
            </Button>
          )}

          {/* 已安装且版本兼容时显示成功提示 */}
          {isNodeInstalled && versionCheck.compatible && (
            <Alert severity="success">
              Node.js 已安装，请点击下方&ldquo;下一步&rdquo;按钮继续。
            </Alert>
          )}
        </Box>
      </Box>

    </Box>
  );
};

export default NodeInstallStep;