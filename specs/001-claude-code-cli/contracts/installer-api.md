# Installer API Contracts

## GUI应用接口定义

### 应用启动接口

#### `Claude安装助手.exe` / `Claude安装助手.app`
双击启动图形化安装程序。

**启动参数** (可选命令行参数):
- `--lang <language>`: 设置界面语言 (zh-CN, en-US)
- `--config <path>`: 指定配置文件路径
- `--reset`: 重置所有配置到初始状态
- `--resume`: 从上次中断位置继续
- `--silent`: 静默模式（企业部署用）

**GUI行为**:
- 双击启动：显示欢迎界面和向导步骤
- 支持最小化到系统托盘
- 支持暂停和恢复安装
- 自动保存进度状态

**退出代码**:
- `0`: 安装成功完成
- `1`: 用户取消安装
- `2`: 网络连接失败
- `3`: 权限不足
- `4`: 系统不兼容
- `5`: 其他错误

## React组件接口定义

### 主要UI组件

#### WizardStep
向导步骤基础组件。

```typescript
interface WizardStepProps {
  stepNumber: number;
  title: string;
  description: string;
  isActive: boolean;
  isCompleted: boolean;
  canGoNext: boolean;
  canGoPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSkip?: () => void;
  children: React.ReactNode;
}
```

#### ProgressBar
进度指示组件。

```typescript
interface ProgressBarProps {
  totalSteps: number;
  currentStep: number;
  stepProgress: number; // 当前步骤内部进度 0-100
  showStepLabels: boolean;
  stepLabels: string[];
  estimatedTimeRemaining?: number; // 秒数
}
```

#### ErrorDialog
错误处理对话框。

```typescript
interface ErrorDialogProps {
  isOpen: boolean;
  errorCode: string;
  errorMessage: string;
  solution: string;
  canRetry: boolean;
  canSkip: boolean;
  onRetry: () => void;
  onSkip: () => void;
  onClose: () => void;
}
```

#### QRCodeView
二维码显示组件。

```typescript
interface QRCodeViewProps {
  qrCodeData: string;
  title: string;
  description: string;
  showImage: boolean;
  imageSize: number;
  onScanComplete?: () => void;
}
```

## Electron IPC通信接口

### 主进程到渲染进程事件

```typescript
interface MainToRendererEvents {
  'step-progress': (stepNumber: number, progress: number) => void;
  'step-completed': (stepNumber: number, success: boolean) => void;
  'step-error': (stepNumber: number, error: ErrorInfo) => void;
  'detection-result': (component: string, result: DetectionResult) => void;
  'installation-progress': (component: string, progress: number) => void;
  'system-notification': (message: string, type: 'info' | 'warning' | 'error') => void;
}
```

### 渲染进程到主进程命令

```typescript
interface RendererToMainCommands {
  'start-step': (stepNumber: number) => Promise<void>;
  'retry-step': (stepNumber: number) => Promise<void>;
  'skip-step': (stepNumber: number) => Promise<void>;
  'detect-component': (component: string) => Promise<DetectionResult>;
  'install-component': (component: string) => Promise<boolean>;
  'save-config': (config: UserConfig) => Promise<void>;
  'load-config': () => Promise<UserConfig>;
  'open-external-url': (url: string) => Promise<void>;
  'show-qr-code': (data: string) => Promise<void>;
  'minimize-to-tray': () => Promise<void>;
  'exit-app': () => Promise<void>;
}
```

## 内部模块接口

### 检测器模块接口 (Detector)

#### NetworkDetector
网络连接检测模块。

```typescript
interface NetworkDetector {
  checkConnectivity(): Promise<NetworkStatus>;
  testGoogleAccess(): Promise<boolean>;
  testGithubAccess(): Promise<boolean>;
  detectProxy(): Promise<ProxyConfig | null>;
  measureLatency(url: string): Promise<number>;
}
```

#### NodeJsDetector
Node.js环境检测模块。

```typescript
interface NodeJsDetector {
  isInstalled(): Promise<boolean>;
  getVersion(): Promise<string | null>;
  isVersionSupported(version: string): boolean;
  getInstallPath(): Promise<string | null>;
  validateInstallation(): Promise<NodeJsInfo>;
}
```

#### GoogleAccountDetector
Google账户检测模块。

```typescript
interface GoogleAccountDetector {
  hasGoogleAccount(): Promise<boolean>;
  getAccountInfo(): Promise<GoogleAccountInfo | null>;
  validateAccount(email: string): Promise<boolean>;
}
```

#### ClaudeCliDetector
Claude CLI检测模块。

```typescript
interface ClaudeCliDetector {
  isInstalled(): Promise<boolean>;
  getVersion(): Promise<string | null>;
  isConfigured(): Promise<boolean>;
  testConnection(): Promise<boolean>;
  validateInstallation(): Promise<ClaudeCliInfo>;
}
```

### 安装器模块接口 (Installer)

#### NodeJsInstaller
Node.js自动安装模块。

```typescript
interface NodeJsInstaller {
  downloadInstaller(platform: string): Promise<string>;
  install(installerPath: string): Promise<boolean>;
  verify(): Promise<boolean>;
  getInstallProgress(): Promise<number>;
  onProgress(callback: (progress: number) => void): void;
}
```

