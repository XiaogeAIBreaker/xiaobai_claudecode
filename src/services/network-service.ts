/**
 * 网络检测服务
 * 负责网络连接检测和优化，移除代理设置，优化检测流程
 */

import { getNetworkManager } from '../main/ipc/network-handler';
import { NetworkConfiguration, getChinaOptimizedConfig, getInternationalConfig } from '../models/network-configuration';

/**
 * 网络检测结果接口
 */
interface NetworkDetectionResult {
  overall: 'excellent' | 'good' | 'fair' | 'poor' | 'failed';
  details: {
    connectivity: boolean;
    speed: 'fast' | 'medium' | 'slow' | 'timeout';
    latency: number;
    dns: boolean;
    registry: boolean;
    anthropicApi: boolean;
    googleServices: boolean;
  };
  recommendations: string[];
  optimizedConfig?: NetworkConfiguration;
}

/**
 * 网络优化建议接口
 */
interface NetworkOptimization {
  enabled: boolean;
  chinaMirrors: boolean;
  customDns: string[];
  timeout: number;
  retryCount: number;
  userAgent: string;
}

/**
 * 网络检测选项接口
 */
interface NetworkDetectionOptions {
  timeout?: number;
  skipCache?: boolean;
  checkAll?: boolean;
  userRegion?: 'CN' | 'US' | 'Other';
}

/**
 * 网络检测服务类
 */
export class NetworkService {
  private networkManager = getNetworkManager();
  private detectionCache = new Map<string, { result: NetworkDetectionResult; timestamp: number }>();
  private readonly cacheTimeout = 2 * 60 * 1000; // 2分钟缓存

  /**
   * 执行完整的网络检测
   */
  async detectNetwork(options: NetworkDetectionOptions = {}): Promise<NetworkDetectionResult> {
    console.log('开始网络检测服务');

    const cacheKey = this.generateCacheKey(options);

    // 检查缓存
    if (!options.skipCache && this.detectionCache.has(cacheKey)) {
      const cached = this.detectionCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('使用缓存的网络检测结果');
        return cached.result;
      }
    }

