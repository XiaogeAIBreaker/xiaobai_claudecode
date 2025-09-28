/**
 * 加密存储和安全处理工具
 * 提供数据加密、安全存储、密钥管理和安全工具函数
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { fileSystem } from './file-system';
import { logger } from './logger';
import { IdGenerator } from './common';

/**
 * 加密配置接口
 */
interface EncryptionConfig {
  algorithm: string;
  keyDerivation: 'pbkdf2' | 'scrypt' | 'argon2';
  keyLength: number;
  ivLength: number;
  saltLength: number;
  iterations: number;
  memoryLimit?: number;
  parallelism?: number;
  tagLength?: number;
}

/**
 * 安全存储配置接口
 */
interface SecureStorageConfig {
  encryption: EncryptionConfig;
  keyStorage: 'memory' | 'file' | 'keychain' | 'registry';
  autoLock: boolean;
  lockTimeout: number;
  backupEnabled: boolean;
  integrityCheck: boolean;
}

/**
 * 加密数据接口
 */
interface EncryptedData {
  data: string;
  iv: string;
  salt: string;
  tag?: string;
  algorithm: string;
  keyDerivation: string;
  iterations: number;
  timestamp: number;
}

/**
 * 密钥信息接口
 */
interface KeyInfo {
  id: string;
  algorithm: string;
  keyLength: number;
  created: Date;
  lastUsed: Date;
  usage: number;
  purpose: string[];
}

/**
 * 安全审计日志接口
 */
interface SecurityAuditLog {
  id: string;
  timestamp: Date;
  action: string;
  result: 'success' | 'failure';
  details: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  userAgent?: string;
  ipAddress?: string;
}

/**
 * 加密工具类
 */
class CryptographyUtils {
  private config: EncryptionConfig;

  constructor(config?: Partial<EncryptionConfig>) {
    this.config = {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'pbkdf2',
      keyLength: 32,
      ivLength: 16,
      saltLength: 32,
      iterations: 100000,
      tagLength: 16,
      ...config
    };
  }

  /**
   * 生成随机字节
   */
  generateRandomBytes(length: number): Buffer {
    return crypto.randomBytes(length);
  }

  /**
   * 生成安全随机字符串
   */
  generateRandomString(length: number, charset?: string): string {
    const defaultCharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const chars = charset || defaultCharset;
    const randomBytes = this.generateRandomBytes(length);

    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[randomBytes[i] % chars.length];
    }

