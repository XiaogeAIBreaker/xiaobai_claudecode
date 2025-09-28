/**
 * UserConfiguration实体定义和验证
 * 定义用户配置的数据结构和业务规则
 */

/**
 * API配置接口
 */
export interface ApiConfiguration {
  anthropicBaseUrl?: string;       // ANTHROPIC_BASE_URL
  anthropicApiKey?: string;        // ANTHROPIC_API_KEY (加密存储)
  isConfigured: boolean;          // 是否已配置
  lastValidated?: string;         // 最后验证时间（ISO字符串）
  validationStatus: 'valid' | 'invalid' | 'unknown'; // 验证状态
}

/**
 * 用户偏好设置接口
 */
export interface UserPreferences {
  language: string;               // 界面语言
  autoDetectSettings: boolean;    // 自动检测设置
  skipOptionalSteps: boolean;     // 跳过可选步骤
  debugMode: boolean;            // 调试模式
  telemetryEnabled: boolean;     // 遥测数据
}

/**
 * 代理设置接口
 */
export interface ProxySettings {
  enabled: boolean;              // 是否启用代理
  host: string;                 // 代理主机
  port: number;                 // 代理端口
  username?: string;            // 用户名（可选）
  password?: string;            // 密码（可选，加密存储）
  protocol: 'http' | 'https' | 'socks5'; // 代理协议
}

/**
 * 用户配置接口
 */
export interface UserConfiguration {
  anthropicBaseUrl?: string;      // ANTHROPIC_BASE_URL
  anthropicApiKey?: string;       // ANTHROPIC_API_KEY (加密存储)
  npmRegistry?: string;           // npm镜像源
  installPath?: string;           // 安装路径
  language: string;               // 界面语言
  autoDetectSettings: boolean;    // 自动检测设置
  skipOptionalSteps: boolean;     // 跳过可选步骤
  debugMode: boolean;             // 调试模式
  telemetryEnabled: boolean;      // 遥测数据
  proxySettings?: ProxySettings;  // 代理设置（可选）
  createdAt: string;              // 创建时间（ISO字符串）
  updatedAt: string;              // 更新时间（ISO字符串）
}

/**
 * 验证用户配置数据
 */
export function validateUserConfiguration(config: UserConfiguration): void {
  // 验证基本字段
  if (typeof config.language !== 'string' || config.language.trim() === '') {
    throw new Error('UserConfiguration.language 必须是非空字符串');
  }

  if (typeof config.autoDetectSettings !== 'boolean') {
    throw new Error('UserConfiguration.autoDetectSettings 必须是布尔值');
  }

  if (typeof config.skipOptionalSteps !== 'boolean') {
    throw new Error('UserConfiguration.skipOptionalSteps 必须是布尔值');
  }

  if (typeof config.debugMode !== 'boolean') {
    throw new Error('UserConfiguration.debugMode 必须是布尔值');
  }

  if (typeof config.telemetryEnabled !== 'boolean') {
    throw new Error('UserConfiguration.telemetryEnabled 必须是布尔值');
  }

  // 验证时间字段
  if (typeof config.createdAt !== 'string') {
    throw new Error('UserConfiguration.createdAt 必须是ISO时间字符串');
  }

  if (typeof config.updatedAt !== 'string') {
    throw new Error('UserConfiguration.updatedAt 必须是ISO时间字符串');
  }

  try {
    new Date(config.createdAt);
    new Date(config.updatedAt);
  } catch (error) {
    throw new Error('UserConfiguration 时间字段必须是有效的ISO时间字符串');
  }

  // 验证可选字段
  if (config.anthropicBaseUrl !== undefined) {
    validateUrl(config.anthropicBaseUrl);
  }

  if (config.anthropicApiKey !== undefined) {
    validateApiKey(config.anthropicApiKey);
  }

  if (config.npmRegistry !== undefined) {
    validateUrl(config.npmRegistry);
  }

  if (config.installPath !== undefined) {
    validateInstallPath(config.installPath);
  }

  if (config.proxySettings !== undefined) {
    validateProxySettings(config.proxySettings);
  }

  // 验证语言代码
  if (!isValidLanguageCode(config.language)) {
    throw new Error(`UserConfiguration.language 不是支持的语言代码: ${config.language}`);
  }
}

/**
 * 验证API密钥格式
 */
export function validateApiKey(apiKey: string): void {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API密钥不能为空');
  }

  // Anthropic API密钥格式: sk-* 开头
  if (!apiKey.startsWith('sk-')) {
    throw new Error('API密钥格式无效，必须以 sk- 开头');
  }

  if (apiKey.length < 10) {
    throw new Error('API密钥长度不足');
  }
}

/**
 * 验证URL格式
 */
export function validateUrl(url: string): void {
  if (!url || url.trim() === '') {
    throw new Error('URL不能为空');
  }

  try {
    new URL(url);
  } catch (error) {
    throw new Error(`URL格式无效: ${url}`);
  }

  // 只允许HTTPS和HTTP协议
  const parsedUrl = new URL(url);
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('URL必须使用HTTP或HTTPS协议');
  }
}

/**
 * 验证安装路径
 */
