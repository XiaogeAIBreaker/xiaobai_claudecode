
# Implementation Plan: Repository-wide Codebase Refactor

**Branch**: `004-refactor-code-update` | **Date**: 2025-10-02 | **Spec**: [`specs/004-refactor-code-update/spec.md`](specs/004-refactor-code-update/spec.md)
**Input**: Feature specification from `/specs/004-refactor-code-update/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
对现有Claude Code安装器代码库进行结构化重构：保持所有业务流程与用户体验不变的前提下，统一跨进程共享的数据源，消除重复声明与遗留模块，确保文档与测试能够覆盖新结构，并在合并前验证与重构前的行为对齐。

## Technical Context
**Language/Version**: TypeScript 5.x, Node.js 18.x（Electron运行时）  
**Primary Dependencies**: Electron 38.x、React 18、Webpack 5、Electron Builder、Material UI  
**Storage**: 本地文件持久化（electron-store）  
**Testing**: Jest（单元/集成）、Playwright（E2E）、自定义性能脚本  
**Target Platform**: Windows 10+ 与 macOS 13+ 桌面环境  
**Project Type**: single（Electron单仓库，main/preload/renderer 分层）  
**Performance Goals**: 冷启动≤3秒、安装流程无额外延迟  
**Constraints**: 渲染进程内存≤200MB、避免阻塞主进程、全流程保持原有成功率  
**Scale/Scope**: 覆盖所有安装向导场景（Node、CLI、环境变量、账号注册）与支撑脚本

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Electron跨平台兼容性检查**:
- [x] 功能在Windows和macOS上保持一致
- [x] 平台特定功能有降级方案
- [x] 两个目标平台均已测试验证

**原生体验要求**:
- [x] 遵循各平台UI指南和交互规范
- [x] 使用原生菜单、快捷键和文件系统集成
- [x] 避免Web应用外观，追求桌面应用体验

**安全性要求**:
- [x] 禁用渲染进程Node.js集成
- [x] 使用contextIsolation和安全IPC通信
- [x] 用户输入验证和清理
- [x] 敏感数据加密存储

**性能标准**:
- [x] 启动时间≤3秒
- [x] 内存占用≤200MB基线
- [x] 避免主进程阻塞操作
- [x] 实施缓存和懒加载机制

**可维护性要求**:
- [x] 主进程和渲染进程逻辑分离
- [x] 使用TypeScript类型安全
- [x] 完整的测试套件覆盖
- [x] 文档与代码同步

## Project Structure

### Documentation (this feature)
```
specs/004-refactor-code-update/
├── plan.md              # 当前实现计划
├── research.md          # Phase 0 研究结论
├── data-model.md        # Phase 1 数据模型
├── quickstart.md        # Phase 1 回归指导
├── contracts/           # Phase 1 接口契约与测试框架
└── tasks.md             # /tasks 输出
```

### Source Code (repository root)
```
src/
├── installer/           # 安装向导业务模块
├── main/                # Electron 主进程逻辑
├── preload/             # 预加载桥接脚本
├── renderer/            # React UI 组件与页面
└── shared/              # 跨进程共享工具与数据源

assets/
├── icons/
└── locales/

config/
scripts/

tests/
├── unit/
├── integration/
├── e2e/
├── contract/
├── performance/
└── shared/
```

**Structure Decision**: 维持单仓库多进程分层：`src/main`、`src/preload`、`src/renderer` 分别托管主进程、桥接与UI，所有跨进程共享资源集中到 `src/shared/`，测试按类型存放在 `tests/` 各子目录。

## Phase 0: Outline & Research
1. 盘点四条关键业务流程（onboarding、environment、cliInstall、accountLink），结合 Jest / Playwright 结果与一次人工冒烟，形成基线记录并写入 `research.md` 的 D1。
2. 整理 `src/` 中重复的常量与配置，确定全部迁移到 `src/shared/` 的分类方案，落地在 `research.md` 的 D2。
3. 制定遗留模块删除判定与回归策略，收敛在 `research.md` 的 D3/D4，并登记需要对齐的 Stakeholder。

**Output**: [`research.md`](specs/004-refactor-code-update/research.md) 汇总 D1-D4 决策，后续跟踪项在 “Follow-ups” 小节中记录。

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. 基于决策 D1-D3 抽取 `SharedConfigurationCatalog`、`InstallerWorkflowMap` 两个核心实体，并在 [`data-model.md`](specs/004-refactor-code-update/data-model.md) 中定义字段、约束与派生视图；治理矩阵改为在文档层记录，避免在代码中保留无引用的静态数据。
2. 将关键交互整理为 IPC 契约：`ipc.shared-config.get` 与 `ipc.workflow-map.sync`，分别记录于 [`contracts/shared-config.contract.md`](specs/004-refactor-code-update/contracts/shared-config.contract.md) 与 [`contracts/workflow-map.contract.md`](specs/004-refactor-code-update/contracts/workflow-map.contract.md)。
3. 为每个契约创建失败中的占位测试（位于 [`contracts/tests/`](specs/004-refactor-code-update/contracts/tests)），确保后续实现按测试驱动补齐逻辑。
4. 编写 [`quickstart.md`](specs/004-refactor-code-update/quickstart.md) 回归手册，覆盖自动化指令与跨平台冒烟步骤，并量化构建体积差异门槛。
5. 执行 `.specify/scripts/bash/update-agent-context.sh claude` 同步技术栈快照（命令已运行并在 CLAUDE.md 中更新）。

**Output**: data-model、contracts、占位测试与 quickstart 文档均已生成，agent 上下文同步完成。

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- 载入 `.specify/templates/tasks-template.md` 作为骨架，结合 `research.md`、`data-model.md` 与两份 IPC 契约输出任务。
- 为每个实体创建集中治理任务：`SharedConfigurationCatalog` → 构建单一导出与引用迁移；`InstallerWorkflowMap` → 建立流程定义与校验。模块责任矩阵移至文档记录，避免无引用代码残留。
- 为两条契约分别生成 IPC handler、预加载桥接、渲染层消费与合同测试修复任务，标记独立步骤为 [P] 以便并行。
- 根据 quickstart 冒烟要求添加跨平台回归、失败场景复测、性能比对等验证任务。
- 添加清理与文档同步任务：删除遗留模块、更新 README/AGENTS 等引用、刷新 `SharedConfigurationCatalog.lastValidatedAt`。

**Ordering Strategy**:
1. 先执行基线记录与分析任务，确保引用迁移前有对照数据。
2. 按数据→契约→流程→清理→回归的顺序串联；其中跨平台验证与文档更新标记为收尾步骤。
3. 对无需顺序依赖的契约测试、脚本更新、文档同步标记 [P]，便于平行执行。

**Estimated Output**: 28±3 项任务，覆盖数据迁移、契约实现、测试补强与回归验证。

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | n/a | n/a |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
