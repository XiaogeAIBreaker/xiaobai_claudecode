# Contract: Shared Configuration Access

## Channel
- **Name**: `ipc.shared-config.get`
- **Type**: Electron IPC invoke（`ipcRenderer.invoke` / `ipcMain.handle`）

## Request Schema
```json
{
  "id": "string",      // SharedConfigurationCatalog 唯一键
  "context": {
    "caller": "main" | "renderer" | "preload",
    "flowId": "onboarding" | "environment" | "cliInstall" | "accountLink"
  }
}
```
- `id` 必须匹配 `SharedConfigurationCatalog` 中存在的条目。
- `context.caller` 用于审计和限权。
- `context.flowId` 用于记录调用来源，支持后续日志聚合。

## Response Schema
```json
{
  "id": "string",
  "value": {},
  "version": "string",           // 语义化版本，标记配置变更
  "lastValidatedAt": "string",   // ISO8601
  "checksum": "string"           // SHA256，防止重复声明
}
```
- 若 `id` 未找到 → 返回 IPC 错误 `shared-config/not-found`。
- 若调用方无权访问 → 返回 IPC 错误 `shared-config/forbidden`。

## Invariants
- 同一 `id` 每次响应的 `checksum` 必须一致，除非配置更新版本号。
- 所有响应写入 `electron-log` 的审计轨迹。

## Contract Tests
- `contracts/tests/shared-config.contract.test.ts`
  - 请求存在条目 → 返回匹配值与校验信息。
  - 请求不存在条目 → 抛出 `shared-config/not-found`。
  - 渲染进程访问受限条目 → 抛出 `shared-config/forbidden`。
