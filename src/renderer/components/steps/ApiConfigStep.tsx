/**
 * API配置步骤组件
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import { Key, HelpOutline } from '@mui/icons-material';

interface ApiConfigStepProps {
  onComplete: (data?: any) => void;
  onError: (error: string) => void;
  onNext: () => void;
  canGoNext: boolean;
}

const ApiConfigStep: React.FC<ApiConfigStepProps> = ({
  onComplete,
  onError,
  onNext,
  canGoNext
}) => {
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [configured, setConfigured] = useState(false);

  /**
   * 组件挂载时加载已有的环境变量
   */
  useEffect(() => {
    loadExistingConfig();
  }, []);

  /**
   * 加载已有配置
   */
  const loadExistingConfig = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.env.get(['ANTHROPIC_BASE_URL', 'ANTHROPIC_API_KEY']);

      if (result.success && result.data) {
        const loadedBaseUrl = result.data.ANTHROPIC_BASE_URL || '';
        const loadedApiKey = result.data.ANTHROPIC_API_KEY || '';

        setBaseUrl(loadedBaseUrl);
        setApiKey(loadedApiKey);

        // 如果已有配置，自动标记为完成
        if (loadedApiKey) {
          setConfigured(true);
          onComplete({ baseUrl: loadedBaseUrl, apiKey: loadedApiKey });
        }
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 保存配置
   */
  const saveConfig = async () => {
    try {
      setSaving(true);

      const varsToSet: Record<string, string> = {};

      if (baseUrl.trim()) {
        varsToSet.ANTHROPIC_BASE_URL = baseUrl.trim();
      }

      if (apiKey.trim()) {
        varsToSet.ANTHROPIC_API_KEY = apiKey.trim();
      }

      if (Object.keys(varsToSet).length === 0) {
        onError('请至少填写一个配置项');
        return;
      }

      const result = await window.electronAPI.env.set(varsToSet);

      if (result.success) {
        setConfigured(true);
        onComplete(varsToSet);
      } else {
        onError(result.error || '保存配置失败');
      }
    } catch (error: any) {
      onError(error instanceof Error ? error.message : '保存配置时发生错误');
    } finally {
      setSaving(false);
    }
  };

  /**
   * 打开帮助对话框
   */
  const openHelpDialog = () => {
    setHelpDialogOpen(true);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" gutterBottom>
        API 配置
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        配置您的Claude API密钥以使用Claude Code。如果暂时没有API密钥，可以跳过此步骤。
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ ml: 2 }}>
            正在加载配置...
          </Typography>
        </Box>
      ) : (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <TextField
              fullWidth
              label="Base URL (可选)"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.anthropic.com"
              sx={{ mb: 2 }}
              helperText="自定义 API 端点，留空使用默认值"
            />

            <TextField
              fullWidth
              label="API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              sx={{ mb: 2 }}
              helperText="您的 Anthropic API 密钥"
            />

            {configured && (
              <Alert severity="success" sx={{ mt: 2 }}>
                环境变量已配置！下次打开终端时将自动生效。
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Box sx={{ mt: 'auto', pt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<HelpOutline />}
          onClick={openHelpDialog}
        >
          如何获取 API Key？
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<Key />}
            onClick={saveConfig}
            disabled={saving || loading}
          >
            {saving ? '保存中...' : configured ? '更新配置' : '保存配置'}
          </Button>
        </Box>
      </Box>

      {/* 帮助对话框 */}
      <Dialog
        open={helpDialogOpen}
        onClose={() => setHelpDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>如何获取 Claude API Key</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="body1" paragraph>
              目前 Anthropic API 需要申请才能使用。您可以通过以下方式获取：
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              方式一：官方申请
            </Typography>
            <Typography variant="body2" paragraph>
              访问 <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">Anthropic Console</a> 注册并申请 API 访问权限。
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              方式二：国内代理服务
            </Typography>
            <Typography variant="body2" paragraph>
              如果官方申请困难，可以添加我的微信获取国内代理服务信息：
            </Typography>

            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: 'background.default',
              p: 2,
              borderRadius: 1,
              mt: 2
            }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                微信号：your-wechat-id
              </Typography>
              <Typography variant="body2" color="text.secondary">
                添加时请备注：Claude API
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApiConfigStep;
