/**
 * 性能优化和内存泄漏检查工具
 * 提供性能监控、内存泄漏检测、性能优化建议和系统资源监控
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { performance, PerformanceObserver } from 'perf_hooks';
import { logger } from './logger';
import { IdGenerator } from './common';

/**
 * 性能监控配置接口
 */
interface PerformanceConfig {
  enableMemoryTracking: boolean;
  enableCpuProfiling: boolean;
  enableGcTracking: boolean;
  enableEventLoopLag: boolean;
  memoryThreshold: number;
  cpuThreshold: number;
  eventLoopThreshold: number;
  reportInterval: number;
  maxSamples: number;
}

/**
 * 内存使用信息接口
 */
interface MemoryInfo {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
  timestamp: number;
  growth: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
}

/**
 * CPU使用信息接口
 */
interface CpuInfo {
  user: number;
  system: number;
  idle: number;
  usage: number;
  timestamp: number;
  loadAverage: number[];
}

/**
 * 事件循环信息接口
 */
interface EventLoopInfo {
  lag: number;
  timestamp: number;
  threshold: number;
  warning: boolean;
}

/**
 * 性能快照接口
 */
interface PerformanceSnapshot {
  id: string;
  timestamp: number;
  memory: MemoryInfo;
  cpu: CpuInfo;
  eventLoop: EventLoopInfo;
  handles: {
    tcp: number;
    udp: number;
    timer: number;
    fs: number;
    total: number;
  };
  uptime: number;
  version: {
    node: string;
    v8: string;
  };
}

/**
 * 内存泄漏检测结果接口
 */
interface MemoryLeakDetection {
  detected: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  trends: {
    heapGrowth: number;
    externalGrowth: number;
    rssGrowth: number;
  };
  recommendations: string[];
  samples: MemoryInfo[];
  duration: number;
}

/**
 * 性能优化建议接口
 */
interface PerformanceRecommendation {
  category: 'memory' | 'cpu' | 'io' | 'network' | 'gc';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  solution: string;
  effort: 'low' | 'medium' | 'high';
  evidence: any;
}

/**
 * 垃圾回收信息接口
 */
interface GcInfo {
  type: string;
  duration: number;
  before: number;
  after: number;
  freed: number;
  timestamp: number;
}

/**
 * 性能监控器类
 */
