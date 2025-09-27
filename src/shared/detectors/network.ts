/**
 * T020: 网络连接检测器
 * 检测网络连接、代理设置和国外网站访问能力
 */

import axios, { AxiosRequestConfig } from 'axios';
import { execSync } from 'child_process';
import * as os from 'os';
import {
  NetworkEnvironment,
  NetworkStatus,
  DetectionResult,
  DetectionStatus,
  EnvironmentDetector
} from '../types/environment';
import { log } from '../utils/logger';
import { retry } from '../utils/system';

/**
 * 网络检测配置
 */
interface NetworkDetectorConfig {
  timeout: number;
  retries: number;
  testUrls: {
    google: string;
    github: string;
    npm: string;
    claude: string;
  };
}

/**
 * 网络连接检测器实现
 */
export class NetworkDetector implements EnvironmentDetector {
  name = 'network-detector';
  type = 'network' as const;
  required = true;
  timeout = 30000; // 30秒
  
  private config: NetworkDetectorConfig;
  private progress = 0;
  
  constructor(config?: Partial<NetworkDetectorConfig>) {
    this.config = {
      timeout: 5000,
      retries: 2,
      testUrls: {
        google: 'https://www.google.com',
        github: 'https://api.github.com',
        npm: 'https://registry.npmjs.org',
        claude: 'https://claude.ai'
      },
      ...config
    };
  }
  