    return result;
  }

  /**
   * 生成UUID
   */
  generateUUID(): string {
    return IdGenerator.generateUUID();
  }

  /**
   * 从密码派生密钥
   */
  async deriveKey(password: string, salt?: Buffer): Promise<{ key: Buffer; salt: Buffer }> {
    const actualSalt = salt || this.generateRandomBytes(this.config.saltLength);

    let key: Buffer;

    switch (this.config.keyDerivation) {
      case 'pbkdf2':
        key = await new Promise<Buffer>((resolve, reject) => {
          crypto.pbkdf2(password, actualSalt, this.config.iterations, this.config.keyLength, 'sha256', (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey);
          });
        });
        break;

      case 'scrypt':
        key = await new Promise<Buffer>((resolve, reject) => {
          const options = {
            cost: 16384,
            blockSize: 8,
            parallelization: 1,
            maxmem: this.config.memoryLimit || 128 * 1024 * 1024
          };

          crypto.scrypt(password, actualSalt, this.config.keyLength, options, (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey);
          });
        });
        break;

      default:
        throw new Error(`不支持的密钥派生算法: ${this.config.keyDerivation}`);
    }

    return { key, salt: actualSalt };
  }

  /**
   * 加密数据
   */
  async encrypt(data: string, password: string): Promise<EncryptedData> {
    try {
      const { key, salt } = await this.deriveKey(password);
      const iv = this.generateRandomBytes(this.config.ivLength);

      const cipher = crypto.createCipher(this.config.algorithm, key);
      if (this.config.algorithm.includes('gcm')) {
        (cipher as any).setAAD(salt);
      }

      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      const result: EncryptedData = {
        data: encrypted,
        iv: iv.toString('base64'),
        salt: salt.toString('base64'),
        algorithm: this.config.algorithm,
        keyDerivation: this.config.keyDerivation,
        iterations: this.config.iterations,
        timestamp: Date.now()
      };

      // 添加认证标签（如果支持）
      if (this.config.algorithm.includes('gcm')) {
        const tag = (cipher as any).getAuthTag();
        result.tag = tag.toString('base64');
      }

      return result;
    } catch (error) {
      logger.error('数据加密失败', error as Error, 'crypto');
      throw new Error(`加密失败: ${error}`);
    }
  }

  /**
   * 解密数据
   */
  async decrypt(encryptedData: EncryptedData, password: string): Promise<string> {
    try {
      const salt = Buffer.from(encryptedData.salt, 'base64');
      const { key } = await this.deriveKey(password, salt);

      const decipher = crypto.createDecipher(encryptedData.algorithm, key);

      // 设置认证标签（如果有）
      if (encryptedData.tag && encryptedData.algorithm.includes('gcm')) {
        const tag = Buffer.from(encryptedData.tag, 'base64');
        (decipher as any).setAuthTag(tag);
        (decipher as any).setAAD(salt);
      }

      let decrypted = decipher.update(encryptedData.data, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('数据解密失败', error as Error, 'crypto');
      throw new Error(`解密失败: ${error}`);
    }
  }

  /**
   * 计算数据哈希
   */
  hash(data: string | Buffer, algorithm = 'sha256'): string {
    const hash = crypto.createHash(algorithm);
    hash.update(data);
    return hash.digest('hex');
  }

  /**
   * 验证数据完整性
   */
  verifyIntegrity(data: string | Buffer, expectedHash: string, algorithm = 'sha256'): boolean {
    const actualHash = this.hash(data, algorithm);
    return crypto.timingSafeEqual(Buffer.from(actualHash), Buffer.from(expectedHash));
  }

  /**
   * 生成HMAC
   */
  generateHMAC(data: string | Buffer, secret: string, algorithm = 'sha256'): string {
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(data);
    return hmac.digest('hex');
  }

  /**
   * 验证HMAC
   */
  verifyHMAC(data: string | Buffer, secret: string, expectedHmac: string, algorithm = 'sha256'): boolean {
    const actualHmac = this.generateHMAC(data, secret, algorithm);
    return crypto.timingSafeEqual(Buffer.from(actualHmac), Buffer.from(expectedHmac));
  }
}

/**
 * 密钥管理器类
 */
class KeyManager {
  private keys: Map<string, KeyInfo> = new Map();
  private masterKey: Buffer | null = null;
  private cryptoUtils: CryptographyUtils;
  private keyDirectory: string;

  constructor(keyDirectory?: string) {
    this.cryptoUtils = new CryptographyUtils();
    this.keyDirectory = keyDirectory || path.join(os.homedir(), '.claude-code-cli', 'keys');
  }

  /**
   * 初始化密钥管理器
   */
  async initialize(masterPassword?: string): Promise<void> {
    await fileSystem.ensureDirectory(this.keyDirectory);

    if (masterPassword) {
      const { key } = await this.cryptoUtils.deriveKey(masterPassword);
      this.masterKey = key;
    }

    await this.loadKeys();
    logger.info('密钥管理器初始化完成', 'keymanager');
  }

  /**
   * 生成新密钥
   */
  async generateKey(purpose: string[], keyLength = 32): Promise<string> {
    const keyId = this.cryptoUtils.generateUUID();
    const keyData = this.cryptoUtils.generateRandomBytes(keyLength);

    const keyInfo: KeyInfo = {
      id: keyId,
      algorithm: 'aes-256',
      keyLength,
      created: new Date(),
      lastUsed: new Date(),
      usage: 0,
      purpose
    };

    this.keys.set(keyId, keyInfo);

    // 保存密钥到安全存储
    await this.saveKey(keyId, keyData);

    logger.info(`生成新密钥: ${keyId}`, 'keymanager', { purpose, keyLength });

    return keyId;
  }

  /**
   * 获取密钥
   */
  async getKey(keyId: string): Promise<Buffer | null> {
    const keyInfo = this.keys.get(keyId);
    if (!keyInfo) {
      logger.warn(`密钥不存在: ${keyId}`, 'keymanager');
      return null;
    }

    try {
      const keyData = await this.loadKey(keyId);

      // 更新使用信息
      keyInfo.lastUsed = new Date();
      keyInfo.usage++;

      return keyData;
    } catch (error) {
      logger.error(`获取密钥失败: ${keyId}`, error as Error, 'keymanager');
      return null;
    }
  }

