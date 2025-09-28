/**
 * 日志记录和错误追踪系统
 * 提供统一的日志记录、错误追踪、性能监控和调试功能
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { fileSystem } from './file-system';
import { IdGenerator } from './common';

/**
 * 日志级别枚举
 */
enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

/**
 * 日志配置接口
 */
interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  logDirectory: string;
  maxFileSize: number;
  maxFiles: number;
  dateFormat: string;
  includeStackTrace: boolean;
  includeSystemInfo: boolean;
  remoteEndpoint?: string;
  bufferSize: number;
  flushInterval: number;
}

/**
 * 日志条目接口
 */
interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  category: string;
  data?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
    cause?: any;
  };
  context: {
    pid: number;
    platform: string;
    hostname: string;
    userAgent?: string;
    sessionId?: string;
    requestId?: string;
  };
  performance?: {
    memory: NodeJS.MemoryUsage;
    uptime: number;
    duration?: number;
  };
}

/**
 * 错误追踪条目接口
 */
interface ErrorTrackingEntry {
  id: string;
  timestamp: Date;
  error: Error;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  context: Record<string, any>;
  stackTrace: string;
  systemInfo: {
    platform: string;
    nodeVersion: string;
    arch: string;
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
  };
  userInfo?: {
    id?: string;
    session?: string;
    action?: string;
  };
  recovery?: {
    attempted: boolean;
    successful: boolean;
    method?: string;
  };
}

/**
 * 性能指标接口
 */
interface PerformanceMetric {
  id: string;
  timestamp: Date;
  name: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
  duration?: number;
  samples?: number[];
}

/**
 * 日志传输接口
 */
interface LogTransport {
  name: string;
  enabled: boolean;
  write(entry: LogEntry): Promise<void>;
  flush?(): Promise<void>;
  close?(): Promise<void>;
}

/**
 * 控制台日志传输
 */
class ConsoleTransport implements LogTransport {
  name = 'console';
  enabled = true;

  async write(entry: LogEntry): Promise<void> {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level].padEnd(5);
    const category = entry.category ? `[${entry.category}] ` : '';
    const message = `${timestamp} ${level} ${category}${entry.message}`;

    switch (entry.level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        console.debug(message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data || '');
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message, entry.data || '');
        if (entry.error?.stack) {
          console.error(entry.error.stack);
        }
        break;
    }
  }
}

/**
 * 文件日志传输
 */
class FileTransport implements LogTransport {
  name = 'file';
  enabled = true;

  private config: LoggerConfig;
  private currentFile: string | null = null;
  private writeStream: any = null;
  private currentFileSize = 0;

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  async write(entry: LogEntry): Promise<void> {
    try {
      await this.ensureLogFile();

      const logLine = this.formatLogEntry(entry);

      // 检查文件大小并轮转
      if (this.currentFileSize + logLine.length > this.config.maxFileSize) {
        await this.rotateLogFile();
      }

      await this.writeToFile(logLine);
      this.currentFileSize += logLine.length;
    } catch (error) {
      console.error('文件日志写入失败:', error);
    }
  }

  async flush(): Promise<void> {
    // 文件系统会自动刷新
  }

  async close(): Promise<void> {
    this.writeStream = null;
    this.currentFile = null;
  }

  private async ensureLogFile(): Promise<void> {
    if (this.currentFile) return;

    await fileSystem.ensureDirectory(this.config.logDirectory);

    const timestamp = new Date().toISOString().slice(0, 10);
    this.currentFile = path.join(this.config.logDirectory, `app-${timestamp}.log`);

    try {
      const stats = await fs.stat(this.currentFile);
      this.currentFileSize = stats.size;
    } catch {
      this.currentFileSize = 0;
    }
  }

  private async rotateLogFile(): Promise<void> {
    if (!this.currentFile) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedFile = this.currentFile.replace('.log', `-${timestamp}.log`);

    try {
      await fs.rename(this.currentFile, rotatedFile);
      this.currentFileSize = 0;

      // 清理旧日志文件
      await this.cleanupOldFiles();
    } catch (error) {
      console.error('日志文件轮转失败:', error);
    }
  }

