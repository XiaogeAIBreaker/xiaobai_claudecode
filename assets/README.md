# 静态资源

这个目录包含Claude Code CLI安装程序的静态资源文件。

## 目录结构

```
assets/
├── qr-codes/           # 微信二维码和技术支持联系方式
│   ├── wechat-support.png     # 微信技术支持群二维码
│   ├── wechat-community.png   # 微信用户社区二维码
│   └── qq-group.png           # QQ用户群二维码
├── icons/              # 应用图标
│   ├── app-icon.png           # 应用主图标
│   ├── app-icon.ico           # Windows图标
│   └── app-icon.icns          # macOS图标
└── images/             # 界面图片
    ├── logo.png               # 应用Logo
    ├── welcome-bg.png         # 欢迎页背景
    ├── success-icon.png       # 成功图标
    ├── error-icon.png         # 错误图标
    └── loading-spinner.gif    # 加载动画
```

## 文件说明

### QR码文件
- **wechat-support.png**: 微信技术支持群二维码，用于用户遇到技术问题时获取帮助
- **wechat-community.png**: 微信用户社区群二维码，用于用户交流和分享经验
- **qq-group.png**: QQ用户群二维码，备用联系方式

### 图标文件
- **app-icon.png**: 通用应用图标，256x256px PNG格式
- **app-icon.ico**: Windows应用图标，包含多种尺寸
- **app-icon.icns**: macOS应用图标，包含多种尺寸

### 图像文件
- **logo.png**: 应用Logo，用于启动界面和关于页面
- **welcome-bg.png**: 欢迎页面背景图
- **success-icon.png**: 成功状态图标
- **error-icon.png**: 错误状态图标
- **loading-spinner.gif**: 加载动画

## 使用说明

1. 所有二维码都应该使用高质量PNG格式，推荐尺寸300x300px
2. 图标文件需要支持透明背景
3. 背景图片应该针对不同屏幕密度提供多个版本
4. 所有图片都应该经过压缩优化以减少应用体积

## 更新指南

如果需要更新二维码或其他资源：

1. 替换对应的文件，保持文件名不变
2. 确保图片质量和尺寸符合要求
3. 更新应用程序并重新打包
4. 测试所有使用这些资源的功能

## 注意事项

- 二维码需要定期检查有效性
- 如果微信群满员，需要及时更新为新群的二维码
- 图标更改需要重新打包应用程序
- 所有资源都应该符合相关法律法规要求