/**
 * Network API IPC处理器实现
 * 处理网络相关的IPC请求
 */

import { IpcMainInvokeEvent } from 'electron';
import { ipcRegistry, IpcHandler, createSuccessResponse, createErrorResponse } from '../ipc-handlers';
import { NetworkConfiguration, getChinaOptimizedConfig, getInternationalConfig } from '../../models/network-configuration';

/**
 * 网络测试请求接口
 */
interface TestConnectionRequest {
  targets: string[];
  timeout?: number;
}

interface TestDnsRequest {
  domains: string[];
  dnsServers?: string[];
}

/**
 * 网络测试响应接口
 */
interface TestConnectionResponse {
  results: {
    url: string;
    success: boolean;
    responseTime?: number;
    error?: string;
  }[];
}

interface TestDnsResponse {
  results: {
    domain: string;
    success: boolean;
    ips?: string[];
    responseTime?: number;
    error?: string;
  }[];
}

/**
 * 网络管理器
 */
class NetworkManager {
  private configuration: NetworkConfiguration;

  constructor() {
    // 检测并设置初始配置
    this.configuration = this.detectOptimalConfiguration();
  }

  /**
   * 检测最优网络配置
   */
  private detectOptimalConfiguration(): NetworkConfiguration {
    // 简单的地理位置检测
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = process.env.LANG || 'en-US';

    // 如果是中国用户，使用中国优化配置
    if (timezone.includes('Shanghai') || timezone.includes('Beijing') || language.startsWith('zh')) {
      console.log('检测到中国用户，使用中国优化网络配置');
      return getChinaOptimizedConfig();
    }

    console.log('使用国际网络配置');
    return getInternationalConfig();
  }

  /**
   * 测试网络连接
   */
  async testConnection(request: TestConnectionRequest): Promise<TestConnectionResponse> {
    console.log('开始测试网络连接:', request.targets);

    const timeout = request.timeout || this.configuration.timeout;
    const results = [];

    for (const url of request.targets) {
      const startTime = Date.now();
      let result: TestConnectionResponse['results'][0];

      try {
        // 使用fetch测试连接
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method: 'HEAD', // 只获取头部信息，减少带宽消耗
          signal: controller.signal,
          headers: {
            'User-Agent': this.configuration.userAgent
          }
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        result = {
          url,
          success: response.ok,
          responseTime,
          error: response.ok ? undefined : `HTTP ${response.status}`
        };

        console.log(`连接测试 ${url}: ${response.status} (${responseTime}ms)`);

      } catch (error) {
        const responseTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        result = {
          url,
          success: false,
          responseTime,
          error: errorMessage
        };

        console.error(`连接测试失败 ${url}:`, errorMessage);
      }

      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`网络连接测试完成: ${successCount}/${results.length} 成功`);

    return { results };
  }

  /**
   * 测试DNS解析
   */
  async testDns(request: TestDnsRequest): Promise<TestDnsResponse> {
    console.log('开始测试DNS解析:', request.domains);

    const results = [];

    for (const domain of request.domains) {
      const startTime = Date.now();
      let result: TestDnsResponse['results'][0];

      try {
        // 使用DNS查询测试解析
        // 注意：在Electron主进程中，我们可以使用Node.js的dns模块
        const dns = require('dns').promises;

        const addresses = await dns.resolve4(domain);
        const responseTime = Date.now() - startTime;

        result = {
          domain,
          success: true,
          ips: addresses,
          responseTime
        };

        console.log(`DNS解析 ${domain}: ${addresses.join(', ')} (${responseTime}ms)`);

      } catch (error) {
        const responseTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        result = {
          domain,
          success: false,
          responseTime,
          error: errorMessage
        };

        console.error(`DNS解析失败 ${domain}:`, errorMessage);
      }

      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`DNS解析测试完成: ${successCount}/${results.length} 成功`);

    return { results };
  }

