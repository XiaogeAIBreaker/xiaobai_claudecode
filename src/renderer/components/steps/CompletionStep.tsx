/**
 * 完成步骤组件
 */

import React from 'react';
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
  ListItemText
} from '@mui/material';
import {
  CheckCircle,
  Launch,
  Description,
  Help
} from '@mui/icons-material';

interface CompletionStepProps {
  onComplete: (data?: any) => void;
  onError: (error: string) => void;
  onNext: () => void;
  canGoNext: boolean;
}

const CompletionStep: React.FC<CompletionStepProps> = ({
  onComplete,
  onError,
  onNext,
  canGoNext
}) => {
  const openDocumentation = () => {
    window.electronAPI.system.openExternal('https://docs.claude.com');
  };

  const openTerminal = () => {
    // 这里应该实现打开终端的逻辑
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" gutterBottom>
        安装完成
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        恭喜！Claude CLI已成功安装并配置完成。
      </Typography>

      <Alert severity="success" sx={{ mb: 2 }}>
        🎉 Claude Code CLI安装程序已完成所有设置！
      </Alert>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            下一步操作
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <Launch />
              </ListItemIcon>
              <ListItemText
                primary="开始使用Claude CLI"
                secondary="在终端中运行 'claude --help' 查看可用命令"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Description />
              </ListItemIcon>
              <ListItemText
                primary="查看文档"
                secondary="访问在线文档了解更多功能"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Help />
              </ListItemIcon>
              <ListItemText
                primary="获取帮助"
                secondary="如有问题，请查看FAQ或联系支持"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      <Box sx={{ mt: 'auto', pt: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Button variant="outlined" onClick={openDocumentation}>
          查看文档
        </Button>
        <Button variant="contained" onClick={openTerminal}>
          打开终端
        </Button>
      </Box>
    </Box>
  );
};

export default CompletionStep;