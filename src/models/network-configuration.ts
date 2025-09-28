/**
 * NetworkConfiguration实体定义和验证
 * 定义网络配置的数据结构和业务规则
 */

/**
 * 超时设置接口
 */
export interface TimeoutSettings {
  connectionTimeout: number;      // 连接超时(毫秒)
  dnsTimeout: number;            // DNS解析超时(毫秒)
  downloadTimeout: number;       // 下载超时(毫秒)
}

/**
 * 重试策略接口
 */
export interface RetryPolicy {
  maxRetries: number;            // 最大重试次数
  retryDelay: number;            // 重试间隔(毫秒)
  exponentialBackoff: boolean;   // 指数退避
}

/**
 * 网络配置接口
 */
export interface NetworkConfiguration {
  testUrls: string[];                    // 测试URL列表
  timeout: number;                       // 超时时间(毫秒)
  retryAttempts: number;                // 重试次数
  dnsServers: string[];                 // DNS服务器列表
  proxySettings?: ProxyConfiguration;   // 代理设置（可选）
  userAgent: string;                    // User-Agent字符串
  sslVerification: boolean;             // SSL证书验证
  followRedirects: boolean;             // 跟随重定向
  maxRedirects: number;                 // 最大重定向次数
  preferredRegistry: string;            // 首选npm注册表
  fallbackRegistries: string[];         // 备用注册表
  connectionPooling: boolean;           // 连接池
  keepAlive: boolean;                   // 保持连接
}

/**
 * 代理配置接口
 */
export interface ProxyConfiguration {
  enabled: boolean;                     // 是否启用
  host: string;                        // 代理主机
  port: number;                        // 代理端口
  username?: string;                   // 用户名（可选）
  password?: string;                   // 密码（可选）
  protocol: 'http' | 'https' | 'socks5'; // 协议类型
  bypassList: string[];               // 绕过代理的地址列表
}

/**
 * 验证网络配置数据
 */
