/**
 * 安全工具单元测试
 * 测试加密、解密、哈希等安全功能
 */

import {
    SecurityUtils,
    EncryptionService,
    ValidationService,
    type EncryptionResult,
    type ValidationResult
} from '../../../src/utils/security';
import { promises as fs } from 'fs';
import * as path from 'path';

describe('Security Utils - SecurityUtils', () => {
    describe('密码和令牌生成', () => {
        it('应该生成安全的随机密码', () => {
            const password = SecurityUtils.generateSecurePassword(16);

            expect(password).toHaveLength(16);
            expect(/[A-Z]/.test(password)).toBe(true); // 包含大写字母
            expect(/[a-z]/.test(password)).toBe(true); // 包含小写字母
            expect(/[0-9]/.test(password)).toBe(true); // 包含数字
            expect(/[!@#$%^&*]/.test(password)).toBe(true); // 包含特殊字符
        });

        it('应该生成不同长度的密码', () => {
            const short = SecurityUtils.generateSecurePassword(8);
            const long = SecurityUtils.generateSecurePassword(32);

            expect(short).toHaveLength(8);
            expect(long).toHaveLength(32);
            expect(short).not.toBe(long);
        });

        it('应该生成安全令牌', () => {
            const token = SecurityUtils.generateSecureToken();

            expect(typeof token).toBe('string');
            expect(token.length).toBeGreaterThan(40);
            expect(/^[a-f0-9]+$/.test(token)).toBe(true); // 十六进制格式
        });

        it('应该生成唯一令牌', () => {
            const token1 = SecurityUtils.generateSecureToken();
            const token2 = SecurityUtils.generateSecureToken();

            expect(token1).not.toBe(token2);
        });
    });

    describe('哈希功能', () => {
        it('应该计算文件哈希', () => {
            const content = 'test content for hashing';
            const hash = SecurityUtils.calculateHash(content);

            expect(typeof hash).toBe('string');
            expect(hash.length).toBe(64); // SHA-256 哈希长度
            expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
        });

        it('应该支持不同的哈希算法', () => {
            const content = 'test content';
            const sha256 = SecurityUtils.calculateHash(content, 'sha256');
            const sha512 = SecurityUtils.calculateHash(content, 'sha512');

            expect(sha256.length).toBe(64);
            expect(sha512.length).toBe(128);
        });

        it('应该对相同内容产生相同哈希', () => {
            const content = 'consistent content';
            const hash1 = SecurityUtils.calculateHash(content);
            const hash2 = SecurityUtils.calculateHash(content);

            expect(hash1).toBe(hash2);
        });

        it('应该验证哈希', () => {
            const content = 'content to verify';
            const hash = SecurityUtils.calculateHash(content);

            expect(SecurityUtils.verifyHash(content, hash)).toBe(true);
            expect(SecurityUtils.verifyHash('different content', hash)).toBe(false);
        });
    });

    describe('安全清理', () => {
        it('应该安全清理敏感字符串', () => {
            let sensitiveData = 'secret password 123';
            const originalLength = sensitiveData.length;

            SecurityUtils.secureClear(sensitiveData);

            // 注意：JavaScript 中字符串是不可变的，这个测试主要验证函数不会抛出错误
            expect(() => SecurityUtils.secureClear(sensitiveData)).not.toThrow();
        });

        it('应该安全清理缓冲区', () => {
            const buffer = Buffer.from('sensitive data');
            const originalData = buffer.toString();

            SecurityUtils.secureClearBuffer(buffer);

            expect(buffer.toString()).not.toBe(originalData);
            expect(buffer.every(byte => byte === 0)).toBe(true);
        });
    });

    describe('输入验证', () => {
        it('应该验证安全文件路径', () => {
            expect(SecurityUtils.isSecurePath('/safe/path/file.txt')).toBe(true);
            expect(SecurityUtils.isSecurePath('../../../etc/passwd')).toBe(false);
            expect(SecurityUtils.isSecurePath('/safe/path/../../../etc/passwd')).toBe(false);
        });

        it('应该检测路径遍历攻击', () => {
            expect(SecurityUtils.isSecurePath('../../dangerous')).toBe(false);
            expect(SecurityUtils.isSecurePath('.\\..\\windows\\system32')).toBe(false);
            expect(SecurityUtils.isSecurePath('/safe/./path')).toBe(true);
        });

        it('应该验证安全文件名', () => {
            expect(SecurityUtils.isSecureFilename('safe-file.txt')).toBe(true);
            expect(SecurityUtils.isSecureFilename('file with spaces.txt')).toBe(true);
            expect(SecurityUtils.isSecureFilename('../dangerous.txt')).toBe(false);
            expect(SecurityUtils.isSecureFilename('con.txt')).toBe(false); // Windows 保留名
        });
    });
});

describe('Security Utils - EncryptionService', () => {
    let encryptionService: EncryptionService;

    beforeEach(() => {
        encryptionService = new EncryptionService();
    });

    describe('AES 加密', () => {
        it('应该加密和解密数据', () => {
            const plaintext = 'sensitive information';
            const password = 'secure-password-123';

            const encrypted = encryptionService.encrypt(plaintext, password);
            expect(encrypted.success).toBe(true);
            expect(encrypted.data).toBeDefined();
            expect(encrypted.iv).toBeDefined();
            expect(encrypted.tag).toBeDefined();

            const decrypted = encryptionService.decrypt(encrypted, password);
            expect(decrypted.success).toBe(true);
            expect(decrypted.data).toBe(plaintext);
        });

        it('应该使用不同的IV产生不同的密文', () => {
            const plaintext = 'same content';
            const password = 'same-password';

            const encrypted1 = encryptionService.encrypt(plaintext, password);
            const encrypted2 = encryptionService.encrypt(plaintext, password);

            expect(encrypted1.data).not.toBe(encrypted2.data);
            expect(encrypted1.iv).not.toBe(encrypted2.iv);
        });

        it('应该拒绝错误的密码', () => {
            const plaintext = 'secret data';
            const correctPassword = 'correct-password';
            const wrongPassword = 'wrong-password';

            const encrypted = encryptionService.encrypt(plaintext, correctPassword);
            const decrypted = encryptionService.decrypt(encrypted, wrongPassword);

            expect(decrypted.success).toBe(false);
            expect(decrypted.error).toBeDefined();
        });

        it('应该检测篡改的数据', () => {
            const plaintext = 'important data';
            const password = 'secure-password';

            const encrypted = encryptionService.encrypt(plaintext, password);

            // 篡改密文
            const tamperedEncrypted = {
                ...encrypted,
                data: encrypted.data!.slice(0, -4) + 'XXXX'
            };

            const decrypted = encryptionService.decrypt(tamperedEncrypted, password);
            expect(decrypted.success).toBe(false);
        });
    });

    describe('密钥派生', () => {
        it('应该从密码派生密钥', () => {
            const password = 'user-password';
            const salt = SecurityUtils.generateSecureToken();

            const key1 = encryptionService.deriveKey(password, salt);
            const key2 = encryptionService.deriveKey(password, salt);

            expect(key1).toBe(key2); // 相同输入应产生相同密钥
            expect(typeof key1).toBe('string');
        });

        it('应该使用不同salt产生不同密钥', () => {
            const password = 'same-password';
            const salt1 = SecurityUtils.generateSecureToken();
            const salt2 = SecurityUtils.generateSecureToken();

            const key1 = encryptionService.deriveKey(password, salt1);
            const key2 = encryptionService.deriveKey(password, salt2);

            expect(key1).not.toBe(key2);
        });
    });

    describe('文件加密', () => {
        const testFilePath = path.join(__dirname, 'test-file.txt');
        const encryptedFilePath = path.join(__dirname, 'test-file.txt.encrypted');

        beforeEach(async () => {
            await fs.writeFile(testFilePath, 'test file content for encryption');
        });

        afterEach(async () => {
            try {
                await fs.unlink(testFilePath);
                await fs.unlink(encryptedFilePath);
            } catch (error) {
                // 忽略文件不存在的错误
            }
        });

        it('应该加密和解密文件', async () => {
            const password = 'file-encryption-password';

            const encryptResult = await encryptionService.encryptFile(testFilePath, encryptedFilePath, password);
            expect(encryptResult.success).toBe(true);

            const decryptedFilePath = path.join(__dirname, 'test-file-decrypted.txt');
            const decryptResult = await encryptionService.decryptFile(encryptedFilePath, decryptedFilePath, password);
            expect(decryptResult.success).toBe(true);

            const originalContent = await fs.readFile(testFilePath, 'utf8');
            const decryptedContent = await fs.readFile(decryptedFilePath, 'utf8');
            expect(decryptedContent).toBe(originalContent);

            await fs.unlink(decryptedFilePath);
        });
    });
});

describe('Security Utils - ValidationService', () => {
    let validationService: ValidationService;

    beforeEach(() => {
        validationService = new ValidationService();
    });

    describe('输入验证', () => {
        it('应该验证安全的用户输入', () => {
            const result = validationService.validateUserInput('normal user input');

            expect(result.isValid).toBe(true);
            expect(result.sanitized).toBe('normal user input');
        });

        it('应该检测和清理危险输入', () => {
            const maliciousInput = '<script>alert("xss")</script>';
            const result = validationService.validateUserInput(maliciousInput);

            expect(result.isValid).toBe(false);
            expect(result.issues).toContain('potential_script_injection');
            expect(result.sanitized).not.toContain('<script>');
        });

        it('应该检测SQL注入尝试', () => {
            const sqlInjection = "'; DROP TABLE users; --";
            const result = validationService.validateUserInput(sqlInjection);

            expect(result.isValid).toBe(false);
            expect(result.issues).toContain('potential_sql_injection');
        });
    });

    describe('API密钥验证', () => {
        it('应该验证有效的API密钥格式', () => {
            const validApiKey = 'sk-1234567890abcdef1234567890abcdef12345678';
            const result = validationService.validateApiKey(validApiKey);

            expect(result.isValid).toBe(true);
            expect(result.keyType).toBeDefined();
        });

        it('应该拒绝无效的API密钥', () => {
            const invalidApiKey = 'invalid-key';
            const result = validationService.validateApiKey(invalidApiKey);

            expect(result.isValid).toBe(false);
            expect(result.issues).toBeDefined();
        });

        it('应该检测泄露的测试密钥', () => {
            const testApiKey = 'sk-test1234567890abcdef1234567890abcdef';
            const result = validationService.validateApiKey(testApiKey);

            expect(result.issues).toContain('test_key_detected');
        });
    });

    describe('配置验证', () => {
        it('应该验证安全的配置对象', () => {
            const config = {
                apiUrl: 'https://api.example.com',
                timeout: 5000,
                retries: 3
            };

            const result = validationService.validateConfiguration(config);
            expect(result.isValid).toBe(true);
        });

        it('应该检测不安全的配置', () => {
            const unsafeConfig = {
                apiUrl: 'http://insecure-api.com', // HTTP instead of HTTPS
                password: 'plaintext-password',
                debug: true
            };

            const result = validationService.validateConfiguration(unsafeConfig);
            expect(result.isValid).toBe(false);
            expect(result.issues).toContain('insecure_http_url');
            expect(result.issues).toContain('plaintext_credentials');
        });
    });

    describe('权限验证', () => {
        it('应该验证文件访问权限', async () => {
            const result = await validationService.validateFileAccess(__filename);

            expect(result.canRead).toBe(true);
            expect(result.exists).toBe(true);
        });

        it('应该检测权限不足', async () => {
            const restrictedPath = '/root/restricted-file';
            const result = await validationService.validateFileAccess(restrictedPath);

            expect(result.exists).toBe(false);
        });
    });
});