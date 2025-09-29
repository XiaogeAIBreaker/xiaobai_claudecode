/**
 * T034: Google服务设置步骤组件
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
  Chip
} from '@mui/material';
import { CheckCircle, Error, Language } from '@mui/icons-material';
import { DetectionResult, DetectionStatus, GoogleEnvironment } from '../../../shared/types/environment';

interface GoogleSetupStepProps {
  onComplete: (data?: any) => void;
  onError: (error: string) => void;
  onNext: () => void;
  canGoNext: boolean;
}

const GoogleSetupStep: React.FC<GoogleSetupStepProps> = ({
  onComplete,
  onError,
  onNext,
  canGoNext
}) => {
  const [checking, setChecking] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [googleData, setGoogleData] = useState<GoogleEnvironment | null>(null);

  const checkGoogleAccess = async () => {
    try {
      setChecking(true);
      const result = await window.electronAPI.detect.google();
      setDetectionResult(result);

      if (result.status === DetectionStatus.SUCCESS && result.data) {
        setGoogleData(result.data as GoogleEnvironment);
        onComplete(result.data);
      }
    } catch (error: any) {
      onError(String(error));
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkGoogleAccess();
  }, []);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" gutterBottom>
        Google 服务设置
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        检查Google服务的访问状态，Claude CLI可能需要访问某些Google服务。
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            访问状态
          </Typography>

          {googleData && (
            <List>
              <ListItem>
                <ListItemIcon>
                  {googleData.accessible ? <CheckCircle color="success" /> : <Error color="error" />}
                </ListItemIcon>
                <ListItemText
                  primary="Google服务"
                  secondary={googleData.accessible ? '可以正常访问' : '无法访问'}
                />
                <Chip
                  label={googleData.accessible ? '正常' : '受限'}
                  color={googleData.accessible ? 'success' : 'warning'}
                  size="small"
                />
              </ListItem>
            </List>
          )}

          {detectionResult?.status === DetectionStatus.SUCCESS ? (
            <Alert severity="success" sx={{ mt: 2 }}>
              Google服务检查完成，可以继续安装。
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Google服务访问受限，但不会影响Claude CLI的基本功能。
            </Alert>
          )}
        </CardContent>
      </Card>

      <Box sx={{ mt: 'auto', pt: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Button variant="outlined" onClick={checkGoogleAccess} disabled={checking}>
          重新检查
        </Button>

        {detectionResult && (
          <Alert severity="success" sx={{ ml: 2, flex: 1 }}>
            Google服务检查完成，请点击下方"下一步"按钮继续。
          </Alert>
        )}
      </Box>
    </Box>
  );
};

export default GoogleSetupStep;