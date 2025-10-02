# 数据源初筛（2025-10-02）

> 方法：使用 `rg` 及 Node.js 脚本遍历 `src/**/*.ts(x)`，识别重复常量/配置命名；随后人工核对核心业务模块，记录目前散落的数据源及其调用方。结果将用于 T015 的 post-scan 对比。

## 重复或分散的数据源

| 主题 | 位置 | 现状 | 风险 |
| ---- | ---- | ---- | ---- |
| 安装向导步骤 `INSTALL_STEPS` | `src/renderer/components/InstallWizard.tsx:37` | 渲染层独有，主进程/测试需自行维护步骤次序 | 步骤顺序一旦调整，主进程 IPC 与 Playwright 流程可能不同步 |
| Node.js 推荐版本 | `src/renderer/components/steps/NodeInstallStep.tsx:113` (`'18.0.0'`), `src/shared/detectors/nodejs.ts:47` (`'18.17.0'`) | 同一含义在 Renderer/Shared 存在不同默认值 | UI 与检测器表现不一致，导致误报“需升级” |
| Claude CLI 安装提示与日志文案 | `src/main/services/claude-cli-installer.ts`, `src/shared/installers/claude-cli.ts`, `src/renderer/components/steps/ClaudeInstallStep.tsx` | 同样的状态消息/提示语分别在主进程、shared、renderer 内硬编码 | 提示语更新需跨文件同步，易残留旧文案 |
| 环境变量模板 | `src/main/services/env-manager.ts:118`（shell 注入模板） 与 `src/shared/installers/claude-cli.ts:424`（配置写入） | 重复声明 PATH / 环境变量片段 | 维护成本高，易产生不同格式 |
| Workflow 条件守卫 | `src/main/ipc-handlers.ts:39-210` 及多个 renderer 步骤组件 | 条件判断散落各处，无集中映射 | 难以验证流程覆盖度，后续统一管理困难 |

## 已知缺口
- 缺少集中导出的 `SharedConfigurationCatalog` 文件；多数常量直接写在使用处。
- 缺少 `InstallerWorkflowMap` 版本号，无法检测 renderer 是否使用过期流程定义。

## 后续步骤
1. T015 将生成 `SharedConfigUsageMatrix`，验证以上条目在迁移后的引用集中度。
2. Phase 3.3 中创建 `src/shared/config/catalog.ts` / `src/shared/workflows/map.ts`，作为单一数据源。
3. 在 `docs/refactor/004/data-sources/diff.md` 中追踪 pre/post 变化。
