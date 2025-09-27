/**
 * T018: 日志系统
 * 支持多级别日志、文件输出、敏感信息过滤和异步批量处理
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LoggingConfig } from '../types/config';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * 日志记录接口
 */
interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
}

/**
 * 敏感信息关键词
 */
const SENSITIVE_KEYS = [
  'password', 'passwd', 'secret', 'token', 'key', 'apikey', 'api_key',
  'auth', 'authorization', 'credential', 'private', 'sensitive'
];

/**
 * 日志系统实现类
 */
export class Logger {
  private config: LoggingConfig;
  private logBuffer: LogEntry[] = [];
  private bufferTimer?: NodeJS.Timeout;
  private readonly maxBufferSize = 100;
  private readonly flushInterval = 1000; // 1秒

  constructor(config?: Partial<LoggingConfig>) {
    this.config = {
      level: 'info',
      console: true,
      file: true,
      filePath: path.join(os.homedir(), '.claude-installer', 'logs', 'installer.log'),
      maxFileSize: 10,
      maxFiles: 5,
      includeSensitive: false,
      ...config
    };

    this.ensureLogDirectory();
    this.startBufferTimer();
  }

  /**
   * 设置日志级别
   */
  setLevel(level: string): void {
    this.config.level = level as any;
  }

  /**
   * Debug级别日志
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Info级别日志
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Warn级别日志
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Error级别日志
   */
  error(message: string, error?: Error | Record<string, any>): void {
    if (error instanceof Error) {
      this.log(LogLevel.ERROR, message, undefined, error);
    } else {
      this.log(LogLevel.ERROR, message, error);
    }
  }

  /**
   * 统一日志记录方法
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    const configLevel = this.getLogLevel(this.config.level);
    if (level < configLevel) {
      return; // 级别过低，不记录
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: context ? this.sanitizeContext(context) : undefined,
      error
    };

    // 添加到缓冲区
    this.logBuffer.push(entry);

    // 控制台输出
    if (this.config.console) {
      this.logToConsole(entry);
    }

    // 如果缓冲区满了，立即刷新
    if (this.logBuffer.length >= this.maxBufferSize) {
      this.flushBuffer();
    }
  }

  /**
   * 输出到控制台
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelStr = this.getLevelString(entry.level);
    const logMessage = `${timestamp} [${levelStr}] ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, entry.context || '', entry.error || '');
        break;
      case LogLevel.INFO:
        console.log(logMessage, entry.context || '', entry.error || '');
        break;
      case LogLevel.WARN:
        console.warn(logMessage, entry.context || '', entry.error || '');
        break;
      case LogLevel.ERROR:
        console.error(logMessage, entry.context || '', entry.error || '');
        break;
    }
  }

  /**
   * 刷新缓冲区到文件
   */
  private flushBuffer(): void {
    if (!this.config.file || this.logBuffer.length === 0) {
      return;
    }

    try {
      const logLines = this.logBuffer.map(entry => this.formatLogEntry(entry));
      const logContent = logLines.join('\n') + '\n';

      // 检查文件大小并轮换
      this.rotateLogFile();

      // 异步写入文件
      fs.appendFileSync(this.config.filePath, logContent, 'utf8');

      // 清空缓冲区
      this.logBuffer = [];
    } catch (error) {
      console.error('日志写入失败:', error);
    }
  }

  /**
   * 格式化日志条目
   */
  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = this.getLevelString(entry.level);
    const context = entry.context ? JSON.stringify(entry.context) : '';
    const error = entry.error ? `\n${entry.error.stack || entry.error.message}` : '';
    
    return `${timestamp}\t[${level}]\t${entry.message}\t${context}${error}`;
  }

  /**
   * 日志文件轮换
   */
  private rotateLogFile(): void {
    if (!fs.existsSync(this.config.filePath)) {
      return;
    }

    try {
      const stats = fs.statSync(this.config.filePath);
      const fileSizeMB = stats.size / (1024 * 1024);

      if (fileSizeMB > this.config.maxFileSize) {
        const logDir = path.dirname(this.config.filePath);
        const baseName = path.basename(this.config.filePath, '.log');
        const currentDate = new Date().toISOString().split('T')[0];
        const rotatedFile = path.join(logDir, `${baseName}-${currentDate}.log`);

        // 重命名当前文件
        fs.renameSync(this.config.filePath, rotatedFile);

        // 清理旧文件
        this.cleanupOldLogFiles(logDir, baseName);
      }
    } catch (error) {
      console.warn('日志文件轮换失败:', error);
    }
  }

  /**
   * 清理旧日志文件
   */
  private cleanupOldLogFiles(logDir: string, baseName: string): void {
    try {
      const files = fs.readdirSync(logDir)
        .filter(file => file.startsWith(baseName) && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(logDir, file),
          stat: fs.statSync(path.join(logDir, file))
        }))
        .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime());

      // 保留最新的 maxFiles 个文件
      const filesToDelete = files.slice(this.config.maxFiles);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
      });
    } catch (error) {
      console.warn('清理旧日志文件失败:', error);
    }
  }

  /**
   * 过滤敏感信息
   */
  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    if (this.config.includeSensitive) {
      return context;
    }

    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(context)) {
      const keyLower = key.toLowerCase();
      const isSensitive = SENSITIVE_KEYS.some(sensitiveKey => 
        keyLower.includes(sensitiveKey)
      );

      if (isSensitive) {
        if (typeof value === 'string' && value.length > 3) {
          sanitized[key] = `${value.substring(0, 3)}***`;
        } else {
          sanitized[key] = '***';
        }
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeContext(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * 获取日志级别枚举值
   */
  private getLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      default: return LogLevel.INFO;
    }
  }

  /**
   * 获取日志级别字符串
   */
  private getLevelString(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return 'DEBUG';
      case LogLevel.INFO: return 'INFO';
      case LogLevel.WARN: return 'WARN';
      case LogLevel.ERROR: return 'ERROR';
      default: return 'INFO';
    }
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDirectory(): void {
    const logDir = path.dirname(this.config.filePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * 启动缓冲区定时器
   */
  private startBufferTimer(): void {
    this.bufferTimer = setInterval(() => {
      this.flushBuffer();
    }, this.flushInterval);
  }

  /**
   * 停止缓冲区定时器
   */
  private stopBufferTimer(): void {
    if (this.bufferTimer) {
      clearInterval(this.bufferTimer);
      this.bufferTimer = undefined;
    }
  }

  /**
   * 销毁日志器
   */
  destroy(): void {
    this.flushBuffer(); // 最后一次刷新
    this.stopBufferTimer();
  }
}

// 导出全局日志器实例
export const logger = new Logger();

// 导出快捷方法
export const log = {
  debug: (message: string, context?: Record<string, any>) => logger.debug(message, context),
  info: (message: string, context?: Record<string, any>) => logger.info(message, context),
  warn: (message: string, context?: Record<string, any>) => logger.warn(message, context),
  error: (message: string, error?: Error | Record<string, any>) => logger.error(message, error)
};
