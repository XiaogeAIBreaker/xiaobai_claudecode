# Installer API Contract

**Feature**: 002-1-2-3 Claude Code CLI 安装程序用户体验优化
**Date**: 2025-09-28
**Version**: 1.0.0

## API Overview

安装程序的内部API合约，定义主进程和渲染进程之间的IPC通信接口。

## IPC Channels

### Navigation API

#### `installer:navigation:next`
**Description**: 用户点击"下一步"按钮
**Direction**: Renderer → Main
**Request**:
```typescript
interface NextStepRequest {
  currentStepId: string;
  skipCurrent?: boolean;
}
```
**Response**:
```typescript
interface NextStepResponse {
  success: boolean;
  nextStepId?: string;
  error?: string;
}
```

#### `installer:navigation:previous`
**Description**: 用户点击"上一步"按钮
**Direction**: Renderer → Main
**Request**:
```typescript
interface PreviousStepRequest {
  currentStepId: string;
}
```
**Response**:
```typescript
interface PreviousStepResponse {
  success: boolean;
  previousStepId?: string;
  error?: string;
}
```

#### `installer:navigation:state-changed`
**Description**: 导航状态变化通知
**Direction**: Main → Renderer
**Payload**:
```typescript
interface NavigationStateChanged {
  currentStepIndex: number;
  canGoBack: boolean;
  canGoNext: boolean;
  progressPercentage: number;
}
```

### Step Execution API

#### `installer:step:start`
**Description**: 开始执行安装步骤
**Direction**: Renderer → Main
**Request**:
```typescript
interface StartStepRequest {
  stepId: string;
  options?: {
    skipDetection?: boolean;
    autoFix?: boolean;
  };
}
```
**Response**:
```typescript
interface StartStepResponse {
  success: boolean;
  taskId?: string;
  error?: string;
}
```

#### `installer:step:progress`
**Description**: 步骤执行进度通知
**Direction**: Main → Renderer
**Payload**:
```typescript
interface StepProgress {
  stepId: string;
  taskId: string;
  progress: number; // 0-100
  message: string;
  details?: any;
}
```

#### `installer:step:completed`
**Description**: 步骤执行完成通知
**Direction**: Main → Renderer
**Payload**:
```typescript
interface StepCompleted {
  stepId: string;
  taskId: string;
  status: 'success' | 'failed' | 'warning';
  message: string;
  canRetry: boolean;
  autoFixApplied?: boolean;
}
```

### Detection API

#### `installer:detection:start`
**Description**: 开始自动检测
**Direction**: Renderer → Main
**Request**:
```typescript
interface StartDetectionRequest {
  detectionType: DetectionType;
  options?: DetectionOptions;
}

interface DetectionOptions {
  timeout?: number;
  retryCount?: number;
  customConfig?: any;
}
```
**Response**:
```typescript
interface StartDetectionResponse {
  success: boolean;
  detectionId?: string;
  error?: string;
}
```

#### `installer:detection:result`
**Description**: 检测结果通知
**Direction**: Main → Renderer
**Payload**:
```typescript
interface DetectionResult {
  detectionId: string;
  type: DetectionType;
  status: DetectionStatus;
  message: string;
  details: {
    duration: number;
    canRetry: boolean;
    autoFixAvailable: boolean;
    recommendations?: string[];
  };
}
```

### Network API

#### `installer:network:test-connection`
**Description**: 测试网络连接
**Direction**: Renderer → Main
**Request**:
```typescript
interface TestConnectionRequest {
  targets: string[]; // URLs to test
  timeout?: number;
}
```
**Response**:
```typescript
interface TestConnectionResponse {
  results: {
    url: string;
    success: boolean;
    responseTime?: number;
    error?: string;
  }[];
}
```

#### `installer:network:test-dns`
**Description**: 测试DNS解析
**Direction**: Renderer → Main
**Request**:
```typescript
interface TestDnsRequest {
  domains: string[];
  dnsServers?: string[];
}
```
**Response**:
```typescript
interface TestDnsResponse {
  results: {
    domain: string;
    success: boolean;
    ips?: string[];
    responseTime?: number;
    error?: string;
  }[];
}
```