  /**
   * 检测网络速度
   */
  async testNetworkSpeed(): Promise<{ downloadSpeed: number; latency: number }> {
    console.log('开始测试网络速度');

    try {
      // 测试延迟
      const latencyStart = Date.now();
      await fetch('https://www.google.com/favicon.ico', { method: 'HEAD' });
      const latency = Date.now() - latencyStart;

      // 测试下载速度（下载一个小文件）
      const speedTestUrl = 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png';
      const downloadStart = Date.now();
      const response = await fetch(speedTestUrl);
      const blob = await response.blob();
      const downloadTime = Date.now() - downloadStart;
      const downloadSpeed = (blob.size / downloadTime) * 1000; // bytes per second

      console.log(`网络速度测试完成: 延迟 ${latency}ms, 下载速度 ${(downloadSpeed / 1024).toFixed(2)} KB/s`);

      return { downloadSpeed, latency };

    } catch (error) {
      console.error('网络速度测试失败:', error);
      return { downloadSpeed: 0, latency: 9999 };
    }
  }

  /**
   * 获取网络配置
   */
  getConfiguration(): NetworkConfiguration {
    return this.configuration;
  }

  /**
   * 更新网络配置
   */
  updateConfiguration(newConfig: Partial<NetworkConfiguration>): void {
    this.configuration = { ...this.configuration, ...newConfig };
    console.log('网络配置已更新');
  }

  /**
   * 测试完整网络环境
   */
  async testNetworkEnvironment(): Promise<{
    connection: TestConnectionResponse;
    dns: TestDnsResponse;
    speed: { downloadSpeed: number; latency: number };
    summary: {
      overallStatus: 'good' | 'fair' | 'poor';
      recommendations: string[];
    };
  }> {
    console.log('开始完整网络环境测试');

    // 并行执行所有测试
    const [connectionResult, dnsResult, speedResult] = await Promise.all([
      this.testConnection({
        targets: this.configuration.testUrls
      }),
      this.testDns({
        domains: this.configuration.testUrls.map(url => new URL(url).hostname)
      }),
      this.testNetworkSpeed()
    ]);

    // 分析结果并生成建议
    const connectionSuccessRate = connectionResult.results.filter(r => r.success).length / connectionResult.results.length;
    const dnsSuccessRate = dnsResult.results.filter(r => r.success).length / dnsResult.results.length;
    const avgResponseTime = connectionResult.results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / connectionResult.results.length;

    let overallStatus: 'good' | 'fair' | 'poor';
    const recommendations: string[] = [];

    if (connectionSuccessRate >= 0.8 && dnsSuccessRate >= 0.8 && avgResponseTime < 2000) {
      overallStatus = 'good';
      recommendations.push('网络环境良好，可以正常进行安装');
    } else if (connectionSuccessRate >= 0.6 && dnsSuccessRate >= 0.6) {
      overallStatus = 'fair';
      recommendations.push('网络环境一般，建议检查网络连接');
      if (avgResponseTime > 3000) {
        recommendations.push('网络延迟较高，安装过程可能较慢');
      }
    } else {
      overallStatus = 'poor';
      recommendations.push('网络环境较差，建议检查网络设置');
      if (connectionSuccessRate < 0.5) {
        recommendations.push('多个连接测试失败，请检查防火墙设置');
      }
      if (dnsSuccessRate < 0.5) {
        recommendations.push('DNS解析失败，建议更换DNS服务器');
      }
    }

    // 中国用户特定建议
    if (this.configuration.preferredRegistry.includes('npmmirror.com')) {
      if (overallStatus === 'poor') {
        recommendations.push('建议使用中国镜像源加速下载');
      }
    }

    console.log(`网络环境测试完成: ${overallStatus}`);

    return {
      connection: connectionResult,
      dns: dnsResult,
      speed: speedResult,
      summary: {
        overallStatus,
        recommendations
      }
    };
  }
}

/**
 * 全局网络管理器实例
 */
const networkManager = new NetworkManager();

/**
 * 处理测试网络连接的请求
 */
