# Data Model: Claude Code CLI 安装程序用户体验优化

**Feature**: 002-1-2-3
**Date**: 2025-09-28
**Status**: Draft

## 核心实体

### InstallationStep (安装步骤)
```typescript
interface InstallationStep {
  id: string;                    // 步骤唯一标识
  name: string;                  // 步骤名称
  description: string;           // 步骤描述
  order: number;                 // 执行顺序
  status: StepStatus;           // 当前状态
  isOptional: boolean;          // 是否可选
  canSkip: boolean;             // 是否可跳过
  hasAutoDetection: boolean;    // 是否支持自动检测
  estimatedDuration: number;    // 预估耗时(秒)
}

enum StepStatus {
  PENDING = 'pending',           // 待执行
  RUNNING = 'running',           // 执行中
  SUCCESS = 'success',           // 成功
  FAILED = 'failed',             // 失败
  SKIPPED = 'skipped'            // 已跳过
}
```

### DetectionResult (检测结果)
```typescript
interface DetectionResult {
  stepId: string;               // 关联的步骤ID
  type: DetectionType;          // 检测类型
  status: DetectionStatus;      // 检测状态
  message: string;              // 状态消息
  details?: any;                // 详细信息
  timestamp: Date;              // 检测时间
  duration: number;             // 检测耗时(毫秒)
  canRetry: boolean;           // 是否可重试
  autoFixAvailable: boolean;   // 是否可自动修复
}

enum DetectionType {
  NETWORK_CONNECTION = 'network_connection',
  DNS_RESOLUTION = 'dns_resolution',
  GOOGLE_ACCESS = 'google_access',
  NODE_INSTALLATION = 'node_installation',
  NPM_REGISTRY = 'npm_registry',
  CLAUDE_CLI = 'claude_cli',
  API_CONFIGURATION = 'api_configuration'
}

enum DetectionStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  WARNING = 'warning',
  TIMEOUT = 'timeout'
}
```

### UserConfiguration (用户配置)
```typescript
interface UserConfiguration {
  userId?: string;              // 用户标识（可选）
  preferences: UserPreferences; // 用户偏好设置
  apiConfig: ApiConfiguration; // API配置
  installationHistory: InstallationRecord[]; // 安装历史
  skipOptionalSteps: string[]; // 跳过的可选步骤
  customSettings: Record<string, any>; // 自定义设置
}

interface UserPreferences {
  language: string;            // 界面语言
  theme: 'light' | 'dark';    // 主题设置
  autoUpdate: boolean;        // 自动更新
  telemetry: boolean;         // 遥测数据
  verboseLogging: boolean;    // 详细日志
}

interface ApiConfiguration {
  anthropicBaseUrl?: string;   // ANTHROPIC_BASE_URL
  anthropicApiKey?: string;    // ANTHROPIC_API_KEY (加密存储)
  isConfigured: boolean;      // 是否已配置
  lastValidated?: Date;       // 最后验证时间
  validationStatus: 'valid' | 'invalid' | 'unknown'; // 验证状态
}
```

### InstallationRecord (安装记录)
```typescript
interface InstallationRecord {
  id: string;                  // 记录ID
  startTime: Date;            // 开始时间
  endTime?: Date;             // 结束时间
  status: InstallationStatus; // 安装状态
  completedSteps: string[];   // 已完成步骤
  failedSteps: FailedStepInfo[]; // 失败步骤
  platformInfo: PlatformInfo; // 平台信息
  errorLogs: string[];        // 错误日志
}

enum InstallationStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

interface FailedStepInfo {
  stepId: string;
  error: string;
  timestamp: Date;
  retryCount: number;
}

interface PlatformInfo {
  os: string;                 // 操作系统
  version: string;            // 系统版本
  arch: string;               // 系统架构
  nodeVersion?: string;       // Node.js版本
  npmVersion?: string;        // npm版本
}
```

### NavigationState (导航状态)
```typescript
interface NavigationState {
  currentStepIndex: number;    // 当前步骤索引
  canGoBack: boolean;         // 是否可以返回
  canGoNext: boolean;         // 是否可以继续
  totalSteps: number;         // 总步骤数
  progressPercentage: number; // 进度百分比
  navigationHistory: number[]; // 导航历史
}
```

### NetworkConfiguration (网络配置)
```typescript
interface NetworkConfiguration {
  proxyEnabled: boolean;      // 是否启用代理（已移除UI，但保留配置）
  proxyUrl?: string;         // 代理地址
  useCustomDns: boolean;     // 是否使用自定义DNS
  customDnsServers: string[]; // 自定义DNS服务器
  timeoutSettings: TimeoutSettings; // 超时设置
  retryPolicy: RetryPolicy;  // 重试策略
}

interface TimeoutSettings {
  connectionTimeout: number;  // 连接超时(毫秒)
  dnsTimeout: number;        // DNS解析超时(毫秒)
  downloadTimeout: number;   // 下载超时(毫秒)
}

interface RetryPolicy {
  maxRetries: number;        // 最大重试次数
  retryDelay: number;        // 重试间隔(毫秒)
  exponentialBackoff: boolean; // 指数退避
}
```

## 数据关系

### 实体关系图
```
InstallationRecord (1) -----> (*) InstallationStep
InstallationStep (1) --------> (*) DetectionResult
UserConfiguration (1) -------> (1) ApiConfiguration
UserConfiguration (1) -------> (*) InstallationRecord
NavigationState (1) ---------> (1) InstallationStep (current)
NetworkConfiguration (1) ----> (*) DetectionResult
```

### 数据流
1. **安装流程启动** → 创建 InstallationRecord
2. **步骤执行** → 更新 InstallationStep.status
3. **自动检测** → 生成 DetectionResult
4. **用户配置** → 更新 UserConfiguration
5. **导航操作** → 更新 NavigationState

## 验证规则

### InstallationStep 验证
- `order` 必须唯一且连续
- `name` 不能为空
- 可选步骤不能阻塞安装流程

### DetectionResult 验证
- `stepId` 必须对应有效的安装步骤
- `duration` 不能为负数
- 超时检测的 `duration` 应该接近配置的超时时间

### UserConfiguration 验证
- `apiConfig.anthropicApiKey` 必须加密存储
- `preferences.language` 必须是支持的语言代码
- `installationHistory` 按时间倒序排列

### NavigationState 验证
- `currentStepIndex` 必须在有效范围内
- `progressPercentage` 必须在0-100之间
- `totalSteps` 必须等于定义的步骤总数

## 状态转换

### 安装步骤状态转换
```
PENDING → RUNNING → SUCCESS
PENDING → RUNNING → FAILED
PENDING → SKIPPED
RUNNING → FAILED → RUNNING (重试)
```

### 检测状态转换
```
开始检测 → SUCCESS/FAILED/WARNING/TIMEOUT
FAILED → 重试检测 (如果 canRetry = true)
TIMEOUT → 重试检测 (如果 canRetry = true)
```

## 数据持久化

### 本地存储
- **配置文件**: `~/.claude-installer/config.json`
- **日志文件**: `~/.claude-installer/logs/`
- **临时文件**: `~/.claude-installer/temp/`

### 加密存储
- API密钥使用系统密钥链存储
- 敏感配置项使用AES加密
- 密钥派生使用PBKDF2

### 数据迁移
- 版本兼容性检查
- 配置格式自动升级
- 数据备份和恢复机制