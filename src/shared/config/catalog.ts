import { SharedConfigurationCatalog, SharedConfigurationEntry } from '../types/shared-config';

const DEFAULT_VALIDATION_DATE = '2025-10-02T13:15:00.000Z';

const catalog: SharedConfigurationCatalog = {
  'network.proxy': {
    id: 'network.proxy',
    value: {
      primary: 'https://proxy.internal/api',
      fallback: 'https://proxy.backup/api',
      bypassList: ['localhost', '127.0.0.1', '*.anthropic.com'],
    },
    description: '联网检测与下载任务使用的默认代理与回退地址',
    owner: 'platform-network',
    sourceModule: 'shared',
    lastValidatedAt: DEFAULT_VALIDATION_DATE,
    tags: ['network', 'proxy'],
  },
  'environment.node.versioning': {
    id: 'environment.node.versioning',
    value: {
      minimum: '16.0.0',
      recommended: '18.17.0',
      preferred: '20.11.1',
      ltsCandidate: '22.3.0',
    },
    description: 'Node.js 版本基线（minimum/recommended/preferred）',
    owner: 'platform-runtime',
    sourceModule: 'shared',
    lastValidatedAt: DEFAULT_VALIDATION_DATE,
    tags: ['runtime', 'nodejs'],
  },
  'environment.node.supportedArch': {
    id: 'environment.node.supportedArch',
    value: ['x64', 'arm64'] as const,
    description: '官方验证通过的 Node.js 架构列表',
    owner: 'platform-runtime',
    sourceModule: 'shared',
    lastValidatedAt: DEFAULT_VALIDATION_DATE,
    tags: ['runtime', 'nodejs'],
  },
  'installer.node.progressMessages': {
    id: 'installer.node.progressMessages',
    value: {
      permissionCheck: '检查系统权限',
      permissionGranted: '已具有管理员权限',
      permissionPrompt: '请在弹出的对话框中输入管理员密码',
      download: '正在下载 Node.js 安装包...',
      verify: '验证安装包完整性...',
      install: '正在安装 Node.js...',
      configureEnv: '配置环境变量...',
      finalize: '完成安装配置...',
      success: 'Node.js 安装成功！',
      genericError: '安装失败，请检查网络连接后重试',
    },
    description: 'Node.js 安装流程的统一提示语',
    owner: 'installer-services',
    sourceModule: 'shared',
    lastValidatedAt: DEFAULT_VALIDATION_DATE,
    tags: ['nodejs', 'message'],
  },
  'installer.cli.package': {
    id: 'installer.cli.package',
    value: {
      npm: '@anthropic-ai/claude-code',
      binaryName: 'claude',
    },
    description: 'Claude CLI 安装所需的 npm 包与可执行文件名称',
    owner: 'installer-services',
    sourceModule: 'shared',
    lastValidatedAt: DEFAULT_VALIDATION_DATE,
    tags: ['cli', 'package'],
  },
  'installer.cli.progressMessages': {
    id: 'installer.cli.progressMessages',
    value: {
      preparing: '准备安装 Claude CLI...',
      downloading: '正在下载 Claude CLI 依赖',
      installing: '正在安装 Claude CLI',
      verifying: '验证 Claude CLI 安装结果',
      configuring: '配置 Claude CLI 环境',
      success: 'Claude CLI 安装成功',
      npmReady: 'npm 检查完成，尝试本地安装...',
      fallback: '本地安装失败，尝试全局安装（需要管理员权限）...',
      verification: '验证安装...',
      resolving: '正在解析依赖树...',
      finishing: '正在完成本地安装...',
      sudoPrompt: '请在弹出的对话框中输入密码以授权全局安装...',
      globalComplete: '全局安装完成...',
      failure: '安装失败',
    },
    description: 'Claude CLI 安装过程中统一的进度提示语',
    owner: 'installer-services',
    sourceModule: 'shared',
    lastValidatedAt: DEFAULT_VALIDATION_DATE,
    tags: ['cli', 'message'],
  },
  'installer.cli.mirrors': {
    id: 'installer.cli.mirrors',
    value: {
      global: 'https://registry.npmjs.org',
      china: 'https://registry.npmmirror.com',
    },
    description: 'Claude CLI 安装使用的 npm registry 镜像地址',
    owner: 'platform-network',
    sourceModule: 'shared',
    lastValidatedAt: DEFAULT_VALIDATION_DATE,
    tags: ['cli', 'network'],
  },
  'installer.env.shellBanner': {
    id: 'installer.env.shellBanner',
    value: '# Claude CLI Path',
    description: '环境变量脚本中的标识注释，避免重复写入',
    owner: 'installer-services',
    sourceModule: 'shared',
    lastValidatedAt: DEFAULT_VALIDATION_DATE,
    tags: ['environment'],
  },
  'installer.env.shellFiles': {
    id: 'installer.env.shellFiles',
    value: ['.zshrc', '.bashrc', '.bash_profile', '.profile'],
    description: '需要写入 PATH 的 shell 配置文件优先级列表',
    owner: 'installer-services',
    sourceModule: 'shared',
    lastValidatedAt: DEFAULT_VALIDATION_DATE,
    tags: ['environment'],
  },
  'installer.env.variableBanner': {
    id: 'installer.env.variableBanner',
    value: '# Claude Code Environment Variables',
    description: '环境变量写入段落的标识注释',
    owner: 'installer-services',
    sourceModule: 'shared',
    lastValidatedAt: DEFAULT_VALIDATION_DATE,
    tags: ['environment'],
  },
  'installer.workflow.supportedFlows': {
    id: 'installer.workflow.supportedFlows',
    value: ['onboarding', 'environment', 'cliInstall', 'accountLink'],
    description: '安装向导中受支持的流程顺序',
    owner: 'installer-product',
    sourceModule: 'shared',
    lastValidatedAt: DEFAULT_VALIDATION_DATE,
    tags: ['workflow'],
  },
  'installer.quickstart.lastValidatedAt': {
    id: 'installer.quickstart.lastValidatedAt',
    value: DEFAULT_VALIDATION_DATE,
    description: '最近一次按照 quickstart.md 完成回归的时间戳',
    owner: 'qa',
    sourceModule: 'shared',
    lastValidatedAt: DEFAULT_VALIDATION_DATE,
    tags: ['quality'],
  },
  'installer.google.signupUrl': {
    id: 'installer.google.signupUrl',
    value: 'https://accounts.google.com/signup',
    description: 'Google 账号注册页面 URL',
    owner: 'installer-product',
    sourceModule: 'shared',
    lastValidatedAt: DEFAULT_VALIDATION_DATE,
    tags: ['google'],
  },
  'installer.google.windowOptions': {
    id: 'installer.google.windowOptions',
    value: {
      width: 1000,
      height: 800,
      offset: { x: 100, y: 50 },
      title: 'Google 账号注册',
      alwaysOnTop: true,
      loadTimeoutMs: 30000,
    },
    description: 'Google 注册窗口默认尺寸与行为',
    owner: 'installer-platform',
    sourceModule: 'shared',
    lastValidatedAt: DEFAULT_VALIDATION_DATE,
    tags: ['google'],
  },
};

export const sharedConfigurationCatalog: SharedConfigurationCatalog = catalog;

export const allowedSharedConfigOrigins = [
  'app://renderer/index.html',
  'file://',
];

export function getSharedConfigEntry<TValue = unknown>(id: string): SharedConfigurationEntry<TValue> | undefined {
  return sharedConfigurationCatalog[id] as SharedConfigurationEntry<TValue> | undefined;
}

export function listSharedConfigEntries(): SharedConfigurationEntry[] {
  return Object.values(sharedConfigurationCatalog);
}

export function setSharedConfigValidatedAt(id: string, isoString: string): SharedConfigurationEntry | undefined {
  const entry = sharedConfigurationCatalog[id];
  if (!entry) {
    return undefined;
  }

  entry.lastValidatedAt = isoString;
  if (typeof entry.value === 'string') {
    entry.value = isoString;
  }
  return entry;
}

export function updateSharedConfigValue<TValue>(id: string, value: TValue): SharedConfigurationEntry<TValue> | undefined {
  const entry = sharedConfigurationCatalog[id] as SharedConfigurationEntry<TValue> | undefined;
  if (!entry) {
    return undefined;
  }
  entry.value = value;
  entry.lastValidatedAt = new Date().toISOString();
  return entry;
}
