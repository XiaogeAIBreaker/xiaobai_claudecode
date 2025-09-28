/**
 * Electron Security Configuration
 * 安全最佳实践配置
 */

module.exports = {
  // 主进程安全配置
  main: {
    // 禁用Node.js集成在渲染进程中
    nodeIntegration: false,
    // 启用上下文隔离
    contextIsolation: true,
    // 启用沙盒模式
    sandbox: true,
    // 禁用webSecurity仅在开发环境
    webSecurity: process.env.NODE_ENV === 'production',
    // 禁用允许运行不安全内容
    allowRunningInsecureContent: false,
    // 禁用实验性功能
    experimentalFeatures: false
  },

  // 渲染进程安全配置
  renderer: {
    // CSP (Content Security Policy) 配置
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "https:"],
        "font-src": ["'self'"],
        "connect-src": ["'self'", "https:"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"]
      }
    }
  },

  // IPC安全配置
  ipc: {
    // 启用消息验证
    validateMessages: true,
    // 超时配置（毫秒）
    timeout: 5000,
    // 允许的IPC通道前缀
    allowedChannels: [
      'installer:',
      'app:',
      'window:',
      'dialog:'
    ]
  },

  // 数据安全配置
  data: {
    // 敏感数据加密
    encryption: {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'pbkdf2'
    },
    // 配置文件安全存储
    storage: {
      configDir: process.env.NODE_ENV === 'production'
        ? '~/.claude-installer'
        : '~/.claude-installer-dev',
      permissions: 0o600 // 仅用户可读写
    }
  },

  // 网络安全配置
  network: {
    // 允许的域名列表
    allowedDomains: [
      'registry.npmjs.org',
      'registry.npmmirror.com',
      'api.anthropic.com',
      'claude.ai'
    ],
    // HTTPS强制
    enforceHttps: true,
    // 证书验证
    verifyCertificates: true
  },

  // 开发环境特殊配置
  development: {
    // 开发工具
    enableDevTools: process.env.NODE_ENV === 'development',
    // 热重载
    enableHotReload: process.env.NODE_ENV === 'development',
    // 调试模式
    debugMode: process.env.DEBUG === 'true'
  }
};