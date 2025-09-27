# Claude Code CLI 安装程序 API 参考

## 📋 概述

本文档提供了Claude Code CLI安装程序的完整API参考，包括IPC通信接口、类型定义、工具函数等。

## 🔌 IPC通信接口

### 环境检测接口

#### `detector:network`

检测网络环境和连接状态。

**调用方式**:
```typescript
const result = await window.electronAPI.detector.network();
```

**返回类型**:
```typescript
interface NetworkDetectionResult {
  connected: boolean;
  proxyDetected: boolean;
  chinaNetwork: boolean;
  speed: number; // Mbps
  latency: number; // ms
  recommendations: string[];
}
```

**示例**:
```typescript
const networkResult = await window.electronAPI.detector.network();
if (networkResult.connected) {
  console.log(`网络速度: ${networkResult.speed} Mbps`);
  console.log(`延迟: ${networkResult.latency} ms`);
}
```

#### `detector:nodejs`

检测Node.js安装状态和版本信息。

**调用方式**:
```typescript
const result = await window.electronAPI.detector.nodejs();
```

**返回类型**:
```typescript
interface NodeJSDetectionResult {
  installed: boolean;
  version?: string;
  path?: string;
  npmVersion?: string;
  architecture: string;
  compatible: boolean;
  recommendations: string[];
}
```

#### `detector:google`

检测Google服务访问状态。

**调用方式**:
```typescript
const result = await window.electronAPI.detector.google();
```

**返回类型**:
```typescript
interface GoogleDetectionResult {
  accessible: boolean;
  accountStatus: 'unknown' | 'logged-in' | 'logged-out';
  servicesAvailable: string[];
  recommendations: string[];
}
```

#### `detector:claude-cli`

检测Claude CLI安装状态。

**调用方式**:
```typescript
const result = await window.electronAPI.detector.claudeCli();
```

**返回类型**:
```typescript
interface ClaudeCliDetectionResult {
  installed: boolean;
  version?: string;
  path?: string;
  configured: boolean;
  apiKeySet: boolean;
  recommendations: string[];
}
```

### 安装器接口

#### `installer:nodejs`

安装Node.js环境。

**调用方式**:
```typescript
const result = await window.electronAPI.installer.nodejs(options);
```

**参数类型**:
```typescript
interface NodeJSInstallOptions {
  version?: string; // 默认使用LTS版本
  architecture?: 'x64' | 'x86' | 'arm64';
  installPath?: string; // 自定义安装路径
  addToPath?: boolean; // 是否添加到PATH
}
```

**返回类型**:
```typescript
interface InstallationResult {
  success: boolean;
  version?: string;
  path?: string;
  message: string;
  errors?: string[];
}
```

#### `installer:claude-cli`

安装Claude CLI工具。

**调用方式**:
```typescript
const result = await window.electronAPI.installer.claudeCli(options);
```

**参数类型**:
```typescript
interface ClaudeCliInstallOptions {
  version?: string; // 默认使用最新版本
  global?: boolean; // 是否全局安装
  registry?: string; // npm registry
}
```

### 配置管理接口

#### `config:get`

获取应用配置。

**调用方式**:
```typescript
const config = await window.electronAPI.config.get(key?);
```

**参数**:
- `key?: string` - 配置键名，不提供则返回所有配置

**返回类型**:
```typescript
type ConfigValue = string | number | boolean | object;
```

#### `config:set`

设置应用配置。

**调用方式**:
```typescript
await window.electronAPI.config.set(key, value);
```

**参数**:
- `key: string` - 配置键名
- `value: ConfigValue` - 配置值

#### `config:reset`

重置配置到默认值。

**调用方式**:
```typescript
await window.electronAPI.config.reset(key?);
```

### UI操作接口

#### `ui:show-notification`

显示系统通知。

**调用方式**:
```typescript
await window.electronAPI.ui.showNotification(options);
```

**参数类型**:
```typescript
interface NotificationOptions {
  title: string;
  body: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number; // 毫秒
  actions?: NotificationAction[];
}

interface NotificationAction {
  id: string;
  label: string;
  callback?: () => void;
}
```

#### `ui:show-dialog`

显示模态对话框。

**调用方式**:
```typescript
const result = await window.electronAPI.ui.showDialog(options);
```

**参数类型**:
```typescript
interface DialogOptions {
  type: 'info' | 'warning' | 'error' | 'question';
  title: string;
  message: string;
  detail?: string;
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
}
```

**返回类型**:
```typescript
interface DialogResult {
  response: number; // 按钮索引
  checkboxChecked?: boolean;
}
```

