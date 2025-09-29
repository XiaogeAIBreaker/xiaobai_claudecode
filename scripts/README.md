# Node.js 自动安装脚本

这个目录包含了用于自动安装 Node.js 的跨平台脚本，支持 Windows 和 macOS。

## 脚本文件说明

### Windows 脚本
- `install-nodejs.ps1` - 基础PowerShell安装脚本（GPT原版）
- `install-nodejs-with-progress.ps1` - 带JSON进度输出的安装脚本（用于Electron集成）

### macOS 脚本
- `install-nodejs.sh` - 基础bash安装脚本
- `install-nodejs-with-progress.sh` - 带JSON进度输出的安装脚本（用于Electron集成）

### 测试脚本
- `test-nodejs-script.sh` - 脚本功能测试工具（验证网络、版本获取等）

## 功能特性

### ✅ 已验证功能
- [x] 自动检测系统架构（x64/arm64/x86）
- [x] 获取最新稳定版本和LTS版本
- [x] 优先安装LTS版本（更稳定）
- [x] 文件SHA256完整性校验
- [x] 静默安装（无用户交互）
- [x] 自动配置PATH环境变量
- [x] 安装后验证功能
- [x] 错误处理和回退机制
- [x] 临时文件自动清理

### 🔧 技术细节
- **Windows**: 下载MSI安装包，使用msiexec静默安装
- **macOS**: 下载PKG安装包，使用installer命令安装
- **权限要求**: 需要管理员/sudo权限
- **网络要求**: 需要访问 nodejs.org
- **安全**: 强制TLS 1.2，SHA256校验

## 使用方法

### Windows 使用
```powershell
# 以管理员身份运行PowerShell，然后执行：
.\install-nodejs.ps1

# 或者使用带进度输出的版本（用于程序集成）：
.\install-nodejs-with-progress.ps1
```

### macOS 使用
```bash
# 使用 sudo 执行：
sudo ./install-nodejs.sh

# 或者使用带进度输出的版本（用于程序集成）：
sudo ./install-nodejs-with-progress.sh
```

### 功能测试（仅macOS）
```bash
# 测试脚本的各项功能，不实际安装：
./test-nodejs-script.sh
```

## 进度输出格式

带进度输出的脚本会以JSON格式输出安装进度，便于前端程序解析：

```json
{"step":"permission_check","progress":5,"message":"检查管理员权限","status":"running"}
{"step":"arch_detection","progress":10,"message":"检测系统架构","status":"running"}
{"step":"version_fetch","progress":20,"message":"获取最新Node.js版本信息","status":"running"}
{"step":"download_start","progress":35,"message":"开始下载: node-v22.20.0.pkg","status":"running"}
{"step":"install_complete","progress":90,"message":"Node.js安装完成","status":"running"}
{"step":"complete","progress":100,"message":"Node.js安装成功","status":"success","nodeVersion":"v22.20.0","npmVersion":"10.8.2"}
```

### 进度步骤说明
- `permission_check` (5%) - 检查管理员权限
- `arch_detection` (10%) - 检测系统架构
- `version_fetch` (20%) - 获取版本信息
- `version_selected` (25%) - 选择安装版本
- `temp_setup` (30%) - 创建临时目录
- `download_start` (35%) - 开始下载
- `download_complete` (60%) - 下载完成
- `checksum_download` (65%) - 下载校验文件
- `checksum_verify` (70%) - 校验文件
- `checksum_ok` (75%) - 校验通过
- `install_start` (80%) - 开始安装
- `install_complete` (90%) - 安装完成
- `verify` (95%) - 验证安装
- `complete` (100%) - 全部完成

## 错误处理

脚本包含完善的错误处理机制：
- 网络连接失败自动重试
- 下载失败提供备用方案
- 文件损坏自动检测和提示
- Windows下支持winget作为备用安装方式

## 测试结果

使用 `test-nodejs-script.sh` 在 macOS ARM64 环境下的测试结果：

```
✅ 架构检测成功: arm64 -> arm64
✅ 网络连接正常
✅ 最新版本: v24.9.0
✅ 最新LTS版本: v22.20.0
✅ 下载链接可用
✅ 校验文件可用
✅ 所有系统工具可用
```

## 集成到Electron应用

这些脚本设计用于集成到Electron应用中：

1. 使用 `child_process.spawn` 执行带进度输出的脚本
2. 解析JSON格式的进度信息
3. 在前端显示实时安装进度
4. 处理错误和用户反馈

## 安全考虑

- 所有下载文件都进行SHA256校验
- 强制使用HTTPS和TLS 1.2
- 只从官方nodejs.org下载
- 需要管理员权限确认
- 自动清理临时文件

## 注意事项

1. **权限要求**: 必须以管理员/sudo权限运行
2. **网络要求**: 需要能够访问 nodejs.org
3. **系统要求**:
   - Windows: Windows 7+ with PowerShell 2.0+
   - macOS: macOS 10.10+ with bash
4. **防病毒软件**: 可能需要将脚本添加到白名单