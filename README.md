# Claude Code CLI 沉浸式安装程序

为中国地区0基础编程小白设计的 Claude Code CLI 图形化安装程序。

## 🚀 项目特性

- 🖥️ **图形化界面**: 完全可视化的安装向导，无需命令行操作
- 🇨🇳 **中文本地化**: 完全中文界面，适合国内用户
- 🔄 **跨平台支持**: 支持 Windows (.exe) 和 macOS (.app)
- 🌐 **网络适配**: 针对中国网络环境优化，支持代理设置
- 👶 **小白友好**: 专为0基础用户设计，简单易用
- 🛠️ **自动安装**: 自动检测和安装所有必要组件
- ⚡ **极速启动**: 启动时间 < 3秒，界面响应 < 1秒
- 🧠 **轻量级**: 内存占用 < 200MB，安装包 < 100MB
- 🔒 **安全可靠**: 代码签名、安全审查、数据加密存储

## 📦 安装流程

### 1. 网络环境检测
- 自动检测网络连接状态
- 测试访问 npm、GitHub、Anthropic 等服务
- 提供网络问题诊断和解决建议
- 支持代理配置和网络优化

### 2. Node.js 环境安装
- 检测是否已安装 Node.js
- 自动下载适合的 Node.js 版本（18+）
- 配置 npm 镜像源（淘宝镜像）
- 验证安装成功并测试功能

### 3. 邮箱登录引导
- 支持 Gmail、Outlook、Yahoo 等主流邮箱
- 简化的登录向导界面
- 邮箱验证和账户激活引导
- 可选步骤，支持跳过

### 4. Claude CLI 安装
- 自动安装最新版本的 Claude CLI
- 检测安装状态和功能完整性
- 提供详细的安装进度反馈
- 支持重试和错误恢复

### 5. API 密钥配置（可选）
- Anthropic API 密钥配置界面
- 密钥验证和权限检查
- 安全的加密存储
- 支持稍后配置

### 6. 安装完成验证
- 完整的功能测试
- 生成安装报告
- 提供使用指南链接
- 快速开始教程

## 🛠️ 技术架构

### 前端技术栈
- **框架**: Electron + TypeScript
- **UI**: 原生 HTML/CSS + 组件化设计
- **状态管理**: EventEmitter 模式
- **路由**: 自研轻量级路由系统

### 后端技术栈
- **运行时**: Node.js 18+
- **进程通信**: Electron IPC
- **文件系统**: 跨平台文件操作
- **网络请求**: 内置 HTTP 客户端

### 安全特性
- **数据加密**: AES-256-GCM 加密存储
- **权限控制**: 最小权限原则
- **代码签名**: macOS/Windows 代码签名
- **安全审查**: 自动化安全扫描

### 性能优化
- **内存管理**: 智能垃圾回收
- **启动优化**: 延迟加载和预缓存
- **网络优化**: 连接池和重试机制
- **用户体验**: 流畅动画和即时反馈

## 📁 项目结构

```
xiaobai_claudecode/
├── src/                        # 源代码目录
│   ├── main/                   # 主进程代码
│   │   ├── main.ts             # 主进程入口
│   │   ├── menu.ts             # 原生菜单
│   │   ├── notifications.ts    # 系统通知
│   │   └── ipc/                # IPC处理器
│   ├── renderer/               # 渲染进程代码
│   │   ├── index.ts            # 渲染进程入口
│   │   ├── router.ts           # 路由管理
│   │   ├── components/         # UI组件
│   │   └── managers/           # 状态管理器
│   ├── platform/               # 平台特定功能
│   │   ├── windows.ts          # Windows平台
│   │   └── macos.ts            # macOS平台
│   └── utils/                  # 工具库
│       ├── common.ts           # 通用工具
│       ├── file-system.ts      # 文件系统
│       ├── logger.ts           # 日志系统
│       ├── security.ts         # 安全工具
│       └── performance.ts      # 性能监控
├── tests/                      # 测试代码
├── build/                      # 构建脚本
├── docs/                       # 项目文档
└── dist/                       # 构建输出
```

## 🚀 快速开始

### 系统要求
- **操作系统**: Windows 10+ 或 macOS 10.15+
- **内存**: 最少 4GB RAM
- **存储**: 至少 1GB 可用空间
- **网络**: 稳定的互联网连接