export function validateNetworkConfiguration(config: NetworkConfiguration): void {
  // 验证测试URL列表
  if (!Array.isArray(config.testUrls) || config.testUrls.length === 0) {
    throw new Error('NetworkConfiguration.testUrls 必须是非空的URL数组');
  }

  config.testUrls.forEach((url, index) => {
    try {
      validateTestUrl(url);
    } catch (error) {
      throw new Error(`NetworkConfiguration.testUrls[${index}] 无效: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // 验证超时设置
  validateTimeout(config.timeout);

  // 验证重试次数
  validateRetryAttempts(config.retryAttempts);

  // 验证DNS服务器
  if (!Array.isArray(config.dnsServers)) {
    throw new Error('NetworkConfiguration.dnsServers 必须是字符串数组');
  }

  config.dnsServers.forEach((dns, index) => {
    try {
      validateDnsServer(dns);
    } catch (error) {
      throw new Error(`NetworkConfiguration.dnsServers[${index}] 无效: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // 验证User-Agent
  if (!config.userAgent || config.userAgent.trim() === '') {
    throw new Error('NetworkConfiguration.userAgent 不能为空');
  }

  // 验证布尔值字段
  if (typeof config.sslVerification !== 'boolean') {
    throw new Error('NetworkConfiguration.sslVerification 必须是布尔值');
  }

  if (typeof config.followRedirects !== 'boolean') {
    throw new Error('NetworkConfiguration.followRedirects 必须是布尔值');
  }

  if (typeof config.connectionPooling !== 'boolean') {
    throw new Error('NetworkConfiguration.connectionPooling 必须是布尔值');
  }

  if (typeof config.keepAlive !== 'boolean') {
    throw new Error('NetworkConfiguration.keepAlive 必须是布尔值');
  }

  // 验证最大重定向次数
  if (typeof config.maxRedirects !== 'number' || config.maxRedirects < 0 || config.maxRedirects > 10) {
    throw new Error('NetworkConfiguration.maxRedirects 必须是0-10之间的数字');
  }

  // 验证注册表URL
  validateRegistryUrl(config.preferredRegistry);

  if (!Array.isArray(config.fallbackRegistries)) {
    throw new Error('NetworkConfiguration.fallbackRegistries 必须是字符串数组');
  }

  config.fallbackRegistries.forEach((registry, index) => {
    try {
      validateRegistryUrl(registry);
    } catch (error) {
      throw new Error(`NetworkConfiguration.fallbackRegistries[${index}] 无效: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // 验证代理设置（如果存在）
  if (config.proxySettings !== undefined) {
    validateProxyConfiguration(config.proxySettings);
  }
}

/**
 * 验证测试URL格式
 */
export function validateTestUrl(url: string): void {
  if (!url || url.trim() === '') {
    throw new Error('测试URL不能为空');
  }

  try {
    const parsedUrl = new URL(url);

    // 只允许HTTP和HTTPS协议
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('测试URL必须使用HTTP或HTTPS协议');
    }
  } catch (error) {
    throw new Error(`测试URL格式无效: ${url}`);
  }
}

/**
 * 验证注册表URL
 */
export function validateRegistryUrl(url: string): void {
  if (!url || url.trim() === '') {
    throw new Error('注册表URL不能为空');
  }

  try {
    const parsedUrl = new URL(url);

    // 只允许HTTP和HTTPS协议
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('注册表URL必须使用HTTP或HTTPS协议');
    }

    // 检查是否是已知的npm注册表
    const knownRegistries = [
      'https://registry.npmjs.org',
      'https://registry.npmmirror.com',
      'https://registry.yarnpkg.com'
    ];

    // 对于已知注册表，进行额外验证
    if (knownRegistries.some(known => url.startsWith(known))) {
      // 已知注册表通过验证
      return;
    }

    // 对于未知注册表，警告但不阻止
    console.warn(`使用未知的npm注册表: ${url}`);
  } catch (error) {
    throw new Error(`注册表URL格式无效: ${url}`);
  }
}

/**
 * 验证超时值
 */
export function validateTimeout(timeout: number): void {
  if (typeof timeout !== 'number') {
    throw new Error('超时值必须是数字');
  }

  if (timeout <= 0) {
    throw new Error('超时值必须大于0');
  }

  if (timeout > 300000) { // 5分钟
    throw new Error('超时值不能超过300秒');
  }
}

/**
 * 验证重试次数
 */
export function validateRetryAttempts(retries: number): void {
  if (typeof retries !== 'number') {
    throw new Error('重试次数必须是数字');
  }

  if (retries < 0) {
    throw new Error('重试次数不能为负数');
  }

  if (retries > 10) {
    throw new Error('重试次数不能超过10次');
  }
}

/**
 * 验证DNS服务器地址
 */
export function validateDnsServer(dns: string): void {
  if (!dns || dns.trim() === '') {
    throw new Error('DNS服务器地址不能为空');
  }

  // 简单的IP地址格式验证
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  if (!ipv4Regex.test(dns) && !ipv6Regex.test(dns)) {
    throw new Error(`DNS服务器地址格式无效: ${dns}`);
  }
}

/**
 * 验证代理配置
 */
export function validateProxyConfiguration(proxyConfig: ProxyConfiguration): void {
  if (typeof proxyConfig.enabled !== 'boolean') {
    throw new Error('ProxyConfiguration.enabled 必须是布尔值');
  }

  if (!proxyConfig.enabled) {
    return; // 未启用代理时不需要验证其他字段
  }

  if (!proxyConfig.host || proxyConfig.host.trim() === '') {
    throw new Error('代理主机不能为空');
  }

  if (typeof proxyConfig.port !== 'number' || proxyConfig.port <= 0 || proxyConfig.port > 65535) {
    throw new Error('代理端口必须是1-65535之间的数字');
  }

  if (!['http', 'https', 'socks5'].includes(proxyConfig.protocol)) {
    throw new Error('代理协议必须是 http、https 或 socks5');
  }

  if (!Array.isArray(proxyConfig.bypassList)) {
    throw new Error('ProxyConfiguration.bypassList 必须是字符串数组');
  }

  // 验证可选的用户名和密码
  if (proxyConfig.username !== undefined && proxyConfig.username.trim() === '') {
    throw new Error('代理用户名不能为空字符串');
  }

  if (proxyConfig.password !== undefined && proxyConfig.password.trim() === '') {
    throw new Error('代理密码不能为空字符串');
  }
}

/**
 * 获取中国区优化的网络配置
 */
export function getChinaOptimizedConfig(): NetworkConfiguration {
  return {
    testUrls: [
      'https://registry.npmmirror.com',
      'https://api.anthropic.com',
      'https://www.baidu.com'
    ],
    timeout: 10000, // 10秒
    retryAttempts: 3,
    dnsServers: ['114.114.114.114', '8.8.8.8'],
    userAgent: 'Claude-CLI-Installer/1.0.0 (China-Optimized)',
    sslVerification: true,
    followRedirects: true,
    maxRedirects: 5,
    preferredRegistry: 'https://registry.npmmirror.com/',
    fallbackRegistries: [
      'https://registry.npmjs.org',
      'https://registry.yarnpkg.com'
    ],
    connectionPooling: true,
    keepAlive: true
  };
}

/**
 * 获取国际版网络配置
 */
export function getInternationalConfig(): NetworkConfiguration {
  return {
    testUrls: [
      'https://registry.npmjs.org',
      'https://api.anthropic.com',
      'https://www.google.com'
    ],
    timeout: 5000, // 5秒
    retryAttempts: 2,
    dnsServers: ['8.8.8.8', '1.1.1.1'],
    userAgent: 'Claude-CLI-Installer/1.0.0',
    sslVerification: true,
    followRedirects: true,
    maxRedirects: 3,
    preferredRegistry: 'https://registry.npmjs.org',
    fallbackRegistries: [
      'https://registry.yarnpkg.com'
    ],
    connectionPooling: true,
    keepAlive: true
  };
}

/**
 * 检测网络环境并返回适配的配置
 */
export function detectNetworkEnvironment(): NetworkConfiguration {
  // 简单的地理位置检测逻辑
  // 在实际实现中可能需要更复杂的检测
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language || 'en-US';

  // 如果时区或语言指示是中国用户，使用中国优化配置
  if (timezone.includes('Shanghai') || timezone.includes('Beijing') || language.startsWith('zh')) {
    return getChinaOptimizedConfig();
  }

  return getInternationalConfig();
}

/**
 * 设置自定义DNS服务器
 */
export function setCustomDnsServers(config: NetworkConfiguration, dnsServers: string[]): NetworkConfiguration {
  // 验证所有DNS服务器
  dnsServers.forEach(dns => validateDnsServer(dns));

  return {
    ...config,
    dnsServers: [...dnsServers]
  };
}

/**
 * 配置连接池设置
 */
export function configureConnectionPool(
  config: NetworkConfiguration,
  options: { maxSockets?: number; keepAlive?: boolean }
): NetworkConfiguration {
  return {
    ...config,
    connectionPooling: true,
    keepAlive: options.keepAlive ?? config.keepAlive
    // maxSockets 配置将在网络服务实现中使用
  };
}

/**
 * 设置User-Agent
 */
export function setUserAgent(config: NetworkConfiguration, userAgent: string): NetworkConfiguration {
  if (!userAgent || userAgent.trim() === '') {
    throw new Error('User-Agent不能为空');
  }

  return {
    ...config,
    userAgent
  };
}

/**
 * 添加备用注册表
 */
export function addFallbackRegistry(config: NetworkConfiguration, registryUrl: string): NetworkConfiguration {
  validateRegistryUrl(registryUrl);

  // 避免重复添加
  if (config.fallbackRegistries.includes(registryUrl)) {
    return config;
  }

  return {
    ...config,
    fallbackRegistries: [...config.fallbackRegistries, registryUrl]
  };
}

/**
 * 创建超时设置
 */
export function createTimeoutSettings(
  connectionTimeout: number = 5000,
  dnsTimeout: number = 3000,
  downloadTimeout: number = 30000
): TimeoutSettings {
  validateTimeout(connectionTimeout);
  validateTimeout(dnsTimeout);
  validateTimeout(downloadTimeout);

  return {
    connectionTimeout,
    dnsTimeout,
    downloadTimeout
  };
}

/**
 * 创建重试策略
 */
export function createRetryPolicy(
  maxRetries: number = 3,
  retryDelay: number = 1000,
  exponentialBackoff: boolean = true
): RetryPolicy {
  validateRetryAttempts(maxRetries);

  if (retryDelay <= 0) {
    throw new Error('重试间隔必须大于0');
  }

  return {
    maxRetries,
    retryDelay,
    exponentialBackoff
  };
}

/**
 * 计算重试延迟（支持指数退避）
 */
export function calculateRetryDelay(attempt: number, baseDelay: number, exponentialBackoff: boolean): number {
  if (exponentialBackoff) {
    return baseDelay * Math.pow(2, attempt - 1);
  }
  return baseDelay;
}

/**
 * 检查网络配置是否为中国优化版本
 */
export function isChinaOptimized(config: NetworkConfiguration): boolean {
  return config.preferredRegistry === 'https://registry.npmmirror.com/' &&
         config.dnsServers.includes('114.114.114.114');
}