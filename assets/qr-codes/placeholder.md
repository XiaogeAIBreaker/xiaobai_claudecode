# QR码占位文件

这个目录应该包含以下二维码文件：

## 需要的文件

1. **wechat-support.png** (300x300px)
   - 微信技术支持群二维码
   - 用于用户遇到技术问题时扫码入群获取帮助
   - 建议群名：Claude Code CLI 技术支持

2. **wechat-community.png** (300x300px)
   - 微信用户社区群二维码
   - 用于用户交流使用经验和最佳实践
   - 建议群名：Claude Code CLI 用户社区

3. **qq-group.png** (300x300px)
   - QQ用户群二维码
   - 作为微信群的备用联系方式
   - 建议群名：Claude Code CLI 用户群

## 生成说明

请使用相应的二维码生成工具创建这些文件：

```bash
# 示例：使用qrencode生成二维码
# 替换 GROUP_LINK 为实际的群组链接

# 微信支持群
qrencode -o wechat-support.png -s 10 "GROUP_LINK"

# 微信社区群
qrencode -o wechat-community.png -s 10 "GROUP_LINK"

# QQ群
qrencode -o qq-group.png -s 10 "GROUP_LINK"
```

## 使用位置

这些二维码会在以下位置使用：

- Google设置步骤页面
- API配置步骤页面
- 错误处理对话框
- 帮助菜单
- 关于页面