async function handleTestConnection(
  event: IpcMainInvokeEvent,
  request: TestConnectionRequest
): Promise<any> {
  console.log('处理测试网络连接请求:', request);

  try {
    // 验证请求参数
    if (!Array.isArray(request.targets) || request.targets.length === 0) {
      throw new Error('targets 必须是非空的URL数组');
    }

    // 验证URL格式
    for (const target of request.targets) {
      try {
        new URL(target);
      } catch {
        throw new Error(`无效的URL格式: ${target}`);
      }
    }

    const result = await networkManager.testConnection(request);
    return createSuccessResponse(result);

  } catch (error) {
    console.error('处理测试网络连接请求失败:', error);
    return createErrorResponse(
      'NETWORK_TEST_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 处理测试DNS解析的请求
 */
async function handleTestDns(
  event: IpcMainInvokeEvent,
  request: TestDnsRequest
): Promise<any> {
  console.log('处理测试DNS解析请求:', request);

  try {
    // 验证请求参数
    if (!Array.isArray(request.domains) || request.domains.length === 0) {
      throw new Error('domains 必须是非空的域名数组');
    }

    // 验证域名格式
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    for (const domain of request.domains) {
      if (!domainRegex.test(domain)) {
        throw new Error(`无效的域名格式: ${domain}`);
      }
    }

    const result = await networkManager.testDns(request);
    return createSuccessResponse(result);

  } catch (error) {
    console.error('处理测试DNS解析请求失败:', error);
    return createErrorResponse(
      'DNS_TEST_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 获取网络配置
 */
async function handleGetNetworkConfig(event: IpcMainInvokeEvent): Promise<any> {
  try {
    const config = networkManager.getConfiguration();
    return createSuccessResponse(config);

  } catch (error) {
    console.error('获取网络配置失败:', error);
    return createErrorResponse(
      'GET_NETWORK_CONFIG_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 更新网络配置
 */
async function handleUpdateNetworkConfig(
  event: IpcMainInvokeEvent,
  configUpdate: Partial<NetworkConfiguration>
): Promise<any> {
  try {
    networkManager.updateConfiguration(configUpdate);
    return createSuccessResponse({ updated: true });

  } catch (error) {
    console.error('更新网络配置失败:', error);
    return createErrorResponse(
      'UPDATE_NETWORK_CONFIG_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 测试完整网络环境
 */
async function handleTestNetworkEnvironment(event: IpcMainInvokeEvent): Promise<any> {
  try {
    const result = await networkManager.testNetworkEnvironment();
    return createSuccessResponse(result);

  } catch (error) {
    console.error('测试网络环境失败:', error);
    return createErrorResponse(
      'NETWORK_ENVIRONMENT_TEST_ERROR',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Network API IPC处理器定义
 */
const networkHandlers: IpcHandler[] = [
  {
    channel: 'installer:network:test-connection',
    handler: handleTestConnection
  },
  {
    channel: 'installer:network:test-dns',
    handler: handleTestDns
  },
  {
    channel: 'installer:network:get-config',
    handler: handleGetNetworkConfig
  },
  {
    channel: 'installer:network:update-config',
    handler: handleUpdateNetworkConfig
  },
  {
    channel: 'installer:network:test-environment',
    handler: handleTestNetworkEnvironment
  }
];

/**
 * 注册Network API处理器
 */
export function registerNetworkHandlers(): void {
  console.log('注册Network API处理器...');

  networkHandlers.forEach(handler => {
    try {
      ipcRegistry.register(handler);
    } catch (error) {
      console.error(`注册Network API处理器失败 [${handler.channel}]:`, error);
    }
  });

  console.log('Network API处理器注册完成');
}

/**
 * 注销Network API处理器
 */
export function unregisterNetworkHandlers(): void {
  console.log('注销Network API处理器...');

  networkHandlers.forEach(handler => {
    try {
      ipcRegistry.unregister(handler.channel);
    } catch (error) {
      console.error(`注销Network API处理器失败 [${handler.channel}]:`, error);
    }
  });

  console.log('Network API处理器注销完成');
}

/**
 * 获取网络管理器实例（用于其他模块）
 */
export function getNetworkManager(): NetworkManager {
  return networkManager;
}

/**
 * 导出类型定义
 */
export type {
  TestConnectionRequest,
  TestConnectionResponse,
  TestDnsRequest,
  TestDnsResponse
};