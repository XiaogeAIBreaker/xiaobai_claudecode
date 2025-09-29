/**
 * T032: 网络检查步骤组件
 * 检测网络连接状态和代理设置
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  LinearProgress,
  FormControlLabel,
  Switch,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Wifi,
  Security,
  Language,
  Settings,
  ExpandMore
} from '@mui/icons-material';
import { DetectionResult, DetectionStatus, NetworkEnvironment } from '../../../shared/types/environment';

/**
 * 网络检查项
 */
interface NetworkCheckItem {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'checking' | 'success' | 'warning' | 'error';
  result?: string;
  details?: string;
}

/**
 * 步骤组件属性
 */
interface NetworkCheckStepProps {
  onComplete: (data?: any) => void;
  onError: (error: string) => void;
  onNext: () => void;
  canGoNext: boolean;
}

/**
 * 网络检查步骤组件
 */
const NetworkCheckStep: React.FC<NetworkCheckStepProps> = ({
  onComplete,
  onError,
  onNext,
  canGoNext
}) => {
  // 状态管理
  const [checking, setChecking] = useState(false);
  const [checkComplete, setCheckComplete] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [networkData, setNetworkData] = useState<NetworkEnvironment | null>(null);
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxySettings, setProxySettings] = useState({
    host: '',
    port: '',
    username: '',
    password: ''
  });

  // 检查项状态
  const [checkItems, setCheckItems] = useState<NetworkCheckItem[]>([
    {
      id: 'internet',
      label: '互联网连接',
      description: '检查基本网络连通性',
      status: 'pending'
    },
    {
      id: 'dns',
      label: 'DNS解析',
      description: '检查域名解析服务',
      status: 'pending'
    },
    {
      id: 'npm',
      label: 'NPM仓库访问',
      description: '检查Node.js包管理器访问',
      status: 'pending'
    },
    {
      id: 'github',
      label: 'GitHub访问',
      description: '检查GitHub代码仓库访问',
      status: 'pending'
    },
    {
      id: 'anthropic',
      label: 'Anthropic API',
      description: '检查Claude API服务访问',
      status: 'pending'
    }
  ]);

  /**
   * 更新检查项状态
   */
  const updateCheckItem = (id: string, updates: Partial<NetworkCheckItem>) => {
    setCheckItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  /**
   * 开始网络检查
   */
  const startNetworkCheck = async () => {
    try {
      setChecking(true);
      setCheckComplete(false);

      // 逐项检查
      for (const item of checkItems) {
        updateCheckItem(item.id, { status: 'checking' });

        // 模拟检查延迟
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
          // 调用相应的检查方法
          const result = await performNetworkCheck(item.id);
          updateCheckItem(item.id, {
            status: result.success ? 'success' : 'error',
            result: result.message,
            details: result.details
          });
        } catch (error: any) {
          updateCheckItem(item.id, {
            status: 'error',
            result: '检查失败',
            details: String(error)
          });
        }
      }

      // 执行完整的网络检测
      const result = await window.electronAPI.detect.network();
      setDetectionResult(result);

      if (result.status === DetectionStatus.SUCCESS && result.data) {
        setNetworkData(result.data as NetworkEnvironment);
        setCheckComplete(true);
        onComplete(result.data);
      } else {
        onError(result.message || '网络检测失败');
      }
    } catch (error: any) {
      onError(String(error));
    } finally {
      setChecking(false);
    }
  };

  /**
   * 执行单项网络检查
   */
  const performNetworkCheck = async (checkId: string): Promise<{
    success: boolean;
    message: string;
    details?: string;
  }> => {
    switch (checkId) {
      case 'internet':
        // 检查基本网络连接
        try {
          const response = await fetch('https://www.baidu.com', {
            method: 'HEAD',
            mode: 'no-cors'
          });
          return { success: true, message: '连接正常' };
        } catch {
          return { success: false, message: '无法连接到互联网' };
        }

      case 'dns':
        // 检查DNS解析
        try {
          await fetch('https://8.8.8.8', { method: 'HEAD', mode: 'no-cors' });
          return { success: true, message: 'DNS解析正常' };
        } catch {
          return { success: false, message: 'DNS解析失败' };
        }

      case 'npm':
        // 检查NPM仓库
        try {
          const response = await fetch('https://registry.npmjs.org/', {
            method: 'HEAD',
            mode: 'no-cors'
          });
          return { success: true, message: 'NPM仓库可访问' };
        } catch {
          return { success: false, message: 'NPM仓库无法访问，可能需要配置代理' };
        }

      case 'github':
        // 检查GitHub
        try {
          const response = await fetch('https://github.com', {
            method: 'HEAD',
            mode: 'no-cors'
          });
          return { success: true, message: 'GitHub可访问' };
        } catch {
          return { success: false, message: 'GitHub无法访问' };
        }

      case 'anthropic':
        // 检查Anthropic API
        try {
          const response = await fetch('https://api.anthropic.com', {
            method: 'HEAD',
            mode: 'no-cors'
          });
          return { success: true, message: 'Anthropic API可访问' };
        } catch {
          return { success: false, message: 'Anthropic API无法访问' };
        }

      default:
        return { success: false, message: '未知检查项' };
    }
  };

  /**
   * 获取状态图标
   */
  const getStatusIcon = (status: NetworkCheckItem['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle color="success" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'error':
        return <Error color="error" />;
      case 'checking':
        return <Box sx={{ width: 24, height: 24 }}><LinearProgress /></Box>;
      default:
        return <Wifi color="disabled" />;
    }
  };

  /**
   * 获取状态颜色
   */
  const getStatusColor = (status: NetworkCheckItem['status']) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'checking':
        return 'info';
      default:
        return 'default';
    }
  };

  /**
   * 保存代理设置
   */
  const saveProxySettings = async () => {
    try {
      const config = await window.electronAPI.config.load();
      const updatedConfig = {
        ...config,
        network: {
          ...config.network,
          proxy: proxyEnabled ? {
            enabled: true,
            host: proxySettings.host,
            port: parseInt(proxySettings.port) || 8080,
            auth: proxySettings.username ? {
              username: proxySettings.username,
              password: proxySettings.password
            } : undefined
          } : { enabled: false }
        }
      };

      await window.electronAPI.config.save(updatedConfig);
    } catch (error) {
      console.error('保存代理设置失败:', error);
    }
  };

  /**
   * 组件挂载时的处理
   */
  useEffect(() => {
    // 自动开始检查
    const timer = setTimeout(() => {
      startNetworkCheck();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 标题 */}
      <Typography variant="h5" gutterBottom>
        网络环境检查
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        正在检查您的网络环境，确保能够正常下载和安装Claude CLI。
      </Typography>

      {/* 检查进度 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <List>
            {checkItems.map((item) => (
              <ListItem key={item.id}>
                <ListItemIcon>
                  {getStatusIcon(item.status)}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  secondary={item.description}
                />
                <Box sx={{ ml: 1 }}>
                  <Chip
                    label={item.result || item.status}
                    size="small"
                    color={getStatusColor(item.status) as any}
                    variant={item.status === 'pending' ? 'outlined' : 'filled'}
                  />
                </Box>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* 检查结果 */}
      {detectionResult && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              检查结果
            </Typography>
            {detectionResult.status === DetectionStatus.SUCCESS ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                网络环境检查完成，一切正常！
              </Alert>
            ) : (
              <Alert severity="error" sx={{ mb: 2 }}>
                {detectionResult.message}
              </Alert>
            )}

            {networkData && (
              <Box>
                <Typography variant="body2" gutterBottom>
                  <strong>连接类型:</strong> {networkData.connectionType}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>网速:</strong> {networkData.speed ? `${networkData.speed} Mbps` : '未知'}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>代理状态:</strong> {networkData.proxyConfig ? '已启用' : '未启用'}
                </Typography>
                {networkData.restrictions.blockedSites.length > 0 && (
                  <Typography variant="body2" color="warning.main">
                    <strong>网络限制:</strong> {networkData.restrictions.blockedSites.join(', ')}
                  </Typography>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* 代理设置 */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Settings sx={{ mr: 1 }} />
            <Typography>代理设置</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <FormControlLabel
            control={
              <Switch
                checked={proxyEnabled}
                onChange={(e) => setProxyEnabled(e.target.checked)}
              />
            }
            label="启用HTTP代理"
          />

          {proxyEnabled && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="代理主机"
                value={proxySettings.host}
                onChange={(e) => setProxySettings(prev => ({ ...prev, host: e.target.value }))}
                placeholder="例如: 127.0.0.1"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="代理端口"
                value={proxySettings.port}
                onChange={(e) => setProxySettings(prev => ({ ...prev, port: e.target.value }))}
                placeholder="例如: 8080"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="用户名 (可选)"
                value={proxySettings.username}
                onChange={(e) => setProxySettings(prev => ({ ...prev, username: e.target.value }))}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                type="password"
                label="密码 (可选)"
                value={proxySettings.password}
                onChange={(e) => setProxySettings(prev => ({ ...prev, password: e.target.value }))}
                sx={{ mb: 2 }}
              />
              <Button variant="outlined" onClick={saveProxySettings}>
                保存代理设置
              </Button>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* 操作按钮 */}
      <Box sx={{ mt: 'auto', pt: 2, display: 'flex', justifyContent: 'flex-start' }}>
        <Button
          variant="outlined"
          onClick={startNetworkCheck}
          disabled={checking}
        >
          重新检查
        </Button>
        {/* T023: 移除"继续安装"按钮，导航逻辑已移至底部ActionBar */}
      </Box>
    </Box>
  );
};

export default NetworkCheckStep;