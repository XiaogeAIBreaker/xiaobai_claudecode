/**
 * T033: Node.js安装步骤组件
 * 检测和安装Node.js运行环境
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Download,
  PlayArrow,
  Refresh,
  Info
} from '@mui/icons-material';
import { DetectionResult, DetectionStatus, NodeEnvironment } from '../../../shared/types/environment';
import { ProgressEvent, InstallResult } from '../../../shared/types/installer';

/**
 * 安装选项
 */
interface InstallOptions {
  version: string;
  installType: 'auto' | 'manual';
}

/**
 * 步骤组件属性
 */
interface NodeInstallStepProps {
  onComplete: (data?: any) => void;
  onError: (error: string) => void;
  onNext: () => void;
  canGoNext: boolean;
}

/**
 * Node.js安装步骤组件
 */
const NodeInstallStep: React.FC<NodeInstallStepProps> = ({
  onComplete,
  onError,
  onNext,
  canGoNext
}) => {
  // 状态管理
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [nodeData, setNodeData] = useState<NodeEnvironment | null>(null);
  const [installProgress, setInstallProgress] = useState(0);
  const [installMessage, setInstallMessage] = useState('');
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [installOptions, setInstallOptions] = useState<InstallOptions>({
    version: '18.17.0',
    installType: 'auto'
  });

  /**
   * 检查Node.js安装状态
   */
  const checkNodeInstallation = async () => {
    try {
      setChecking(true);
      const result = await window.electronAPI.detect.nodejs();
      setDetectionResult(result);

      if (result.status === DetectionStatus.SUCCESS && result.data) {
        setNodeData(result.data as NodeEnvironment);
      }
    } catch (error: any) {
      onError(String(error));
    } finally {
      setChecking(false);
    }
  };

  /**
   * 开始安装Node.js
   */
  const startNodeInstallation = async () => {
    try {
      setInstalling(true);
      setInstallProgress(0);
      setInstallMessage('准备下载Node.js...');

      // 设置进度回调
      const progressCallback = (event: ProgressEvent) => {
        setInstallProgress(event.progress);
        setInstallMessage(event.message);
      };

      // 执行安装
      const result: InstallResult = await window.electronAPI.install.nodejs(progressCallback);

      if (result.success) {
        setInstallMessage('Node.js安装成功！');
        // 重新检查安装状态
        await checkNodeInstallation();
        onComplete(result);
      } else {
        onError(result.errors?.[0]?.message || 'Node.js安装失败');
      }
    } catch (error: any) {
      onError(String(error));
    } finally {
      setInstalling(false);
      setShowInstallDialog(false);
    }
  };

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
   * 检查版本兼容性
   */
  const checkVersionCompatibility = (version: string): {
    compatible: boolean;
    message: string;
  } => {
    const major = parseInt(version.split('.')[0]);
    if (major >= 16) {
      return { compatible: true, message: '版本兼容' };
    }
    return {
      compatible: false,
      message: '版本过低，建议升级到16.0.0或更高版本'
    };
  };

  /**
   * 组件挂载时检查Node.js
   */
  useEffect(() => {
    checkNodeInstallation();
  }, []);

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
              severity={versionCheck.compatible ? 'success' : 'warning'}
              sx={{ mt: 2 }}
              icon={<Info />}
            >
              {versionCheck.message}
            </Alert>
          )}

          {/* 推荐信息 */}
          {!isNodeInstalled && (
            <Alert severity="info" sx={{ mt: 2 }}>
              推荐安装Node.js v18.17.0 LTS版本，它提供了最佳的稳定性和兼容性。
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
        <Button
          variant="outlined"
          onClick={checkNodeInstallation}
          disabled={checking || installing}
          startIcon={<Refresh />}
        >
          重新检查
        </Button>

        <Box>
          {!isNodeInstalled && (
            <Button
              variant="contained"
              onClick={() => setShowInstallDialog(true)}
              disabled={checking || installing}
              startIcon={<Download />}
              sx={{ mr: 1 }}
            >
              安装 Node.js
            </Button>
          )}

          {/* T023: 移除"继续"按钮，导航逻辑已移至底部ActionBar */}
        </Box>
      </Box>

      {/* 安装确认对话框 */}
      <Dialog
        open={showInstallDialog}
        onClose={() => setShowInstallDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>安装 Node.js</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            即将开始下载和安装Node.js。这可能需要几分钟时间，具体取决于您的网络速度。
          </Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>版本</InputLabel>
            <Select
              value={installOptions.version}
              label="版本"
              onChange={(e) => setInstallOptions(prev => ({ ...prev, version: e.target.value }))}
            >
              <MenuItem value="18.17.0">v18.17.0 LTS (推荐)</MenuItem>
              <MenuItem value="16.20.0">v16.20.0 LTS</MenuItem>
              <MenuItem value="20.5.0">v20.5.0 (最新)</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>安装方式</InputLabel>
            <Select
              value={installOptions.installType}
              label="安装方式"
              onChange={(e) => setInstallOptions(prev => ({ ...prev, installType: e.target.value as 'auto' | 'manual' }))}
            >
              <MenuItem value="auto">自动安装 (推荐)</MenuItem>
              <MenuItem value="manual">手动安装</MenuItem>
            </Select>
          </FormControl>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              自动安装将静默完成安装过程。如果您希望查看安装程序界面，请选择手动安装。
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInstallDialog(false)}>
            取消
          </Button>
          <Button
            onClick={startNodeInstallation}
            variant="contained"
            startIcon={<PlayArrow />}
          >
            开始安装
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NodeInstallStep;