/**
 * Electron 安全配置
 * 基于 Electron 安全最佳实践
 * https://www.electronjs.org/docs/latest/tutorial/security
 */

export const SECURITY_CONFIG = {
  // 内容安全策略 (CSP)
  CONTENT_SECURITY_POLICY:
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https: wss: ws:; " +
    "media-src 'self'; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "frame-ancestors 'none';",

  // BrowserWindow 安全配置
  BROWSER_WINDOW_SECURITY: {
    // 禁用Node.js集成
    nodeIntegration: false,

    // 启用上下文隔离
    contextIsolation: true,

    // 禁用webSecurity (仅开发模式，生产环境应启用)
    webSecurity: process.env.NODE_ENV === 'production',

    // 允许运行不安全内容 (仅开发模式)
    allowRunningInsecureContent: process.env.NODE_ENV === 'development',

    // 禁用实验性功能
    experimentalFeatures: false,

    // 启用沙盒模式 (可选，可能影响某些功能)
    sandbox: false,

    // 禁用node integration in workers
    nodeIntegrationInWorker: false,

    // 禁用node integration in sub frames
    nodeIntegrationInSubFrames: false,

    // 启用远程模块保护
    enableRemoteModule: false,

    // 安全的预加载脚本路径
    preload: '', // 在主进程中动态设置
  },

  // 允许的外部URL (白名单)
  ALLOWED_EXTERNAL_URLS: [
    'https://api.anthropic.com',
    'https://nodejs.org',
    'https://registry.npmjs.org',
    'https://github.com',
    'https://accounts.google.com',
    // 中国镜像源
    'https://npmmirror.com',
    'https://registry.npmmirror.com',
  ],

  // 危险的permissions (禁用)
  DANGEROUS_PERMISSIONS: [
    'camera',
    'microphone',
    'geolocation',
    'notifications',
    'persistent-storage',
  ],

  // IPC 通道白名单
  ALLOWED_IPC_CHANNELS: {
    // 主进程到渲染进程
    MAIN_TO_RENDERER: [
      'step-progress',
      'step-completed',
      'step-error',
      'detection-result',
      'installation-progress',
      'system-notification',
    ],

    // 渲染进程到主进程
    RENDERER_TO_MAIN: [
      'start-step',
      'retry-step',
      'skip-step',
      'detect-component',
      'install-component',
      'save-config',
      'load-config',
      'open-external-url',
      'show-qr-code',
      'minimize-to-tray',
      'exit-app',
    ],
  },

  // 文件访问限制
  FILE_ACCESS_RESTRICTIONS: {
    // 允许读取的目录
    ALLOWED_READ_DIRS: [
      // 用户目录下的配置文件
      '~/.claude-installer',
      '~/.claude',
      // 临时目录
      '/tmp',
      '/var/tmp',
      // 应用资源目录
      process.resourcesPath || '',
    ],

    // 允许写入的目录
    ALLOWED_WRITE_DIRS: [
      '~/.claude-installer',
      '~/.claude',
      '/tmp/claude-installer',
    ],

    // 禁止访问的敏感目录
    FORBIDDEN_DIRS: [
      '~/.ssh',
      '~/.aws',
      '~/.docker',
      '/etc/passwd',
      '/etc/shadow',
      // Windows敏感目录
      'C:\\Windows\\System32',
      'C:\\Users\\*\\AppData\\Local\\Microsoft\\Windows\\WebCache',
    ],
  },

  // 网络请求限制
  NETWORK_RESTRICTIONS: {
    // 允许的协议
    ALLOWED_PROTOCOLS: ['https:', 'http:'],

    // 禁止的协议
    FORBIDDEN_PROTOCOLS: ['file:', 'ftp:', 'data:', 'javascript:'],

    // 请求超时时间 (毫秒)
    REQUEST_TIMEOUT: 30000,

    // 最大重试次数
    MAX_RETRIES: 3,
  },
};

/**
 * 验证URL是否安全
 */
export function isUrlSafe(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    // 检查协议
    if (!SECURITY_CONFIG.NETWORK_RESTRICTIONS.ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      return false;
    }

    // 检查是否在白名单中
    return SECURITY_CONFIG.ALLOWED_EXTERNAL_URLS.some(allowedUrl => {
      const allowedParsed = new URL(allowedUrl);
      return parsedUrl.hostname === allowedParsed.hostname;
    });
  } catch {
    return false;
  }
}

/**
 * 验证IPC通道是否安全
 */
export function isIpcChannelSafe(channel: string, direction: 'main-to-renderer' | 'renderer-to-main'): boolean {
  const allowedChannels = direction === 'main-to-renderer'
    ? SECURITY_CONFIG.ALLOWED_IPC_CHANNELS.MAIN_TO_RENDERER
    : SECURITY_CONFIG.ALLOWED_IPC_CHANNELS.RENDERER_TO_MAIN;

  return allowedChannels.includes(channel);
}

/**
 * 验证文件路径是否安全
 */
export function isFilePathSafe(filePath: string, operation: 'read' | 'write'): boolean {
  const allowedDirs = operation === 'read'
    ? SECURITY_CONFIG.FILE_ACCESS_RESTRICTIONS.ALLOWED_READ_DIRS
    : SECURITY_CONFIG.FILE_ACCESS_RESTRICTIONS.ALLOWED_WRITE_DIRS;

  // 检查是否在允许的目录中
  const isAllowed = allowedDirs.some(allowedDir => {
    const expandedDir = allowedDir.replace('~', require('os').homedir());
    return filePath.startsWith(expandedDir);
  });

  if (!isAllowed) {
    return false;
  }

  // 检查是否在禁止的目录中
  const isForbidden = SECURITY_CONFIG.FILE_ACCESS_RESTRICTIONS.FORBIDDEN_DIRS.some(forbiddenDir => {
    const expandedDir = forbiddenDir.replace('~', require('os').homedir()).replace('*', '');
    return filePath.startsWith(expandedDir);
  });

  return !isForbidden;
}