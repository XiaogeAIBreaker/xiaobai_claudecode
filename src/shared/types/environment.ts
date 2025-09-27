/**
 * T014: 环境检测类型定义
 * 基于data-model.md实体定义
 */

/**
 * 操作系统类型
 */
export enum PlatformType {
  WINDOWS = 'win32',
  MACOS = 'darwin',
  LINUX = 'linux'
}

/**
 * 架构类型
 */
export enum ArchType {
  X64 = 'x64',
  ARM64 = 'arm64',
  X86 = 'ia32'
}

/**
 * 网络状态
 */
export enum NetworkStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  LIMITED = 'limited',
  UNKNOWN = 'unknown'
}

/**
 * 检测状态
 */
export enum DetectionStatus {
  PENDING = 'pending',
  DETECTING = 'detecting',
  SUCCESS = 'success',
  FAILED = 'failed',
  WARNING = 'warning'
}

/**
 * 系统信息接口
 */
export interface SystemInfo {
  /** 操作系统类型 */
  platform: PlatformType;
  /** 系统架构 */
  arch: ArchType;
  /** 操作系统版本 */
  osVersion: string;
  /** 系统名称 */
  osName: string;
  /** CPU信息 */
  cpu: {
    model: string;
    cores: number;
    speed: number; // GHz
  };
  /** 内存信息 */
  memory: {
    total: number; // GB
    free: number; // GB
    used: number; // GB
  };
  /** 磁盘空间 */
  disk: {
    total: number; // GB
    free: number; // GB
    used: number; // GB
  };
  /** 用户信息 */
  user: {
    name: string;
    home: string;
    isAdmin: boolean;
  };
  /** 系统环境变量 */
  environment: Record<string, string>;
}

/**
 * 网络环境接口
 */
export interface NetworkEnvironment {
  /** 网络状态 */
  status: NetworkStatus;
  /** 是否可访问国外网站 */
  hasInternationalAccess: boolean;
  /** 是否使用代理 */
  hasProxy: boolean;
  /** 连接类型 */
  connectionType: 'wifi' | 'ethernet' | 'cellular' | 'unknown';
  /** 网络速度 */
  speed: {
    download: number; // Mbps
    upload: number; // Mbps
    ping: number; // ms
  };
  /** 网络限制 */
  restrictions: {
    hasFirewall: boolean;
    blockedSites: string[];
    needsVPN: boolean;
  };
  /** 代理配置 */
  proxyConfig?: {
    http?: string;
    https?: string;
    ftp?: string;
    socks?: string;
    noProxy?: string[];
  };
  /** DNS服务器 */
  dnsServers: string[];
  /** 网络延迟 (ms) */
  latency: {
    google: number;
    github: number;
    npm: number;
    claude: number;
  };
  /** 网络带宽 (Mbps) */
  bandwidth?: {
    download: number;
    upload: number;
  };
  /** 地理位置 */
  location?: {
    country: string;
    region: string;
    city: string;
    timezone: string;
  };
}

/**
 * Node.js环境信息
 */
export interface NodeEnvironment {
  /** 是否已安装 */
  installed: boolean;
  /** 当前版本 */
  currentVersion?: string;
  /** 推荐版本 */
  recommendedVersion: string;
  /** 安装路径 */
  installPath?: string;
  /** npm版本 */
  npmVersion?: string;
  /** npm配置 */
  npmConfig?: {
    registry: string;
    cache: string;
    prefix: string;
    userconfig: string;
  };
  /** 是否需要更新 */
  needsUpdate: boolean;
  /** 支持的架构 */
  supportedArchs: ArchType[];
  /** 环境变量 */
  environmentVars: {
    NODE_PATH?: string;
    NPM_CONFIG_PREFIX?: string;
    PATH: string[];
  };
}

/**
 * Google账户环境
 */
export interface GoogleEnvironment {
  /** 是否可访问Google服务 */
  accessible: boolean;
  /** 是否已登录 */
  loggedIn: boolean;
  /** 用户信息 */
  userInfo?: {
    email: string;
    name: string;
    avatar?: string;
  };
  /** 可用的服务 */
  availableServices: {
    gmail: boolean;
    drive: boolean;
    calendar: boolean;
    youtube: boolean;
  };
  /** 访问方式 */
  accessMethod: 'direct' | 'proxy' | 'vpn' | 'mirror';
  /** 登录方式 */
  authMethods: Array<'browser' | 'qrcode' | 'sms'>;
}

/**
 * Claude CLI环境
 */
export interface ClaudeEnvironment {
  /** 是否已安装 */
  installed: boolean;
  /** 当前版本 */
  currentVersion?: string;
  /** 最新版本 */
  latestVersion: string;
  /** 安装路径 */
  installPath?: string;
  /** 是否已配置 */
  configured: boolean;
  /** API密钥状态 */
  apiKeyStatus: 'missing' | 'invalid' | 'valid' | 'expired';
  /** 配置文件路径 */
  configPath?: string;
  /** 可用命令 */
  availableCommands: string[];
  /** 最近使用时间 */
  lastUsed?: Date;
  /** 使用统计 */
  usage?: {
    totalCommands: number;
    successfulCommands: number;
    failedCommands: number;
  };
}

/**
 * 环境检测结果
 */
export interface DetectionResult {
  /** 检测状态 */
  status: DetectionStatus;
  /** 检测时间 */
  timestamp: Date;
  /** 检测耗时 (ms) */
  duration: number;
  /** 检测消息 */
  message: string;
  /** 错误信息 */
  error?: string;
  /** 检测数据 */
  data?: Record<string, any>;
  /** 建议操作 */
  recommendations?: Array<{
    action: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

/**
 * 环境检测器接口
 */
export interface EnvironmentDetector {
  /** 检测器名称 */
  name: string;
  /** 检测类型 */
  type: 'system' | 'network' | 'nodejs' | 'google' | 'claude';
  /** 是否必需 */
  required: boolean;
  /** 检测超时 (ms) */
  timeout: number;
  
  /** 执行检测 */
  detect(): Promise<DetectionResult>;
  
  /** 检查先决条件 */
  checkPrerequisites(): Promise<boolean>;
  
  /** 获取检测进度 */
  getProgress(): number;
}

/**
 * 综合环境状态
 */
export interface EnvironmentState {
  /** 系统信息 */
  system: SystemInfo;
  /** 网络环境 */
  network: NetworkEnvironment;
  /** Node.js环境 */
  nodejs: NodeEnvironment;
  /** Google环境 */
  google: GoogleEnvironment;
  /** Claude CLI环境 */
  claude: ClaudeEnvironment;
  /** 检测结果 */
  detectionResults: Record<string, DetectionResult>;
  /** 整体状态 */
  overallStatus: DetectionStatus;
  /** 检测完成时间 */
  lastDetection?: Date;
  /** 是否需要重新检测 */
  needsRedetection: boolean;
}
