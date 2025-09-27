<!--
Sync Impact Report:
Version change: Template → 1.0.0
Modified principles:
- Added: I. 跨平台兼容性
- Added: II. 原生体验优先
- Added: III. 安全第一
- Added: IV. 性能优化
- Added: V. 可维护性
Added sections:
- 构建与打包标准
- 开发流程规范
Templates requiring updates: ✅ updated
Follow-up TODOs: None
-->

# Electron跨平台桌面应用 Constitution

## Core Principles

### I. 跨平台兼容性
应用必须在Windows和macOS上提供一致的功能和用户体验。所有平台特定的功能必须有相应的降级方案。代码中不得包含未经测试的平台特定逻辑。每个发布版本都必须在两个目标平台上验证通过。

### II. 原生体验优先
界面设计必须遵循各平台的用户界面指南和交互规范。使用原生菜单、快捷键和文件系统集成。避免Web应用的外观和行为，追求真正的桌面应用体验。

### III. 安全第一
禁用Node.js集成在渲染进程中，使用contextIsolation和安全的IPC通信。所有用户输入必须验证和清理。敏感数据必须加密存储。定期更新Electron版本以获取安全补丁。

### IV. 性能优化
启动时间必须控制在3秒内。内存占用不得超过200MB基线。避免阻塞主进程的操作。使用适当的缓存策略和懒加载机制。定期进行性能分析和优化。

### V. 可维护性
代码必须模块化，主进程和渲染进程逻辑分离。使用TypeScript增强类型安全。建立完整的单元测试和集成测试套件。文档必须与代码同步更新。

## 构建与打包标准

打包系统必须支持自动化构建流程，生成适用于Windows (.exe, .msi)和macOS (.dmg, .app)的安装包。所有构建产物必须进行代码签名。支持自动更新机制。构建过程必须可重现且版本化。

## 开发流程规范

开发环境必须支持热重载和调试工具。每个功能开发必须包括跨平台测试。Pull Request必须包含对两个平台的影响评估。发布前必须在真实设备上进行端到端测试。

## Governance

Constitution优先于所有其他开发实践。任何修改都需要文档化、审批和迁移计划。所有代码审查必须验证宪法合规性。复杂性增加必须有明确的业务价值支撑。

**Version**: 1.0.0 | **Ratified**: 2025-09-27 | **Last Amended**: 2025-09-27