  private async cleanupOldFiles(): Promise<void> {
    try {
      const files = await fileSystem.listDirectory(this.config.logDirectory, {
        filter: (name) => name.endsWith('.log')
      });

      if (files.length <= this.config.maxFiles) return;

      // 按修改时间排序，删除最旧的文件
      const filesWithStats = await Promise.all(
        files.map(async (file) => ({
          path: file,
          stats: await fs.stat(file)
        }))
      );

      filesWithStats
        .sort((a, b) => a.stats.mtime.getTime() - b.stats.mtime.getTime())
        .slice(0, files.length - this.config.maxFiles)
        .forEach(async ({ path }) => {
          try {
            await fs.unlink(path);
          } catch (error) {
            console.error('删除旧日志文件失败:', error);
          }
        });
    } catch (error) {
      console.error('清理旧日志文件失败:', error);
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level].padEnd(5);
    const category = entry.category ? `[${entry.category}] ` : '';

    let logLine = `${timestamp} ${level} ${category}${entry.message}`;

    if (entry.data) {
      logLine += ` | Data: ${JSON.stringify(entry.data)}`;
    }

    if (entry.error) {
      logLine += ` | Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack && this.config.includeStackTrace) {
        logLine += `\nStack: ${entry.error.stack}`;
      }
    }

    if (entry.performance) {
      logLine += ` | Memory: ${(entry.performance.memory.heapUsed / 1024 / 1024).toFixed(2)}MB`;
      if (entry.performance.duration) {
        logLine += ` | Duration: ${entry.performance.duration}ms`;
      }
    }

    return logLine + '\n';
  }

  private async writeToFile(content: string): Promise<void> {
    if (!this.currentFile) return;

    try {
      await fs.appendFile(this.currentFile, content);
    } catch (error) {
      console.error('写入日志文件失败:', error);
    }
  }
}

/**
 * 远程日志传输
 */
class RemoteTransport implements LogTransport {
  name = 'remote';
  enabled = false;

  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: LoggerConfig) {
    this.config = config;
    this.startFlushTimer();
  }

  async write(entry: LogEntry): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    this.buffer.push(entry);

    if (this.buffer.length >= this.config.bufferSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.config.remoteEndpoint) return;

    const entries = this.buffer.splice(0);

    try {
      // 这里简化实现，实际应用中需要HTTP客户端
      console.log(`模拟发送 ${entries.length} 条日志到 ${this.config.remoteEndpoint}`);
    } catch (error) {
      console.error('远程日志发送失败:', error);
      // 将失败的条目放回缓冲区
      this.buffer.unshift(...entries);
    }
  }

  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, this.config.flushInterval);
  }
}

/**
 * 主日志记录器类
 */
class Logger {
  private config: LoggerConfig;
  private transports: LogTransport[] = [];
  private sessionId: string;
  private errorTracker: ErrorTracker;
  private performanceMonitor: PerformanceMonitor;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: true,
      enableRemote: false,
      logDirectory: path.join(os.homedir(), '.claude-code-cli', 'logs'),
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      dateFormat: 'YYYY-MM-DD HH:mm:ss',
      includeStackTrace: true,
      includeSystemInfo: true,
      bufferSize: 100,
      flushInterval: 5000,
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.errorTracker = new ErrorTracker(this);
    this.performanceMonitor = new PerformanceMonitor(this);

    this.initializeTransports();
  }

  /**
   * 初始化传输层
   */
  private initializeTransports(): void {
    if (this.config.enableConsole) {
      this.transports.push(new ConsoleTransport());
    }

    if (this.config.enableFile) {
      this.transports.push(new FileTransport(this.config));
    }

    if (this.config.enableRemote && this.config.remoteEndpoint) {
      const remoteTransport = new RemoteTransport(this.config);
      remoteTransport.enabled = true;
      this.transports.push(remoteTransport);
    }
  }

  /**
   * 记录跟踪级别日志
   */
  trace(message: string, category?: string, data?: any): void {
    this.log(LogLevel.TRACE, message, category, data);
  }

  /**
   * 记录调试级别日志
   */
  debug(message: string, category?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, category, data);
  }

  /**
   * 记录信息级别日志
   */
  info(message: string, category?: string, data?: any): void {
    this.log(LogLevel.INFO, message, category, data);
  }

  /**
   * 记录警告级别日志
   */
  warn(message: string, category?: string, data?: any): void {
    this.log(LogLevel.WARN, message, category, data);
  }

  /**
   * 记录错误级别日志
   */
  error(message: string, error?: Error, category?: string, data?: any): void {
    this.log(LogLevel.ERROR, message, category, data, error);
  }

  /**
   * 记录致命错误级别日志
   */
  fatal(message: string, error?: Error, category?: string, data?: any): void {
    this.log(LogLevel.FATAL, message, category, data, error);
  }

  /**
   * 通用日志记录方法
   */
  private async log(level: LogLevel, message: string, category?: string, data?: any, error?: Error): Promise<void> {
    if (level < this.config.level) return;

    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      message,
      category: category || 'app',
      data,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: (error as any).cause
      } : undefined,
      context: {
        pid: process.pid,
        platform: os.platform(),
        hostname: os.hostname(),
        sessionId: this.sessionId
      },
      performance: this.config.includeSystemInfo ? {
        memory: process.memoryUsage(),
        uptime: process.uptime()
      } : undefined
    };

    // 写入到所有传输层
    await Promise.all(
      this.transports
        .filter(transport => transport.enabled)
        .map(transport => transport.write(entry).catch(console.error))
    );

    // 错误追踪
    if (error && level >= LogLevel.ERROR) {
      this.errorTracker.track(error, {
        severity: level === LogLevel.FATAL ? 'critical' : 'high',
        category: category || 'app',
        context: { message, data }
      });
    }
  }

  /**
   * 性能计时开始
   */
  startTiming(name: string, tags?: Record<string, string>): PerformanceTimer {
    return this.performanceMonitor.startTiming(name, tags);
  }

  /**
   * 记录性能指标
   */
  metric(name: string, value: number, unit: string, tags?: Record<string, string>): void {
    this.performanceMonitor.recordMetric(name, value, unit, tags);
  }

  /**
   * 创建子日志记录器
   */
  child(category: string, additionalContext?: Record<string, any>): Logger {
    const child = new Logger(this.config);
    child.sessionId = this.sessionId;

    // 重写log方法以包含额外上下文
    const originalLog = child.log.bind(child);
    child.log = (level: LogLevel, message: string, cat?: string, data?: any, error?: Error) => {
      const combinedData = additionalContext ? { ...additionalContext, ...data } : data;
      return originalLog(level, message, cat || category, combinedData, error);
    };

    return child;
  }

  /**
   * 刷新所有缓冲区
   */
  async flush(): Promise<void> {
    await Promise.all(
      this.transports
        .filter(transport => transport.flush)
        .map(transport => transport.flush!().catch(console.error))
    );
  }

  /**
   * 关闭日志记录器
   */
  async close(): Promise<void> {
    await this.flush();

    await Promise.all(
      this.transports
        .filter(transport => transport.close)
        .map(transport => transport.close!().catch(console.error))
    );
  }

  /**
   * 获取错误追踪器
   */
  getErrorTracker(): ErrorTracker {
    return this.errorTracker;
  }

  /**
   * 获取性能监控器
   */
  getPerformanceMonitor(): PerformanceMonitor {
    return this.performanceMonitor;
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return IdGenerator.generateSessionId();
  }

  /**
   * 生成日志ID
   */
  private generateLogId(): string {
    return IdGenerator.generateLogId();
  }
}

/**
 * 错误追踪器类
 */
class ErrorTracker {
  private logger: Logger;
  private errors: ErrorTrackingEntry[] = [];
  private maxErrors = 1000;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 追踪错误
   */
  track(error: Error, context?: {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    category?: string;
    context?: Record<string, any>;
    userInfo?: any;
    recovery?: any;
  }): string {
    const entry: ErrorTrackingEntry = {
      id: this.generateErrorId(),
      timestamp: new Date(),
      error,
      severity: context?.severity || 'medium',
      category: context?.category || 'unknown',
      context: context?.context || {},
      stackTrace: error.stack || '',
      systemInfo: {
        platform: os.platform(),
        nodeVersion: process.version,
        arch: process.arch,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      },
      userInfo: context?.userInfo,
      recovery: context?.recovery
    };

    this.errors.push(entry);

    // 保持错误数量在限制内
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    return entry.id;
  }

  /**
   * 获取错误统计
   */
  getStats(): {
    total: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    recent: ErrorTrackingEntry[];
  } {
    const bySeverity: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const error of this.errors) {
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
      byCategory[error.category] = (byCategory[error.category] || 0) + 1;
    }

    const recent = this.errors
      .slice(-10)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      total: this.errors.length,
      bySeverity,
      byCategory,
      recent
    };
  }

  /**
   * 清除错误记录
   */
  clear(): void {
    this.errors = [];
  }

  private generateErrorId(): string {
    return IdGenerator.generateErrorId();
  }
}

/**
 * 性能监控器类
 */
class PerformanceMonitor {
  private logger: Logger;
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, { start: number; name: string; tags?: Record<string, string> }> = new Map();
  private maxMetrics = 10000;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 开始计时
   */
  startTiming(name: string, tags?: Record<string, string>): PerformanceTimer {
    const id = this.generateTimerId();
    const start = performance.now();

    this.timers.set(id, { start, name, tags });

    return new PerformanceTimer(id, this);
  }

  /**
   * 结束计时
   */
  endTiming(timerId: string): number | null {
    const timer = this.timers.get(timerId);
    if (!timer) return null;

    const duration = performance.now() - timer.start;
    this.timers.delete(timerId);

    this.recordMetric(timer.name, duration, 'ms', timer.tags);

    return duration;
  }

  /**
   * 记录性能指标
   */
  recordMetric(name: string, value: number, unit: string, tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      id: this.generateMetricId(),
      timestamp: new Date(),
      name,
      value,
      unit,
      tags: tags || {}
    };

    this.metrics.push(metric);

    // 保持指标数量在限制内
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * 获取性能统计
   */
  getStats(name?: string): {
    total: number;
    metrics: PerformanceMetric[];
    summary?: {
      min: number;
      max: number;
      avg: number;
      count: number;
    };
  } {
    let filteredMetrics = this.metrics;

    if (name) {
      filteredMetrics = this.metrics.filter(m => m.name === name);
    }

    let summary;
    if (filteredMetrics.length > 0) {
      const values = filteredMetrics.map(m => m.value);
      summary = {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        count: values.length
      };
    }

    return {
      total: filteredMetrics.length,
      metrics: filteredMetrics.slice(-100), // 最近100个指标
      summary
    };
  }

  /**
   * 清除性能指标
   */
  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }

  private generateTimerId(): string {
    return IdGenerator.generatePrefixedId('timer');
  }

  private generateMetricId(): string {
    return IdGenerator.generatePrefixedId('metric');
  }
}

/**
 * 性能计时器类
 */
class PerformanceTimer {
  private id: string;
  private monitor: PerformanceMonitor;

  constructor(id: string, monitor: PerformanceMonitor) {
    this.id = id;
    this.monitor = monitor;
  }

  /**
   * 结束计时
   */
  end(): number | null {
    return this.monitor.endTiming(this.id);
  }
}

/**
 * 全局日志记录器实例
 */
export const logger = new Logger();

/**
 * 导出类型定义
 */
export type { LoggerConfig, LogEntry, ErrorTrackingEntry, PerformanceMetric };

/**
 * 导出枚举和类
 */
export { LogLevel, Logger, ErrorTracker, PerformanceMonitor, PerformanceTimer };