  /**
   * 执行网络检测
   */
  async detect(): Promise<DetectionResult> {
    const startTime = Date.now();
    this.progress = 0;
    
    try {
      log.info('开始网络环境检测');
      
      // 检查先决条件
      const prerequisites = await this.checkPrerequisites();
      if (!prerequisites) {
        throw new Error('网络检测先决条件不满足');
      }
      this.progress = 10;
      
      // 检测基本网络状态
      const networkStatus = await this.detectNetworkStatus();
      this.progress = 30;
      
      // 检测代理设置
      const proxyConfig = await this.detectProxySettings();
      this.progress = 50;
      
      // 检测国外网站访问
      const internationalAccess = await this.testInternationalAccess();
      this.progress = 70;
      
      // 测试网络延迟
      const latency = await this.measureLatency();
      this.progress = 90;
      
      // 获取DNS设置
      const dnsServers = this.getDNSServers();
      this.progress = 100;
      
      const networkEnvironment: NetworkEnvironment = {
        status: networkStatus,
        hasInternationalAccess: internationalAccess,
        hasProxy: proxyConfig !== null,
        connectionType: 'unknown' as const,
        speed: {
          download: 0,
          upload: 0,
          ping: latency.google
        },
        restrictions: {
          hasFirewall: false,
          blockedSites: [],
          needsVPN: !internationalAccess
        },
        proxyConfig: proxyConfig || undefined,
        dnsServers,
        latency
      };
      
      const duration = Date.now() - startTime;
      log.info('网络环境检测完成', { duration, networkEnvironment });
      
      return {
        status: DetectionStatus.SUCCESS,
        timestamp: new Date(),
        duration,
        message: '网络环境检测成功',
        data: networkEnvironment,
        recommendations: this.generateRecommendations(networkEnvironment)
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error('网络环境检测失败', error as Error);
      
      return {
        status: DetectionStatus.FAILED,
        timestamp: new Date(),
        duration,
        message: `网络检测失败: ${error instanceof Error ? error.message : '未知错误'}`,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }
  
  /**
   * 检查先决条件
   */
  async checkPrerequisites(): Promise<boolean> {
    // 检查是否有网络接口
    try {
      const networkInterfaces = os.networkInterfaces();
      const hasActiveInterface = Object.values(networkInterfaces)
        .flat()
        .some(iface => iface && !iface.internal && iface.family === 'IPv4');
      
      return hasActiveInterface;
    } catch {
      return false;
    }
  }
  
  /**
   * 获取检测进度
   */
  getProgress(): number {
    return this.progress;
  }
  
  /**
   * 检测网络状态
   */
  private async detectNetworkStatus(): Promise<NetworkStatus> {
    try {
      // 尝试访问多个本地网站
      const testUrls = [
        'https://www.baidu.com',
        'https://www.qq.com',
        'https://www.taobao.com'
      ];
      
      let successCount = 0;
      for (const url of testUrls) {
        try {
          await axios.get(url, { timeout: this.config.timeout });
          successCount++;
        } catch {
          // 忽略单个网站的失败
        }
      }
      
      if (successCount >= 2) {
        return NetworkStatus.ONLINE;
      } else if (successCount >= 1) {
        return NetworkStatus.LIMITED;
      } else {
        return NetworkStatus.OFFLINE;
      }
    } catch {
      return NetworkStatus.UNKNOWN;
    }
  }
  
  /**
   * 检测代理设置
   */
  private async detectProxySettings(): Promise<NetworkEnvironment['proxyConfig'] | null> {
    const platform = os.platform();
    
    try {
      // 检查环境变量
      const envProxy = this.getEnvironmentProxy();
      if (envProxy) {
        return envProxy;
      }
      
      // 根据平台检查系统代理设置
      switch (platform) {
        case 'win32':
          return await this.getWindowsProxySettings();
        case 'darwin':
          return await this.getMacOSProxySettings();
        case 'linux':
          return await this.getLinuxProxySettings();
        default:
          return null;
      }
    } catch (error) {
      log.warn('检测代理设置失败', { error });
      return null;
    }
  }
  
  /**
   * 获取环境变量中的代理设置
   */
  private getEnvironmentProxy(): NetworkEnvironment['proxyConfig'] | null {
    const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
    const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
    const ftpProxy = process.env.FTP_PROXY || process.env.ftp_proxy;
    const socksProxy = process.env.SOCKS_PROXY || process.env.socks_proxy;
    const noProxy = (process.env.NO_PROXY || process.env.no_proxy)?.split(',') || [];
    
    if (httpProxy || httpsProxy || ftpProxy || socksProxy) {
      return {
        http: httpProxy,
        https: httpsProxy,
        ftp: ftpProxy,
        socks: socksProxy,
        noProxy: noProxy.map(host => host.trim())
      };
    }
    
    return null;
  }
  
  /**
   * 获取Windows代理设置
   */
  private async getWindowsProxySettings(): Promise<NetworkEnvironment['proxyConfig'] | null> {
    try {
      const command = 'reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /v ProxyServer';
      const output = execSync(command, { encoding: 'utf8' });
      
      const proxyEnabled = output.includes('ProxyEnable') && output.includes('0x1');
      if (!proxyEnabled) {
        return null;
      }
      
      const proxyMatch = output.match(/ProxyServer\s+REG_SZ\s+(.+)/);
      if (proxyMatch) {
        const proxyServer = proxyMatch[1].trim();
        return {
          http: `http://${proxyServer}`,
          https: `http://${proxyServer}`
        };
      }
      
      return null;
    } catch {
      return null;
    }
  }
  
  /**
   * 获取macOS代理设置
   */
  private async getMacOSProxySettings(): Promise<NetworkEnvironment['proxyConfig'] | null> {
    try {
      const command = 'scutil --proxy';
      const output = execSync(command, { encoding: 'utf8' });
      
      const httpEnabled = output.includes('HTTPEnable : 1');
      const httpsEnabled = output.includes('HTTPSEnable : 1');
      
      if (!httpEnabled && !httpsEnabled) {
        return null;
      }
      
      const httpMatch = output.match(/HTTPProxy : (.+)/);
      const httpPortMatch = output.match(/HTTPPort : (\d+)/);
      const httpsMatch = output.match(/HTTPSProxy : (.+)/);
      const httpsPortMatch = output.match(/HTTPSPort : (\d+)/);
      
      const result: NetworkEnvironment['proxyConfig'] = {};
      
      if (httpEnabled && httpMatch && httpPortMatch) {
        result.http = `http://${httpMatch[1]}:${httpPortMatch[1]}`;
      }
      
      if (httpsEnabled && httpsMatch && httpsPortMatch) {
        result.https = `http://${httpsMatch[1]}:${httpsPortMatch[1]}`;
      }
      
      return Object.keys(result).length > 0 ? result : null;
    } catch {
      return null;
    }
  }
  
  /**
   * 获取Linux代理设置
   */
  private async getLinuxProxySettings(): Promise<NetworkEnvironment['proxyConfig'] | null> {
    // Linux主要依赖环境变量，已在getEnvironmentProxy中处理
    return null;
  }
  
  /**
   * 测试国外网站访问
   */
  private async testInternationalAccess(): Promise<boolean> {
    const testUrls = [
      this.config.testUrls.google,
      this.config.testUrls.github
    ];
    
    let successCount = 0;
    
    for (const url of testUrls) {
      try {
        await retry(async () => {
          const response = await axios.get(url, {
            timeout: this.config.timeout,
            validateStatus: (status) => status < 500 // 允许重定向等
          });
          return response;
        }, this.config.retries, 1000);
        
        successCount++;
      } catch (error) {
        log.debug(`无法访问 ${url}`, { error });
      }
    }
    
    return successCount > 0;
  }
  
  /**
   * 测量网络延迟
   */
  private async measureLatency(): Promise<NetworkEnvironment['latency']> {
    const latency: NetworkEnvironment['latency'] = {
      google: -1,
      github: -1,
      npm: -1,
      claude: -1
    };
    
    for (const [key, url] of Object.entries(this.config.testUrls)) {
      try {
        const startTime = Date.now();
        await axios.head(url, { timeout: this.config.timeout });
        latency[key as keyof typeof latency] = Date.now() - startTime;
      } catch {
        // 如果无法访问，保持-1
      }
    }
    
    return latency;
  }
  
  /**
   * 获取DNS服务器
   */
  private getDNSServers(): string[] {
    const platform = os.platform();
    
    try {
      switch (platform) {
        case 'win32':
          return this.getWindowsDNSServers();
        case 'darwin':
          return this.getMacOSDNSServers();
        case 'linux':
          return this.getLinuxDNSServers();
        default:
          return [];
      }
    } catch (error) {
      log.warn('获取DNS服务器失败', { error });
      return [];
    }
  }
  
  /**
   * 获取Windows DNS服务器
   */
  private getWindowsDNSServers(): string[] {
    try {
      const output = execSync('nslookup', { encoding: 'utf8' });
      const dnsMatch = output.match(/Server:\s+([0-9.]+)/);
      return dnsMatch ? [dnsMatch[1]] : [];
    } catch {
      return [];
    }
  }
  
  /**
   * 获取macOS DNS服务器
   */
  private getMacOSDNSServers(): string[] {
    try {
      const output = execSync('scutil --dns | grep nameserver', { encoding: 'utf8' });
      const matches = output.match(/nameserver\[\d+\] : ([0-9.]+)/g);
      if (matches) {
        return matches.map(match => {
          const ip = match.match(/([0-9.]+)/);
          return ip ? ip[1] : '';
        }).filter(ip => ip);
      }
      return [];
    } catch {
      return [];
    }
  }
  
  /**
   * 获取Linux DNS服务器
   */
  private getLinuxDNSServers(): string[] {
    try {
      const output = execSync('cat /etc/resolv.conf | grep nameserver', { encoding: 'utf8' });
      const matches = output.match(/nameserver\s+([0-9.]+)/g);
      if (matches) {
        return matches.map(match => {
          const ip = match.match(/([0-9.]+)/);
          return ip ? ip[1] : '';
        }).filter(ip => ip);
      }
      return [];
    } catch {
      return [];
    }
  }
  
  /**
   * 生成建议
   */
  private generateRecommendations(env: NetworkEnvironment): Array<{
    action: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    const recommendations = [];
    
    if (env.status === NetworkStatus.OFFLINE) {
      recommendations.push({
        action: 'check-network-connection',
        description: '请检查网络连接是否正常',
        priority: 'high' as const
      });
    }
    
    if (env.status === NetworkStatus.LIMITED) {
      recommendations.push({
        action: 'check-firewall',
        description: '网络连接受限，请检查防火墙设置',
        priority: 'medium' as const
      });
    }
    
    if (!env.hasInternationalAccess) {
      recommendations.push({
        action: 'setup-proxy',
        description: '无法访问国外网站，建议配置代理或VPN',
        priority: 'high' as const
      });
    }
    
    if (env.latency.google > 3000 && env.latency.google !== -1) {
      recommendations.push({
        action: 'optimize-network',
        description: '网络延迟较高，建议优化网络连接',
        priority: 'low' as const
      });
    }
    
    return recommendations;
  }
}

// 导出单例实例
export const networkDetector = new NetworkDetector();
