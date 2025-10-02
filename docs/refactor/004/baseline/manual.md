# 手动冒烟基线（待补）

> 说明：当前 CLI 环境缺乏 GUI / 多平台条件，无法在本地完成 quickstart.md 要求的 macOS 与 Windows 实机演练。以下记录基于既有流程脚本与上一迭代截图占位，需在具备目标环境的机器上补齐截图与确认文案。

## Onboarding
- 预期提示：账户登录 → 许可确认 → 使用条款复核。
- 待补截图：`screenshots/onboarding/{mac,win}-*.png`
- 备注：确认 `InstallerWorkflowMap` 更新后导航顺序未变化。

## Environment 检测
- 预期提示：Node 版本提示、PATH 修复建议、代理提醒。
- 待补截图：`screenshots/environment/{mac,win}-*.png`
- 备注：记录 Node 版本检测日志，确保 catalog 中的 `environment.node.supportedVersions` 与 UI 一致。

## CLI Install
- 预期提示：安装目录选择、进度条、完成提示。
- 断网失败流程：记录错误提示 & 恢复重试路径。
- 待补截图：`screenshots/cli/{mac,win}-*.png`
- 备注：需核对 `SharedConfigurationCatalog` 中的下载源与校验哈希。

## Account Link
- 预期提示：二维码/登录链接、状态同步成功提示。
- 待补截图：`screenshots/account/{mac,win}-*.png`
- 备注：确认 `workflowMap` 对应步骤的 `successCriteria` 与 UI 一致。

## 后续行动
- [ ] 在物理 Windows 设备执行 quickstart.md 流程并回填截图 + 文案。
- [ ] 在物理 macOS 设备执行 quickstart.md 流程并回填截图 + 文案。
- [ ] 记录完成时间并更新 `SharedConfigurationCatalog.lastValidatedAt`。
