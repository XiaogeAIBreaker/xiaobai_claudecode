# Quickstart: Claude Code CLI安装助手

## 快速开始指南

### 前置条件
- Windows 10+ 或 macOS 10.15+
- 网络连接（建议配置代理以访问国外服务）
- 管理员权限（用于软件安装）

### 安装步骤

#### 1. 下载安装助手
从官方网站下载适合您系统的安装助手：
- **Windows**: `Claude安装助手.exe`
- **macOS**: `Claude安装助手.app`

#### 2. 运行安装助手
**Windows用户**:
1. 双击 `Claude安装助手.exe`
2. 如果出现安全提示，点击"更多信息" → "仍要运行"
3. 如果需要管理员权限，点击"是"

**macOS用户**:
1. 双击 `Claude安装助手.app`
2. 如果出现"无法打开"提示，右键点击 → "打开" → "打开"
3. 如果需要输入密码，请输入您的Mac密码

#### 3. 跟随图形化向导完成安装
安装助手将通过友好的图形界面引导您完成：
1. **网络环境检测** - 自动检测网络连接和代理设置
2. **Node.js环境** - 自动下载和安装Node.js
3. **Google邮箱** - 引导注册或验证Google账户
4. **Claude Code CLI** - 自动安装Claude命令行工具
5. **API配置** - 配置API密钥和连接设置
6. **CLI启动测试** - 验证安装是否成功
7. **TodoList教程** - 完成您的第一个项目

## 验证安装

### 图形界面验证
安装助手会在最后一步自动验证所有组件：

1. **界面提示**: 绿色勾选表示各组件安装成功
2. **测试按钮**: 点击"测试Claude CLI"按钮验证功能
3. **状态指示**: 实时显示连接状态和版本信息

### 手动验证（可选）
如果需要手动验证，可以：

#### 打开终端/命令提示符验证
**Windows**: 按 `Win + R`，输入 `cmd`，按回车
**macOS**: 按 `Cmd + 空格`，输入 `terminal`，按回车

```bash
# 检查Claude Code CLI是否安装
claude --version

# 测试基本功能
claude --help

# 验证API配置
claude config show
```

#### 创建测试项目
```bash
# 创建新目录
mkdir test-project
cd test-project

# 初始化项目
claude init

# 验证Claude Code CLI响应
claude "创建一个简单的Hello World程序"
```

#### 验证预期输出
- Claude Code CLI版本信息正常显示
- API配置已正确设置
- 能够与Claude AI正常交互
- 可以创建和修改文件

### 图形界面功能
安装助手还提供以下便利功能：
- **最小化到托盘**: 可以最小化到系统托盘继续后台运行
- **暂停/恢复**: 可以暂停安装过程，稍后继续
- **错误恢复**: 出错时提供图形化解决方案和重试选项
- **进度保存**: 自动保存安装进度，意外关闭后可继续

## 故障排除

### 常见问题

#### 网络连接问题
**症状**: 无法访问Google或GitHub
**解决方案**:
```bash
# 设置代理
claude-installer config set proxy "http://your-proxy:port"

# 或使用系统代理
claude-installer config set useSystemProxy true

# 重新运行安装
claude-installer --resume
```

#### Node.js安装失败
**症状**: Node.js下载或安装失败
**解决方案**:
```bash
# 手动下载Node.js
# Windows: 下载 node-vXX.X.X-x64.exe 双击安装
# macOS: 下载 node-vXX.X.X.pkg 双击安装
# 访问: https://nodejs.org/zh-cn/download/

# 使用镜像源
claude-installer config set nodejsMirror "https://npmmirror.com/mirrors/node/"

# 重试安装
claude-installer --resume
```

#### 权限不足
**症状**: 安装过程中提示权限错误
**解决方案**:
```bash
# Windows: 以管理员身份运行
# 右键 → "以管理员身份运行"

# macOS: 使用sudo
sudo claude-installer

# 或更改安装位置
claude-installer config set installLocation "~/Applications"
```

#### API配置问题
**症状**: Claude CLI无法连接到API
**解决方案**:
```bash
# 重新配置API
claude-installer config

# 或手动设置
claude config set api-key "your-api-key"
claude config set api-base-url "your-base-url"

# 测试连接
claude config test
```

### 重置和重新安装

#### 完全重置
```bash
# 重置所有配置
claude-installer --reset

# 清除缓存
claude-installer config clear-cache

# 重新开始安装
claude-installer
```

#### 部分重置
```bash
# 只重置特定步骤
claude-installer --reset --steps 4,5

# 跳过已完成的步骤
claude-installer --skip 1,2,3
```

## 高级用法

### 配置文件自定义

#### 导出当前配置
```bash
claude-installer config export ./my-config.json
```

#### 配置文件示例
```json
{
  "language": "zh-CN",
  "proxy": {
    "http": "http://proxy.example.com:8080",
    "https": "http://proxy.example.com:8080"
  },
  "mirrors": {
    "nodejs": "https://npmmirror.com/mirrors/node/",
    "npm": "https://registry.npmmirror.com"
  },
  "installLocation": "~/Applications",
  "skipSteps": [],
  "autoRetry": true,
  "maxRetries": 3
}
```

#### 导入配置
```bash
claude-installer config import ./my-config.json
```

### 批量部署

#### 静默安装
```bash
# 使用预配置文件进行静默安装
claude-installer --config ./enterprise-config.json --silent
```

#### 企业配置模板
```json
{
  "language": "zh-CN",
  "silent": true,
  "proxy": {
    "http": "http://corporate-proxy:8080"
  },
  "apiConfig": {
    "baseUrl": "https://api.claude.ai",
    "apiKey": "${CLAUDE_API_KEY}"
  },
  "skipSteps": [3],
  "autoRetry": true
}
```

## 卸载

### 完全卸载
```bash
# 卸载Claude Code CLI
npm uninstall -g @anthropic-ai/claude-code

# 卸载安装程序
npm uninstall -g claude-installer

# 清理配置文件
rm -rf ~/.claude-installer
rm -rf ~/.claude
```

### 保留配置卸载
```bash
# 只卸载程序，保留配置
claude-installer uninstall --keep-config
```

## 支持和反馈

### 获取帮助
```bash
# 显示帮助信息
claude-installer --help

# 检查系统信息
claude-installer check --verbose

# 生成诊断报告
claude-installer diagnose
```

### 联系支持
- 微信支持: 扫描安装程序中的二维码
- GitHub Issues: [项目地址]
- 文档: [在线文档地址]

### 常用命令参考
```bash
# 基本命令
claude-installer                    # 标准安装
claude-installer --help            # 显示帮助
claude-installer --version         # 显示版本

# 配置管理
claude-installer config list       # 列出配置
claude-installer config set <key> <value>  # 设置配置
claude-installer config get <key>  # 获取配置

# 状态检查
claude-installer check             # 检查环境
claude-installer status            # 显示安装状态

# 维护操作
claude-installer --reset           # 重置配置
claude-installer --resume          # 继续安装
claude-installer update            # 更新安装程序
```

---

*快速开始指南*: 为小白用户提供最简单的安装路径，同时为高级用户提供自定义选项。所有操作都有明确的输入和预期输出，便于验证和故障排除。