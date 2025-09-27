# Data Model: Claude Code CLI沉浸式安装程序

## 核心实体定义

### 安装器状态 (InstallerState)
管理整个安装流程的状态和进度信息。

**字段**:
- `currentStep`: number - 当前执行步骤（1-7）
- `stepStatus`: StepStatus[] - 每个步骤的完成状态
- `startTime`: Date - 安装开始时间
- `lastUpdateTime`: Date - 最后更新时间
- `errorHistory`: ErrorRecord[] - 错误历史记录
- `isCompleted`: boolean - 是否完成全部安装
- `canResume`: boolean - 是否可以断点续传

**状态转换**:
- 初始化 → 网络检测 → Node.js检测 → Google邮箱检测 → Claude CLI检测 → API配置 → CLI启动 → TodoList教程 → 完成

### 步骤状态 (StepStatus)
记录单个安装步骤的执行情况。

**字段**:
- `stepNumber`: number - 步骤编号（1-7）
- `name`: string - 步骤名称
- `status`: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
- `startTime`: Date | null - 步骤开始时间
- `endTime`: Date | null - 步骤结束时间
- `progress`: number - 进度百分比（0-100）
- `message`: string - 当前状态描述
- `errorMessage`: string | null - 错误信息
- `canRetry`: boolean - 是否可以重试

**验证规则**:
- stepNumber必须在1-7范围内
- status变更必须遵循状态机规则
- progress必须在0-100范围内

### 环境检测结果 (EnvironmentCheck)
存储各种环境检测的结果。

**字段**:
- `networkConnectivity`: NetworkStatus - 网络连接状态
- `nodeJsInfo`: NodeJsInfo | null - Node.js环境信息
- `googleAccount`: GoogleAccountInfo | null - Google账户信息
- `claudeCliInfo`: ClaudeCliInfo | null - Claude CLI信息
- `systemInfo`: SystemInfo - 系统信息
- `lastCheckTime`: Date - 最后检测时间

### 网络状态 (NetworkStatus)
网络连接检测结果。

**字段**:
- `canAccessGoogle`: boolean - 是否可访问Google服务
- `canAccessGithub`: boolean - 是否可访问GitHub
- `canAccessNpm`: boolean - 是否可访问NPM源
- `proxyConfig`: ProxyConfig | null - 代理配置
- `recommendedMirrors`: string[] - 推荐镜像源
- `latency`: number - 网络延迟（毫秒）

### Node.js信息 (NodeJsInfo)
Node.js环境检测结果。

**字段**:
- `isInstalled`: boolean - 是否已安装
- `version`: string | null - 版本号
- `installPath`: string | null - 安装路径
- `npmVersion`: string | null - NPM版本
- `isVersionSupported`: boolean - 版本是否满足要求
- `needsUpdate`: boolean - 是否需要更新

### Google账户信息 (GoogleAccountInfo)
Google账户相关信息。

**字段**:
- `hasAccount`: boolean - 是否有Google账户
- `email`: string | null - 邮箱地址（仅存储非敏感标识）
- `isVerified`: boolean - 是否已验证
- `needsRegistration`: boolean - 是否需要注册
- `registrationSteps`: RegistrationStep[] - 注册步骤指导

### Claude CLI信息 (ClaudeCliInfo)
Claude Code CLI状态信息。

**字段**:
- `isInstalled`: boolean - 是否已安装
- `version`: string | null - 版本号
- `installPath`: string | null - 安装路径
- `isConfigured`: boolean - 是否已配置
- `lastTestTime`: Date | null - 最后测试时间
- `testResult`: 'success' | 'failed' | 'pending' | null - 测试结果

### 用户配置 (UserConfig)
用户自定义配置和偏好设置。

**字段**:
- `language`: 'zh-CN' | 'en-US' - 界面语言
- `apiKey`: string | null - API密钥（加密存储）
- `apiBaseUrl`: string | null - API基础URL
- `proxySettings`: ProxyConfig | null - 代理设置
- `installLocation`: string | null - 自定义安装位置
- `skipSteps`: number[] - 跳过的步骤
- `autoRetry`: boolean - 是否自动重试
- `maxRetries`: number - 最大重试次数