#### `ui:open-external`

打开外部链接。

**调用方式**:
```typescript
await window.electronAPI.ui.openExternal(url);
```

### 应用控制接口

#### `app:get-version`

获取应用版本信息。

**调用方式**:
```typescript
const version = await window.electronAPI.app.getVersion();
```

#### `app:quit`

退出应用程序。

**调用方式**:
```typescript
await window.electronAPI.app.quit();
```

#### `app:restart`

重启应用程序。

**调用方式**:
```typescript
await window.electronAPI.app.restart();
```

## 📊 类型定义

### 安装器类型

#### `InstallerState`

安装器的全局状态。

```typescript
interface InstallerState {
  status: InstallerStatus;
  currentStep: InstallStep;
  steps: Record<InstallStep, StepState>;
  overallProgress: number; // 0-100
  allowBackward: boolean;
  autoRetry: boolean;
  maxRetries: number;
  currentRetries: number;
}

enum InstallerStatus {
  INITIALIZING = 'initializing',
  READY = 'ready',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

enum InstallStep {
  NETWORK_CHECK = 'network-check',
  NODEJS_INSTALL = 'nodejs-install',
  GOOGLE_SETUP = 'google-setup',
  CLAUDE_INSTALL = 'claude-install',
  API_CONFIG = 'api-config',
  CLI_TEST = 'cli-test',
  COMPLETION = 'completion'
}
```

#### `StepState`

单个安装步骤的状态。

```typescript
interface StepState {
  status: StepStatus;
  progress: number; // 0-100
  message: string;
  details?: string;
  errors: string[];
  warnings: string[];
  canSkip: boolean;
  canRetry: boolean;
  startTime?: Date;
  endTime?: Date;
  data?: any; // 步骤特定数据
}

enum StepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}
```

### 环境检测类型

#### `DetectionResult`

环境检测结果的基础接口。

```typescript
interface DetectionResult {
  success: boolean;
  message: string;
  details?: string;
  recommendations: string[];
  timestamp: Date;
  metadata?: Record<string, any>;
}
```

#### `SystemInfo`

系统信息。

```typescript
interface SystemInfo {
  platform: 'win32' | 'darwin' | 'linux';
  arch: 'x64' | 'x86' | 'arm64';
  version: string;
  hostname: string;
  username: string;
  homedir: string;
  locale: string;
  timezone: string;
}
```

### 配置类型

#### `UserConfig`

用户配置信息。

```typescript
interface UserConfig {
  language: SupportedLanguage;
  theme: Theme;
  apiKey?: string;
  proxySettings?: ProxySettings;
  installationPath?: string;
  autoUpdate: boolean;
  telemetry: boolean;
  preferences: UserPreferences;
}

enum SupportedLanguage {
  ZH_CN = 'zh-CN',
  EN_US = 'en-US'
}

enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto'
}

interface ProxySettings {
  enabled: boolean;
  type: 'http' | 'https' | 'socks5';
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
}
```

#### `ApplicationConfig`

应用程序配置。

```typescript
interface ApplicationConfig {
  window: WindowConfig;
  logging: LoggingConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
}

interface WindowConfig {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  center: boolean;
  resizable: boolean;
  maximizable: boolean;
}

interface LoggingConfig {
  level: LogLevel;
  file: boolean;
  console: boolean;
  maxFileSize: number; // bytes
  maxFiles: number;
}

enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}
```

### UI状态类型

#### `GlobalUIState`

全局UI状态。

```typescript
interface GlobalUIState {
  ui: UIState;
  wizard: WizardState;
  progress: ProgressState;
  notifications: NotificationState;
  dialog: DialogState;
  qrCode: QRCodeState;
  errors: ErrorState[];
  shortcuts: ShortcutState[];
  accessibility: AccessibilityState;
  lastUpdated: Date;
}

interface UIState {
  theme: Theme;
  language: string;
  window: WindowState;
  windowSize: { width: number; height: number };
  windowPosition: { x: number; y: number };
  loading: boolean;
  sidebarVisible: boolean;
  detailsVisible: boolean;
  activePanel: string;
  animations: AnimationState;
}

enum WindowState {
  NORMAL = 'normal',
  MAXIMIZED = 'maximized',
  MINIMIZED = 'minimized',
  FULLSCREEN = 'fullscreen'
}
```

## 🛠️ 工具函数

### 日志工具

#### `log`

结构化日志记录器。

