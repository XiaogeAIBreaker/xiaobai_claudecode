# 自动化基线记录（2025-10-02）

| 命令 | 结果 | 备注 |
| ---- | ---- | ---- |
| `npm install` | ✅ 成功 | 依赖已是最新，无额外下载。 |
| `npm run lint` | ✅ 成功 | `eslint src/**/*.{ts,tsx} --fix` 无报错；需后续确认是否触发自动格式化变更。 |
| `npm run typecheck` | ❌ 失败 | `tsc --noEmit` 报出 `InstallStep` 类型不匹配、`InstallResult` 缺失字段等14条错误，主要集中在 `src/main/services/claude-cli-installer.ts` 与 `src/renderer/components/steps/*.tsx`。 |
| `npm test` | ❌ 失败 | 多个占位测试仍含 `expect(true).toBe(false)`，共 8 套件失败（配置、日志、安装器、网络探测、WizardStep、平台集成、IPC 处理器、Playwright 入口）。 |

> 说明：保留失败详情用于后续 refactor 过程中对照验证；后续完成核心任务后需重跑并更新 `validation.md`。