**安全规则**:
- apiKey必须加密存储
- 敏感信息不记录到日志
- 配置文件权限限制

### 错误记录 (ErrorRecord)
错误信息记录。

**字段**:
- `stepNumber`: number - 发生错误的步骤
- `errorCode`: string - 错误代码
- `errorMessage`: string - 错误描述
- `timestamp`: Date - 发生时间
- `context`: object - 错误上下文信息
- `resolution`: string | null - 解决方案
- `isResolved`: boolean - 是否已解决

### 系统信息 (SystemInfo)
操作系统和硬件信息。

**字段**:
- `platform`: 'win32' | 'darwin' | 'linux' - 操作系统平台
- `osVersion`: string - 操作系统版本
- `architecture`: string - 系统架构
- `totalMemory`: number - 总内存（字节）
- `freeMemory`: number - 可用内存（字节）
- `homeDirectory`: string - 用户主目录
- `tempDirectory`: string - 临时目录
- `installerFileExtension`: string - 平台对应的安装包扩展名（Windows: '.exe', macOS: '.pkg'）
- `installerCommand`: string - 平台对应的安装命令模板

### GUI界面状态 (UIState)
管理图形界面的显示状态和用户交互。

**字段**:
- `currentWizardStep`: number - 当前向导步骤（1-7）
- `isMinimized`: boolean - 是否最小化到托盘
- `showProgressBar`: boolean - 是否显示进度条
- `showErrorDialog`: boolean - 是否显示错误对话框
- `showQRCode`: boolean - 是否显示二维码
- `windowSize`: WindowSize - 窗口大小和位置
- `theme`: 'light' | 'dark' | 'auto' - 界面主题
- `language`: 'zh-CN' | 'en-US' - 界面语言
- `animationsEnabled`: boolean - 是否启用动画效果

**状态转换**:
- 正常模式 ↔ 最小化模式
- 步骤页面间的向导导航
- 错误状态 → 恢复状态

### 窗口状态 (WindowSize)
窗口大小和位置信息。

**字段**:
- `width`: number - 窗口宽度
- `height`: number - 窗口高度
- `x`: number - 窗口X坐标
- `y`: number - 窗口Y坐标
- `isMaximized`: boolean - 是否最大化
- `isFullscreen`: boolean - 是否全屏

### 向导页面状态 (WizardPageState)
单个向导页面的状态信息。

**字段**:
- `pageId`: string - 页面标识符
- `title`: string - 页面标题
- `isLoading`: boolean - 是否正在加载
- `canGoNext`: boolean - 是否可以进入下一步
- `canGoPrevious`: boolean - 是否可以返回上一步
- `canSkip`: boolean - 是否可以跳过
- `validationErrors`: string[] - 验证错误列表
- `userInputs`: Record<string, any> - 用户输入数据

## 实体关系

```
InstallerState 1:N StepStatus
InstallerState 1:N ErrorRecord
InstallerState 1:1 EnvironmentCheck
InstallerState 1:1 UserConfig
InstallerState 1:1 UIState

EnvironmentCheck 1:1 NetworkStatus
EnvironmentCheck 1:1 SystemInfo
EnvironmentCheck 0:1 NodeJsInfo
EnvironmentCheck 0:1 GoogleAccountInfo
EnvironmentCheck 0:1 ClaudeCliInfo

UserConfig 0:1 ProxyConfig

UIState 1:1 WindowSize
UIState 1:N WizardPageState
```

## 数据存储策略

### 本地配置文件
- **位置**: `~/.claude-installer/`
- **主配置**: `config.json` - 用户配置和安装状态
- **状态文件**: `state.json` - 当前安装进度
- **错误日志**: `errors.log` - 错误记录
- **缓存目录**: `cache/` - 下载文件缓存

### 数据持久化规则
- 每个步骤完成后立即保存状态
- 错误发生时记录详细上下文
- 敏感信息加密存储
- 定期清理过期缓存文件

### 数据备份和恢复
- 支持导出/导入配置
- 提供重置到初始状态功能
- 保留最近3次安装历史

---

*数据模型设计原则*: 结构化存储安装状态，支持断点续传，保障数据安全，便于调试和恢复。