**实现说明**:
- **Windows**: 下载官方exe安装程序，使用 `/S` 参数进行静默安装
- **macOS**: 下载官方pkg安装包，使用 `installer` 命令安装
- **downloadInstaller**: 根据平台类型下载对应格式的安装包（Windows: .exe, macOS: .pkg）
- **install**: 执行平台特定的安装命令（Windows: `installer.exe /S`, macOS: `sudo installer -pkg installer.pkg -target /`）

#### ClaudeCliInstaller
Claude CLI安装模块。

```typescript
interface ClaudeCliInstaller {
  install(): Promise<boolean>;
  configure(apiKey: string, baseUrl?: string): Promise<boolean>;
  verify(): Promise<boolean>;
  getInstallProgress(): Promise<number>;
}
```

### 引导模块接口 (Guide)

#### GoogleSignupGuide
Google邮箱注册引导。

```typescript
interface GoogleSignupGuide {
  showSignupSteps(): Promise<void>;
  openSignupPage(): Promise<void>;
  waitForCompletion(): Promise<boolean>;
  validateRegistration(): Promise<boolean>;
}
```

#### ApiConfigGuide
API配置引导。

```typescript
interface ApiConfigGuide {
  showQrCode(): Promise<void>;
  promptForApiKey(): Promise<string>;
  promptForBaseUrl(): Promise<string>;
  validateConfig(apiKey: string, baseUrl?: string): Promise<boolean>;
  saveConfig(config: ApiConfig): Promise<void>;
}
```

#### TodoListTutorial
TodoList应用教程。

```typescript
interface TodoListTutorial {
  startTutorial(): Promise<void>;
  showStep(stepNumber: number): Promise<void>;
  executeStep(stepNumber: number): Promise<boolean>;
  verifyCompletion(): Promise<boolean>;
}
```

### 工具模块接口 (Utils)

#### ConfigManager
配置管理工具。

```typescript
interface ConfigManager {
  load(): Promise<UserConfig>;
  save(config: UserConfig): Promise<void>;
  reset(): Promise<void>;
  export(filePath: string): Promise<void>;
  import(filePath: string): Promise<UserConfig>;
  encrypt(data: string): string;
  decrypt(data: string): string;
}
```

#### Logger
日志系统。

```typescript
interface Logger {
  info(message: string, context?: object): void;
  warn(message: string, context?: object): void;
  error(message: string, error?: Error, context?: object): void;
  debug(message: string, context?: object): void;
  setLevel(level: 'debug' | 'info' | 'warn' | 'error'): void;
}
```

#### UIHelper
用户界面工具。

```typescript
interface UIHelper {
  showProgress(title: string, current: number, total: number): void;
  showSpinner(message: string): () => void;
  showSuccess(message: string): void;
  showError(message: string, solution?: string): void;
  showWarning(message: string): void;
  prompt(question: string, defaultValue?: string): Promise<string>;
  confirm(question: string): Promise<boolean>;
  select(question: string, choices: string[]): Promise<string>;
}
```

## 错误处理接口

### 错误代码定义

```typescript
enum ErrorCode {
  // 网络相关错误
  NETWORK_UNREACHABLE = 'E001',
  GOOGLE_ACCESS_BLOCKED = 'E002',
  PROXY_REQUIRED = 'E003',

  // Node.js相关错误
  NODEJS_NOT_FOUND = 'E101',
  NODEJS_VERSION_UNSUPPORTED = 'E102',
  NODEJS_INSTALL_FAILED = 'E103',
  NODEJS_PERMISSION_DENIED = 'E104',

  // Google账户相关错误
  GOOGLE_ACCOUNT_NOT_FOUND = 'E201',
  GOOGLE_ACCOUNT_UNVERIFIED = 'E202',

  // Claude CLI相关错误
  CLAUDE_CLI_INSTALL_FAILED = 'E301',
  CLAUDE_CLI_CONFIG_INVALID = 'E302',
  CLAUDE_CLI_API_ERROR = 'E303',

  // 系统相关错误
  INSUFFICIENT_PERMISSIONS = 'E401',
  INSUFFICIENT_DISK_SPACE = 'E402',
  UNSUPPORTED_PLATFORM = 'E403',

  // 用户相关错误
  USER_CANCELLED = 'E501',
  INVALID_INPUT = 'E502'
}
```

### 错误处理接口

```typescript
interface ErrorHandler {
  handleError(error: Error, context?: object): Promise<void>;
  getSolution(errorCode: ErrorCode): string;
  canRecover(errorCode: ErrorCode): boolean;
  recover(errorCode: ErrorCode): Promise<boolean>;
}
```

## 事件接口

### 安装进度事件

```typescript
interface InstallationEvents {
  onStepStart(stepNumber: number, stepName: string): void;
  onStepProgress(stepNumber: number, progress: number): void;
  onStepComplete(stepNumber: number, success: boolean): void;
  onStepError(stepNumber: number, error: Error): void;
  onInstallationComplete(success: boolean): void;
  onUserInteraction(action: string, data?: object): void;
}
```

---

*合约定义说明*: 所有接口均为TypeScript定义，确保类型安全。异步操作使用Promise，支持取消和超时。错误处理统一化，便于本地化和用户指导。