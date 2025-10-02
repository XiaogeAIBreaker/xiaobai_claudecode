# Contract: Installer Workflow Map Sync

## Channel
- **Name**: `ipc.workflow-map.sync`
- **Type**: Electron IPC invoke（双向：renderer 请求，main 回复）

## Request Schema
```json
{
  "flowId": "onboarding" | "environment" | "cliInstall" | "accountLink",
  "version": "string"   // 渲染进程已知的流程版本
}
```

## Response Schema
```json
{
  "flowId": "string",
  "version": "string",
  "steps": [
    {
      "stepId": "string",
      "title": "string",
      "description": "string",
      "dependsOn": ["string"],
      "guard": {
        "type": "enum",
        "payload": {}
      }
    }
  ],
  "successCriteria": "string",
  "rollbackActions": ["string"],
  "changed": "boolean"   // 若 true，渲染层需刷新界面
}
```

## Error Handling
- 流程不存在 → `workflow/not-found`
- 版本冲突 → 返回最新版本并附带 `changed = true`

## Invariants
- 主进程必须从唯一路径（`src/shared/workflows`）加载流程定义。
- 任意步骤更新需同步增加 `version`。

## Contract Tests
- `contracts/tests/workflow-map.contract.test.ts`
  - `flowId` 合法且版本一致 → `changed = false`，返回现有定义。
  - 版本过旧 → `changed = true`，返回最新流程。
  - 非法 `flowId` → 抛出 `workflow/not-found`。
