/**
 * T045: 性能监控和优化工具
 * 监控应用启动时间和界面响应性能
 */

export interface PerformanceMetrics {
  /** 应用启动时间(毫秒) */
  startupTime: number;
  /** 主窗口创建时间(毫秒) */
  windowCreationTime: number;
  /** 渲染器初始化时间(毫秒) */
  rendererInitTime: number;
  /** 界面响应时间(毫秒) */
  interfaceResponseTime: number;
  /** 内存使用量(MB) */
  memoryUsage: number;
  /** CPU使用率(%) */
  cpuUsage: number;
}

export interface PerformanceThresholds {
  /** 最大启动时间(毫秒) */
  maxStartupTime: number;
  /** 最大界面响应时间(毫秒) */
  maxResponseTime: number;
  /** 最大内存使用量(MB) */
  maxMemoryUsage: number;
}

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Partial<PerformanceMetrics> = {};
  private startTime: number = 0;
  private checkpoints: Record<string, number> = {};

  /** 性能阈值配置 */
  private thresholds: PerformanceThresholds = {
    maxStartupTime: 3000, // 3秒
    maxResponseTime: 1000, // 1秒
    maxMemoryUsage: 512 // 512MB
  };

  private constructor() {
    this.startTime = Date.now();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 记录检查点
   */
  public checkpoint(name: string): void {
    this.checkpoints[name] = Date.now();
  }

  /**
   * 计算时间差
   */
  public getTimeDiff(checkpointName: string): number {
    const checkpointTime = this.checkpoints[checkpointName];
    if (!checkpointTime) {
      return 0;
    }
    return Date.now() - checkpointTime;
  }

  /**
   * 记录启动完成
   */
  public markStartupComplete(): void {
    this.metrics.startupTime = Date.now() - this.startTime;
    this.checkpoint('startup-complete');
  }

  /**
   * 记录主窗口创建完成
   */
  public markWindowCreated(): void {
    this.metrics.windowCreationTime = this.getTimeDiff('app-start') || (Date.now() - this.startTime);
    this.checkpoint('window-created');
  }

  /**
   * 记录渲染器初始化完成
   */
  public markRendererReady(): void {
    this.metrics.rendererInitTime = this.getTimeDiff('window-created') || 0;
    this.checkpoint('renderer-ready');
  }

  /**
   * 测量界面响应时间
   */
  public async measureResponseTime(action: () => Promise<void> | void): Promise<number> {
    const startTime = Date.now();
    await action();
    const responseTime = Date.now() - startTime;
    this.metrics.interfaceResponseTime = responseTime;
    return responseTime;
  }

  /**
   * 获取内存使用情况
   */
  public getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      this.metrics.memoryUsage = Math.round(memUsage.heapUsed / 1024 / 1024);
      return this.metrics.memoryUsage;
    }
    return 0;
  }

  /**
   * 获取当前性能指标
   */
  public getMetrics(): PerformanceMetrics {
    return {
      startupTime: this.metrics.startupTime || 0,
      windowCreationTime: this.metrics.windowCreationTime || 0,
      rendererInitTime: this.metrics.rendererInitTime || 0,
      interfaceResponseTime: this.metrics.interfaceResponseTime || 0,
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: 0 // 需要额外的库来准确测量CPU使用率
    };
  }

  /**
   * 检查性能是否符合要求
   */
  public checkPerformance(): { passed: boolean; issues: string[] } {
    const metrics = this.getMetrics();
    const issues: string[] = [];

    if (metrics.startupTime > this.thresholds.maxStartupTime) {
      issues.push(`启动时间过长: ${metrics.startupTime}ms > ${this.thresholds.maxStartupTime}ms`);
    }

    if (metrics.interfaceResponseTime > this.thresholds.maxResponseTime) {
      issues.push(`界面响应过慢: ${metrics.interfaceResponseTime}ms > ${this.thresholds.maxResponseTime}ms`);
    }

    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      issues.push(`内存使用过多: ${metrics.memoryUsage}MB > ${this.thresholds.maxMemoryUsage}MB`);
    }

    return {
      passed: issues.length === 0,
      issues
    };
  }

  /**
   * 生成性能报告
   */
  public generateReport(): string {
    const metrics = this.getMetrics();
    const check = this.checkPerformance();

    return `
性能监控报告
==============

启动性能:
- 总启动时间: ${metrics.startupTime}ms (目标: <3000ms)
- 窗口创建时间: ${metrics.windowCreationTime}ms
- 渲染器初始化: ${metrics.rendererInitTime}ms

运行时性能:
- 界面响应时间: ${metrics.interfaceResponseTime}ms (目标: <1000ms)
- 内存使用: ${metrics.memoryUsage}MB (目标: <512MB)

性能检查: ${check.passed ? '✅ 通过' : '❌ 不达标'}
${check.issues.length > 0 ? '\n问题:\n' + check.issues.map(issue => `- ${issue}`).join('\n') : ''}

检查点记录:
${Object.entries(this.checkpoints).map(([name, time]) => `- ${name}: ${new Date(time).toISOString()}`).join('\n')}
    `.trim();
  }

  /**
   * 重置监控数据
   */
  public reset(): void {
    this.metrics = {};
    this.checkpoints = {};
    this.startTime = Date.now();
  }
}

/**
 * 全局性能监控实例
 */
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * 性能优化建议
 */
export const PerformanceOptimizations = {
  /**
   * 启动优化建议
   */
  startup: [
    '延迟加载非关键模块',
    '使用Webpack代码分割',
    '减少初始化时的同步操作',
    '优化Electron主进程启动速度',
    '缓存重复的计算结果'
  ],

  /**
   * 界面响应优化建议
   */
  interface: [
    '使用React.memo优化组件渲染',
    '实现虚拟滚动处理大列表',
    '使用debounce处理频繁的用户输入',
    '异步处理耗时操作',
    '优化状态管理和数据流'
  ],

  /**
   * 内存优化建议
   */
  memory: [
    '及时清理事件监听器',
    '避免内存泄漏',
    '使用对象池重用对象',
    '优化图片和资源加载',
    '定期清理缓存数据'
  ]
};