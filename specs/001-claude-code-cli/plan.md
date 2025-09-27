
# Implementation Plan: Claude Code CLI沉浸式安装程序

**Branch**: `001-claude-code-cli` | **Date**: 2025-09-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/bytedance/Desktop/xiaobai_claudecode/specs/001-claude-code-cli/spec.md`

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
为中国地区0基础编程小白创建一个图形化的Claude Code CLI安装助手。用户双击运行.exe/.app文件，通过向导式界面自动检测和安装所有必要组件（网络、Node.js、Google邮箱、Claude Code CLI），配置API凭据，并引导用户完成第一个todolist应用。采用Electron跨平台GUI架构，完全中文界面，无需任何命令行操作。

## Technical Context
**Language/Version**: Node.js 18+ + TypeScript + Electron
**Primary Dependencies**: Electron（跨平台GUI框架）、React（UI组件）、Material-UI（界面组件库）、Axios（HTTP请求）
**Storage**: 本地JSON配置文件存储用户设置和安装状态
**Testing**: Jest + Electron测试 + 端到端GUI测试
**Target Platform**: Windows 10+(.exe) 和 macOS 10.15+(.app)
**Project Type**: single - 桌面GUI应用
**Performance Goals**: 启动时间<3秒，界面响应<1秒，检测操作<5秒
**Constraints**: 中国网络环境适配，支持代理设置，双击运行，无需命令行
**Scale/Scope**: 单用户图形化工具，7个向导步骤，完全中文界面

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**CLI跨平台兼容性检查**:
- [x] CLI在Windows和macOS上功能一致
- [x] 使用Node.js跨平台API避免平台特定代码
- [x] 两个目标平台测试覆盖

**用户体验要求**:
- [x] 提供中文本地化界面
- [x] 友好的错误信息和恢复指导
- [x] 进度指示和状态反馈
- [x] 小白用户友好的交互设计

**安全性要求**:
- [x] 用户输入验证和清理
- [x] API密钥安全存储
- [x] 网络请求验证和错误处理
- [x] 避免在日志中暴露敏感信息

**性能标准**:
- [x] 启动时间≤2秒
- [x] 网络检测≤5秒
- [x] 安装操作异步处理避免阻塞
- [x] 适当的缓存和重试机制

**可维护性要求**:
- [x] 模块化架构设计
- [x] 使用TypeScript类型安全
- [x] 完整的测试套件覆盖
- [x] 文档与代码同步

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
src/
├── main/                   # Electron主进程
│   ├── main.ts            # 应用入口
│   ├── ipc-handlers.ts    # IPC通信处理
│   └── menu.ts            # 应用菜单
├── renderer/               # Electron渲染进程(GUI)
│   ├── App.tsx            # React主组件
│   ├── components/        # React组件
│   │   ├── WizardStep.tsx # 向导步骤组件
│   │   ├── ProgressBar.tsx# 进度条组件
│   │   ├── ErrorDialog.tsx# 错误对话框
│   │   └── QRCodeView.tsx # 二维码显示
│   ├── pages/             # 向导页面
│   │   ├── NetworkCheck.tsx    # 网络检测页面
│   │   ├── NodejsInstall.tsx   # Node.js安装页面
│   │   ├── GoogleSignup.tsx    # Google注册页面
│   │   ├── ClaudeCLISetup.tsx  # Claude CLI设置页面
│   │   ├── APIConfig.tsx       # API配置页面
│   │   ├── CLITest.tsx         # CLI测试页面
│   │   └── TodoTutorial.tsx    # Todo教程页面
│   └── styles/            # CSS样式文件
├── shared/                 # 主进程和渲染进程共享代码
│   ├── detectors/         # 环境检测模块
│   │   ├── network.ts     # 网络连接检测
│   │   ├── nodejs.ts      # Node.js环境检测
│   │   ├── google.ts      # Google邮箱检测
│   │   └── claude-cli.ts  # Claude CLI检测
│   ├── installers/        # 安装模块
│   │   ├── nodejs.ts      # Node.js自动安装
│   │   └── claude-cli.ts  # Claude CLI安装
│   ├── utils/             # 公共工具
│   │   ├── config.ts      # 配置管理
│   │   ├── logger.ts      # 日志系统
│   │   └── system.ts      # 系统工具
│   └── types/             # TypeScript类型定义
│       ├── installer.ts   # 安装器类型
│       ├── config.ts      # 配置类型
│       ├── ui.ts          # 界面类型
│       └── state.ts       # 状态类型

tests/
├── unit/                   # 单元测试
│   ├── shared/            # 共享模块测试
│   │   ├── detectors/
│   │   ├── installers/
│   │   └── utils/
│   └── renderer/          # 渲染进程测试
│       └── components/
├── integration/            # 集成测试
│   ├── full-install.test.ts
│   └── gui-flow.test.ts
├── e2e/                   # 端到端GUI测试
│   ├── installer-wizard.test.ts
│   └── error-handling.test.ts
└── fixtures/               # 测试数据

config/                     # 配置文件
├── electron/              # Electron配置
├── qr-codes/             # 微信二维码图片
└── messages.json         # 中文提示消息

assets/                     # 静态资源
├── icons/                # 应用图标
├── images/               # 界面图片
└── sounds/               # 提示音效

docs/                       # 项目文档
├── README.md
├── user-guide.md         # 用户使用指南
└── troubleshooting.md    # 故障排除

build/                      # 构建输出
├── win/                  # Windows .exe
├── mac/                  # macOS .app
└── dist/                 # 开发构建
```

