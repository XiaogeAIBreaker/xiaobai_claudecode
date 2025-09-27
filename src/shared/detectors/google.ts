/**
 * T022: Google账户检测器
 * 检测Google服务访问能力和用户登录状态
 */

import axios from 'axios';
import {
  GoogleEnvironment,
  DetectionResult,
  DetectionStatus,
  EnvironmentDetector
} from '../types/environment';
import { log } from '../utils/logger';
import { retry } from '../utils/system';

/**
 * Google检测配置
 */
interface GoogleDetectorConfig {
  timeout: number;
  retries: number;
  testServices: {
    main: string;
    gmail: string;
    drive: string;
    calendar: string;
    youtube: string;
  };
}

/**
 * Google账户检测器实现
 */
export class GoogleDetector implements EnvironmentDetector {
  name = 'google-detector';
  type = 'google' as const;
  required = false; // Google服务不是必需的
  timeout = 20000; // 20秒
  
  private config: GoogleDetectorConfig;
  private progress = 0;
  
  constructor(config?: Partial<GoogleDetectorConfig>) {
    this.config = {
      timeout: 8000,
      retries: 2,
      testServices: {
        main: 'https://www.google.com',
        gmail: 'https://mail.google.com',
        drive: 'https://drive.google.com',
        calendar: 'https://calendar.google.com',
        youtube: 'https://www.youtube.com'
      },
      ...config
    };
  }
  
