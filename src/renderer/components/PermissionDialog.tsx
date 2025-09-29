/**
 * 权限对话框组件
 * 向用户解释为什么需要管理员权限
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Security,
  Download,
  Settings,
  VerifiedUser
} from '@mui/icons-material';

interface PermissionDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const PermissionDialog: React.FC<PermissionDialogProps> = ({
  open,
  onConfirm,
  onCancel
}) => {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Security color="warning" />
        需要管理员权限
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          为了安装 Node.js，需要您的管理员权限确认
        </Alert>

        <Typography variant="body1" paragraph>
          我们需要管理员权限来执行以下操作：
        </Typography>

        <List>
          <ListItem>
            <ListItemIcon>
              <Download color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="下载 Node.js 安装包"
              secondary="从官方 nodejs.org 下载最新稳定版"
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <VerifiedUser color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="验证文件完整性"
              secondary="使用 SHA256 校验确保文件安全"
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <Settings color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="安装到系统目录"
              secondary="将 Node.js 安装到 /usr/local/bin 等系统目录"
            />
          </ListItem>
        </List>

        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>完全安全：</strong>我们只安装官方 Node.js，不会修改其他系统文件或收集任何个人信息。
          </Typography>
        </Alert>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            💡 <strong>接下来会发生什么：</strong>
            <br />
            1. 点击"继续"后，系统会弹出密码输入框
            <br />
            2. 请输入您的 Mac 用户密码
            <br />
            3. 我们会自动下载并安装 Node.js
            <br />
            4. 整个过程大约需要 2-5 分钟
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel} color="inherit">
          取消
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="primary"
          startIcon={<Security />}
        >
          继续安装
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PermissionDialog;