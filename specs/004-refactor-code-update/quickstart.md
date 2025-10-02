# Quickstart — Repository-wide Codebase Refactor Regression

## 前置条件
1. Node.js 18.x 与 npm 9.x 已安装。
2. 本地可执行 `npm install`、`npm run build`。
3. 具备 Windows / macOS 设备各一台，确保跨平台验证。

## 自动化验证
1. `npm install`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run test:e2e`
6. `npm run build`

> 期待结果：上述命令全部通过，`npm run build` 的产物尺寸与主分支最新版本差异 < 5%。

## 手动冒烟（两平台均需执行）
1. 启动 `npm run dev:quick`，打开应用。
2. 走通以下流程并记录截图：
   - Onboarding：账户登录、许可确认。
   - Environment：检测 Node 版本、PATH 配置。
   - CLI Install：选择安装目录、观察进度条与完成提示。
   - Account Link：完成 Claude 账号绑定流程。
3. 在每个步骤中确认界面文案、按钮状态、告警提示与主分支基线一致。
4. 触发失败场景：断开网络后重试 CLI 安装，确认错误提示一致且可恢复。
5. 重新上线网络，点击“重试”完成流程。

## 记录与回归
- 将每次回归的截图、日志上传到共享盘并更新 `SharedConfigurationCatalog.lastValidatedAt`。
- 若发现新字段或多余字段，立即更新 `data-model.md` 与契约测试。