```typescript
import { log } from '../shared/utils/logger';

// 基础日志方法
log.error(message: string, error?: Error, context?: object);
log.warn(message: string, context?: object);
log.info(message: string, context?: object);
log.debug(message: string, context?: object);

// 示例
log.info('安装开始', { step: 'nodejs-install' });
log.error('安装失败', error, { step: 'api-config', retries: 2 });
```

### 配置管理

#### `ConfigManager`

配置管理器类。

```typescript
import { ConfigManager } from '../shared/utils/config';

const config = new ConfigManager();

// 获取配置
const value = await config.get('key', defaultValue);

// 设置配置
await config.set('key', value);

// 重置配置
await config.reset('key');

// 监听配置变化
config.on('change', (key, newValue, oldValue) => {
  console.log(`配置 ${key} 从 ${oldValue} 变更为 ${newValue}`);
});
```

### 系统工具

#### `SystemUtils`

系统相关工具函数。

```typescript
import { SystemUtils } from '../shared/utils/system';

// 获取系统信息
const systemInfo = SystemUtils.getSystemInfo();

// 检查管理员权限
const isAdmin = await SystemUtils.isAdministrator();

// 获取可用磁盘空间
const freeSpace = await SystemUtils.getFreeSpace('/path');

// 检查端口是否可用
const portAvailable = await SystemUtils.isPortAvailable(3000);

// 打开文件浏览器
await SystemUtils.openFileManager('/path');
```

### 性能监控

#### `PerformanceMonitor`

性能监控工具。

```typescript
import { performanceMonitor } from '../shared/utils/performance';

// 记录检查点
performanceMonitor.checkpoint('operation-start');

// 标记启动完成
performanceMonitor.markStartupComplete();

// 测量操作时间
const time = await performanceMonitor.measureResponseTime(async () => {
  // 执行操作
});

// 获取性能指标
const metrics = performanceMonitor.getMetrics();

// 生成性能报告
const report = performanceMonitor.generateReport();
```

### 国际化工具

#### `I18nManager`

国际化管理器。

```typescript
import { i18n } from '../shared/utils/i18n';

// 获取本地化消息
const message = i18n.getMessage('app.title');

// 带参数的消息
const message = i18n.getMessage('step.progress', {
  current: 3,
  total: 7
});

// 切换语言
await i18n.setLanguage(SupportedLanguage.EN_US);

// 获取当前语言
const currentLang = i18n.getCurrentLanguage();
```

## 📱 React组件API

### InstallWizard

主安装向导组件。

**Props**:
```typescript
interface InstallWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
  initialStep?: InstallStep;
  allowBackward?: boolean;
}
```

**使用示例**:
```tsx
<InstallWizard
  onComplete={() => console.log('安装完成')}
  onCancel={() => console.log('安装取消')}
  initialStep={InstallStep.NETWORK_CHECK}
  allowBackward={true}
/>
```

### QRCodeView

二维码显示组件。

**Props**:
```typescript
interface QRCodeViewProps {
  type: QRCodeType;
  title?: string;
  description?: string;
  showFallback?: boolean;
  sx?: any; // Material-UI sx prop
}

enum QRCodeType {
  WECHAT_SUPPORT = 'wechat-support',
  WECHAT_COMMUNITY = 'wechat-community',
  QQ_GROUP = 'qq-group'
}
```

**使用示例**:
```tsx
<QRCodeView
  type={QRCodeType.WECHAT_SUPPORT}
  title="技术支持群"
  showFallback={true}
/>
```

### 步骤组件

每个安装步骤都有对应的React组件：

```typescript
// 通用步骤组件Props
interface StepComponentProps {
  onNext: (data?: any) => void;
  onBack: () => void;
  onSkip: () => void;
  stepState: StepState;
  installerState: InstallerState;
}
```

可用的步骤组件：
- `NetworkCheckStep`
- `NodeInstallStep`
- `GoogleSetupStep`
- `ClaudeInstallStep`
- `ApiConfigStep`
- `TestingStep`
- `CompletionStep`

## 🔌 React Hooks

### usePerformance

性能监控Hook。

```typescript
const { measureInteraction } = usePerformance({
  componentName: 'MyComponent',
  trackRender: true,
  trackInteraction: true,
  threshold: 1000
});

// 测量用户交互
await measureInteraction('button-click', async () => {
  // 处理点击事件
});
```

### useDebounce

防抖Hook。

```typescript
const debouncedValue = useDebounce(value, 300);

useEffect(() => {
  // 在debouncedValue变化时执行搜索
  performSearch(debouncedValue);
}, [debouncedValue]);
```

