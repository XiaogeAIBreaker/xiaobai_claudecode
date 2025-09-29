/**
 * API配置步骤组件
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  TextField,
  FormHelperText
} from '@mui/material';

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
  const [apiKey, setApiKey] = useState('');
  const [configured, setConfigured] = useState(false);

  const configureApi = async () => {
    if (!apiKey.trim()) {
      onError('请输入有效的API密钥');
      return;
    }

    try {
      // 这里应该调用配置API的方法
      setConfigured(true);
      onComplete({ apiKey });
    } catch (error) {
      onError('API配置失败');
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" gutterBottom>
        API 配置
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        请输入您的Claude API密钥以完成配置。
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <TextField
            fullWidth
            label="Claude API Key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            sx={{ mb: 2 }}
          />
          <FormHelperText>
            您可以在 Anthropic Console 中获取API密钥
          </FormHelperText>

          {configured && (
            <Alert severity="success" sx={{ mt: 2 }}>
              API密钥配置成功！
            </Alert>
          )}
        </CardContent>
      </Card>

      <Box sx={{ mt: 'auto', pt: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Box />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!configured && (
            <Button variant="contained" onClick={configureApi}>
              配置API
            </Button>
          )}
          {configured && (
            <Alert severity="success">
              API配置完成，请点击下方"下一步"按钮继续。
            </Alert>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ApiConfigStep;