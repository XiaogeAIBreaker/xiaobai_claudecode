/**
 * T024: 更新步骤状态指示器
 * 统一的步骤状态指示器组件
 */

import React from 'react';
import {
  Box,
  CircularProgress,
  Icon,
  Typography,
  Chip,
  Tooltip
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Schedule,
  PlayArrow,
  SkipNext
} from '@mui/icons-material';
import { StepStatus } from '../../../shared/types/installer';

interface StepIndicatorsProps {
  status: StepStatus;
  progress?: number;
  message?: string;
  retryCount?: number;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  showStatusText?: boolean;
  className?: string;
}

/**
 * 步骤状态指示器组件
 * 显示当前步骤的状态：待执行、执行中、成功、失败、跳过
 */
export const StepIndicators: React.FC<StepIndicatorsProps> = ({
  status,
  progress = 0,
  message,
  retryCount = 0,
  size = 'medium',
  showProgress = true,
  showStatusText = true,
  className
}) => {
  // 根据状态获取指示器配置
  const getIndicatorConfig = () => {
    switch (status) {
      case StepStatus.PENDING:
        return {
          icon: Schedule,
          color: '#9e9e9e',
          bgColor: '#f5f5f5',
          label: '待执行',
          description: '步骤尚未开始'
        };

      case StepStatus.RUNNING:
        return {
          icon: PlayArrow,
          color: '#2196f3',
          bgColor: '#e3f2fd',
          label: '执行中',
          description: '步骤正在执行中'
        };

      case StepStatus.SUCCESS:
        return {
          icon: CheckCircle,
          color: '#4caf50',
          bgColor: '#e8f5e8',
          label: '成功',
          description: '步骤执行成功'
        };

      case StepStatus.FAILED:
        return {
          icon: Error,
          color: '#f44336',
          bgColor: '#ffebee',
          label: retryCount > 0 ? `失败 (重试${retryCount}次)` : '失败',
          description: '步骤执行失败'
        };

      case StepStatus.SKIPPED:
        return {
          icon: SkipNext,
          color: '#ff9800',
          bgColor: '#fff3e0',
          label: '跳过',
          description: '步骤已跳过'
        };

      default:
        return {
          icon: Warning,
          color: '#9e9e9e',
          bgColor: '#f5f5f5',
          label: '未知',
          description: '未知状态'
        };
    }
  };

  const config = getIndicatorConfig();
  const IconComponent = config.icon;

  // 计算图标大小
  const getIconSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'large': return 32;
      default: return 24;
    }
  };

  // 渲染主要状态指示器
  const renderMainIndicator = () => {
    if (status === StepStatus.RUNNING && showProgress) {
      return (
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <CircularProgress
            variant={progress > 0 ? 'determinate' : 'indeterminate'}
            value={progress}
            size={getIconSize()}
            sx={{ color: config.color }}
          />
          {progress > 0 && (
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                variant="caption"
                component="div"
                color="text.secondary"
                sx={{ fontSize: size === 'small' ? '8px' : '10px' }}
              >
                {Math.round(progress)}%
              </Typography>
            </Box>
          )}
        </Box>
      );
    }

    return (
      <IconComponent
        sx={{
          fontSize: getIconSize(),
          color: config.color
        }}
      />
    );
  };

  // 渲染状态芯片
  const renderStatusChip = () => {
    if (!showStatusText) return null;

    return (
      <Chip
        label={config.label}
        size={size === 'large' ? 'medium' : 'small'}
        sx={{
          backgroundColor: config.bgColor,
          color: config.color,
          fontWeight: 500,
          '& .MuiChip-label': {
            fontSize: size === 'small' ? '11px' : '12px'
          }
        }}
      />
    );
  };

  // 渲染进度条（可选）
  const renderProgressBar = () => {
    if (!showProgress || status !== StepStatus.RUNNING || progress <= 0) {
      return null;
    }

    return (
      <Box sx={{ width: '100%', mt: 1 }}>
        <Box
          sx={{
            width: '100%',
            height: 4,
            backgroundColor: '#e0e0e0',
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          <Box
            sx={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: config.color,
              transition: 'width 0.3s ease-in-out'
            }}
          />
        </Box>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            mt: 0.5,
            color: 'text.secondary',
            fontSize: '11px'
          }}
        >
          {Math.round(progress)}% 完成
        </Typography>
      </Box>
    );
  };

  const indicator = (
    <Box
      className={className}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: size === 'small' ? 1 : 1.5,
        flexDirection: size === 'large' ? 'column' : 'row'
      }}
    >
      {renderMainIndicator()}
      {renderStatusChip()}
      {size === 'large' && renderProgressBar()}
    </Box>
  );

  // 如果有消息或描述，包装在Tooltip中
  if (message || config.description) {
    return (
      <Tooltip
        title={
          <Box>
            {config.description && (
              <Typography variant="caption" display="block">
                {config.description}
              </Typography>
            )}
            {message && (
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                {message}
              </Typography>
            )}
          </Box>
        }
        arrow
      >
        {indicator}
      </Tooltip>
    );
  }

  return indicator;
};

/**
 * 简化的步骤状态图标组件
 */
export const StepStatusIcon: React.FC<{
  status: StepStatus;
  size?: number;
  showTooltip?: boolean;
}> = ({ status, size = 20, showTooltip = true }) => {
  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  const icon = (
    <IconComponent
      sx={{
        fontSize: size,
        color: config.color
      }}
    />
  );

  if (!showTooltip) return icon;

  return (
    <Tooltip title={config.label} arrow>
      {icon}
    </Tooltip>
  );
};

/**
 * 获取状态配置的辅助函数
 */
function getStatusConfig(status: StepStatus) {
  switch (status) {
    case StepStatus.PENDING:
      return { icon: Schedule, color: '#9e9e9e', label: '待执行' };
    case StepStatus.RUNNING:
      return { icon: PlayArrow, color: '#2196f3', label: '执行中' };
    case StepStatus.SUCCESS:
      return { icon: CheckCircle, color: '#4caf50', label: '成功' };
    case StepStatus.FAILED:
      return { icon: Error, color: '#f44336', label: '失败' };
    case StepStatus.SKIPPED:
      return { icon: SkipNext, color: '#ff9800', label: '跳过' };
    default:
      return { icon: Warning, color: '#9e9e9e', label: '未知' };
  }
}

export default StepIndicators;