/**
 * T020: 重构ActionBar组件
 * 实现新的状态驱动的底部操作栏，整合所有导航逻辑
 */

import React from 'react';
import { Box, Button, CircularProgress } from '@mui/material';
import { ButtonState } from '../../../shared/types/ui';
import { InstallStep } from '../../../shared/types/installer';
import { InstallationUIStateManager } from '../../../shared/store/ui-state-manager';
import { UIEventHandler } from '../../../shared/utils/ui-event-handler';

interface ActionBarProps {
  uiStateManager: InstallationUIStateManager;
  className?: string;
}

/**
 * ActionBar组件 - 底部操作栏
 * 核心功能：整合"上一步"和"下一步"按钮，移除步骤内的"继续安装"按钮
 */
export const ActionBar: React.FC<ActionBarProps> = ({
  uiStateManager,
  className
}) => {
  const [uiState, setUIState] = React.useState(uiStateManager.getCurrentState());

  // 订阅UI状态变化
  React.useEffect(() => {
    const unsubscribe = uiStateManager.subscribe(setUIState);
    return unsubscribe;
  }, [uiStateManager]);

  // 按钮点击处理器
  const handlePreviousClick = React.useCallback(() => {
    UIEventHandler.handleButtonClick('previous', uiStateManager);
  }, [uiStateManager]);

  const handleNextClick = React.useCallback(() => {
    UIEventHandler.handleButtonClick('next', uiStateManager);
  }, [uiStateManager]);

  // 渲染按钮组件
  const renderButton = (buttonState: ButtonState, onClick: () => void, key: string) => {
    if (!buttonState.visible) {
      return null;
    }

    return (
      <Button
        key={key}
        onClick={onClick}
        disabled={!buttonState.enabled}
        variant={buttonState.variant === 'primary' ? 'contained' : 'outlined'}
        color={buttonState.variant === 'primary' ? 'primary' : 'inherit'}
        startIcon={buttonState.loading ? <CircularProgress size={16} /> : undefined}
        sx={{
          minWidth: 120,
          height: 40,
          fontSize: '14px',
          fontWeight: 500,
          borderRadius: 1,
          textTransform: 'none',
          opacity: buttonState.enabled ? 1 : 0.6,
          cursor: buttonState.enabled ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: buttonState.enabled ? 'translateY(-1px)' : 'none',
            boxShadow: buttonState.enabled ? '0 4px 8px rgba(0,0,0,0.12)' : 'none'
          },
          '&:disabled': {
            backgroundColor: buttonState.variant === 'primary' ? 'action.disabledBackground' : 'transparent',
            color: 'action.disabled',
            borderColor: 'action.disabled'
          }
        }}
      >
        {buttonState.label}
      </Button>
    );
  };

  const { actionBar } = uiState;

  return (
    <Box
      className={className}
      sx={{
        p: 3,
        borderTop: 1,
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'background.paper',
        minHeight: 80,
        position: 'sticky',
        bottom: 0,
        zIndex: 10,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.08)'
      }}
    >
      {/* 左侧：上一步按钮 */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {renderButton(actionBar.previousButton, handlePreviousClick, 'previous')}
      </Box>

      {/* 中间：当前步骤信息（可选） */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        color: 'text.secondary',
        fontSize: '12px',
        fontWeight: 400
      }}>
        步骤 {uiState.currentStep === InstallStep.NETWORK_CHECK ? '1' :
              uiState.currentStep === InstallStep.NODEJS_INSTALL ? '2' :
              uiState.currentStep === InstallStep.GOOGLE_SETUP ? '3' :
              uiState.currentStep === InstallStep.CLAUDE_CLI_SETUP ? '4' :
              uiState.currentStep === InstallStep.API_CONFIGURATION ? '5' :
              uiState.currentStep === InstallStep.TESTING ? '6' : '7'} / 7
      </Box>

      {/* 右侧：下一步按钮 */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {renderButton(actionBar.nextButton, handleNextClick, 'next')}
      </Box>
    </Box>
  );
};

/**
 * ActionBar组件的便利包装器，自动连接UI状态管理器
 */
export const ConnectedActionBar: React.FC<{ className?: string }> = ({ className }) => {
  const [uiStateManager] = React.useState(() => InstallationUIStateManager.getInstance());

  return <ActionBar uiStateManager={uiStateManager} className={className} />;
};

export default ActionBar;