  /**
   * 删除密钥
   */
  async deleteKey(keyId: string): Promise<boolean> {
    try {
      const keyPath = path.join(this.keyDirectory, `${keyId}.key`);

      if (await fileSystem.exists(keyPath)) {
        await fileSystem.deleteFile(keyPath, { backup: true });
      }

      this.keys.delete(keyId);

      logger.info(`删除密钥: ${keyId}`, 'keymanager');
      return true;
    } catch (error) {
      logger.error(`删除密钥失败: ${keyId}`, error as Error, 'keymanager');
      return false;
    }
  }

  /**
   * 列出所有密钥
   */
  listKeys(): KeyInfo[] {
    return Array.from(this.keys.values());
  }

  /**
   * 轮换密钥
   */
  async rotateKey(keyId: string): Promise<string | null> {
    const keyInfo = this.keys.get(keyId);
    if (!keyInfo) {
      return null;
    }

    try {
      // 生成新密钥
      const newKeyId = await this.generateKey(keyInfo.purpose, keyInfo.keyLength);

      // 标记旧密钥为已轮换
      logger.info(`密钥轮换完成: ${keyId} -> ${newKeyId}`, 'keymanager');

      return newKeyId;
    } catch (error) {
      logger.error(`密钥轮换失败: ${keyId}`, error as Error, 'keymanager');
      return null;
    }
  }

  /**
   * 保存密钥到文件
   */
  private async saveKey(keyId: string, keyData: Buffer): Promise<void> {
    const keyPath = path.join(this.keyDirectory, `${keyId}.key`);

    let dataToSave: string;

    if (this.masterKey) {
      // 使用主密钥加密
      const encrypted = await this.cryptoUtils.encrypt(keyData.toString('base64'), this.masterKey.toString('base64'));
      dataToSave = JSON.stringify(encrypted);
    } else {
      // 明文存储（仅用于开发环境）
      dataToSave = keyData.toString('base64');
    }

    await fileSystem.writeFile(keyPath, dataToSave, { mode: 0o600 });
  }

  /**
   * 从文件加载密钥
   */
  private async loadKey(keyId: string): Promise<Buffer> {
    const keyPath = path.join(this.keyDirectory, `${keyId}.key`);

    if (!(await fileSystem.exists(keyPath))) {
      throw new Error(`密钥文件不存在: ${keyPath}`);
    }

    const content = await fileSystem.readFile(keyPath);

    if (this.masterKey) {
      // 解密密钥
      const encryptedData = JSON.parse(content) as EncryptedData;
      const decrypted = await this.cryptoUtils.decrypt(encryptedData, this.masterKey.toString('base64'));
      return Buffer.from(decrypted, 'base64');
    } else {
      // 明文读取
      return Buffer.from(content, 'base64');
    }
  }

  /**
   * 加载所有密钥信息
   */
  private async loadKeys(): Promise<void> {
    try {
      const keyFiles = await fileSystem.listDirectory(this.keyDirectory, {
        filter: (name) => name.endsWith('.key')
      });

      for (const keyFile of keyFiles) {
        const keyId = path.basename(keyFile, '.key');
        const infoPath = path.join(this.keyDirectory, `${keyId}.info`);

        if (await fileSystem.exists(infoPath)) {
          const infoContent = await fileSystem.readFile(infoPath);
          const keyInfo: KeyInfo = JSON.parse(infoContent);
          this.keys.set(keyId, keyInfo);
        }
      }
    } catch (error) {
      logger.warn('加载密钥信息失败', 'keymanager', error);
    }
  }
}

/**
 * 安全存储类
 */
class SecureStorage {
  private config: SecureStorageConfig;
  private cryptoUtils: CryptographyUtils;
  private keyManager: KeyManager;
  private storageKey: string | null = null;
  private locked = true;
  private lockTimer: NodeJS.Timeout | null = null;
  private auditLog: SecurityAuditLog[] = [];

  constructor(config?: Partial<SecureStorageConfig>) {
    this.config = {
      encryption: {
        algorithm: 'aes-256-gcm',
        keyDerivation: 'pbkdf2',
        keyLength: 32,
        ivLength: 16,
        saltLength: 32,
        iterations: 100000
      },
      keyStorage: 'file',
      autoLock: true,
      lockTimeout: 15 * 60 * 1000, // 15分钟
      backupEnabled: true,
      integrityCheck: true,
      ...config
    };

    this.cryptoUtils = new CryptographyUtils(this.config.encryption);
    this.keyManager = new KeyManager();
  }

