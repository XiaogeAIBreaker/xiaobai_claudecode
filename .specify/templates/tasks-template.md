# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 3.1: Setup
- [ ] T001 Create Electron项目结构(主进程/渲染进程分离)
- [ ] T002 Initialize Electron项目并配置TypeScript
- [ ] T003 [P] Configure ESLint, Prettier和Electron安全最佳实践
- [ ] T004 [P] Setup跨平台构建配置(Windows/macOS)

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T005 [P] 主进程IPC通信测试 in tests/main/test_ipc.spec.ts
- [ ] T006 [P] 渲染进程安全性测试 in tests/renderer/test_security.spec.ts
- [ ] T007 [P] 跨平台功能集成测试 in tests/integration/test_platform.spec.ts
- [ ] T008 [P] 应用启动性能测试 in tests/performance/test_startup.spec.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [ ] T009 [P] 主进程核心逻辑 in src/main/main.ts
- [ ] T010 [P] 渲染进程入口 in src/renderer/index.ts
- [ ] T011 [P] IPC通信处理器 in src/main/ipc-handlers.ts
- [ ] T012 contextIsolation preload脚本 in src/preload/preload.ts
- [ ] T013 原生菜单实现 in src/main/menu.ts
- [ ] T014 用户输入验证和清理 in src/common/validation.ts
- [ ] T015 错误处理和日志记录 in src/common/logger.ts

## Phase 3.4: Integration
- [ ] T016 Windows平台特定功能集成
- [ ] T017 macOS平台特定功能集成
- [ ] T018 文件系统集成和权限处理
- [ ] T019 系统通知和托盘图标
- [ ] T020 自动更新机制配置

## Phase 3.5: Polish
- [ ] T021 [P] 单元测试覆盖 in tests/unit/test_validation.spec.ts
- [ ] T022 性能测试(启动时间≤3秒, 内存≤200MB)
- [ ] T023 [P] 更新README.md和用户文档
- [ ] T024 代码重构和去重
- [ ] T025 跨平台手动测试验证
- [ ] T026 安全审查和代码签名配置

## Dependencies
- Setup (T001-T004) before Tests (T005-T008)
- Tests (T005-T008) before implementation (T009-T015)
- Core implementation before integration (T016-T020)
- Integration before polish (T021-T026)
- T009主进程 blocks T011 IPC handlers
- T012 preload blocks 渲染进程安全

## Parallel Example
```
# Launch T005-T008 together:
Task: "主进程IPC通信测试 in tests/main/test_ipc.spec.ts"
Task: "渲染进程安全性测试 in tests/renderer/test_security.spec.ts"
Task: "跨平台功能集成测试 in tests/integration/test_platform.spec.ts"
Task: "应用启动性能测试 in tests/performance/test_startup.spec.ts"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Avoid: vague tasks, same file conflicts

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - Each contract file → contract test task [P]
   - Each endpoint → implementation task
   
2. **From Data Model**:
   - Each entity → model creation task [P]
   - Relationships → service layer tasks
   
3. **From User Stories**:
   - Each story → integration test [P]
   - Quickstart scenarios → validation tasks

4. **Ordering**:
   - Setup → Tests → Models → Services → Endpoints → Polish
   - Dependencies block parallel execution

## Validation Checklist
*GATE: Checked by main() before returning*

- [ ] All contracts have corresponding tests
- [ ] All entities have model tasks
- [ ] All tests come before implementation
- [ ] Parallel tasks truly independent
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another [P] task