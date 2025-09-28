/**
 * 通用工具函数集合
 * 提供ID生成、时间格式化、数据验证等常用功能，消除项目中的代码重复
 */

import * as crypto from 'crypto';

/**
 * ID生成选项接口
 */
interface IdGenerationOptions {
  prefix?: string;
  suffix?: string;
  length?: number;
  includeTimestamp?: boolean;
  charset?: string;
}

/**
 * 格式化选项接口
 */
interface FormatOptions {
  locale?: string;
  timezone?: string;
  precision?: number;
}

/**
 * 验证规则接口
 */
interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

/**
 * ID生成工具类
 */
class IdGenerator {
  private static defaultCharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  /**
   * 生成UUID v4
   */
  static generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * 生成短ID
   */
  static generateShortId(options: IdGenerationOptions = {}): string {
    const {
      prefix = '',
      suffix = '',
      length = 9,
      includeTimestamp = true,
      charset = this.defaultCharset
    } = options;

    let id = '';

    // 添加时间戳部分
    if (includeTimestamp) {
      id += Date.now().toString(36);
    }

    // 添加随机部分
    const randomBytes = crypto.randomBytes(Math.ceil(length / 2));
    let randomPart = '';

    for (let i = 0; i < length; i++) {
      randomPart += charset[randomBytes[i % randomBytes.length] % charset.length];
    }

    id += '_' + randomPart;

    return prefix + id + suffix;
  }

  /**
   * 生成带前缀的ID
   */
  static generatePrefixedId(prefix: string, length: number = 9): string {
    return this.generateShortId({ prefix: `${prefix}_`, length, includeTimestamp: true });
  }

  /**
   * 生成数字ID
   */
  static generateNumericId(length: number = 10): string {
    const digits = '0123456789';
    let id = '';
    const randomBytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
      id += digits[randomBytes[i] % digits.length];
    }

    return id;
  }

  /**
   * 生成会话ID
   */
  static generateSessionId(): string {
    return this.generatePrefixedId('session', 12);
  }

  /**
   * 生成请求ID
   */
  static generateRequestId(): string {
    return this.generatePrefixedId('req', 8);
  }

  /**
   * 生成错误ID
   */
  static generateErrorId(): string {
    return this.generatePrefixedId('error', 10);
  }

  /**
   * 生成日志ID
   */
  static generateLogId(): string {
    return this.generatePrefixedId('log', 8);
  }

  /**
   * 生成任务ID
   */
  static generateTaskId(): string {
    return this.generatePrefixedId('task', 10);
  }

  /**
   * 验证ID格式
   */
  static validateId(id: string, expectedPrefix?: string): boolean {
    if (!id || typeof id !== 'string') return false;

    if (expectedPrefix && !id.startsWith(expectedPrefix)) return false;

    // 基本格式验证：应包含字母数字和下划线
    const idPattern = /^[a-zA-Z0-9_-]+$/;
    return idPattern.test(id);
  }
}

/**
 * 时间格式化工具类
 */