### useThrottle

节流Hook。

```typescript
const throttledCallback = useThrottle(callback, 1000);

return (
  <button onClick={throttledCallback}>
    点击我
  </button>
);
```

## 🔧 错误处理

### 错误类型

```typescript
enum ErrorType {
  NETWORK_ERROR = 'network-error',
  PERMISSION_ERROR = 'permission-error',
  VALIDATION_ERROR = 'validation-error',
  INSTALLATION_ERROR = 'installation-error',
  CONFIGURATION_ERROR = 'configuration-error',
  UNKNOWN_ERROR = 'unknown-error'
}

interface AppError {
  type: ErrorType;
  code: string;
  message: string;
  details?: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: Date;
  recoverable: boolean;
  suggestions: string[];
}
```

### 错误处理函数

```typescript
import { handleError } from '../shared/utils/error';

try {
  // 可能出错的操作
} catch (error) {
  const appError = handleError(error, {
    context: { operation: 'nodejs-install' },
    suggestions: ['检查网络连接', '重试安装']
  });

  // 显示错误信息
  showErrorDialog(appError);
}
```

## 📈 事件系统

### 事件类型

```typescript
enum EventType {
  STEP_START = 'step:start',
  STEP_COMPLETE = 'step:complete',
  STEP_ERROR = 'step:error',
  PROGRESS_UPDATE = 'progress:update',
  CONFIG_CHANGE = 'config:change',
  PERFORMANCE_WARNING = 'performance:warning'
}

interface AppEvent {
  type: EventType;
  data?: any;
  timestamp: Date;
  source: string;
}
```

### 事件监听

```typescript
import { eventBus } from '../shared/utils/events';

// 监听事件
eventBus.on(EventType.STEP_COMPLETE, (event) => {
  console.log(`步骤完成: ${event.data.step}`);
});

// 发送事件
eventBus.emit(EventType.PROGRESS_UPDATE, {
  step: InstallStep.NODEJS_INSTALL,
  progress: 50
});

// 移除监听器
eventBus.off(EventType.STEP_COMPLETE, handler);
```

## 🧪 测试工具

### 模拟数据

```typescript
// 用于测试的模拟数据
export const mockInstallerState: InstallerState = {
  status: InstallerStatus.RUNNING,
  currentStep: InstallStep.NODEJS_INSTALL,
  steps: {
    [InstallStep.NETWORK_CHECK]: {
      status: StepStatus.COMPLETED,
      progress: 100,
      message: '网络检测完成'
    }
  },
  overallProgress: 30
};

export const mockNetworkResult: NetworkDetectionResult = {
  connected: true,
  proxyDetected: false,
  chinaNetwork: true,
  speed: 100,
  latency: 50,
  recommendations: []
};
```

### 测试工具函数

```typescript
// 创建测试用的Electron API模拟
export function createMockElectronAPI() {
  return {
    detector: {
      network: jest.fn().mockResolvedValue(mockNetworkResult)
    },
    installer: {
      nodejs: jest.fn().mockResolvedValue({ success: true })
    }
  };
}

// 设置测试环境
export function setupTestEnvironment() {
  (window as any).electronAPI = createMockElectronAPI();
}
```

## 📝 使用示例

### 完整的安装流程示例

```typescript
import React, { useState, useEffect } from 'react';
import { InstallWizard } from './components/InstallWizard';
import { performanceMonitor } from '../shared/utils/performance';

function App() {
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // 应用启动时记录性能
    performanceMonitor.markRendererReady();
  }, []);

  const handleInstallComplete = async () => {
    setInstalling(false);

    // 显示完成通知
    await window.electronAPI.ui.showNotification({
      title: '安装完成',
      body: 'Claude Code CLI 已成功安装',
      type: 'success'
    });

    // 可选择性退出应用
    const choice = await window.electronAPI.ui.showDialog({
      type: 'question',
      title: '安装完成',
      message: '是否立即体验Claude CLI？',
      buttons: ['立即体验', '稍后使用']
    });

    if (choice.response === 0) {
      // 打开终端或启动教程
      await window.electronAPI.ui.openExternal('terminal://');
    }
  };

  return (
    <div className="app">
      {installing ? (
        <InstallWizard
          onComplete={handleInstallComplete}
          onCancel={() => setInstalling(false)}
        />
      ) : (
        <WelcomeScreen onStartInstall={() => setInstalling(true)} />
      )}
    </div>
  );
}
```

---

**文档版本**: v1.0.0
**最后更新**: 2025年9月
**API版本**: v1.0.0