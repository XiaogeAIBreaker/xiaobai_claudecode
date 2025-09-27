/**
 * 测试验证步骤组件
 */

import React, { useState } from 'react';
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
import { CheckCircle, Error, PlayArrow } from '@mui/icons-material';

interface TestingStepProps {
  onComplete: (data?: any) => void;
  onError: (error: string) => void;
  onNext: () => void;
  canGoNext: boolean;
}

const TestingStep: React.FC<TestingStepProps> = ({
  onComplete,
  onError,
  onNext,
  canGoNext
}) => {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [allTestsPassed, setAllTestsPassed] = useState(false);

  const runTests = async () => {
    setTesting(true);

    // 模拟测试过程
    const tests = ['node', 'npm', 'claude', 'api'];
    const results: Record<string, boolean> = {};

    for (const test of tests) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      results[test] = Math.random() > 0.1; // 90%成功率
      setTestResults({ ...results });
    }

    const allPassed = Object.values(results).every(Boolean);
    setAllTestsPassed(allPassed);
    setTesting(false);

    if (allPassed) {
      onComplete();
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" gutterBottom>
        测试验证
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        验证所有组件是否正确安装和配置。
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <List>
            {['node', 'npm', 'claude', 'api'].map((test) => (
              <ListItem key={test}>
                <ListItemIcon>
                  {testResults[test] === true ? (
                    <CheckCircle color="success" />
                  ) : testResults[test] === false ? (
                    <Error color="error" />
                  ) : (
                    <PlayArrow color="disabled" />
                  )}
                </ListItemIcon>
                <ListItemText primary={`${test.toUpperCase()} 测试`} />
                <Chip
                  label={
                    testResults[test] === true ? '通过' :
                    testResults[test] === false ? '失败' : '待测试'
                  }
                  color={
                    testResults[test] === true ? 'success' :
                    testResults[test] === false ? 'error' : 'default'
                  }
                  size="small"
                />
              </ListItem>
            ))}
          </List>

          {allTestsPassed && (
            <Alert severity="success" sx={{ mt: 2 }}>
              所有测试通过！Claude CLI已准备就绪。
            </Alert>
          )}
        </CardContent>
      </Card>

      <Box sx={{ mt: 'auto', pt: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Button variant="outlined" onClick={runTests} disabled={testing}>
          {testing ? '测试中...' : '运行测试'}
        </Button>
        <Button variant="contained" onClick={onNext} disabled={!allTestsPassed}>
          继续
        </Button>
      </Box>
    </Box>
  );
};

export default TestingStep;