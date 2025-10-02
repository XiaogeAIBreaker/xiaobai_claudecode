# 数据源差异对照（Pre vs Post）

| 条目 ID | Pre-scan 状态 | Post-scan 去向 | 备注 |
| ------- | -------------- | -------------- | ---- |
| `environment.node.versioning` | Renderer 与 shared 存在不同默认值 | 统一至 `src/shared/config/catalog.ts`，renderer/node 检测均通过 `useSharedConfig` 消费 | 版本比对逻辑同步改写，消除 `18.0.0` 与 `18.17.0` 冲突 |
| `installer.workflow.supportedFlows` | `InstallWizard.tsx` 内部常量 | 由 catalog 驱动，renderer 通过 workflow sync API 注入 | 阶段顺序现可由共享配置控制，避免多处手工更新 |
| `installer.cli.progressMessages` / `installer.node.progressMessages` | 主进程脚本硬编码文案 | Catalog 暴露统一提示语；服务层引用共享配置 | 保证主进程、UI 与文档提示对齐 |
| `installer_env.*` | 多处重复 PATH 注释及 shell 文件列表 | Catalog 集中维护 `shellFiles`、`shellBanner`、`variableBanner` | `EnvManager`、`ClaudeCliInstaller` 统一引用；避免写入多个注释风格 |
| `installer.google.*` | `google-auth-helper` 手写 URL/窗口参数 | Catalog 定义 URL、窗口尺寸、超时 | 便于未来动态调整注册入口 |
| 旧的 `INSTALL_STEPS` 常量 | 渲染层本地数组 | 渲染层改为根据 workflow map 渲染 | IPC 同步渲染/主进程流程版本号 |

> 结果：`post-scan.json` 仅保留 catalog 定义与消费方引用，未发现新的重复声明。