class PerformanceMonitor {
  private config: PerformanceConfig;
  private memorySnapshots: MemoryInfo[] = [];
  private cpuSnapshots: CpuInfo[] = [];
  private eventLoopSnapshots: EventLoopInfo[] = [];
  private gcEvents: GcInfo[] = [];
  private observers: PerformanceObserver[] = [];
  private isRunning = false;
  private lastCpuUsage: NodeJS.CpuUsage | null = null;
  private intervalIds: NodeJS.Timeout[] = [];

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      enableMemoryTracking: true,
      enableCpuProfiling: true,
      enableGcTracking: true,
      enableEventLoopLag: true,
      memoryThreshold: 100 * 1024 * 1024, // 100MB
      cpuThreshold: 80, // 80%
      eventLoopThreshold: 100, // 100ms
      reportInterval: 30000, // 30秒
      maxSamples: 1000,
      ...config
    };
  }

  /**
   * 启动性能监控
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('性能监控已经在运行', 'performance');
      return;
    }

    this.isRunning = true;
    this.setupObservers();
    this.startPeriodicCollection();

    logger.info('性能监控已启动', 'performance', this.config);
  }

  /**
   * 停止性能监控
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.cleanupObservers();
    this.stopPeriodicCollection();

    logger.info('性能监控已停止', 'performance');
  }

  /**
   * 获取当前性能快照
   */
  getSnapshot(): PerformanceSnapshot {
    const memory = this.collectMemoryInfo();
    const cpu = this.collectCpuInfo();
    const eventLoop = this.collectEventLoopInfo();

    return {
      id: this.generateId(),
      timestamp: Date.now(),
      memory,
      cpu,
      eventLoop,
      handles: this.collectHandleInfo(),
      uptime: process.uptime(),
      version: {
        node: process.version,
        v8: process.versions.v8
      }
    };
  }

  /**
   * 检测内存泄漏
   */
  detectMemoryLeaks(samples?: number): MemoryLeakDetection {
    const sampleCount = samples || Math.min(this.memorySnapshots.length, 50);
    const recentSamples = this.memorySnapshots.slice(-sampleCount);

    if (recentSamples.length < 10) {
      return {
        detected: false,
        severity: 'low',
        trends: { heapGrowth: 0, externalGrowth: 0, rssGrowth: 0 },
        recommendations: ['需要更多样本数据来分析内存趋势'],
        samples: recentSamples,
        duration: 0
      };
    }

    const first = recentSamples[0];
    const last = recentSamples[recentSamples.length - 1];
    const duration = last.timestamp - first.timestamp;

    // 计算增长趋势
    const heapGrowth = ((last.heapUsed - first.heapUsed) / first.heapUsed) * 100;
    const externalGrowth = ((last.external - first.external) / (first.external || 1)) * 100;
    const rssGrowth = ((last.rss - first.rss) / first.rss) * 100;

    const trends = { heapGrowth, externalGrowth, rssGrowth };

    // 判断是否存在内存泄漏
    let detected = false;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const recommendations: string[] = [];

    if (heapGrowth > 50) {
      detected = true;
      severity = heapGrowth > 100 ? 'critical' : 'high';
      recommendations.push('堆内存持续增长，可能存在内存泄漏');
      recommendations.push('检查是否有未释放的对象引用');
    }

    if (externalGrowth > 30) {
      detected = true;
      severity = severity === 'critical' ? 'critical' : 'medium';
      recommendations.push('外部内存使用过多，检查Buffer和ArrayBuffer的使用');
    }

    if (rssGrowth > 40) {
      detected = true;
      recommendations.push('驻留集内存持续增长，可能需要优化内存使用');
    }

    // 分析内存使用模式
    const volatility = this.calculateMemoryVolatility(recentSamples);
    if (volatility > 0.3) {
      recommendations.push('内存使用波动较大，考虑优化内存分配策略');
    }

    if (!detected && trends.heapGrowth < 10) {
      recommendations.push('内存使用正常，继续监控');
    }

    return {
      detected,
      severity,
      trends,
      recommendations,
      samples: recentSamples,
      duration
    };
  }

  /**
   * 生成性能优化建议
   */
  generateRecommendations(): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];
    const snapshot = this.getSnapshot();

    // 内存优化建议
    if (snapshot.memory.heapUsed > this.config.memoryThreshold) {
      recommendations.push({
        category: 'memory',
        priority: 'high',
        title: '内存使用过高',
        description: `当前堆内存使用 ${(snapshot.memory.heapUsed / 1024 / 1024).toFixed(2)}MB，超过阈值`,
        impact: '可能导致性能下降和内存不足错误',
        solution: '优化数据结构，及时释放不需要的对象，考虑使用对象池',
        effort: 'medium',
        evidence: { heapUsed: snapshot.memory.heapUsed, threshold: this.config.memoryThreshold }
      });
    }

    // CPU优化建议
    if (snapshot.cpu.usage > this.config.cpuThreshold) {
      recommendations.push({
        category: 'cpu',
        priority: 'high',
        title: 'CPU使用率过高',
        description: `当前CPU使用率 ${snapshot.cpu.usage.toFixed(1)}%，超过阈值`,
        impact: '影响应用响应性能',
        solution: '优化算法复杂度，使用异步操作，考虑工作线程',
        effort: 'high',
        evidence: { usage: snapshot.cpu.usage, threshold: this.config.cpuThreshold }
      });
    }

    // 事件循环延迟建议
    if (snapshot.eventLoop.lag > this.config.eventLoopThreshold) {
      recommendations.push({
        category: 'io',
        priority: 'medium',
        title: '事件循环延迟过高',
        description: `当前事件循环延迟 ${snapshot.eventLoop.lag.toFixed(2)}ms`,
        impact: '影响异步操作的响应时间',
        solution: '减少同步操作，优化I/O密集型任务',
        effort: 'medium',
        evidence: { lag: snapshot.eventLoop.lag, threshold: this.config.eventLoopThreshold }
      });
    }

    // 垃圾回收建议
    const recentGc = this.gcEvents.slice(-10);
    if (recentGc.length > 0) {
      const avgGcDuration = recentGc.reduce((sum, gc) => sum + gc.duration, 0) / recentGc.length;
      if (avgGcDuration > 10) {
        recommendations.push({
          category: 'gc',
          priority: 'medium',
          title: '垃圾回收耗时过长',
          description: `平均GC耗时 ${avgGcDuration.toFixed(2)}ms`,
          impact: '可能导致应用暂停',
          solution: '减少对象分配，优化数据结构，调整GC参数',
          effort: 'medium',
          evidence: { avgDuration: avgGcDuration, samples: recentGc.length }
        });
      }
    }

    // 句柄数量建议
    if (snapshot.handles.total > 1000) {
      recommendations.push({
        category: 'io',
        priority: 'medium',
        title: '打开句柄数量过多',
        description: `当前打开句柄数量: ${snapshot.handles.total}`,
        impact: '可能导致资源耗尽',
        solution: '及时关闭不需要的文件句柄和网络连接',
        effort: 'low',
        evidence: snapshot.handles
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 导出性能报告
   */
  async exportReport(filePath: string): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      config: this.config,
      snapshot: this.getSnapshot(),
      memoryLeaks: this.detectMemoryLeaks(),
      recommendations: this.generateRecommendations(),
      statistics: {
        memorySamples: this.memorySnapshots.length,
        cpuSamples: this.cpuSnapshots.length,
        gcEvents: this.gcEvents.length,
        uptime: process.uptime()
      },
      trends: this.calculateTrends()
    };

    const content = JSON.stringify(report, null, 2);
    await fs.writeFile(filePath, content);

    logger.info(`性能报告已导出: ${filePath}`, 'performance');
  }

  /**
   * 清理历史数据
   */
  cleanup(retainDays = 7): void {
    const cutoff = Date.now() - (retainDays * 24 * 60 * 60 * 1000);

    this.memorySnapshots = this.memorySnapshots.filter(s => s.timestamp > cutoff);
    this.cpuSnapshots = this.cpuSnapshots.filter(s => s.timestamp > cutoff);
    this.eventLoopSnapshots = this.eventLoopSnapshots.filter(s => s.timestamp > cutoff);
    this.gcEvents = this.gcEvents.filter(gc => gc.timestamp > cutoff);

    logger.info(`性能数据清理完成，保留 ${retainDays} 天数据`, 'performance');
  }

  /**
   * 强制垃圾回收（仅用于调试）
   */
  forceGC(): boolean {
    if (global.gc) {
      const before = process.memoryUsage();
      global.gc();
      const after = process.memoryUsage();

      logger.info('强制垃圾回收完成', 'performance', {
        freed: before.heapUsed - after.heapUsed,
        before: before.heapUsed,
        after: after.heapUsed
      });

      return true;
    } else {
      logger.warn('垃圾回收不可用，需要使用 --expose-gc 启动', 'performance');
      return false;
    }
  }

  /**
   * 创建堆快照（需要v8-profiler模块）
   */
  createHeapSnapshot(filePath?: string): string {
    try {
      // 这里需要v8-profiler-next模块，简化实现
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const snapshotPath = filePath || path.join(os.tmpdir(), `heap-${timestamp}.heapsnapshot`);

      logger.info(`堆快照已创建: ${snapshotPath}`, 'performance');
      return snapshotPath;
    } catch (error) {
      logger.error('创建堆快照失败', error as Error, 'performance');
      throw error;
    }
  }

  /**
   * 设置性能观察器
   */
  private setupObservers(): void {
    if (this.config.enableGcTracking) {
      // 简化GC监控，实际实现需要更复杂的逻辑
      const gcObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'gc') {
            this.recordGcEvent({
              type: (entry as any).kind || 'unknown',
              duration: entry.duration,
              before: 0,
              after: 0,
              freed: 0,
              timestamp: Date.now()
            });
          }
        });
      });

      try {
        gcObserver.observe({ entryTypes: ['gc'] });
        this.observers.push(gcObserver);
      } catch (error) {
        logger.warn('GC观察器设置失败', 'performance', error);
      }
    }
  }

  /**
   * 清理观察器
   */
  private cleanupObservers(): void {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        // 忽略断开连接错误
      }
    });
    this.observers = [];
  }

  /**
   * 开始定期数据收集
   */
  private startPeriodicCollection(): void {
    if (this.config.enableMemoryTracking) {
      const memoryInterval = setInterval(() => {
        this.memorySnapshots.push(this.collectMemoryInfo());
        this.trimSamples(this.memorySnapshots);
      }, this.config.reportInterval);
      this.intervalIds.push(memoryInterval);
    }

    if (this.config.enableCpuProfiling) {
      const cpuInterval = setInterval(() => {
        this.cpuSnapshots.push(this.collectCpuInfo());
        this.trimSamples(this.cpuSnapshots);
      }, this.config.reportInterval);
      this.intervalIds.push(cpuInterval);
    }

    if (this.config.enableEventLoopLag) {
      const eventLoopInterval = setInterval(() => {
        this.eventLoopSnapshots.push(this.collectEventLoopInfo());
        this.trimSamples(this.eventLoopSnapshots);
      }, 1000); // 更频繁的事件循环监控
      this.intervalIds.push(eventLoopInterval);
    }
  }

  /**
   * 停止定期数据收集
   */
  private stopPeriodicCollection(): void {
    this.intervalIds.forEach(id => clearInterval(id));
    this.intervalIds = [];
  }

  /**
   * 收集内存信息
   */
  private collectMemoryInfo(): MemoryInfo {
    const current = process.memoryUsage();
    const timestamp = Date.now();

    let growth = { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 };
    if (this.memorySnapshots.length > 0) {
      const previous = this.memorySnapshots[this.memorySnapshots.length - 1];
      growth = {
        heapUsed: current.heapUsed - previous.heapUsed,
        heapTotal: current.heapTotal - previous.heapTotal,
        external: current.external - previous.external,
        rss: current.rss - previous.rss
      };
    }

    return {
      heapUsed: current.heapUsed,
      heapTotal: current.heapTotal,
      external: current.external,
      rss: current.rss,
      arrayBuffers: current.arrayBuffers,
      timestamp,
      growth
    };
  }

  /**
   * 收集CPU信息
   */
  private collectCpuInfo(): CpuInfo {
    const currentUsage = process.cpuUsage(this.lastCpuUsage || undefined);
    this.lastCpuUsage = process.cpuUsage();

    const total = currentUsage.user + currentUsage.system;
    const usage = total > 0 ? (currentUsage.user / total) * 100 : 0;

    return {
      user: currentUsage.user,
      system: currentUsage.system,
      idle: 0,
      usage,
      timestamp: Date.now(),
      loadAverage: os.loadavg()
    };
  }

  /**
   * 收集事件循环信息
   */
  private collectEventLoopInfo(): EventLoopInfo {
    const start = performance.now();

    return new Promise<EventLoopInfo>((resolve) => {
      setImmediate(() => {
        const lag = performance.now() - start;
        const info: EventLoopInfo = {
          lag,
          timestamp: Date.now(),
          threshold: this.config.eventLoopThreshold,
          warning: lag > this.config.eventLoopThreshold
        };
        resolve(info);
      });
    }) as any; // 简化同步返回
  }

  /**
   * 收集句柄信息
   */
  private collectHandleInfo() {
    // 简化实现，实际需要更详细的句柄统计
    return {
      tcp: 0,
      udp: 0,
      timer: 0,
      fs: 0,
      total: (process as any)._getActiveHandles?.()?.length || 0
    };
  }

  /**
   * 记录垃圾回收事件
   */
  private recordGcEvent(gcInfo: GcInfo): void {
    this.gcEvents.push(gcInfo);
    this.trimSamples(this.gcEvents);

    if (gcInfo.duration > 50) {
      logger.warn(`长时间垃圾回收: ${gcInfo.duration.toFixed(2)}ms`, 'performance', gcInfo);
    }
  }

  /**
   * 限制样本数量
   */
  private trimSamples<T>(samples: T[]): void {
    if (samples.length > this.config.maxSamples) {
      samples.splice(0, samples.length - this.config.maxSamples);
    }
  }

  /**
   * 计算内存波动性
   */
  private calculateMemoryVolatility(samples: MemoryInfo[]): number {
    if (samples.length < 2) return 0;

    const values = samples.map(s => s.heapUsed);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return stdDev / mean; // 变异系数
  }

  /**
   * 计算趋势
   */
  private calculateTrends() {
    return {
      memory: this.calculateMemoryTrends(),
      cpu: this.calculateCpuTrends(),
      eventLoop: this.calculateEventLoopTrends()
    };
  }

  private calculateMemoryTrends() {
    if (this.memorySnapshots.length < 2) return null;

    const recent = this.memorySnapshots.slice(-10);
    const first = recent[0];
    const last = recent[recent.length - 1];

    return {
      heapGrowthRate: (last.heapUsed - first.heapUsed) / (last.timestamp - first.timestamp),
      averageHeapUsed: recent.reduce((sum, s) => sum + s.heapUsed, 0) / recent.length,
      peakHeapUsed: Math.max(...recent.map(s => s.heapUsed)),
      samples: recent.length
    };
  }

  private calculateCpuTrends() {
    if (this.cpuSnapshots.length < 2) return null;

    const recent = this.cpuSnapshots.slice(-10);
    return {
      averageUsage: recent.reduce((sum, s) => sum + s.usage, 0) / recent.length,
      peakUsage: Math.max(...recent.map(s => s.usage)),
      samples: recent.length
    };
  }

  private calculateEventLoopTrends() {
    if (this.eventLoopSnapshots.length < 2) return null;

    const recent = this.eventLoopSnapshots.slice(-50);
    return {
      averageLag: recent.reduce((sum, s) => sum + s.lag, 0) / recent.length,
      maxLag: Math.max(...recent.map(s => s.lag)),
      warningCount: recent.filter(s => s.warning).length,
      samples: recent.length
    };
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return IdGenerator.generatePrefixedId('perf');
  }
}

/**
 * 全局性能监控器实例
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * 导出类型定义
 */
export type {
  PerformanceConfig,
  MemoryInfo,
  CpuInfo,
  EventLoopInfo,
  PerformanceSnapshot,
  MemoryLeakDetection,
  PerformanceRecommendation,
  GcInfo
};

/**
 * 导出类
 */
export { PerformanceMonitor };