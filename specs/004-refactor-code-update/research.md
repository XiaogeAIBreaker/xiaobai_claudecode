# Phase 0 Research — Repository-wide Codebase Refactor

## Overview
梳理当前安装器的核心业务路径与共享数据源，确定重构期间的守护边界和验证手段，确保在统一数据声明、删除遗留模块时不会破坏现有业务行为。

## Decisions

### D1. 基线行为采集策略
- **Decision**: 通过现有自动化测试（Jest、Playwright）配合一次人工冒烟清单，记录 onboarding、环境检测、CLI 安装、账号关联四条关键流程的成功输出作为重构基线。
- **Rationale**: 自动化测试覆盖主要逻辑，人工复核可捕捉文案或节奏差异；组合方案投入与收益平衡。
- **Alternatives Considered**:
  - 仅依赖自动化测试：无法捕捉用户可感知的细微变化。
  - 全人工复测：效率低、易遗漏异常路径。

### D2. 共享数据源归一化方案
- **Decision**: 将跨进程复用的常量、配置对象和工具函数统一收敛到 `src/shared/`，按功能域拆分子目录，并提供单一导出清单供 main、preload、renderer 引用。
- **Rationale**: 与 Clarifications 结论一致，最小化引用路径调整；现有项目已具备 shared 层次，易于扩展。
- **Alternatives Considered**:
  - 使用 `config/` 目录集中管理：会与构建配置混淆，且缺少 TypeScript 约束。
  - 新建 `core/` 模块：需要大范围重写引用，收益不足。

### D3. 遗留模块清理判定
- **Decision**: 以“无引用 + 无测试依赖 + 文档无描述”为删除条件；对不确定模块先标记为待观察并在 quickstart 手册中列出复查动作。
- **Rationale**: 避免误删潜在脚本；将观察窗口记录在文档内便于后续跟踪。
- **Alternatives Considered**:
  - 立即删除所有识别为重复的文件：风险高，若存在暗链将影响业务。
  - 长期保留标记文件：违背清理目标。

### D4. 重构完成后的回归策略
- **Decision**: 在合并前执行 `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, 并按照 quickstart.md 的步骤手动验证关键向导；对性能使用 `npm run build` + 启动时间采样比对。
- **Rationale**: 覆盖类型、单测、端到端、性能多个维度，能验证行为和性能约束。
- **Alternatives Considered**:
  - 仅执行单一测试套件：无法覆盖所有约束。
  - 引入额外工具（如 profiler）：在无明显性能风险下投入过高。

## Follow-ups
- 与 QA 对齐基线记录模板，确保重构后比对口径一致。
- 与文档负责人确认删除模块对应的文档是否同步清理。