  /**
   * 初始化安全存储
   */
  async initialize(masterPassword?: string): Promise<void> {
    await this.keyManager.initialize(masterPassword);

    // 生成或获取存储密钥
    const keys = this.keyManager.listKeys().filter(k => k.purpose.includes('storage'));
    if (keys.length === 0) {
      this.storageKey = await this.keyManager.generateKey(['storage']);
    } else {
      this.storageKey = keys[0].id;
    }

    if (masterPassword) {
      await this.unlock(masterPassword);
    }

    logger.info('安全存储初始化完成', 'secure-storage');
  }

  /**
   * 解锁存储
   */
  async unlock(password: string): Promise<boolean> {
    try {
      // 验证密码
      const testData = 'test';
      const encrypted = await this.cryptoUtils.encrypt(testData, password);
      const decrypted = await this.cryptoUtils.decrypt(encrypted, password);

      if (decrypted !== testData) {
        this.logSecurityEvent('unlock', 'failure', { reason: 'invalid_password' }, 'medium');
        return false;
      }

      this.locked = false;
      this.startAutoLockTimer();

      this.logSecurityEvent('unlock', 'success', {}, 'low');
      logger.info('安全存储已解锁', 'secure-storage');

      return true;
    } catch (error) {
      this.logSecurityEvent('unlock', 'failure', { error: (error as Error).message }, 'high');
      logger.error('解锁安全存储失败', error as Error, 'secure-storage');
      return false;
    }
  }

  /**
   * 锁定存储
   */
  lock(): void {
    this.locked = true;
    this.clearAutoLockTimer();

    this.logSecurityEvent('lock', 'success', {}, 'low');
    logger.info('安全存储已锁定', 'secure-storage');
  }

  /**
   * 安全存储数据
   */
  async store(key: string, data: any, password: string): Promise<boolean> {
    if (this.locked) {
      this.logSecurityEvent('store', 'failure', { key, reason: 'storage_locked' }, 'medium');
      throw new Error('存储已锁定');
    }

    try {
      const serializedData = JSON.stringify(data);
      const encrypted = await this.cryptoUtils.encrypt(serializedData, password);

      // 完整性检查
      if (this.config.integrityCheck) {
        encrypted.data = this.cryptoUtils.hash(encrypted.data);
      }

      const storageData = {
        encrypted,
        metadata: {
          created: new Date().toISOString(),
          size: serializedData.length,
          version: 1
        }
      };

      // 保存到文件或其他存储后端
      await this.saveToStorage(key, storageData);

      // 创建备份
      if (this.config.backupEnabled) {
        await this.createBackup(key, storageData);
      }

      this.logSecurityEvent('store', 'success', { key, size: serializedData.length }, 'low');
      this.resetAutoLockTimer();

      return true;
    } catch (error) {
      this.logSecurityEvent('store', 'failure', { key, error: (error as Error).message }, 'high');
      logger.error(`安全存储数据失败: ${key}`, error as Error, 'secure-storage');
      return false;
    }
  }

  /**
   * 安全检索数据
   */
  async retrieve(key: string, password: string): Promise<any> {
    if (this.locked) {
      this.logSecurityEvent('retrieve', 'failure', { key, reason: 'storage_locked' }, 'medium');
      throw new Error('存储已锁定');
    }

    try {
      const storageData = await this.loadFromStorage(key);
      if (!storageData) {
        this.logSecurityEvent('retrieve', 'failure', { key, reason: 'not_found' }, 'low');
        return null;
      }

      // 完整性检查
      if (this.config.integrityCheck && storageData.encrypted.data) {
        const expectedHash = storageData.encrypted.data;
        const actualHash = this.cryptoUtils.hash(storageData.encrypted.data);

        if (!this.cryptoUtils.verifyIntegrity(storageData.encrypted.data, expectedHash)) {
          this.logSecurityEvent('retrieve', 'failure', { key, reason: 'integrity_check_failed' }, 'critical');
          throw new Error('数据完整性验证失败');
        }
      }

      const decrypted = await this.cryptoUtils.decrypt(storageData.encrypted, password);
      const data = JSON.parse(decrypted);

      this.logSecurityEvent('retrieve', 'success', { key }, 'low');
      this.resetAutoLockTimer();

      return data;
    } catch (error) {
      this.logSecurityEvent('retrieve', 'failure', { key, error: (error as Error).message }, 'high');
      logger.error(`安全检索数据失败: ${key}`, error as Error, 'secure-storage');
      throw error;
    }
  }

