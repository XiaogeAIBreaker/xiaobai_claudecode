/**
 * T032: 网络检查步骤组件
 * 检测Google连接状态
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  LinearProgress
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Wifi
} from '@mui/icons-material';

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
  onNext: () => void;
  canGoNext: boolean;
}

/**
 * 网络检查步骤组件
 */
const NetworkCheckStep: React.FC<NetworkCheckStepProps> = ({
  onComplete,
  onNext: _onNext,
  canGoNext: _canGoNext
}) => {
  // 状态管理
  const [checking, setChecking] = useState(false);
  const [checkComplete, setCheckComplete] = useState(false);

  // 检查项状态
  const [checkItems, setCheckItems] = useState<NetworkCheckItem[]>([
    {
      id: 'google',
      label: 'Google连接',
      description: '检查是否可以正常连接Google服务',
      status: 'pending'
    }
  ]);

  /**
   * 更新检查项状态
   */
  const updateCheckItem = useCallback((id: string, updates: Partial<NetworkCheckItem>) => {
    setCheckItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  /**
   * 开始网络检查
   */
  const startNetworkCheck = useCallback(async () => {
    try {
      setChecking(true);
      setCheckComplete(false);

      // 重置错误状态
      updateCheckItem('google', { status: 'checking', result: '正在检查Google连接...' });

      // 执行Google连接检查
      const googleResult = await performNetworkCheck('google');

      if (googleResult.success) {
        updateCheckItem('google', {
          status: 'success',
          result: googleResult.message
        });

        // Google连接成功即可完成检查
        setCheckComplete(true);
        onComplete({ connectionType: 'Google', status: 'success' });
      } else {
        updateCheckItem('google', {
          status: 'error',
          result: googleResult.message,
          details: googleResult.details
        });
        // 不调用onError，避免显示全局错误提示，因为我们有自己的重试按钮
        setCheckComplete(false);
      }
    } catch (error: any) {
      updateCheckItem('google', {
        status: 'error',
        result: '检查失败',
        details: String(error)
      });
      // 不调用onError，避免显示全局错误提示，因为我们有自己的重试按钮
      setCheckComplete(false);
    } finally {
      setChecking(false);
    }
  }, [onComplete, updateCheckItem]);

  /**
   * 执行Google连接检查
   */
  const performNetworkCheck = async (checkId: string): Promise<{
    success: boolean;
    message: string;
    details?: string;
  }> => {
    if (checkId === 'google') {
      try {
        await fetch('https://www.google.com', {
          method: 'HEAD',
          mode: 'no-cors'
        });
        return { success: true, message: 'Google连接正常' };
      } catch {
        return {
          success: false,
          message: '无法连接到Google',
          details: '网络连接失败'
        };
      }
    }

    return { success: false, message: '未知检查项' };
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
   * 组件挂载时的处理
   */
  useEffect(() => {
    // 自动开始检查
    const timer = setTimeout(() => {
      startNetworkCheck();
    }, 1000);

    return () => clearTimeout(timer);
  }, [startNetworkCheck]);

  return (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* 标题 */}
      <Box sx={{ flex: '0 0 auto', mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          网络连接检查
        </Typography>
        <Typography variant="body2" color="text.secondary">
          正在检查是否可以正常连接Google服务，确保网络环境适合下载和安装Claude CLI。
        </Typography>
      </Box>

      {/* 检查进度 */}
      <Card sx={{ mb: 3, flex: '0 0 auto' }}>
        <CardContent sx={{ pb: 2 }}>
          <List sx={{ py: 0 }}>
            {checkItems.map((item) => (
              <ListItem key={item.id} sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {getStatusIcon(item.status)}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  secondary={item.description}
                  sx={{ mr: 2 }}
                />
                <Box>
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



      {/* 间隔区域 */}
      <Box sx={{ flex: '1 1 auto', minHeight: 0 }} />

      {/* 操作按钮 */}
      <Box sx={{
        flex: '0 0 auto',
        pt: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        {/* 根据检查状态决定是否显示按钮 */}
        {(() => {
          const googleItem = checkItems.find(item => item.id === 'google');
          const showButton = googleItem?.status === 'error' || googleItem?.status === 'pending';
          const buttonText = googleItem?.status === 'pending' ? '开始检查' : '重新检查';

          return showButton ? (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
              <Button
                variant="outlined"
                onClick={startNetworkCheck}
                disabled={checking}
              >
                {buttonText}
              </Button>
            </Box>
          ) : null;
        })()}

        {checkComplete && (
          <Alert severity="success" sx={{ width: '100%' }}>
            Google连接检查完成，请点击下方&ldquo;下一步&rdquo;按钮继续。
          </Alert>
        )}
      </Box>
    </Box>
  );
};

export default NetworkCheckStep;