class TimeFormatter {
  /**
   * 格式化时间戳为可读字符串
   */
  static formatTimestamp(timestamp: Date | number, options: FormatOptions = {}): string {
    const {
      locale = 'zh-CN',
      timezone = undefined
    } = options;

    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

    return date.toLocaleString(locale, {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * 格式化持续时间
   */
  static formatDuration(milliseconds: number, options: FormatOptions = {}): string {
    const { precision = 2 } = options;

    if (milliseconds < 1000) {
      return `${milliseconds.toFixed(precision)}ms`;
    }

    const seconds = milliseconds / 1000;
    if (seconds < 60) {
      return `${seconds.toFixed(precision)}s`;
    }

    const minutes = seconds / 60;
    if (minutes < 60) {
      const remainingSeconds = seconds % 60;
      return `${Math.floor(minutes)}m ${remainingSeconds.toFixed(0)}s`;
    }

    const hours = minutes / 60;
    if (hours < 24) {
      const remainingMinutes = minutes % 60;
      return `${Math.floor(hours)}h ${remainingMinutes.toFixed(0)}m`;
    }

    const days = hours / 24;
    const remainingHours = hours % 24;
    return `${Math.floor(days)}d ${remainingHours.toFixed(0)}h`;
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number, options: FormatOptions = {}): string {
    const { precision = 2 } = options;

    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const base = 1024;
    const unitIndex = Math.floor(Math.log(bytes) / Math.log(base));
    const size = bytes / Math.pow(base, unitIndex);

    return `${size.toFixed(precision)} ${units[unitIndex]}`;
  }

  /**
   * 计算相对时间
   */
  static getRelativeTime(timestamp: Date | number, options: FormatOptions = {}): string {
    const { locale = 'zh-CN' } = options;
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    // 使用Intl.RelativeTimeFormat进行本地化
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (diffMs < 60000) { // 1分钟内
      return rtf.format(-Math.floor(diffMs / 1000), 'second');
    }

    if (diffMs < 3600000) { // 1小时内
      return rtf.format(-Math.floor(diffMs / 60000), 'minute');
    }

    if (diffMs < 86400000) { // 1天内
      return rtf.format(-Math.floor(diffMs / 3600000), 'hour');
    }

    if (diffMs < 2592000000) { // 30天内
      return rtf.format(-Math.floor(diffMs / 86400000), 'day');
    }

    return date.toLocaleDateString(locale);
  }
}

/**
 * 数据验证工具类
 */
class DataValidator {
  /**
   * 验证字符串
   */
  static validateString(value: any, rules: ValidationRule = {}): { valid: boolean; error?: string } {
    const { required = false, minLength, maxLength, pattern, custom } = rules;

    if (required && (value === undefined || value === null || value === '')) {
      return { valid: false, error: '字段为必填项' };
    }

    if (value !== undefined && value !== null && value !== '') {
      if (typeof value !== 'string') {
        return { valid: false, error: '字段必须是字符串类型' };
      }

      if (minLength !== undefined && value.length < minLength) {
        return { valid: false, error: `字段长度不能少于 ${minLength} 个字符` };
      }

      if (maxLength !== undefined && value.length > maxLength) {
        return { valid: false, error: `字段长度不能超过 ${maxLength} 个字符` };
      }

      if (pattern && !pattern.test(value)) {
        return { valid: false, error: '字段格式不符合要求' };
      }

      if (custom) {
        const customResult = custom(value);
        if (customResult !== true) {
          return { valid: false, error: typeof customResult === 'string' ? customResult : '自定义验证失败' };
        }
      }
    }

    return { valid: true };
  }

  /**
   * 验证邮箱地址
   */
  static validateEmail(email: string): { valid: boolean; error?: string } {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return this.validateString(email, {
      required: true,
      pattern: emailPattern,
      custom: (value) => emailPattern.test(value) || '邮箱格式不正确'
    });
  }

  /**
   * 验证URL
   */
  static validateUrl(url: string): { valid: boolean; error?: string } {
    try {
      new URL(url);
      return { valid: true };
    } catch {
      return { valid: false, error: 'URL格式不正确' };
    }
  }

  /**
   * 验证端口号
   */
  static validatePort(port: number): { valid: boolean; error?: string } {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return { valid: false, error: '端口号必须是1-65535之间的整数' };
    }
    return { valid: true };
  }

  /**
   * 验证IP地址
   */
  static validateIpAddress(ip: string): { valid: boolean; error?: string } {
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    if (!ipv4Pattern.test(ip) && !ipv6Pattern.test(ip)) {
      return { valid: false, error: 'IP地址格式不正确' };
    }

    // 进一步验证IPv4范围
    if (ipv4Pattern.test(ip)) {
      const parts = ip.split('.').map(Number);
      for (const part of parts) {
        if (part > 255) {
          return { valid: false, error: 'IPv4地址超出范围' };
        }
      }
    }

    return { valid: true };
  }

  /**
   * 验证对象结构
   */
  static validateObject(obj: any, schema: Record<string, ValidationRule>): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    for (const [key, rules] of Object.entries(schema)) {
      const value = obj?.[key];
      const result = this.validateString(value, rules);

      if (!result.valid && result.error) {
        errors[key] = result.error;
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
}

/**
 * 对象操作工具类
 */
class ObjectUtils {
  /**
   * 深度克隆对象
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as any;
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item)) as any;
    }

    if (typeof obj === 'object') {
      const clonedObj = {} as any;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }

    return obj;
  }

  /**
   * 深度合并对象
   */
  static deepMerge<T>(...objects: Partial<T>[]): T {
    const result = {} as T;

    for (const obj of objects) {
      if (!obj) continue;

      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];

          if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            result[key] = this.deepMerge(result[key] as any, value);
          } else {
            result[key] = value as any;
          }
        }
      }
    }

    return result;
  }

