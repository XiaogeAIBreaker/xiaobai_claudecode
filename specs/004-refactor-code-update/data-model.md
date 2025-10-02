# Phase 1 Data Model — Repository-wide Codebase Refactor

## Entities

### SharedConfigurationCatalog
- **Purpose**: 统一维护跨进程共享的常量、环境变量映射、下载镜像地址及向导步骤元数据。
- **Attributes**:
  - `id`: 唯一键（string），规则为 `domain.namespace`（例如 `network.proxy`）。
  - `value`: 支持 `string | number | boolean | Record<string, unknown>`。
  - `description`: 文本说明，用于文档同步。
  - `owner`: 责任人或小组标识（string）。
  - `sourceModule`: 归属模块（`main` / `preload` / `renderer` / `shared`）。
  - `lastValidatedAt`: ISO8601 时间，用于记录最近回归验证时间。
- **Relationships**:
  - 多个 renderer/main 组件可读取同一 `SharedConfigurationCatalog` 条目，但写操作只能通过受控 IPC 接口完成。
- **Constraints**:
  - 所有条目必须来源于单一 TypeScript 导出入口，禁止多处重复声明。
  - 需要在构建时通过类型检查确保消费者引用存在。

### InstallerWorkflowMap
- **Purpose**: 记录安装向导的步骤顺序、条件节点与成功标准。
- **Attributes**:
  - `flowId`: 标识具体流程（`onboarding`, `environment`, `cliInstall`, `accountLink`）。
  - `steps`: 数组，包含 `stepId`, `title`, `description`, `dependsOn`, `guard`。
  - `successCriteria`: 自然语言描述，指示流程完成的验证点。
  - `rollbackActions`: 在步骤失败时执行的补救动作列表。
- **Relationships**:
  - 与 `SharedConfigurationCatalog` 中的文案、远程地址字段关联，引用由 `stepId` 对齐。
- **Constraints**:
  - 任一步骤更新需同步更新 quickstart.md 的回归步骤与相关 Playwright 测试。

## Derived Views
- **SharedConfigUsageMatrix**: 由静态分析生成，列出 `SharedConfigurationCatalog` 条目与引用它的文件路径；用于检测重复声明和未使用条目。
- **WorkflowParityChecklist**: 将 `InstallerWorkflowMap` 与现有测试用例对齐，标记已覆盖的步骤与缺口。
