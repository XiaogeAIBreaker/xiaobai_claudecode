/**
 * T015: 用户配置和错误类型
 * 基于data-model.md实体定义
 */

import { InstallStep } from './installer';
import { PlatformType } from './environment';

/**
 * 语言设置
 */
export enum Language {
  ZH_CN = 'zh-CN',
  EN_US = 'en-US'
}

/**
 * 错误级别
 */
export enum ErrorLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * 错误类型
 */
export enum ErrorType {
  NETWORK_ERROR = 'network_error',
  PERMISSION_ERROR = 'permission_error',
  FILE_ERROR = 'file_error',
  VALIDATION_ERROR = 'validation_error',
  INSTALLATION_ERROR = 'installation_error',
  CONFIGURATION_ERROR = 'configuration_error',
  USER_CANCELLED = 'user_cancelled',
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * 用户配置接口
 */
export interface UserConfig {
  /** 界面语言 */
  language: Language;

  /** Claude API配置 */
  apiKey: string | null;
  apiBaseUrl: string | null;

  /** 网络设置 */
  network: {
    useProxy: boolean;
    proxyUrl?: string;
    testUrls: string[];
  };

  /** 代理设置 */
  proxySettings: ProxyConfig | null;

  /** 安装设置 */
  installLocation: string | null;
  skipSteps: InstallStep[];

  /** 重试设置 */
  autoRetry: boolean;
  maxRetries: number;

  /** 日志设置 */
  logging: LoggingConfig;

  /** 界面设置 */
  ui: UIConfig;

  /** 高级设置 */
  advanced: AdvancedConfig;
}

/**
 * 代理配置接口
 */
export interface ProxyConfig {
  /** 是否启用代理 */
  enabled: boolean;
  /** 代理类型 */
  type: 'http' | 'https' | 'socks4' | 'socks5';
  /** 代理主机 */
  host: string;
  /** 代理端口 */
  port: number;
  /** 用户名 */
  username?: string;
  /** 密码 */
  password?: string;
  /** 无需代理的地址 */
  noProxy: string[];
  /** 是否验证证书 */
  verifySSL: boolean;
  /** 连接超时 (ms) */
  timeout: number;
}

/**
 * 日志配置接口
 */
export interface LoggingConfig {
  /** 日志级别 */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** 是否输出到控制台 */
  console: boolean;
  /** 是否输出到文件 */
  file: boolean;
  /** 日志文件路径 */
  filePath: string;
  /** 文件大小限制 (MB) */
  maxFileSize: number;
  /** 保留文件数量 */
  maxFiles: number;
  /** 是否包含敏感信息 */
  includeSensitive: boolean;
}

/**
 * 界面配置接口
 */
export interface UIConfig {
  /** 主题 */
  theme: 'light' | 'dark' | 'auto';
  /** 字体大小 */
  fontSize: 'small' | 'medium' | 'large';
  /** 动画效果 */
  animations: boolean;
  /** 是否显示详细信息 */
  showDetails: boolean;
  /** 是否自动关闭窗口 */
  autoClose: boolean;
  /** 窗口大小 */
  windowSize: {
    width: number;
    height: number;
  };
  /** 窗口位置 */
  windowPosition: {
    x: number;
    y: number;
  };
  /** 是否始终置顶 */
  alwaysOnTop: boolean;
}

/**
 * 高级配置接口
 */
export interface AdvancedConfig {
  /** 并发下载数 */
  concurrentDownloads: number;
  /** 下载超时 (ms) */
  downloadTimeout: number;
  /** 是否验证文件校验和 */
  verifyChecksum: boolean;
  /** 是否保留下载文件 */
  keepDownloads: boolean;
  /** 临时文件目录 */
  tempDirectory: string;
  /** 自定义下载源 */
  customMirrors: Record<string, string>;
  /** 调试模式 */
  debugMode: boolean;
  /** 禁用遥测 */
  disableTelemetry: boolean;
  /** 自动更新检查 */
  autoUpdate: boolean;
  /** 预发布版本 */
  allowPrerelease: boolean;
}

/**
 * 错误信息接口
 */
export interface ErrorInfo {
  /** 错误 ID */
  id: string;
  /** 错误级别 */
  level: ErrorLevel;
  /** 错误类型 */
  type: ErrorType;
  /** 错误消息 */
  message: string;
  /** 错误详情 */
  details?: string;
  /** 发生时间 */
  timestamp: Date;
  /** 相关步骤 */
  step?: InstallStep;
  /** 错误代码 */
  code?: string;
  /** 错误堆栈 */
  stack?: string;
  /** 系统信息 */
  system?: {
    platform: PlatformType;
    version: string;
    arch: string;
  };
  /** 用户操作 */
  userAction?: string;
  /** 重试次数 */
  retryCount?: number;
  /** 是否可恢复 */
  recoverable: boolean;
  /** 解决方案 */
  solutions?: Array<{
    description: string;
    action: string;
    automatic: boolean;
  }>;
}

/**
 * 配置验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息 */
  errors: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
  /** 警告信息 */
  warnings: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

/**
 * 配置管理器接口
 */
export interface ConfigManager {
  /** 加载配置 */
  load(): Promise<UserConfig>;
  
  /** 保存配置 */
  save(config: UserConfig): Promise<void>;
  
  /** 重置配置 */
  reset(): Promise<void>;
  
  /** 验证配置 */
  validate(config: Partial<UserConfig>): ValidationResult;
  
  /** 导入配置 */
  import(filePath: string): Promise<UserConfig>;
  
  /** 导出配置 */
  export(filePath: string): Promise<void>;
  
  /** 加密敏感数据 */
  encrypt(data: string): string;
  
  /** 解密敏感数据 */
  decrypt(encryptedData: string): string;
  
  /** 获取配置路径 */
  getConfigPath(): string;
  
  /** 获取默认配置 */
  getDefaultConfig(): UserConfig;
}

/**
 * 应用设置接口
 */
export interface AppSettings {
  /** 应用版本 */
  version: string;
  /** 构建版本 */
  buildVersion: string;
  /** 安装时间 */
  installDate: Date;
  /** 最后更新时间 */
  lastUpdate?: Date;
  /** 应用ID */
  appId: string;
  /** 用户ID */
  userId?: string;
  /** 许可信息 */
  license?: {
    type: string;
    key: string;
    expiry?: Date;
  };
  /** 统计设置 */
  telemetry: {
    enabled: boolean;
    userId: string;
    sessionId: string;
    lastReported?: Date;
  };
}
