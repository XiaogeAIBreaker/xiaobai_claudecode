# Data Model: 优化安装流程用户界面逻辑

## Overview
本文档定义了UI优化功能涉及的数据实体、状态管理和接口设计。

## Core Entities

### UIState (用户界面状态)
主要的UI状态管理实体，控制安装向导的界面显示逻辑。

```typescript
interface UIState {
  // 当前激活的步骤
  currentStep: InstallStep;

  // 底部操作栏状态
  actionBar: {
    // 上一步按钮状态
    previousButton: {
      visible: boolean;
      enabled: boolean;
      label: string; // "上一步"
    };

    // 下一步按钮状态
    nextButton: {
      visible: boolean;
      enabled: boolean;
      label: string; // "下一步" | "完成安装"
    };
  };

  // 每个步骤的UI状态
  stepStates: Record<InstallStep, StepUIState>;
}
```

### StepUIState (步骤UI状态)
每个安装步骤的具体UI状态，继承并扩展现有StepState。

```typescript
interface StepUIState extends StepState {
  // 步骤内按钮显示控制
  inlineButtons: {
    // 继续安装按钮（将被逐步移除）
    continueInstall: {
      visible: boolean;
      enabled: boolean;
    };

    // 重试按钮（失败时显示）
    retry: {
      visible: boolean;
      enabled: boolean;
    };
  };

  // UI特定的状态指示器
  uiIndicators: {
    showSpinner: boolean;
    showCheckmark: boolean;
    showErrorIcon: boolean;
    progressPercent: number;
  };
}
```

### ActionBarState (操作栏状态)
底部操作栏的状态管理，集中控制导航按钮。

```typescript
interface ActionBarState {
  // 当前步骤索引（0-6，对应7个步骤）
  stepIndex: number;

  // 总步骤数
  totalSteps: number;

  // 是否允许向前导航
  canNavigateNext: boolean;

  // 是否允许向后导航
  canNavigatePrevious: boolean;

  // 下一步操作类型
  nextActionType: 'next' | 'complete' | 'disabled';
}
```

## State Transitions

### 步骤状态转换
```
PENDING → RUNNING → SUCCESS/FAILED
                 ↗      ↘
                SKIPPED  ← (用户选择跳过)
```

### UI状态响应规则
1. **StepStatus.SUCCESS**:
   - 隐藏步骤内"继续安装"按钮
   - 启用底部"下一步"按钮
   - 显示成功指示器

2. **StepStatus.FAILED**:
   - 隐藏步骤内"继续安装"按钮
   - 禁用底部"下一步"按钮
   - 显示"重试"按钮
   - 显示错误指示器

3. **StepStatus.RUNNING**:
   - 隐藏所有操作按钮
   - 显示加载指示器

## Validation Rules

### ActionBar按钮状态验证
```typescript
// 上一步按钮规则
previousButton.visible = stepIndex > 0;
previousButton.enabled = !isCurrentStepRunning;

// 下一步按钮规则
nextButton.visible = true;
nextButton.enabled = currentStepStatus === StepStatus.SUCCESS;
nextButton.label = stepIndex === (totalSteps - 1) ? "完成安装" : "下一步";
```

### 步骤内按钮显示规则
```typescript
// 继续安装按钮（逐步移除）
continueInstall.visible = false; // 新逻辑：始终隐藏

// 重试按钮
retry.visible = stepStatus === StepStatus.FAILED;
retry.enabled = !isRetrying;
```

## Integration Points

### 与现有InstallStep枚举的集成
```typescript
// 现有的7个安装步骤保持不变
enum InstallStep {
  NETWORK_CHECK = 'network-check',      // 0
  NODEJS_INSTALL = 'nodejs-install',    // 1
  GOOGLE_SETUP = 'google-setup',        // 2
  CLAUDE_CLI_SETUP = 'claude-cli-setup', // 3
  API_CONFIGURATION = 'api-configuration', // 4
  TESTING = 'testing',                   // 5
  COMPLETION = 'completion'              // 6
}
```

### 与现有StepStatus的集成
```typescript
// 继续使用现有状态枚举
enum StepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}
```

## Data Flow

### 状态更新流程
1. **安装器状态变更** → InstallState更新
2. **UI监听状态变更** → UIState重新计算
3. **条件渲染触发** → 组件重新渲染
4. **用户界面更新** → 用户看到一致的按钮状态

### 事件处理流程
1. **用户点击"下一步"** → ActionBar组件事件
2. **验证当前步骤状态** → 确保可以继续
3. **触发下一步逻辑** → 调用安装器API
4. **更新UI状态** → 反映新的步骤状态

## Backward Compatibility

### 现有代码兼容性
- 保留所有现有的InstallStep和StepStatus枚举
- 扩展而不是替换现有的StepState接口
- 新的UIState作为补充层，不影响核心安装逻辑

### 迁移策略
- 渐进式移除步骤内"继续安装"按钮
- 保留现有事件处理逻辑作为后备
- 通过功能开关控制新旧UI逻辑切换