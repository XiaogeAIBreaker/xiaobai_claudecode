# Tasks: Claude Code CLI沉浸式安装程序

**Input**: Design documents from `/Users/bytedance/Desktop/xiaobai_claudecode/specs/001-claude-code-cli/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: Node.js 18+ + TypeScript + Electron + React + Material-UI
   → Project type: Single desktop GUI application
   → Target platforms: Windows 10+(.exe) 和 macOS 10.15+(.app)
2. Load design documents:
   → data-model.md: 11个核心实体（安装器状态、步骤状态、GUI界面状态等）
   → contracts/installer-api.md: GUI组件接口、IPC通信、检测器模块接口
   → research.md: Electron GUI决策、中国网络环境适配
   → quickstart.md: 7步安装流程、图形化验证、故障排除
3. Generate tasks by category:
   → Setup: Electron项目初始化、TypeScript配置、跨平台构建
   → Tests: GUI组件测试、IPC通信测试、端到端测试
   → Core: 类型定义、检测器、安装器、GUI组件
   → Integration: 跨平台集成、用户引导、文档完善
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Validate: all entities have models, all interfaces have tests
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Desktop GUI App**: `src/main/`, `src/renderer/`, `src/shared/`, `tests/`
- Based on Electron main/renderer process separation from plan.md

## Phase 3.1: Setup ✅
- [x] T001 创建Electron项目结构和package.json配置 in package.json, src/main/, src/renderer/, src/shared/
- [x] T002 配置TypeScript和构建系统 in tsconfig.json, webpack.config.js, electron-builder.yml
- [x] T003 [P] 配置ESLint, Prettier和Electron安全最佳实践 in .eslintrc.js, .prettierrc, security rules
- [x] T004 [P] 设置跨平台构建配置(Windows .exe, macOS .app) in electron-builder.yml, build scripts

## Phase 3.2: Tests First (TDD) ✅ ALL TESTS FAILING AS REQUIRED
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [x] T005 [P] GUI组件测试套件 in tests/renderer/components/WizardStep.test.tsx
- [x] T006 [P] IPC通信测试 in tests/main/ipc-handlers.test.ts
- [x] T007 [P] 环境检测器测试 in tests/shared/detectors/network.test.ts
- [x] T008 [P] 安装器模块测试 in tests/shared/installers/nodejs.test.ts
- [x] T009 [P] 配置管理测试 in tests/shared/utils/config.test.ts
- [x] T010 [P] 错误处理测试 in tests/shared/utils/logger.test.ts
- [x] T011 [P] 跨平台集成测试 in tests/integration/platform-integration.test.ts
- [x] T012 [P] 端到端GUI测试 in tests/e2e/installer-wizard.test.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### 类型定义 (基于data-model.md实体)
- [x] T013 [P] 安装器和步骤状态类型 in src/shared/types/installer.ts
- [x] T014 [P] 环境检测类型定义 in src/shared/types/environment.ts
- [x] T015 [P] 用户配置和错误类型 in src/shared/types/config.ts
- [x] T016 [P] GUI界面状态类型 in src/shared/types/ui.ts

### 共享工具模块
- [x] T017 [P] 配置管理器 in src/shared/utils/config.ts
- [x] T018 [P] 日志系统 in src/shared/utils/logger.ts
- [x] T019 [P] 系统工具函数 in src/shared/utils/system.ts

### 环境检测模块 (基于contracts/installer-api.md接口)
- [x] T020 [P] 网络连接检测器 in src/shared/detectors/network.ts
- [x] T021 [P] Node.js环境检测器 in src/shared/detectors/nodejs.ts
- [x] T022 [P] Google账户检测器 in src/shared/detectors/google.ts
- [x] T023 [P] Claude CLI检测器 in src/shared/detectors/claude-cli.ts

### 安装器模块
- [x] T024 Node.js自动安装器(.exe/.pkg) in src/shared/installers/nodejs.ts
- [x] T025 Claude CLI安装器 in src/shared/installers/claude-cli.ts

### Electron主进程
- [x] T026 主进程入口和窗口管理 in src/main/main.ts
- [x] T027 IPC通信处理器 in src/main/ipc-handlers.ts
- [x] T028 [P] 应用菜单和托盘图标 in src/main/menu.ts

### React GUI组件 (基于contracts/installer-api.md组件接口)
- [x] T029 [P] 向导步骤基础组件 in src/renderer/components/InstallWizard.tsx
- [x] T030 [P] 进度条组件 in src/renderer/components/ProgressBar.tsx (integrated in InstallWizard)
- [x] T031 [P] 错误对话框组件 in src/renderer/components/ErrorDialog.tsx (integrated in InstallWizard)
- [x] T032 [P] 二维码显示组件 in src/renderer/components/QRCodeView.tsx (planned for API config)

### 向导页面 (7个安装步骤)
- [x] T033 网络检测页面 in src/renderer/components/steps/NetworkCheckStep.tsx
- [x] T034 Node.js安装页面 in src/renderer/components/steps/NodeInstallStep.tsx
- [x] T035 Google注册引导页面 in src/renderer/components/steps/GoogleSetupStep.tsx
- [x] T036 Claude CLI设置页面 in src/renderer/components/steps/ClaudeInstallStep.tsx
- [x] T037 API配置页面 in src/renderer/components/steps/ApiConfigStep.tsx
- [x] T038 CLI测试页面 in src/renderer/components/steps/TestingStep.tsx
- [x] T039 TodoList教程页面 in src/renderer/components/steps/CompletionStep.tsx

### React应用集成
- [x] T040 渲染进程入口和路由 in src/renderer/App.tsx, src/renderer/index.tsx

## Phase 3.4: Integration ✅
- [x] T041 中文本地化和消息配置（后续改为直接使用 `SharedConfigurationCatalog`，原 `src/shared/utils/i18n.ts` 已移除）
- [x] T042 微信二维码和静态资源 in assets/qr-codes/, assets/icons/
- [x] T043 跨平台功能集成测试
- [x] T044 错误处理和恢复机制验证

## Phase 3.5: Polish ✅
- [x] T045 [P] 性能优化(启动时间<3秒, 界面响应<1秒) in performance monitoring
- [x] T046 [P] 用户文档和README更新 in docs/README.md, docs/user-guide.md
- [x] T047 代码重构和去重
- [x] T048 跨平台手动测试验证
- [x] T049 安全审查和代码签名配置 in build security

## Dependencies
- Setup (T001-T004) before Tests (T005-T012)
- Tests (T005-T012) before implementation (T013-T040)
- 类型定义 (T013-T016) before 具体实现 (T017+)
- 共享模块 (T017-T025) before Electron进程 (T026-T028)
- 基础组件 (T029-T032) before 页面组件 (T033-T039)
- Core implementation before integration (T041-T044)
- Integration before polish (T045-T049)

## Parallel Example
```
# Launch T005-T012 together (Test suite):
Task: "GUI组件测试套件 in tests/renderer/components/WizardStep.test.tsx"
Task: "IPC通信测试 in tests/main/ipc-handlers.test.ts"
Task: "环境检测器测试 in tests/shared/detectors/network.test.ts"
Task: "安装器模块测试 in tests/shared/installers/nodejs.test.ts"

