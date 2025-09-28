# Quickstart Guide: Claude Code CLI 安装程序优化

**Feature**: 002-1-2-3
**Date**: 2025-09-28
**Target Audience**: 开发者、测试人员

## 概述

这个快速开始指南将帮助您设置和验证Claude Code CLI安装程序的用户体验优化功能。

## 前提条件

### 开发环境要求
- Node.js 18+
- npm 8+
- Git
- Visual Studio Code (推荐)

### 系统要求
- Windows 10+ 或 macOS 10.15+
- 至少 4GB RAM
- 1GB 可用磁盘空间

## 快速设置

### 1. 克隆和设置项目
```bash
# 克隆项目
git clone <repository-url>
cd xiaobai_claudecode

# 切换到功能分支
git checkout 002-1-2-3

# 安装依赖
npm install

# 安装开发依赖
npm install --save-dev
```

### 2. 配置开发环境
```bash
# 复制环境配置模板
cp .env.example .env

# 编辑环境变量（可选）
# ELECTRON_DEV=true
# LOG_LEVEL=debug
```

### 3. 构建和运行
```bash
# 开发模式运行
npm run dev

# 或分别启动
npm run build:main    # 构建主进程
npm run build:renderer # 构建渲染进程
npm run start         # 启动应用
```

## 功能验证清单

### ✅ 通用导航优化
- [ ] 打开安装程序
- [ ] 验证每个步骤完成后只显示"下一步"按钮
- [ ] 验证没有重复的"继续安装"按钮
- [ ] 测试"上一步"/"下一步"导航正常工作
- [ ] 验证进度条正确显示

**预期结果**: 界面简洁，导航逻辑清晰，无重复按钮。

### ✅ 网络检查优化
- [ ] 进入网络检查步骤
- [ ] 验证代理设置选项已移除
- [ ] 测试互联网连接检测
- [ ] 测试DNS解析检测
- [ ] 验证检测完成后无延迟卡顿
- [ ] 验证Google连接检测包含在此步骤

**预期结果**: 网络检测快速完成，界面响应流畅，无卡顿现象。

**测试命令**:
```bash
# 模拟网络检测
npm run test:network

# 查看检测日志
tail -f ~/.claude-installer/logs/network.log
```

### ✅ Node.js安装优化
- [ ] 进入Node.js安装步骤
- [ ] 验证自动检测Node.js安装状态
- [ ] 验证自动设置淘宝镜像源（中国用户）
- [ ] 测试手动切换镜像源功能
- [ ] 验证安装进度显示

**预期结果**: 自动配置中国镜像源，安装速度明显提升。

**测试命令**:
```bash
# 检查当前npm配置
npm config list

# 验证镜像源设置
npm config get registry

# 测试下载速度
npm install --dry-run @anthropic-ai/claude-code
```

### ✅ Google设置重构
- [ ] 进入Google设置步骤
- [ ] 验证这里是邮箱登录引导而非连接检测
- [ ] 测试登录指引的用户体验
- [ ] 验证可以跳过此步骤

**预期结果**: 步骤目的明确，专注于Google账户配置。

### ✅ Claude CLI安装优化
- [ ] 进入Claude CLI安装步骤
- [ ] 验证自动检测claude命令可用性
- [ ] 测试未安装时的自动安装功能
- [ ] 验证安装进度和状态反馈
- [ ] 测试安装失败的重试机制

**预期结果**: 可靠的自动检测和安装，无需用户手动操作。

**测试命令**:
```bash
# 手动检测Claude CLI
which claude

# 验证Claude CLI工作状态
claude --version

# 模拟安装过程
npm install -g @anthropic-ai/claude-code --dry-run
```

### ✅ API配置优化
- [ ] 进入API配置步骤
- [ ] 验证步骤标记为可选
- [ ] 测试ANTHROPIC_BASE_URL配置
- [ ] 测试ANTHROPIC_API_KEY配置
- [ ] 验证配置验证功能
- [ ] 测试"联系支持"引导功能

**预期结果**: 配置选项清晰，有适当的用户支持指引。

**测试命令**:
```bash
# 验证环境变量设置
echo $ANTHROPIC_BASE_URL
echo $ANTHROPIC_API_KEY

# 测试API连接
curl -H "Authorization: Bearer $ANTHROPIC_API_KEY" \
     "$ANTHROPIC_BASE_URL/health" || echo "测试连接"
```

## 性能验证

### 启动性能
```bash
# 测量启动时间
time npm run start

# 期望: ≤ 3秒
```

### 内存使用
```bash
# 监控内存使用（macOS）
top -pid $(pgrep -f "claude-installer")

# 期望: ≤ 200MB
```

### 响应性测试
- [ ] 点击各种按钮，响应时间 < 200ms
- [ ] 切换步骤时界面不卡顿
- [ ] 长时间运行不出现内存泄漏

## 跨平台验证

### Windows测试
```cmd
# Windows特定测试
npm run test:windows

# 验证路径处理
npm run test:paths:windows
```

### macOS测试
```bash
# macOS特定测试
npm run test:macos

# 验证权限处理
npm run test:permissions:macos
```

## 故障排除

### 常见问题

#### 启动失败
```bash
# 清理并重新构建
npm run clean
npm run build
npm run start
```

#### 网络检测失败
```bash
# 检查网络配置
npm run diagnose:network

# 查看详细日志
DEBUG=* npm run start
```

#### Claude CLI安装失败
```bash
# 手动清理npm缓存
npm cache clean --force

# 手动安装Claude CLI
npm install -g @anthropic-ai/claude-code

# 验证安装
claude --version
```

### 日志文件位置
- **主日志**: `~/.claude-installer/logs/main.log`
- **渲染进程日志**: `~/.claude-installer/logs/renderer.log`
- **网络日志**: `~/.claude-installer/logs/network.log`
- **安装日志**: `~/.claude-installer/logs/installation.log`

### 调试模式
```bash
# 启用详细日志
export DEBUG=claude-installer:*
npm run start

# 启用Electron DevTools
export ELECTRON_DEV=true
npm run start
```

## 测试套件

### 运行所有测试
```bash
# 单元测试
npm run test:unit

# 集成测试
npm run test:integration

# 端到端测试
npm run test:e2e

# 完整测试套件
npm test
```

### 测试覆盖率
```bash
# 生成覆盖率报告
npm run test:coverage

# 查看报告
open coverage/index.html
```

## 验收标准

### 功能完整性
- [ ] 所有13个功能需求都已实现
- [ ] 用户可以完成完整的安装流程
- [ ] 所有可选步骤都可以正常跳过

### 性能标准
- [ ] 启动时间 ≤ 3秒
- [ ] 内存占用 ≤ 200MB
- [ ] UI响应时间 ≤ 200ms

### 跨平台兼容性
- [ ] Windows 10+ 正常运行
- [ ] macOS 10.15+ 正常运行
- [ ] 平台特定功能有合适的降级方案

### 用户体验
- [ ] 界面简洁直观
- [ ] 错误信息友好
- [ ] 有合适的进度反馈

## 下一步

验证完成后，您可以：
1. 运行 `/tasks` 命令查看详细的实施任务
2. 开始实际的代码实现
3. 设置持续集成流程

如有任何问题，请查看故障排除部分或联系开发团队。