  /**
   * 执行Google检测
   */
  async detect(): Promise<DetectionResult> {
    const startTime = Date.now();
    this.progress = 0;
    
    try {
      log.info('开始Google环境检测');
      
      // 检查先决条件
      const prerequisites = await this.checkPrerequisites();
      if (!prerequisites) {
        throw new Error('Google检测先决条件不满足');
      }
      this.progress = 10;
      
      // 检测Google主站访问
      const accessible = await this.testGoogleAccess();
      this.progress = 30;
      
      // 检测各项服务
      const availableServices = await this.testGoogleServices();
      this.progress = 60;
      
      // 检测访问方式
      const accessMethod = await this.detectAccessMethod();
      this.progress = 80;
      
      // 检测登录状态（暂时无法实现）
      const loggedIn = false;
      const userInfo = undefined;
      this.progress = 90;
      
      // 获取可用的登录方式
      const authMethods = this.getAvailableAuthMethods(accessible);
      this.progress = 100;
      
      const googleEnvironment: GoogleEnvironment = {
        accessible,
        loggedIn,
        userInfo,
        availableServices,
        accessMethod,
        authMethods
      };
      
      const duration = Date.now() - startTime;
      log.info('Google环境检测完成', { duration, googleEnvironment });
      
      return {
        status: DetectionStatus.SUCCESS,
        timestamp: new Date(),
        duration,
        message: 'Google环境检测成功',
        data: googleEnvironment,
        recommendations: this.generateRecommendations(googleEnvironment)
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error('Google环境检测失败', error as Error);
      
      return {
        status: DetectionStatus.FAILED,
        timestamp: new Date(),
        duration,
        message: `Google检测失败: ${error instanceof Error ? error.message : '未知错误'}`,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }
  
  /**
   * 检查先决条件
   */
  async checkPrerequisites(): Promise<boolean> {
    // Google检测需要网络连接
    try {
      // 尝试访问一个可靠的网站
      await axios.get('https://www.baidu.com', { timeout: 5000 });
      return true;
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
   * 测试Google主站访问
   */
  async testGoogleAccess(): Promise<boolean> {
    try {
      await retry(async () => {
        const response = await axios.get(this.config.testServices.main, {
          timeout: this.config.timeout,
          validateStatus: (status) => status < 500,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        return response;
      }, this.config.retries, 1000);
      
      return true;
    } catch (error) {
      log.debug('Google主站访问失败', { error });
      return false;
    }
  }
  
  /**
   * 测试Google各项服务
   */
  private async testGoogleServices(): Promise<GoogleEnvironment['availableServices']> {
    const services = {
      gmail: false,
      drive: false,
      calendar: false,
      youtube: false
    };
    
    const serviceTests = [
      { name: 'gmail', url: this.config.testServices.gmail },
      { name: 'drive', url: this.config.testServices.drive },
      { name: 'calendar', url: this.config.testServices.calendar },
      { name: 'youtube', url: this.config.testServices.youtube }
    ];
    
    // 并行测试所有服务
    const results = await Promise.allSettled(
      serviceTests.map(async ({ name, url }) => {
        try {
          await axios.head(url, {
            timeout: this.config.timeout,
            validateStatus: (status) => status < 500,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          return { name, available: true };
        } catch {
          return { name, available: false };
        }
      })
    );
    
    // 整理结果
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const serviceName = serviceTests[index].name as keyof typeof services;
        services[serviceName] = result.value.available;
      }
    });
    
    return services;
  }
  
  /**
   * 检测访问方式
   */
  private async detectAccessMethod(): Promise<GoogleEnvironment['accessMethod']> {
    try {
      // 尝试直接访问
      const response = await axios.get(this.config.testServices.main, {
        timeout: this.config.timeout,
        maxRedirects: 0, // 不跟随重定向
        validateStatus: () => true
      });
      
      // 检查是否被重定向到代理或镜像站
      const location = response.headers.location;
      if (location) {
        if (location.includes('proxy') || location.includes('mirror')) {
          return 'mirror';
        }
      }
      
      // 检查响应时间来判断是否通过VPN
      const startTime = Date.now();
      await axios.head(this.config.testServices.main, {
        timeout: this.config.timeout
      });
      const responseTime = Date.now() - startTime;
      
      // 如果响应时间较长，可能通过VPN或代理
      if (responseTime > 3000) {
        // 检查是否有代理设置
        const hasProxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
        return hasProxy ? 'proxy' : 'vpn';
      }
      
      return 'direct';
    } catch {
      return 'direct';
    }
  }
  
  /**
   * 获取可用的登录方式
   */
  private getAvailableAuthMethods(accessible: boolean): GoogleEnvironment['authMethods'] {
    const methods: GoogleEnvironment['authMethods'] = [];
    
    if (accessible) {
      // 如果可以访问Google，支持浏览器登录
      methods.push('browser');
      
      // 在中国大陆地区，推荐使用二维码登录
      if (this.isInChina()) {
        methods.push('qrcode');
      }
    } else {
      // 如果无法访问，只支持二维码和短信登录
      methods.push('qrcode', 'sms');
    }
    
    return methods;
  }
  
  /**
   * 判断是否在中国大陆
   */
  private isInChina(): boolean {
    // 简单的地理位置判断，可以根据需要改进
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    
    return timezone.includes('Shanghai') || 
           timezone.includes('Beijing') || 
           locale.includes('zh-CN');
  }
  
  /**
   * 生成建议
   */
  private generateRecommendations(env: GoogleEnvironment): Array<{
    action: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    const recommendations = [];
    
    if (!env.accessible) {
      recommendations.push({
        action: 'setup-vpn-or-proxy',
        description: '无法访问Google服务，建议配置代理或VPN',
        priority: 'high' as const
      });
      
      recommendations.push({
        action: 'use-qrcode-auth',
        description: '推荐使用二维码登录方式进行Google账户验证',
        priority: 'medium' as const
      });
    }
    
    if (env.accessible && !env.loggedIn) {
      recommendations.push({
        action: 'google-signin',
        description: '请登录Google账户以获得更好的Claude体验',
        priority: 'medium' as const
      });
    }
    
    if (env.accessMethod === 'vpn' || env.accessMethod === 'proxy') {
      recommendations.push({
        action: 'optimize-connection',
        description: '检测到您正在使用代理或VPN，建议优化连接设置',
        priority: 'low' as const
      });
    }
    
    // 检查服务可用性
    const unavailableServices = Object.entries(env.availableServices)
      .filter(([_, available]) => !available)
      .map(([service]) => service);
    
    if (unavailableServices.length > 0) {
      recommendations.push({
        action: 'check-services',
        description: `部分Google服务不可用: ${unavailableServices.join(', ')}`,
        priority: 'low' as const
      });
    }
    
    return recommendations;
  }
  
  /**
   * 公共方法：检查Google访问能力
   */
  async isAccessible(): Promise<boolean> {
    return this.testGoogleAccess();
  }
  
  /**
   * 公共方法：检查特定服务
   */
  async checkService(service: keyof GoogleEnvironment['availableServices']): Promise<boolean> {
    const serviceUrl = this.config.testServices[service as keyof typeof this.config.testServices];
    if (!serviceUrl) {
      return false;
    }
    
    try {
      await axios.head(serviceUrl, {
        timeout: this.config.timeout,
        validateStatus: (status) => status < 500
      });
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * 公共方法：生成Google登录URL
   */
  generateLoginUrl(redirectUri: string, scopes: string[] = []): string {
    const defaultScopes = ['openid', 'email', 'profile'];
    const allScopes = [...defaultScopes, ...scopes];
    
    const params = new URLSearchParams({
      client_id: 'your-client-id', // 实际使用时需要配置
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: allScopes.join(' '),
      access_type: 'offline',
      prompt: 'consent'
    });
    
    return `https://accounts.google.com/oauth2/auth?${params.toString()}`;
  }
  
  /**
   * 公共方法：生成二维码数据
   */
  generateQRCodeData(loginUrl: string): string {
    // 返回用于生成二维码的数据
    return loginUrl;
  }
}

// 导出单例实例
export const googleDetector = new GoogleDetector();