    try {
      const result = await this.performNetworkDetection(options);

      // 缓存结果
      this.detectionCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      console.log(`网络检测完成: ${result.overall}`);
      return result;

    } catch (error) {
      console.error('网络检测失败:', error);

      return {
        overall: 'failed',
        details: {
          connectivity: false,
          speed: 'timeout',
          latency: 9999,
          dns: false,
          registry: false,
          anthropicApi: false,
          googleServices: false
        },
        recommendations: [
          '网络检测失败，请检查网络连接',
          '建议检查防火墙和网络设置'
        ]
      };
    }
  }

  /**
   * 执行实际的网络检测
   */
  private async performNetworkDetection(options: NetworkDetectionOptions): Promise<NetworkDetectionResult> {
    const timeout = options.timeout || 10000;
    const userRegion = options.userRegion || this.detectUserRegion();

    // 并行执行多项检测
    const [connectivityResult, dnsResult, speedResult] = await Promise.all([
      this.testConnectivity(timeout),
      this.testDnsResolution(timeout),
      this.testNetworkSpeed(timeout)
    ]);

    // 测试特定服务
    const [registryResult, anthropicResult, googleResult] = await Promise.all([
      this.testNpmRegistry(timeout, userRegion),
      this.testAnthropicApi(timeout),
      this.testGoogleServices(timeout)
    ]);

    // 分析结果
    const details = {
      connectivity: connectivityResult.success,
      speed: this.categorizeSpeed(speedResult.downloadSpeed),
      latency: speedResult.latency,
      dns: dnsResult.success,
      registry: registryResult.success,
      anthropicApi: anthropicResult.success,
      googleServices: googleResult.success
    };

    // 计算总体评分
    const overall = this.calculateOverallScore(details);

    // 生成建议和优化配置
    const recommendations = this.generateRecommendations(details, userRegion);
    const optimizedConfig = this.generateOptimizedConfig(details, userRegion);

    return {
      overall,
      details,
      recommendations,
      optimizedConfig
    };
  }

  /**
   * 测试基础网络连接
   */
  private async testConnectivity(timeout: number): Promise<{ success: boolean; responseTime: number }> {
    try {
      const testUrls = [
        'https://www.google.com',
        'https://www.baidu.com',
        'https://www.github.com'
      ];

      const results = await Promise.allSettled(
        testUrls.map(url => this.fetchWithTimeout(url, { method: 'HEAD' }, timeout))
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const avgResponseTime = results
        .filter(r => r.status === 'fulfilled')
        .reduce((sum, r) => sum + (r as any).value.responseTime, 0) / Math.max(successCount, 1);

      return {
        success: successCount >= 2, // 至少2个成功
        responseTime: avgResponseTime
      };

    } catch (error) {
      console.error('连接性测试失败:', error);
      return { success: false, responseTime: 9999 };
    }
  }

  /**
   * 测试DNS解析
   */
  private async testDnsResolution(timeout: number): Promise<{ success: boolean; responseTime: number }> {
    try {
      const dns = require('dns').promises;
      const testDomains = [
        'google.com',
        'github.com',
        'npmjs.com',
        'anthropic.com'
      ];

      const startTime = Date.now();
      const results = await Promise.allSettled(
        testDomains.map(domain => dns.resolve4(domain))
      );
      const responseTime = Date.now() - startTime;

      const successCount = results.filter(r => r.status === 'fulfilled').length;

      return {
        success: successCount >= 3, // 至少3个成功
        responseTime
      };

    } catch (error) {
      console.error('DNS解析测试失败:', error);
      return { success: false, responseTime: 9999 };
    }
  }

  /**
   * 测试网络速度
   */
  private async testNetworkSpeed(timeout: number): Promise<{ downloadSpeed: number; latency: number }> {
    try {
      // 测试延迟
      const latencyStart = Date.now();
      await this.fetchWithTimeout('https://www.google.com/favicon.ico', { method: 'HEAD' }, timeout / 2);
      const latency = Date.now() - latencyStart;

      // 测试下载速度（小文件）
      const speedTestUrl = 'https://httpbin.org/bytes/1024'; // 1KB测试文件
      const downloadStart = Date.now();
      const response = await this.fetchWithTimeout(speedTestUrl, {}, timeout);
      const downloadTime = Date.now() - downloadStart;
      const downloadSpeed = (1024 / downloadTime) * 1000; // bytes per second

      return { downloadSpeed, latency };

    } catch (error) {
      console.error('网络速度测试失败:', error);
      return { downloadSpeed: 0, latency: 9999 };
    }
  }

  /**
   * 测试npm注册表连接
   */
  private async testNpmRegistry(timeout: number, userRegion: string): Promise<{ success: boolean; registry: string }> {
    const registries = userRegion === 'CN'
      ? [
          'https://registry.npmmirror.com/',
          'https://registry.npm.taobao.org/',
          'https://registry.npmjs.org/'
        ]
      : [
          'https://registry.npmjs.org/',
          'https://registry.npmmirror.com/'
        ];

    for (const registry of registries) {
      try {
        await this.fetchWithTimeout(registry, { method: 'HEAD' }, timeout);
        return { success: true, registry };
      } catch {
        continue;
      }
    }

    return { success: false, registry: registries[0] };
  }

  /**
   * 测试Anthropic API连接
   */
  private async testAnthropicApi(timeout: number): Promise<{ success: boolean }> {
    try {
      // 只测试连接性，不需要有效的API密钥
      const response = await this.fetchWithTimeout('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      }, timeout);

      // 即使是400错误也表示连接成功
      return { success: response.status < 500 };

    } catch (error) {
      console.error('Anthropic API测试失败:', error);
      return { success: false };
    }
  }

  /**
   * 测试Google服务连接
   */
  private async testGoogleServices(timeout: number): Promise<{ success: boolean }> {
    try {
      await this.fetchWithTimeout('https://accounts.google.com', { method: 'HEAD' }, timeout);
      return { success: true };

    } catch (error) {
      console.error('Google服务测试失败:', error);
      return { success: false };
    }
  }

  /**
   * 带超时的fetch
   */
  private async fetchWithTimeout(url: string, options: any = {}, timeout: number): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 分类网络速度
   */
  private categorizeSpeed(downloadSpeed: number): 'fast' | 'medium' | 'slow' | 'timeout' {
    if (downloadSpeed === 0) return 'timeout';
    if (downloadSpeed > 100 * 1024) return 'fast';    // > 100 KB/s
    if (downloadSpeed > 10 * 1024) return 'medium';   // > 10 KB/s
    return 'slow';
  }

  /**
   * 计算总体评分
   */
  private calculateOverallScore(details: NetworkDetectionResult['details']): NetworkDetectionResult['overall'] {
    let score = 0;

    // 基础连接（权重最高）
    if (details.connectivity) score += 40;
    if (details.dns) score += 20;

    // 服务可用性
    if (details.registry) score += 15;
    if (details.anthropicApi) score += 10;
    if (details.googleServices) score += 5;

    // 性能指标
    if (details.speed === 'fast') score += 10;
    else if (details.speed === 'medium') score += 5;

    if (details.latency < 500) score += 5;
    else if (details.latency < 2000) score += 2;

    // 评分分级
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'fair';
    if (score >= 25) return 'poor';
    return 'failed';
  }

  /**
   * 生成建议
   */
  private generateRecommendations(details: NetworkDetectionResult['details'], userRegion: string): string[] {
    const recommendations: string[] = [];

    if (!details.connectivity) {
      recommendations.push('基础网络连接失败，请检查网络设置');
      recommendations.push('确认网络线缆连接正常，或检查Wi-Fi连接');
    }

    if (!details.dns) {
      recommendations.push('DNS解析失败，建议更换DNS服务器');
      if (userRegion === 'CN') {
        recommendations.push('建议使用：114.114.114.114 或 223.5.5.5');
      } else {
        recommendations.push('建议使用：8.8.8.8 或 1.1.1.1');
      }
    }

    if (!details.registry) {
      if (userRegion === 'CN') {
        recommendations.push('npm注册表连接失败，建议使用淘宝镜像');
        recommendations.push('运行：npm config set registry https://registry.npmmirror.com/');
      } else {
        recommendations.push('npm注册表连接异常，检查防火墙设置');
      }
    }

    if (!details.anthropicApi) {
      recommendations.push('Anthropic API连接失败，可能影响Claude CLI使用');
      if (userRegion === 'CN') {
        recommendations.push('中国用户可能需要配置网络代理');
      }
    }

    if (details.speed === 'slow') {
      recommendations.push('网络速度较慢，安装过程可能需要更长时间');
      recommendations.push('建议在网络环境较好时再次尝试');
    }

    if (details.latency > 2000) {
      recommendations.push('网络延迟较高，可能影响实时操作体验');
    }

    // 如果没有问题，给出积极建议
    if (recommendations.length === 0) {
      recommendations.push('网络环境良好，可以正常进行安装');
      if (userRegion === 'CN') {
        recommendations.push('已为中国用户优化网络配置');
      }
    }

    return recommendations;
  }

  /**
   * 生成优化配置
   */
  private generateOptimizedConfig(details: NetworkDetectionResult['details'], userRegion: string): NetworkConfiguration {
    let config: NetworkConfiguration;

    if (userRegion === 'CN') {
      config = getChinaOptimizedConfig();
    } else {
      config = getInternationalConfig();
    }

    // 根据检测结果调整配置
    if (details.speed === 'slow' || details.latency > 5000) {
      config.timeout = Math.max(config.timeout, 30000); // 增加超时时间
      config.retryCount = Math.max(config.retryCount, 3); // 增加重试次数
    }

    if (!details.dns) {
      // 设置备用DNS
      if (userRegion === 'CN') {
        config.dnsServers = ['114.114.114.114', '223.5.5.5'];
      } else {
        config.dnsServers = ['8.8.8.8', '1.1.1.1'];
      }
    }

    return config;
  }

  /**
   * 检测用户地区
   */
  private detectUserRegion(): 'CN' | 'US' | 'Other' {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = process.env.LANG || 'en-US';

    if (timezone.includes('Shanghai') || timezone.includes('Beijing') || language.startsWith('zh')) {
      return 'CN';
    }
    if (timezone.includes('New_York') || timezone.includes('Los_Angeles')) {
      return 'US';
    }
    return 'Other';
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(options: NetworkDetectionOptions): string {
    return JSON.stringify(options);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.detectionCache.clear();
    console.log('网络检测缓存已清除');
  }

  /**
   * 获取优化建议
   */
  async getOptimizationSuggestions(userRegion?: string): Promise<NetworkOptimization> {
    const region = userRegion || this.detectUserRegion();

    return {
      enabled: true,
      chinaMirrors: region === 'CN',
      customDns: region === 'CN'
        ? ['114.114.114.114', '223.5.5.5']
        : ['8.8.8.8', '1.1.1.1'],
      timeout: region === 'CN' ? 30000 : 10000,
      retryCount: region === 'CN' ? 3 : 2,
      userAgent: 'Claude-CLI-Installer/1.0.0'
    };
  }

  /**
   * 应用网络优化
   */
  async applyOptimization(optimization: NetworkOptimization): Promise<boolean> {
    try {
      console.log('应用网络优化设置');

      // 更新网络管理器配置
      const config = optimization.chinaMirrors
        ? getChinaOptimizedConfig()
        : getInternationalConfig();

      config.timeout = optimization.timeout;
      config.retryCount = optimization.retryCount;
      config.userAgent = optimization.userAgent;
      config.dnsServers = optimization.customDns;

      this.networkManager.updateConfiguration(config);

      console.log('网络优化设置已应用');
      return true;

    } catch (error) {
      console.error('应用网络优化失败:', error);
      return false;
    }
  }
}

/**
 * 导出网络服务单例
 */
export const networkService = new NetworkService();

/**
 * 导出类型定义
 */
export type {
  NetworkDetectionResult,
  NetworkOptimization,
  NetworkDetectionOptions
};