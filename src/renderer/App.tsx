/**
 * T031: React主应用组件
 * 集成安装向导和主题配置
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import InstallWizard from './components/InstallWizard';
import { performanceMonitor } from '../shared/utils/performance';

/**
 * 应用主题配置
 */
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      'PingFang SC',
      'Microsoft YaHei',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

/**
 * 应用状态枚举
 */
enum AppState {
  LOADING = 'loading',
  INSTALLING = 'installing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

/**
 * React主应用组件
 */
const App: React.FC = () => {
  // 状态管理
  const [appState, setAppState] = useState<AppState>(AppState.LOADING);
  const [error, setError] = useState<string | null>(null);

  /**
   * 处理安装完成
   */
  const handleInstallComplete = () => {
    setAppState(AppState.COMPLETED);

    // 显示完成通知
    window.electronAPI.ui.showNotification({
      title: '安装完成',
      body: 'Claude Code CLI 已成功安装！',
      type: 'success'
    });
  };

  /**
   * 处理安装取消
   */
  const handleInstallCancel = () => {
    setError('安装已取消');
    setAppState(AppState.ERROR);
  };

  /**
   * 处理错误
   */
  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setAppState(AppState.ERROR);
  };

  /**
   * 重新开始安装
   */
  const restartInstallation = () => {
    setError(null);
    setAppState(AppState.INSTALLING);
  };

  /**
   * 退出应用
   */
  const exitApplication = () => {
    window.electronAPI.app.quit();
  };

  /**
   * 组件挂载时的初始化
   */
  useEffect(() => {
    // 标记渲染器初始化开始
    performanceMonitor.checkpoint('renderer-init-start');

    // 检查Electron API是否可用
    if (!window.electronAPI) {
      setError('应用初始化失败：Electron API不可用');
      setAppState(AppState.ERROR);
      return;
    }

    // 标记渲染器准备就绪
    performanceMonitor.markRendererReady();

    // 延迟启动安装向导，给用户时间查看界面
    const timer = setTimeout(() => {
      setAppState(AppState.INSTALLING);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  /**
   * 监听菜单事件
   */
  useEffect(() => {
    const handleMenuEvent = (event: string) => {
      switch (event) {
        case 'menu:restart-installation':
          restartInstallation();
          break;
        case 'menu:check-for-updates':
          // 检查更新逻辑
          break;
      }
    };

    if (window.electronAPI) {
      window.electronAPI.on.menuEvent(handleMenuEvent);

      return () => {
        window.electronAPI.off.menuEvent();
      };
    }
  }, []);

  /**
   * 渲染加载状态
   */
  const renderLoading = () => (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        p: 4
      }}
    >
      <CircularProgress size={60} sx={{ mb: 3 }} />
      <Typography variant="h4" gutterBottom>
        Claude Code CLI 安装程序
      </Typography>
      <Typography variant="body1" color="text.secondary">
        为中国地区零基础用户设计的友好安装体验
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        正在初始化安装程序...
      </Typography>
    </Box>
  );

  /**
   * 渲染错误状态
   */
  const renderError = () => (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        p: 4
      }}
    >
      <Alert severity="error" sx={{ mb: 3, maxWidth: 400 }}>
        {error}
      </Alert>
      <Typography variant="h5" gutterBottom>
        安装过程中出现问题
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        您可以重新开始安装，或者退出程序稍后再试。
      </Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <button onClick={restartInstallation}>
          重新开始
        </button>
        <button onClick={exitApplication}>
          退出程序
        </button>
      </Box>
    </Box>
  );

  /**
   * 渲染完成状态
   */
  const renderCompleted = () => (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        p: 4
      }}
    >
      <Typography variant="h4" gutterBottom color="success.main">
        🎉 安装完成！
      </Typography>
      <Typography variant="body1" paragraph>
        Claude Code CLI 已成功安装并配置完成。
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        您现在可以在终端中使用 <code>claude</code> 命令。
      </Typography>
      <button onClick={exitApplication}>
        完成并退出
      </button>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {appState === AppState.LOADING && renderLoading()}
      {appState === AppState.INSTALLING && (
        <InstallWizard
          onComplete={handleInstallComplete}
          onCancel={handleInstallCancel}
        />
      )}
      {appState === AppState.COMPLETED && renderCompleted()}
      {appState === AppState.ERROR && renderError()}
    </ThemeProvider>
  );
};

export default App;