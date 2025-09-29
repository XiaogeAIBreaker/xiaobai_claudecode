# Tasks: 优化安装流程用户界面逻辑

**Input**: Design documents from `/Users/bytedance/Desktop/xiaobai_claudecode/specs/003-/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → 已提取：TypeScript + Electron技术栈，UI组件优化范围
2. Load optional design documents:
   → data-model.md: 提取UIState, StepUIState, ActionBarState实体
   → contracts/: ui-state.contract.ts, action-bar.contract.ts → 合约测试任务
   → research.md: 提取技术决策 → 状态管理优化任务
3. Generate tasks by category:
   → Setup: UI组件类型定义，状态管理架构
   → Tests: 合约测试，UI交互测试，跨平台测试
   → Core: UI状态管理器，ActionBar组件，StepComponent优化
   → Integration: 现有安装器集成，事件处理集成
   → Polish: 单元测试，性能验证，文档更新
4. Apply task rules:
   → 不同文件 = 标记[P]并行执行
   → 相同文件 = 顺序执行
   → 测试优先于实现(TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → 所有合约都有测试 ✓
   → 所有实体都有模型任务 ✓
   → 所有UI组件都有实现任务 ✓
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: 可以并行运行 (不同文件，无依赖关系)
- 描述中包含确切的文件路径

## Path Conventions
基于现有Electron项目结构：
- **主要组件**: `src/renderer/components/`
- **状态管理**: `src/shared/store/`
- **类型定义**: `src/shared/types/`
- **测试文件**: `tests/`

## Phase 3.1: Setup
- [x] **T001** [P] 扩展UI类型定义 in `src/shared/types/ui.ts` - 添加UIState, StepUIState, ActionBarState接口
- [x] **T002** [P] 扩展安装器类型 in `src/shared/types/installer.ts` - 为现有类型添加UI状态属性
- [x] **T003** [P] 创建UI状态管理器架构 in `src/shared/store/ui-state-manager.ts`
- [x] **T004** 配置测试环境支持React组件测试 in `jest.config.js` 和 `tests/setup.ts`

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: 这些测试必须先编写并且必须失败，然后再进行任何实现**

### 合约测试
- [ ] **T005** [P] UI状态管理合约测试 in `tests/contracts/ui-state.contract.test.ts`
- [ ] **T006** [P] ActionBar组件合约测试 in `tests/contracts/action-bar.contract.test.ts`

### 组件单元测试
- [ ] **T007** [P] ActionBar组件单元测试 in `tests/renderer/components/ActionBar.test.tsx`
- [ ] **T008** [P] StepComponent UI状态测试 in `tests/renderer/components/StepComponent.test.tsx`
- [ ] **T009** [P] InstallationWizard集成测试 in `tests/renderer/components/InstallationWizard.test.tsx`

### UI状态管理测试
- [ ] **T010** [P] UI状态管理器测试 in `tests/shared/store/ui-state-manager.test.ts`
- [ ] **T011** [P] 按钮状态计算逻辑测试 in `tests/shared/utils/button-state-calculator.test.ts`
- [ ] **T012** [P] 状态转换验证测试 in `tests/shared/utils/state-validator.test.ts`

### 集成和E2E测试
- [ ] **T013** [P] 7步骤安装流程UI测试 in `tests/e2e/installation-flow.test.ts`
- [ ] **T014** [P] 跨平台UI一致性测试 in `tests/e2e/cross-platform-ui.test.ts`
- [ ] **T015** [P] 错误状态处理E2E测试 in `tests/e2e/error-handling.test.ts`

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### UI状态管理实现
- [x] **T016** 实现UI状态管理器 in `src/shared/store/ui-state-manager.ts`
- [x] **T017** [P] 实现按钮状态计算器 in `src/shared/utils/button-state-calculator.ts`
- [x] **T018** [P] 实现状态转换验证器 in `src/shared/utils/state-validator.ts`
- [x] **T019** [P] 实现UI事件处理器 in `src/shared/utils/ui-event-handler.ts`

### ActionBar组件优化
- [ ] **T020** 重构ActionBar组件 in `src/renderer/components/ActionBar/ActionBar.tsx` - 实现新的状态驱动逻辑
- [ ] **T021** [P] 优化ActionBar样式 in `src/renderer/components/ActionBar/ActionBar.module.css`
- [ ] **T022** [P] 实现ActionBar hooks in `src/renderer/components/ActionBar/useActionBar.ts`

### StepComponent优化
- [ ] **T023** 优化StepComponent in `src/renderer/components/StepComponent/StepComponent.tsx` - 移除"继续安装"按钮逻辑
- [ ] **T024** [P] 更新步骤状态指示器 in `src/renderer/components/StepComponent/StepIndicators.tsx`
- [ ] **T025** [P] 实现步骤UI状态hooks in `src/renderer/components/StepComponent/useStepUI.ts`

### 安装向导控制器
- [ ] **T026** 更新InstallationWizard组件 in `src/renderer/components/InstallationWizard/InstallationWizard.tsx` - 集成新UI状态管理
- [ ] **T027** [P] 实现导航控制逻辑 in `src/renderer/components/InstallationWizard/useNavigationController.ts`

## Phase 3.4: Integration

### 现有系统集成
- [ ] **T028** 集成UI状态与安装器状态 in `src/renderer/hooks/useInstallationState.ts`
- [ ] **T029** 更新IPC通信处理器 in `src/main/ipc-handlers.ts` - 支持UI状态事件
- [ ] **T030** 优化preload脚本 in `src/preload/preload.ts` - 添加UI状态相关API

### 事件处理集成
- [ ] **T031** 实现键盘快捷键支持 in `src/renderer/hooks/useKeyboardShortcuts.ts`
- [ ] **T032** [P] 集成无障碍性支持 in `src/renderer/utils/accessibility-helpers.ts`
- [ ] **T033** [P] 实现错误恢复机制 in `src/renderer/utils/error-recovery.ts`

### 跨平台适配
- [ ] **T034** Windows平台UI适配验证 in `src/renderer/utils/platform-adapter.ts`
- [ ] **T035** macOS平台UI适配验证 in `src/renderer/utils/platform-adapter.ts`

## Phase 3.5: Polish

### 测试完善
- [ ] **T036** [P] 补充边缘情况单元测试 in `tests/renderer/edge-cases/`
- [ ] **T037** [P] 性能测试(UI响应<100ms) in `tests/performance/ui-performance.test.ts`
- [ ] **T038** [P] 内存泄漏测试 in `tests/performance/memory-leak.test.ts`

### 代码质量
- [ ] **T039** 代码重构和优化 - 移除重复代码，优化性能
- [ ] **T040** [P] TypeScript类型检查强化 - 确保类型安全
- [ ] **T041** [P] ESLint规则验证 - 确保代码规范

### 文档和验证
- [ ] **T042** [P] 更新quickstart.md验证指南
- [ ] **T043** [P] 更新组件文档 in `docs/components/`
- [ ] **T044** 最终跨平台手动测试验证
- [ ] **T045** 用户体验验证和优化调整

## Dependencies

### Phase Dependencies
- Setup (T001-T004) → Tests (T005-T015)
- Tests (T005-T015) → Core Implementation (T016-T027)
- Core Implementation (T016-T027) → Integration (T028-T035)
- Integration (T028-T035) → Polish (T036-T045)

### Specific Task Dependencies
- T001, T002 (类型定义) → T005-T015 (所有测试)
- T003 (UI状态管理器架构) → T016 (UI状态管理器实现)
- T016 (UI状态管理器) → T020, T023, T026 (组件实现)
- T020 (ActionBar重构) → T028 (状态集成)
- T026 (InstallationWizard更新) → T029 (IPC集成)

## Parallel Execution Examples

### Setup Phase (并行执行)
```bash
# Launch T001-T003 together:
Task: "扩展UI类型定义 in src/shared/types/ui.ts"
Task: "扩展安装器类型 in src/shared/types/installer.ts"
Task: "创建UI状态管理器架构 in src/shared/store/ui-state-manager.ts"
```

### Test Phase (并行执行)
```bash
# Launch T005-T012 together:
Task: "UI状态管理合约测试 in tests/contracts/ui-state.contract.test.ts"
Task: "ActionBar组件合约测试 in tests/contracts/action-bar.contract.test.ts"
Task: "ActionBar组件单元测试 in tests/renderer/components/ActionBar.test.tsx"
Task: "UI状态管理器测试 in tests/shared/store/ui-state-manager.test.ts"
# ... more parallel test tasks
```

### Implementation Phase (部分并行)
```bash
# After T016 completes, launch T017-T019 together:
Task: "实现按钮状态计算器 in src/shared/utils/button-state-calculator.ts"
Task: "实现状态转换验证器 in src/shared/utils/state-validator.ts"
Task: "实现UI事件处理器 in src/shared/utils/ui-event-handler.ts"
```

## Notes
- [P] 任务 = 不同文件，无依赖关系
- 在实现前验证测试失败
- 每个任务后提交代码
- 避免：模糊任务，相同文件冲突
- 重点：UI优化不影响核心安装功能

## Task Generation Rules
*在main()执行期间应用*

1. **From Contracts**:
   - ui-state.contract.ts → T005 UI状态管理合约测试
   - action-bar.contract.ts → T006 ActionBar组件合约测试

2. **From Data Model**:
   - UIState实体 → T001 类型定义 + T016 状态管理器
   - StepUIState实体 → T025 步骤UI状态hooks
   - ActionBarState实体 → T022 ActionBar hooks

3. **From User Stories**:
   - 7步骤流程验证 → T013 E2E测试
   - 错误状态处理 → T015 错误处理测试
   - 跨平台一致性 → T014 跨平台测试

4. **Ordering**:
   - Setup → Tests → Core → Integration → Polish
   - 类型定义 → 状态管理 → 组件实现 → 系统集成

## Validation Checklist
*GATE: main()返回前检查*

- [x] 所有合约都有对应测试 (T005, T006)
- [x] 所有实体都有模型任务 (T001, T002, T016)
- [x] 所有测试都在实现之前 (T005-T015 → T016-T027)
- [x] 并行任务真正独立 (不同文件路径)
- [x] 每个任务指定确切文件路径
- [x] 没有任务与其他[P]任务修改相同文件

## Success Criteria

### 功能完成标准
- ✅ 所有7个安装步骤移除"继续安装"按钮
- ✅ 底部操作栏正确响应步骤状态
- ✅ 失败状态正确禁用"下一步"按钮
- ✅ 最后步骤显示"完成安装"

### 质量标准
- ✅ 所有测试通过 (单元测试 + 集成测试 + E2E测试)
- ✅ 代码覆盖率 > 90%
- ✅ UI响应时间 < 100ms
- ✅ 跨平台行为一致性验证通过
- ✅ 无障碍性测试通过

### 用户体验标准
- ✅ 用户流程清晰无混乱
- ✅ 错误处理用户友好
- ✅ 导航逻辑直观明确