### Node.js API

#### `installer:nodejs:check-installation`
**Description**: 检查Node.js安装状态
**Direction**: Renderer → Main
**Request**: `void`
**Response**:
```typescript
interface NodeInstallationStatus {
  installed: boolean;
  version?: string;
  path?: string;
  npmVersion?: string;
  compatible: boolean;
  recommendedAction: 'none' | 'install' | 'update';
}
```

#### `installer:nodejs:set-registry`
**Description**: 设置npm镜像源
**Direction**: Renderer → Main
**Request**:
```typescript
interface SetRegistryRequest {
  registry: string; // e.g., "https://registry.npmmirror.com/"
  scope?: string;   // e.g., "@anthropic-ai"
}
```
**Response**:
```typescript
interface SetRegistryResponse {
  success: boolean;
  previousRegistry?: string;
  error?: string;
}
```

### Claude CLI API

#### `installer:claude:check-installation`
**Description**: 检查Claude CLI安装状态
**Direction**: Renderer → Main
**Request**: `void`
**Response**:
```typescript
interface ClaudeInstallationStatus {
  installed: boolean;
  version?: string;
  path?: string;
  working: boolean; // 命令是否正常工作
  needsUpdate: boolean;
}
```

#### `installer:claude:install`
**Description**: 安装Claude CLI
**Direction**: Renderer → Main
**Request**:
```typescript
interface InstallClaudeRequest {
  force?: boolean; // 强制重新安装
  global?: boolean; // 全局安装
}
```
**Response**:
```typescript
interface InstallClaudeResponse {
  success: boolean;
  taskId?: string;
  error?: string;
}
```

### Configuration API

#### `installer:config:get`
**Description**: 获取配置
**Direction**: Renderer → Main
**Request**:
```typescript
interface GetConfigRequest {
  keys?: string[]; // 获取特定配置项，为空则获取全部
}
```
**Response**:
```typescript
interface GetConfigResponse {
  config: UserConfiguration;
}
```

#### `installer:config:set`
**Description**: 设置配置
**Direction**: Renderer → Main
**Request**:
```typescript
interface SetConfigRequest {
  config: Partial<UserConfiguration>;
  encrypt?: string[]; // 需要加密的字段
}
```
**Response**:
```typescript
interface SetConfigResponse {
  success: boolean;
  error?: string;
}
```

#### `installer:config:validate-api`
**Description**: 验证API配置
**Direction**: Renderer → Main
**Request**:
```typescript
interface ValidateApiRequest {
  baseUrl?: string;
  apiKey: string;
  timeout?: number;
}
```
**Response**:
```typescript
interface ValidateApiResponse {
  valid: boolean;
  error?: string;
  userInfo?: {
    id?: string;
    email?: string;
    plan?: string;
  };
}
```

## Error Handling

### 标准错误格式
```typescript
interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  requestId?: string;
}
```

### 错误代码
- `NETWORK_ERROR`: 网络连接错误
- `TIMEOUT_ERROR`: 操作超时
- `PERMISSION_ERROR`: 权限不足
- `VALIDATION_ERROR`: 参数验证错误
- `SYSTEM_ERROR`: 系统错误
- `USER_CANCELLED`: 用户取消操作

## Security Considerations

### 数据加密
- API密钥在IPC传输时必须加密
- 敏感配置使用安全存储

### 权限控制
- 只有授权的渲染进程可以调用API
- 危险操作需要用户确认

### 输入验证
- 所有输入参数必须验证
- 防止代码注入攻击

## Rate Limiting

### 检测API限制
- 每个检测类型每分钟最多10次调用
- 网络检测最多并发3个请求

### 配置API限制
- 配置更新每秒最多1次
- API验证每分钟最多5次

## Version Compatibility

### API版本管理
- 使用语义化版本控制
- 向后兼容性保证
- 废弃API的迁移路径

### 客户端兼容性
- 主进程和渲染进程版本检查
- 不兼容版本的处理策略