export function validateInstallPath(path: string): void {
  if (!path || path.trim() === '') {
    throw new Error('安装路径不能为空');
  }

  // 简单的路径格式验证
  const pathRegex = /^([a-zA-Z]:|\/)[^\0<>:"|?*\n\r\t]*$/;
  if (!pathRegex.test(path)) {
    throw new Error('安装路径格式无效');
  }

  // 不允许安装到系统关键目录
  const forbiddenPaths = ['/root', 'C:\\Windows', 'C:\\System32'];
  const normalizedPath = path.toLowerCase().replace(/\\/g, '/');

  for (const forbidden of forbiddenPaths) {
    if (normalizedPath.startsWith(forbidden.toLowerCase())) {
      throw new Error(`不允许安装到系统目录: ${path}`);
    }
  }
}

/**
 * 验证代理设置
 */
export function validateProxySettings(proxySettings: ProxySettings): void {
  if (typeof proxySettings.enabled !== 'boolean') {
    throw new Error('ProxySettings.enabled 必须是布尔值');
  }

  if (!proxySettings.enabled) {
    return; // 未启用代理时不需要验证其他字段
  }

  if (!proxySettings.host || proxySettings.host.trim() === '') {
    throw new Error('代理主机不能为空');
  }

  if (typeof proxySettings.port !== 'number' || proxySettings.port <= 0 || proxySettings.port > 65535) {
    throw new Error('代理端口必须是1-65535之间的数字');
  }

  if (!['http', 'https', 'socks5'].includes(proxySettings.protocol)) {
    throw new Error('代理协议必须是 http、https 或 socks5');
  }

  // 验证可选的用户名和密码
  if (proxySettings.username !== undefined && proxySettings.username.trim() === '') {
    throw new Error('代理用户名不能为空字符串');
  }

  if (proxySettings.password !== undefined && proxySettings.password.trim() === '') {
    throw new Error('代理密码不能为空字符串');
  }
}

/**
 * 验证语言代码
 */
export function isValidLanguageCode(language: string): boolean {
  const supportedLanguages = ['zh-CN', 'en-US'];
  return supportedLanguages.includes(language);
}

/**
 * 获取默认用户配置
 */
export function getDefaultUserConfiguration(): UserConfiguration {
  const now = new Date().toISOString();

  return {
    language: 'zh-CN',
    autoDetectSettings: true,
    skipOptionalSteps: false,
    debugMode: false,
    telemetryEnabled: true,
    npmRegistry: 'https://registry.npmmirror.com/',
    createdAt: now,
    updatedAt: now
  };
}

/**
 * 合并用户配置与默认配置
 */
export function mergeWithDefaults(userOverrides: Partial<UserConfiguration>): UserConfiguration {
  const defaultConfig = getDefaultUserConfiguration();
  const now = new Date().toISOString();

  const mergedConfig: UserConfiguration = {
    ...defaultConfig,
    ...userOverrides,
    updatedAt: now // 总是更新修改时间
  };

  validateUserConfiguration(mergedConfig);
  return mergedConfig;
}

/**
 * 加密敏感字段
 */
export function encryptSensitiveField(fieldName: string, value: string): string {
  // 实际实现中应该使用真正的加密算法
  // 这里只是一个占位符实现
  const sensitiveFields = ['anthropicApiKey', 'proxyPassword'];

  if (!sensitiveFields.includes(fieldName)) {
    return value;
  }

  // TODO: 实现真正的加密逻辑
  return `encrypted_${Buffer.from(value).toString('base64')}`;
}

/**
 * 解密敏感字段
 */
export function decryptSensitiveField(encryptedValue: string): string {
  // 实际实现中应该使用真正的解密算法
  // 这里只是一个占位符实现
  if (encryptedValue.startsWith('encrypted_')) {
    const base64Value = encryptedValue.substring('encrypted_'.length);
    return Buffer.from(base64Value, 'base64').toString();
  }

  return encryptedValue;
}

/**
 * 序列化配置（排除敏感信息）
 */
export function serializeConfiguration(config: UserConfiguration): string {
  const safeConfig = { ...config };

  // 移除或脱敏敏感信息
  if (safeConfig.anthropicApiKey) {
    safeConfig.anthropicApiKey = '***masked***';
  }

  if (safeConfig.proxySettings?.password) {
    safeConfig.proxySettings.password = '***masked***';
  }

  return JSON.stringify(safeConfig, null, 2);
}

/**
 * 反序列化配置
 */
export function deserializeConfiguration(configJson: string): UserConfiguration {
  try {
    const config = JSON.parse(configJson) as UserConfiguration;
    validateUserConfiguration(config);
    return config;
  } catch (error) {
    throw new Error(`配置反序列化失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 检查配置是否完整
 */
export function isConfigurationComplete(config: UserConfiguration): boolean {
  // 基本配置必须存在
  if (!config.language || !config.createdAt) {
    return false;
  }

  // API配置是可选的
  return true;
}

/**
 * 获取配置摘要信息
 */
export function getConfigurationSummary(config: UserConfiguration): Record<string, any> {
  return {
    language: config.language,
    hasApiKey: !!config.anthropicApiKey,
    hasBaseUrl: !!config.anthropicBaseUrl,
    hasProxy: !!config.proxySettings?.enabled,
    debugMode: config.debugMode,
    telemetryEnabled: config.telemetryEnabled,
    lastUpdated: config.updatedAt
  };
}