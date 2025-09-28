# Tasks: Claude Code CLI 安装程序用户体验优化

**Input**: Design documents from `/specs/002-1-2-3/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Found: Node.js 18+ + TypeScript + Electron架构
   → Extract: 技术栈、库、单项目结构
2. Load optional design documents:
   → data-model.md: 6个核心实体 → 模型任务
   → contracts/: installer-api.md → IPC通信测试任务
   → research.md: 7个技术决策 → 设置任务
   → quickstart.md: 验证清单 → 集成测试任务
3. Generate tasks by category:
   → Setup: Electron项目初始化、依赖配置、linting
   → Tests: IPC合约测试、集成测试
   → Core: 数据模型、服务、UI组件
   → Integration: 安装步骤、检测服务、配置管理
   → Polish: 单元测试、性能优化、文档
4. Apply task rules:
   → 不同文件 = 标记 [P] 并行
   → 相同文件 = 顺序执行 (无 [P])
   → 测试优先于实现 (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → 所有合约都有测试? ✓
   → 所有实体都有模型? ✓
   → 所有功能都有实现? ✓
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: 可并行运行（不同文件，无依赖）
- 描述中包含确切的文件路径

## Path Conventions
- **单项目结构**: `src/`, `tests/` 在项目根目录
- 基于plan.md中的Electron桌面应用结构

## Phase 3.1: Setup (项目初始化)
- [ ] T001 创建Electron项目结构，配置主进程/渲染进程分离架构 in src/main/, src/renderer/, src/preload/
- [ ] T002 初始化TypeScript配置和Electron安全最佳实践 in tsconfig.json, electron.config.js
- [ ] T003 [P] 配置ESLint, Prettier和构建工具 in .eslintrc.js, .prettierrc, webpack.config.js
- [ ] T004 [P] 设置跨平台构建配置(Windows/macOS) in electron-builder.config.js, package.json
- [ ] T005 [P] 安装和配置项目依赖 in package.json (Electron, Commander.js, Inquirer.js, Axios, Chalk)

## Phase 3.2: Tests First (TDD) ⚠️ 必须在实现前完成
**关键：这些测试必须编写并且必须失败，然后才能开始任何实现**

### 合约测试 (基于 contracts/installer-api.md)
- [ ] T006 [P] Navigation API IPC通信测试 in tests/ipc/navigation.spec.ts
- [ ] T007 [P] Step Execution API测试 in tests/ipc/step-execution.spec.ts
- [ ] T008 [P] Detection API测试 in tests/ipc/detection.spec.ts
- [ ] T009 [P] Network API测试 in tests/ipc/network.spec.ts
- [ ] T010 [P] Node.js API测试 in tests/ipc/nodejs.spec.ts
- [ ] T011 [P] Claude CLI API测试 in tests/ipc/claude-cli.spec.ts
- [ ] T012 [P] Configuration API测试 in tests/ipc/configuration.spec.ts

### 数据模型测试 (基于 data-model.md)
- [ ] T013 [P] InstallationStep实体验证测试 in tests/models/installation-step.spec.ts
- [ ] T014 [P] DetectionResult实体验证测试 in tests/models/detection-result.spec.ts
- [ ] T015 [P] UserConfiguration实体验证测试 in tests/models/user-configuration.spec.ts
- [ ] T016 [P] NavigationState实体验证测试 in tests/models/navigation-state.spec.ts
- [ ] T017 [P] NetworkConfiguration实体验证测试 in tests/models/network-configuration.spec.ts

### 集成测试 (基于 quickstart.md验证清单)
- [ ] T018 [P] 通用导航优化集成测试 in tests/integration/navigation.spec.ts
- [ ] T019 [P] 网络检查优化集成测试 in tests/integration/network-check.spec.ts
- [ ] T020 [P] Node.js安装优化集成测试 in tests/integration/nodejs-install.spec.ts
- [ ] T021 [P] Google设置重构集成测试 in tests/integration/google-setup.spec.ts
- [ ] T022 [P] Claude CLI安装优化集成测试 in tests/integration/claude-cli.spec.ts
- [ ] T023 [P] API配置优化集成测试 in tests/integration/api-config.spec.ts

### 性能和跨平台测试
- [ ] T024 [P] 启动性能测试(≤3秒)和内存占用测试(≤200MB) in tests/performance/startup.spec.ts
- [ ] T025 [P] 跨平台兼容性测试 in tests/platform/compatibility.spec.ts

## Phase 3.3: Core Implementation (仅在测试失败后)

### 数据模型实现
- [ ] T026 [P] InstallationStep TypeScript接口和验证 in src/models/installation-step.ts
- [ ] T027 [P] DetectionResult TypeScript接口和验证 in src/models/detection-result.ts
- [ ] T028 [P] UserConfiguration TypeScript接口和验证 in src/models/user-configuration.ts
- [ ] T029 [P] NavigationState TypeScript接口和验证 in src/models/navigation-state.ts
- [ ] T030 [P] NetworkConfiguration TypeScript接口和验证 in src/models/network-configuration.ts

### IPC通信框架
- [ ] T031 主进程IPC处理器基础框架 in src/main/ipc-handlers.ts
- [ ] T032 渲染进程安全的preload脚本 in src/preload/preload.ts
- [ ] T033 Navigation API IPC实现 in src/main/ipc/navigation-handler.ts
- [ ] T034 [P] Step Execution API IPC实现 in src/main/ipc/step-handler.ts
- [ ] T035 [P] Detection API IPC实现 in src/main/ipc/detection-handler.ts
- [ ] T036 [P] Network API IPC实现 in src/main/ipc/network-handler.ts
- [ ] T037 [P] Node.js API IPC实现 in src/main/ipc/nodejs-handler.ts
- [ ] T038 [P] Claude CLI API IPC实现 in src/main/ipc/claude-cli-handler.ts
- [ ] T039 [P] Configuration API IPC实现 in src/main/ipc/config-handler.ts

### 核心服务实现
- [ ] T040 [P] 网络检测服务（移除代理设置，优化检测流程） in src/services/network-service.ts
- [ ] T041 [P] Node.js管理服务（镜像源自动配置） in src/services/nodejs-service.ts
- [ ] T042 [P] Claude CLI检测和安装服务 in src/services/claude-cli-service.ts
- [ ] T043 [P] 配置管理服务（环境变量安全存储） in src/services/config-service.ts
- [ ] T044 [P] 安装步骤管理服务 in src/services/step-service.ts

## Phase 3.4: UI Implementation (用户界面)

### 主进程UI
- [ ] T045 Electron主进程入口和窗口管理 in src/main/main.ts
- [ ] T046 原生菜单和快捷键实现 in src/main/menu.ts
- [ ] T047 系统通知和错误处理 in src/main/notifications.ts

### 渲染进程UI组件
- [ ] T048 渲染进程入口和路由(⚠️阻塞所有UI组件) in src/renderer/index.ts, src/renderer/router.ts
- [ ] T049 [P] 统一导航组件（移除重复的"继续安装"按钮） in src/renderer/components/navigation.ts
- [ ] T050 [P] 网络检查步骤组件（简化界面） in src/renderer/components/network-check.ts
- [ ] T051 [P] Node.js安装步骤组件 in src/renderer/components/nodejs-install.ts
- [ ] T052 [P] Google设置步骤组件（重构为邮箱登录引导） in src/renderer/components/google-setup.ts
- [ ] T053 [P] Claude CLI安装步骤组件 in src/renderer/components/claude-cli-install.ts
- [ ] T054 [P] API配置步骤组件（可选配置） in src/renderer/components/api-config.ts
- [ ] T055 [P] 进度指示器和状态显示组件 in src/renderer/components/progress.ts
- [ ] T056 [P] 错误处理和用户反馈组件 in src/renderer/components/error-handler.ts

## Phase 3.5: Integration (集成功能)
- [ ] T057 Windows平台特定功能集成（路径处理、权限） in src/platform/windows.ts
- [ ] T058 macOS平台特定功能集成（权限、文件系统） in src/platform/macos.ts
- [ ] T059 跨平台文件系统和配置存储 in src/utils/file-system.ts
- [ ] T060 日志记录和错误追踪系统 in src/utils/logger.ts
- [ ] T061 加密存储和安全处理工具 in src/utils/security.ts

## Phase 3.6: Polish (完善优化)
- [ ] T062 [P] 补充单元测试覆盖（目标90%+） in tests/unit/各个模块
- [ ] T063 性能优化和内存泄漏检查 in src/utils/performance.ts
- [ ] T064 [P] 更新README.md和用户文档 in README.md, docs/
- [ ] T065 代码重构和去重优化 (全项目范围)
- [ ] T066 跨平台手动测试验证 (Windows + macOS)
- [ ] T067 安全审查和代码签名配置 in build/scripts/

## Dependencies (依赖关系)
```
Setup (T001-T005)
    ↓