  /**
   * 获取嵌套属性值
   */
  static getNestedValue(obj: any, path: string, defaultValue?: any): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        return defaultValue;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * 设置嵌套属性值
   */
  static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * 从对象中选择指定属性
   */
  static pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    for (const key of keys) {
      if (key in obj) {
        result[key] = obj[key];
      }
    }
    return result;
  }

  /**
   * 从对象中排除指定属性
   */
  static omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj } as any;
    for (const key of keys) {
      delete result[key];
    }
    return result;
  }

  /**
   * 检查对象是否为空
   */
  static isEmpty(obj: any): boolean {
    if (obj === null || obj === undefined) return true;
    if (typeof obj === 'string' || Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  }
}

/**
 * 数组操作工具类
 */
class ArrayUtils {
  /**
   * 数组去重
   */
  static unique<T>(array: T[], keyFn?: (item: T) => any): T[] {
    if (!keyFn) {
      return [...new Set(array)];
    }

    const seen = new Set();
    return array.filter(item => {
      const key = keyFn(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 数组分组
   */
  static groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  /**
   * 数组分块
   */
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 数组交集
   */
  static intersection<T>(...arrays: T[][]): T[] {
    if (arrays.length === 0) return [];
    if (arrays.length === 1) return arrays[0];

    return arrays.reduce((acc, array) =>
      acc.filter(item => array.includes(item))
    );
  }

  /**
   * 数组差集
   */
  static difference<T>(array1: T[], array2: T[]): T[] {
    return array1.filter(item => !array2.includes(item));
  }

  /**
   * 随机打乱数组
   */
  static shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

/**
 * 异步操作工具类
 */
class AsyncUtils {
  /**
   * 延迟执行
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 超时控制
   */
  static timeout<T>(promise: Promise<T>, ms: number, errorMessage = '操作超时'): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), ms)
      )
    ]);
  }

  /**
   * 重试机制
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000,
    backoff: boolean = true
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxAttempts) {
          throw lastError;
        }

        const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  /**
   * 并发控制
   */
  static async concurrent<T>(
    tasks: (() => Promise<T>)[],
    concurrency: number = 3
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<any>[] = [];

    for (const task of tasks) {
      const promise = task().then(result => {
        results.push(result);
        executing.splice(executing.indexOf(promise), 1);
        return result;
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results;
  }
}

/**
 * 错误处理工具类
 */
class ErrorUtils {
  /**
   * 安全地执行可能出错的函数
   */
  static safeExecute<T>(fn: () => T, defaultValue: T): T {
    try {
      return fn();
    } catch {
      return defaultValue;
    }
  }

  /**
   * 安全地执行异步函数
   */
  static async safeExecuteAsync<T>(fn: () => Promise<T>, defaultValue: T): Promise<T> {
    try {
      return await fn();
    } catch {
      return defaultValue;
    }
  }

  /**
   * 创建标准化错误对象
   */
  static createError(message: string, code?: string, cause?: Error): Error {
    const error = new Error(message);
    if (code) {
      (error as any).code = code;
    }
    if (cause) {
      (error as any).cause = cause;
    }
    return error;
  }

  /**
   * 检查是否为特定类型的错误
   */
  static isErrorType(error: unknown, type: string): boolean {
    return error instanceof Error && (error.name === type || (error as any).code === type);
  }
}

// 导出所有工具类
export {
  IdGenerator,
  TimeFormatter,
  DataValidator,
  ObjectUtils,
  ArrayUtils,
  AsyncUtils,
  ErrorUtils
};

// 导出类型定义
export type {
  IdGenerationOptions,
  FormatOptions,
  ValidationRule
};