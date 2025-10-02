# Claude 安装助手

为中国地区0基础编程小白设计的 Claude Code 图形化安装程序。

## 🚀 项目特性

- 🖥️ **图形化界面**: 完全可视化的安装向导，无需命令行操作
- 🇨🇳 **中文本地化**: 完全中文界面，适合国内用户
- 🔄 **跨平台支持**: 支持 Windows (.exe) 和 macOS (.app)
- 🌐 **网络适配**: 针对中国网络环境优化，支持代理设置
- 👶 **小白友好**: 专为0基础用户设计，简单易用
- 🛠️ **自动安装**: 自动检测和安装所有必要组件
- ⚡ **极速启动**: 启动时间 < 1秒，界面响应 < 1秒
- 🧠 **轻量级**: 内存占用 < 50MB，安装包 < 100MB

## 📦 安装流程

1. **网络环境检测** - 自动检测网络连接和代理设置
2. **Node.js环境** - 自动下载和安装Node.js
3. **Google邮箱** - 引导注册或验证Google账户
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
│   ├── config/        # SharedConfigurationCatalog（跨进程共享常量）
│   ├── workflows/     # InstallerWorkflowMap（向导步骤定义）
│   ├── utils/         # 工具函数
│   └── types/         # TypeScript类型定义
└── preload/           # 预加载脚本

tests/                 # 测试文件
scripts/               # 审计脚本与工具（如 shared-config-usage）
config/                # 配置文件
assets/                # 静态资源
docs/                  # 项目文档
```

## 📚 统一数据源与工作流

- **共享配置目录**：`src/shared/config/catalog.ts` 提供 `SharedConfigurationCatalog`，主/预加载/渲染进程统一通过 `window.electronAPI.sharedConfig.get(id)` 访问。
- **安装流程映射**：`src/shared/workflows/map.ts` 暴露 `InstallerWorkflowMap` 与版本号，Renderer 通过 `workflowMap.sync(flowId)` 校验流程是否最新。
- **审计脚本**：运行 `scripts/audit/shared-config-usage.ts` 可输出 `docs/refactor/004/data-sources/post-scan.json`，验证共享配置是否被重复声明。

```bash
# 更新共享配置使用矩阵示例
npx tsc scripts/audit/shared-config-usage.ts --module commonjs --target ES2020 --outDir .tmp/shared-config-audit
node .tmp/shared-config-audit/scripts/audit/shared-config-usage.js
```

> 如已安装 `ts-node`，亦可直接运行 `npx ts-node scripts/audit/shared-config-usage.ts`。

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