**Structure Decision**: 选择Electron GUI应用结构。主进程和渲染进程分离，共享代码模块化。React组件按页面和功能组织，支持跨平台打包。完整的测试覆盖包括单元、集成和E2E GUI测试。

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- CLI模块接口 → TypeScript接口定义任务 [P]
- 数据模型实体 → 类型定义和数据管理任务 [P]
- 检测器模块 → 环境检测功能任务 [P]
- 安装器模块 → 自动安装功能任务
- 引导模块 → 用户引导和教程任务
- 集成测试 → 端到端安装流程测试

**任务分类**:
1. **基础设施任务**: TypeScript配置、CLI框架搭建、工具函数
2. **检测功能任务**: 网络、Node.js、Google、Claude CLI检测器
3. **安装功能任务**: Node.js和Claude CLI自动安装器
4. **用户界面任务**: 中文本地化、进度显示、错误处理
5. **引导教程任务**: Google注册引导、API配置、TodoList教程
6. **测试任务**: 单元测试、集成测试、端到端测试

**Ordering Strategy**:
- 基础设施 → 检测功能 → 安装功能 → 用户界面 → 引导教程 → 测试
- TypeScript类型定义优先于实现
- 工具函数优先于业务逻辑
- 单元测试与对应模块并行开发 [P]
- 集成测试在所有模块完成后

**特殊考虑**:
- 中国网络环境适配任务分散在各个模块中
- 错误处理和恢复机制贯穿所有任务
- 用户体验优化任务独立并行进行
- 安全性要求（API密钥加密等）集成到相关任务

**Estimated Output**: 35-40个编号有序任务，包含：
- 8-10个基础设施任务
- 12-15个核心功能任务
- 6-8个用户界面任务
- 4-5个引导教程任务
- 8-10个测试任务

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
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


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
- [x] Complexity deviations documented (none required)

## Generated Artifacts

**Phase 0 Outputs**:
- [x] research.md - 技术栈选择和中国网络环境适配研究

**Phase 1 Outputs**:
- [x] data-model.md - 数据模型和实体定义
- [x] contracts/installer-api.md - CLI和模块接口定义
- [x] quickstart.md - 快速开始和故障排除指南
- [x] /Users/bytedance/Desktop/xiaobai_claudecode/CLAUDE.md - Agent上下文文件

**Ready for Next Phase**:
✅ 所有设计文档已完成，可以运行 `/tasks` 命令生成任务清单

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
