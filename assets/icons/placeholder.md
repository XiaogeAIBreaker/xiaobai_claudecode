# 应用图标占位文件

这个目录应该包含应用图标文件：

## 需要的文件

1. **app-icon.png** (256x256px)
   - 通用应用图标，PNG格式
   - 支持透明背景
   - 用于应用商店、桌面快捷方式等

2. **app-icon.ico** (Windows格式)
   - Windows应用图标
   - 包含16x16, 32x32, 48x48, 256x256等多种尺寸
   - 用于Windows系统的.exe文件

3. **app-icon.icns** (macOS格式)
   - macOS应用图标
   - 包含16x16到1024x1024的多种尺寸
   - 用于macOS系统的.app文件

## 设计要求

- 图标应该体现Claude AI和CLI工具的特征
- 使用现代、简洁的设计风格
- 颜色搭配应该与Claude品牌保持一致
- 在小尺寸下仍然清晰可识别

## 生成工具

可以使用以下工具生成不同格式的图标：

```bash
# 从PNG生成ICO (Windows)
magick app-icon.png -define icon:auto-resize=256,128,64,48,32,16 app-icon.ico

# 从PNG生成ICNS (macOS)
png2icns app-icon.icns app-icon.png
```

## 使用位置

这些图标会在以下位置使用：

- Electron应用程序图标
- 操作系统任务栏/Dock
- 应用程序文件资源管理器
- 安装程序界面
- 关于对话框