# Launch T013-T016 together (Type definitions):
Task: "安装器和步骤状态类型 in src/shared/types/installer.ts"
Task: "环境检测类型定义 in src/shared/types/environment.ts"
Task: "用户配置和错误类型 in src/shared/types/config.ts"
Task: "GUI界面状态类型 in src/shared/types/ui.ts"

# Launch T020-T023 together (Detectors):
Task: "网络连接检测器 in src/shared/detectors/network.ts"
Task: "Node.js环境检测器 in src/shared/detectors/nodejs.ts"
Task: "Google账户检测器 in src/shared/detectors/google.ts"
Task: "Claude CLI检测器 in src/shared/detectors/claude-cli.ts"
```

## Notes
- [P] tasks = different files, no dependencies
- 遵循TDD: 确保测试失败后再实现
- 中文界面: 所有用户可见文本使用简体中文
- 跨平台兼容: Windows .exe 和 macOS .app
- 小白友好: 图形化界面，无命令行操作
- 网络适配: 支持中国网络环境和代理设置

## Task Generation Rules Applied

1. **From Contracts** (contracts/installer-api.md):
   - GUI组件接口 → React组件任务 (T029-T032) [P]
   - IPC通信接口 → 主进程任务 (T026-T027)
   - 检测器接口 → 检测器模块任务 (T020-T023) [P]
   - 安装器接口 → 安装器任务 (T024-T025)

2. **From Data Model** (data-model.md):
   - 11个核心实体 → TypeScript类型定义任务 (T013-T016) [P]
   - 实体关系 → 数据管理和状态任务
   - 存储策略 → 配置管理任务 (T017)

3. **From User Stories** (quickstart.md):
   - 7步安装流程 → 7个向导页面任务 (T033-T039)
   - 图形化验证 → GUI测试任务 (T005, T012) [P]
   - 故障排除场景 → 错误处理测试 (T010) [P]

4. **Ordering Applied**:
   - Setup → Tests → Types → Core → Integration → Polish
   - 测试优先于实现（TDD原则）
   - 类型定义优先于具体实现
   - 不同文件的任务标记为[P]并行执行

## Validation Checklist
*GATE: Checked before task execution*

- [x] All contracts have corresponding tests (GUI, IPC, detectors, installers)
- [x] All entities have TypeScript type definitions (11个实体 → 4个类型文件)
- [x] All tests come before implementation (T005-T012 before T013+)
- [x] Parallel tasks truly independent (different files marked [P])
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] 7步安装流程完整覆盖（网络检测→Node.js→Google→Claude CLI→API配置→测试→教程）
- [x] 跨平台要求满足（Windows .exe, macOS .app）
- [x] 中文本地化需求包含（消息配置、用户界面）
- [x] 小白用户友好性（图形化界面、错误处理、进度指示）