  /**
   * 删除安全数据
   */
  async delete(key: string): Promise<boolean> {
    if (this.locked) {
      this.logSecurityEvent('delete', 'failure', { key, reason: 'storage_locked' }, 'medium');
      throw new Error('存储已锁定');
    }

    try {
      await this.removeFromStorage(key);

      this.logSecurityEvent('delete', 'success', { key }, 'low');
      this.resetAutoLockTimer();

      return true;
    } catch (error) {
      this.logSecurityEvent('delete', 'failure', { key, error: (error as Error).message }, 'medium');
      logger.error(`删除安全数据失败: ${key}`, error as Error, 'secure-storage');
      return false;
    }
  }

  /**
   * 获取安全审计日志
   */
  getAuditLog(): SecurityAuditLog[] {
    return [...this.auditLog].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 清除审计日志
   */
  clearAuditLog(): void {
    this.auditLog = [];
    logger.info('安全审计日志已清除', 'secure-storage');
  }

  /**
   * 记录安全事件
   */
  private logSecurityEvent(action: string, result: 'success' | 'failure', details: Record<string, any>, riskLevel: 'low' | 'medium' | 'high' | 'critical'): void {
    const event: SecurityAuditLog = {
      id: IdGenerator.generateUUID(),
      timestamp: new Date(),
      action,
      result,
      details,
      riskLevel
    };

    this.auditLog.push(event);

    // 保持审计日志在合理大小
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }

    // 记录高风险事件到主日志
    if (riskLevel === 'high' || riskLevel === 'critical') {
      logger.warn(`安全事件: ${action} ${result}`, 'secure-storage', details);
    }
  }

  /**
   * 启动自动锁定定时器
   */
  private startAutoLockTimer(): void {
    if (!this.config.autoLock) return;

    this.clearAutoLockTimer();
    this.lockTimer = setTimeout(() => {
      this.lock();
    }, this.config.lockTimeout);
  }

  /**
   * 重置自动锁定定时器
   */
  private resetAutoLockTimer(): void {
    if (!this.config.autoLock) return;

    this.clearAutoLockTimer();
    this.startAutoLockTimer();
  }

  /**
   * 清除自动锁定定时器
   */
  private clearAutoLockTimer(): void {
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }
  }

  /**
   * 保存到存储后端
   */
  private async saveToStorage(key: string, data: any): Promise<void> {
    const storageDir = path.join(os.homedir(), '.claude-code-cli', 'secure-storage');
    await fileSystem.ensureDirectory(storageDir);

    const filePath = path.join(storageDir, `${key}.json`);
    await fileSystem.writeFile(filePath, JSON.stringify(data), { mode: 0o600 });
  }

  /**
   * 从存储后端加载
   */
  private async loadFromStorage(key: string): Promise<any> {
    const storageDir = path.join(os.homedir(), '.claude-code-cli', 'secure-storage');
    const filePath = path.join(storageDir, `${key}.json`);

    if (!(await fileSystem.exists(filePath))) {
      return null;
    }

    const content = await fileSystem.readFile(filePath);
    return JSON.parse(content);
  }

  /**
   * 从存储后端移除
   */
  private async removeFromStorage(key: string): Promise<void> {
    const storageDir = path.join(os.homedir(), '.claude-code-cli', 'secure-storage');
    const filePath = path.join(storageDir, `${key}.json`);

    if (await fileSystem.exists(filePath)) {
      await fileSystem.deleteFile(filePath, { backup: this.config.backupEnabled });
    }
  }

  /**
   * 创建备份
   */
  private async createBackup(key: string, data: any): Promise<void> {
    const backupDir = path.join(os.homedir(), '.claude-code-cli', 'secure-storage', 'backups');
    await fileSystem.ensureDirectory(backupDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${key}-${timestamp}.json`);

    await fileSystem.writeFile(backupPath, JSON.stringify(data), { mode: 0o600 });
  }
}

/**
 * 全局加密工具实例
 */
export const cryptoUtils = new CryptographyUtils();

/**
 * 全局密钥管理器实例
 */
export const keyManager = new KeyManager();

/**
 * 全局安全存储实例
 */
export const secureStorage = new SecureStorage();

/**
 * 导出类型定义
 */
export type { EncryptionConfig, SecureStorageConfig, EncryptedData, KeyInfo, SecurityAuditLog };

/**
 * 导出类
 */
export { CryptographyUtils, KeyManager, SecureStorage };