### 下载安装
1. 访问 [Releases 页面](https://github.com/example/xiaobai_claudecode/releases)
2. 下载适合您系统的安装包：
   - Windows: `claude-code-installer-windows.exe`
   - macOS: `claude-code-installer-macos.dmg`
3. 双击安装包开始安装

### 开发环境搭建
```bash
# 克隆仓库
git clone https://github.com/example/xiaobai_claudecode.git
cd xiaobai_claudecode

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 运行测试
npm test

# 代码质量检查
npm run lint

# 性能分析
npm run performance
```

## 📖 使用指南

### 首次使用
1. 启动程序后会自动进入欢迎界面
2. 点击"开始安装"按钮开始向导
3. 按照界面提示完成每个步骤
4. 安装完成后会显示成功页面

### 常见问题

#### 网络连接问题
- **问题**: 无法访问 npm 或 GitHub
- **解决**: 检查防火墙设置，尝试使用代理

#### Node.js 安装失败
- **问题**: Node.js 下载或安装失败
- **解决**: 手动下载 Node.js 或检查权限设置

#### Claude CLI 无法工作
- **问题**: Claude CLI 安装后无法使用
- **解决**: 检查 PATH 环境变量，重启终端

#### API 密钥验证失败
- **问题**: API 密钥无法验证
- **解决**: 检查密钥格式和网络连接

### 高级配置

#### 代理设置
```json
{
  "proxy": {
    "http": "http://proxy.example.com:8080",
    "https": "https://proxy.example.com:8080"
  }
}
```

#### 自定义安装路径
```json
{
  "installation": {
    "nodejs": "/custom/path/nodejs",
    "claude": "/custom/path/claude"
  }
}
```

## 🤝 贡献指南

### 开发流程
1. Fork 项目仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

### 代码规范
- 使用 TypeScript 进行类型安全
- 遵循 ESLint 代码规范
- 编写单元测试覆盖核心功能
- 添加详细的代码注释

### 测试要求
```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- --grep "component"

# 生成覆盖率报告
npm run test:coverage
```

## 📊 性能指标

- **启动时间**: < 3 秒
- **内存占用**: < 200 MB
- **CPU 使用**: < 10%（空闲时）
- **网络请求**: 智能重试和缓存
- **用户界面**: 60 FPS 流畅动画

## 🔒 安全声明

- 所有用户数据本地加密存储
- 不收集或上传用户隐私信息
- 所有网络通信使用 HTTPS
- 定期进行安全审查和更新

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

感谢以下开源项目的支持：
- [Electron](https://electronjs.org/) - 跨平台桌面应用框架
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的 JavaScript
- [Node.js](https://nodejs.org/) - JavaScript 运行环境

## 📞 联系方式

- **问题反馈**: [GitHub Issues](https://github.com/example/xiaobai_claudecode/issues)
- **功能建议**: [GitHub Discussions](https://github.com/example/xiaobai_claudecode/discussions)
- **邮箱支持**: support@example.com

---

*Claude Code CLI 沉浸式安装程序 - 让AI编程触手可及*
4. **Claude Code CLI** - 自动安装Claude命令行工具
5. **API配置** - 配置API密钥和连接设置
6. **CLI启动测试** - 验证安装是否成功
7. **TodoList教程** - 完成您的第一个项目

## 🛠️ 技术栈

- **框架**: Electron + React + TypeScript
- **UI库**: Material-UI
- **构建工具**: Webpack + electron-builder
- **测试**: Jest + Playwright
- **代码质量**: ESLint + Prettier

## 🏗️ 项目结构

```
src/
├── main/              # Electron主进程
├── renderer/          # React渲染进程(GUI)
├── shared/            # 共享代码模块
│   ├── detectors/     # 环境检测模块
│   ├── installers/    # 安装模块
│   ├── utils/         # 工具函数
│   └── types/         # TypeScript类型定义
└── preload/           # 预加载脚本

tests/                 # 测试文件
config/                # 配置文件
assets/                # 静态资源
docs/                  # 项目文档
```

## 🚀 开发指南

### 环境要求

- Node.js 18+
- npm 或 yarn
- Git

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建应用

```bash
# 构建所有平台
npm run build:all

# 仅构建Windows
npm run build:win

# 仅构建macOS
npm run build:mac
```

### 测试

```bash
# 运行所有测试
npm test

# 运行E2E测试
npm run test:e2e

# 生成测试覆盖率报告
npm run test:coverage
```

### 代码质量

```bash
# 检查代码规范
npm run lint

# 格式化代码
npm run format

# 类型检查
npm run typecheck
```

## 📋 开发状态

### ✅ 项目已完成核心开发

- ✅ **Phase 3.1: Setup** - 项目结构、TypeScript、构建系统、代码规范
- ✅ **Phase 3.2: Tests First (TDD)** - 8个核心测试套件完成
- ✅ **Phase 3.3: Core Implementation** - 40个核心功能任务完成
- ✅ **Phase 3.4: Integration** - 中文本地化、静态资源、集成测试、错误处理
- 🚧 **Phase 3.5: Polish** - 性能优化完成，文档更新中...

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目基于 MIT 许可证开源 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🎯 项目目标

让每一个中国的编程小白都能轻松安装和使用 Claude Code CLI，降低AI辅助编程的门槛。

## 📞 支持与反馈

- 微信支持: 扫描安装程序中的二维码
- GitHub Issues: [提交问题](https://github.com/claude-installer/claude-installer/issues)
- 邮箱: support@claude-installer.com