Tests (T006-T025) - 必须先失败
    ↓
Models (T026-T030) - 可并行
    ↓
IPC Framework (T031-T032)
    ↓
IPC Handlers (T033-T039) - 可并行
    ↓
Services (T040-T044) - 可并行
    ↓
Main Process (T045-T047)
    ↓
UI Components (T048-T056) - 部分可并行
    ↓
Integration (T057-T061) - 部分可并行
    ↓
Polish (T062-T067) - 部分可并行
```

### 具体阻塞关系
- T031 IPC基础框架 → 阻塞 T033-T039 所有IPC处理器
- T032 preload脚本 → 阻塞所有渲染进程组件 T048-T056
- T045 主进程入口 → 阻塞 T046-T047 主进程功能
- T048 渲染进程入口 → 阻塞所有UI组件 T049-T056
  * T048 必须完成路由和基础框架设置
  * T049-T056 的所有组件都依赖 T048 提供的路由和上下文
  * 建议：T048完成后再并行执行 T049-T056

## Parallel Execution Examples (并行执行示例)

### Phase 3.2 - 所有测试可并行
```bash
# 启动T006-T025一起执行：
Task: "Navigation API IPC通信测试 in tests/ipc/navigation.spec.ts"
Task: "Step Execution API测试 in tests/ipc/step-execution.spec.ts"
Task: "Detection API测试 in tests/ipc/detection.spec.ts"
Task: "Network API测试 in tests/ipc/network.spec.ts"
Task: "Node.js API测试 in tests/ipc/nodejs.spec.ts"
# ... 其他测试任务
```

### Phase 3.3 - 数据模型可并行
```bash
# 启动T026-T030一起执行：
Task: "InstallationStep TypeScript接口和验证 in src/models/installation-step.ts"
Task: "DetectionResult TypeScript接口和验证 in src/models/detection-result.ts"
Task: "UserConfiguration TypeScript接口和验证 in src/models/user-configuration.ts"
Task: "NavigationState TypeScript接口和验证 in src/models/navigation-state.ts"
Task: "NetworkConfiguration TypeScript接口和验证 in src/models/network-configuration.ts"
```

### Phase 3.4 - IPC处理器可并行
```bash
# T031-T032完成后，启动T034-T039一起执行：
Task: "Step Execution API IPC实现 in src/main/ipc/step-handler.ts"
Task: "Detection API IPC实现 in src/main/ipc/detection-handler.ts"
Task: "Network API IPC实现 in src/main/ipc/network-handler.ts"
Task: "Node.js API IPC实现 in src/main/ipc/nodejs-handler.ts"
Task: "Claude CLI API IPC实现 in src/main/ipc/claude-cli-handler.ts"
Task: "Configuration API IPC实现 in src/main/ipc/config-handler.ts"
```

## Notes (注意事项)
- [P] 任务 = 不同文件，无依赖关系
- 在实现前验证测试失败
- 每个任务后提交代码
- 避免：模糊任务描述、相同文件冲突

## Validation Checklist (验证清单)
*main()执行前检查的门控*

- [x] 所有合约都有对应的测试 (T006-T012覆盖installer-api.md)
- [x] 所有实体都有模型任务 (T026-T030覆盖data-model.md中6个实体)
- [x] 所有测试都在实现之前 (Phase 3.2在3.3之前)
- [x] 并行任务真正独立 (不同文件路径，无共享状态)
- [x] 每个任务都指定确切的文件路径
- [x] 没有任务与其他[P]任务修改相同文件

## Task Generation Rules Applied
*main()执行期间应用的规则*

1. **从合约生成**:
   - installer-api.md → 7个IPC API测试任务 [P] (T006-T012)
   - 每个API → 对应的IPC处理器实现任务 (T033-T039)

2. **从数据模型生成**:
   - 6个实体 → 6个模型创建任务 [P] (T026-T030)
   - 关系逻辑 → 服务层任务 (T040-T044)

3. **从用户故事生成**:
   - quickstart.md中6个验证清单 → 6个集成测试 [P] (T018-T023)
   - 性能要求 → 性能测试任务 (T024)

4. **排序规则**:
   - Setup → Tests → Models → Services → UI → Polish
   - 依赖关系阻塞并行执行