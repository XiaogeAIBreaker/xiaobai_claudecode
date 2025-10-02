# Tasks: Repository-wide Codebase Refactor

**Input**: Design documents from `/specs/004-refactor-code-update/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. 按 plan.md 的顺序执行：先建立基线，再补齐测试，再落地模型与实现。
2. 所有 [P] 任务可并行，但必须满足依赖（同一路径的修改保持串行）。
3. Tests-first：确保新增测试在实现前处于失败状态。
4. 每个阶段结束前运行 lint + typecheck 以捕获早期回归。
5. 快速记录改动：完成任务后更新相关文档与日志。
```

## Phase 3.1: Setup
- [X] T001 建立安装器基线日志：执行 `npm install`、`npm run lint`、`npm run typecheck`、`npm test`，将结果保存到 `docs/refactor/004/baseline/automation.md`，作为后续对比依据。
- [ ] T002 手工走通 quickstart 中四条流程（Windows 与 macOS 各一次），将截图与关键提示语整理到 `docs/refactor/004/baseline/manual.md`。
- [X] T003 [P] 使用 `rg`/`ts-node` 扫描 `src/` 中重复常量，输出 `docs/refactor/004/data-sources/pre-scan.md`，标注需整合的数据源清单。

## Phase 3.2: Tests First (TDD)
- [X] T004 [P] 在 `tests/contract/ipc.shared-config.get.spec.ts` 编写契约测试，覆盖成功、未找到、权限受限三种情形（当前为 fail 占位）。
- [X] T005 [P] 在 `tests/contract/ipc.workflow-map.sync.spec.ts` 编写契约测试，验证版本一致、版本落后、流程不存在三种分支。
- [X] T006 [P] 新增 `tests/e2e/install-onboarding.spec.ts`，录制 Onboarding 向导主路径的 Playwright 场景。
- [X] T007 [P] 新增 `tests/e2e/install-environment.spec.ts`，覆盖环境检测流程及预期提示。
- [X] T008 [P] 新增 `tests/e2e/install-cli.spec.ts`，覆盖 Claude CLI 安装与进度反馈。
- [X] T009 [P] 新增 `tests/e2e/install-account-link.spec.ts`，覆盖账号关联 UI 流程。
- [X] T010 [P] 新增 `tests/e2e/install-cli-offline.spec.ts`，模拟断网安装失败与恢复重试场景。
- [X] T011 [P] 在 `tests/performance/build-size.spec.ts` 定义产物体积与启动时间阈值（≤5% 差异 / ≤3s）。

## Phase 3.3: Core Implementation (after tests fail)
- [X] T012 [P] 创建 `src/shared/config/catalog.ts` 与 `src/shared/config/index.ts`，实现 `SharedConfigurationCatalog` 数据结构与类型约束。
- [X] T013 [P] 创建 `src/shared/workflows/map.ts`，实现 `InstallerWorkflowMap` 并维护版本号。
- [X] T014 [P] （已调整）原计划创建 `src/shared/governance/module-ownership.ts`，现改由 `docs/architecture/installer-refactor.md` 维护模块职责清单，避免仓库中保留无引用代码。
- [X] T015 编写 `scripts/audit/shared-config-usage.ts`（输出 `docs/refactor/004/data-sources/post-scan.json`），基于新 catalog 生成 `SharedConfigUsageMatrix`。
- [X] T016 更新 `src/shared/types`（新增/扩展类型与守护），确保 catalog、workflow、ownership 均具备显式接口。
- [X] T017 调整 `src/main/ipc-handlers.ts`：新增 `ipc.shared-config.get`、`ipc.workflow-map.sync` 处理逻辑，统一读取 `src/shared/config` 与 `src/shared/workflows`。
- [X] T018 更新 `src/preload/preload.ts`：通过 `contextBridge` 暴露 `sharedConfig.get` 与 `workflowMap.sync`，并补充类型声明。
- [X] T019 新建 `src/renderer/hooks/useSharedConfig.ts`，封装预加载桥接的读取逻辑与缓存。
- [X] T020 改写 `src/renderer/components/InstallWizard.tsx`：移除本地 `INSTALL_STEPS`，改用 `InstallerWorkflowMap`，并保留进度与导航逻辑。
- [X] T021 优化 `src/renderer/components/steps/*.tsx`，改用 hook/cached 数据提取文案、提示、条件守卫，删除重复常量。
- [X] T022 [P] 更新 `src/main/services/nodejs-installer.ts`，移除内联下载源与提示语，改从 catalog 获取并记录校验哈希。
- [X] T023 [P] 更新 `src/main/services/claude-cli-installer.ts`，统一使用 catalog 数据并补充 checksum 校验。
- [X] T024 [P] 更新 `src/main/services/env-manager.ts`，统一环境变量模板与文案来源。
- [X] T025 [P] 更新 `src/main/services/google-auth-helper.ts`，统一 BrowserWindow 配置与提示语来源。
- [X] T026 清理项目中已废弃的常量或配置副本（参考 T003/T015 报告），删除无引用文件并移除对应导出。

## Phase 3.4: Integration & Validation
- [X] T027 [P] 在 `tests/unit/shared/config-catalog.spec.ts` 编写单元测试，验证 catalog 导出与 `lastValidatedAt` 更新逻辑。
- [X] T028 运行 `scripts/audit/shared-config-usage.ts` 再次生成 `post-scan` 结果，对比 pre/post 并更新 `docs/refactor/004/data-sources/diff.md`。
- [X] T029 更新文档：同步 `README.md`、`AGENTS.md`、`docs/architecture/installer-refactor.md`，说明单一数据源与新 IPC 模型。
- [X] T030 执行 quickstart.md 中自动化与手动步骤，确保所有测试通过；将最新时间写入 `SharedConfigurationCatalog.lastValidatedAt` 并在 `docs/refactor/004/baseline/validation.md` 记录结果。

## Dependencies
- T001 → T002 → (T003)
- Tests T004-T011 必须在实现前完成（保持失败状态）。
- T012-T016（模型与类型）完成后，方可进入主/预加载/渲染层改动（T017-T025）。
- 服务层更新 T022-T025 可并行，但依赖 T017/T018/T019。
- T026 依赖所有实现完成，用于最终清理。
- 验证阶段 T027-T030 在核心实现与清理完成后执行。

## Parallel Example
```
# 完成模型落地后，可并行处理以下任务：
Task: "T022 [P] 更新 src/main/services/nodejs-installer.ts，移除内联常量"
Task: "T023 [P] 更新 src/main/services/claude-cli-installer.ts，统一使用 catalog"
Task: "T024 [P] 更新 src/main/services/env-manager.ts，统一环境变量模板"
Task: "T025 [P] 更新 src/main/services/google-auth-helper.ts，统一提示语来源"
```

## Validation Checklist
- [ ] 所有契约文件均有对应测试（T004-T005）。
- [ ] 数据模型三大实体对应实现任务（T012-T014）。
- [ ] 测试任务全部在实现任务之前安排。
- [ ] 标记为 [P] 的任务互不修改同一文件。
- [ ] 最终 quickstart 验证记录已更新。
