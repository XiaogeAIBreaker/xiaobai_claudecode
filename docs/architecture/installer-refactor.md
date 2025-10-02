# 安装器重构架构概览

## 目标
- 统一跨进程共享的数据源，杜绝重复常量声明。
- 将安装向导步骤抽象为可版本化的 `InstallerWorkflowMap`，支持 Renderer 与主进程同步。
- 为治理提供可追踪的模块职责矩阵与共享配置审计报表。

## 关键组件
- **SharedConfigurationCatalog** (`src/shared/config/catalog.ts`)
  - 以 `id -> entry` 形式集中管理下载源、提示语、窗口参数等配置。
  - `getSharedConfigEntry`/`updateSharedConfigValue` 提供类型安全的读取与更新辅助。
  - 审计脚本：`scripts/audit/shared-config-usage.ts` 输出 `docs/refactor/004/data-sources/post-scan.json`。
- **InstallerWorkflowMap** (`src/shared/workflows/map.ts`)
  - 定义 `onboarding/environment/cliInstall/accountLink` 四条流程及守卫条件。
  - Renderer 通过 `workflowMap.sync` 比对版本，主进程负责 IPC 返回。
  - 记录各模块职责、共享契约及废弃项，指导后续清理。

## IPC & Bridge 更新
- 主进程 (`src/main/ipc-handlers.ts`) 新增 `ipc.shared-config.get` 与 `ipc.workflow-map.sync`，并在 handlers 中复用 catalog。
- 预加载 (`src/preload/preload.ts`) 暴露 `sharedConfig` / `workflowMap` API，Renderer side 通过 `useSharedConfig` hook 缓存结果。
- 渲染层 (`src/renderer/components/InstallWizard.tsx`) 根据 workflow map 动态渲染步骤，避免硬编码 `INSTALL_STEPS`。

## 验证流程
1. 运行 `npm run lint`、`npm run typecheck` 保证基本质量。
2. `npx tsc scripts/audit/shared-config-usage.ts --module commonjs --target ES2020 --outDir .tmp` + `node .tmp/...` 更新引用报表。
3. Jest/Playwright 契约测试位于 `tests/contract` 与 `tests/e2e`，在扩展共享配置时需更新 `tests/setup.ts`。

## 后续行动
- 将现有 Playwright 占位用例补全录制。
- 在具备 GUI 的 Windows/macOS 环境执行 quickstart.md 所列手动验证。
