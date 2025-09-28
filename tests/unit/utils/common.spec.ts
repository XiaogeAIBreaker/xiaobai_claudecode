/**
 * 通用工具函数单元测试
 * 测试ID生成、验证、格式化等通用功能
 */

import {
    IdGenerator,
    Validator,
    Formatter,
    PathHelper,
    TimeHelper
} from '../../../src/utils/common';

describe('Common Utils - IdGenerator', () => {
    describe('generateUUID', () => {
        it('应该生成有效的UUID', () => {
            const uuid = IdGenerator.generateUUID();
            expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        });

        it('应该生成唯一的UUID', () => {
            const uuid1 = IdGenerator.generateUUID();
            const uuid2 = IdGenerator.generateUUID();
            expect(uuid1).not.toBe(uuid2);
        });
    });

    describe('generateShortId', () => {
        it('应该生成指定长度的短ID', () => {
            const shortId = IdGenerator.generateShortId({ length: 8 });
            expect(shortId).toHaveLength(8);
            expect(/^[a-zA-Z0-9]+$/.test(shortId)).toBe(true);
        });

        it('应该生成带前缀的ID', () => {
            const prefixedId = IdGenerator.generateShortId({
                prefix: 'TEST_',
                length: 10
            });
            expect(prefixedId).toStartWith('TEST_');
            expect(prefixedId.length).toBeGreaterThan(5);
        });

        it('应该生成包含时间戳的ID', () => {
            const timestampId = IdGenerator.generateShortId({
                includeTimestamp: true,
                length: 15
            });
            expect(timestampId.length).toBeGreaterThanOrEqual(15);
        });
    });

    describe('generatePrefixedId', () => {
        it('应该生成有前缀的9位ID', () => {
            const prefixedId = IdGenerator.generatePrefixedId('step');
            expect(prefixedId).toStartWith('step_');
            expect(prefixedId.length).toBeGreaterThan(5);
        });

        it('应该生成自定义长度的前缀ID', () => {
            const prefixedId = IdGenerator.generatePrefixedId('test', 12);
            expect(prefixedId).toStartWith('test_');
            expect(prefixedId.length).toBeGreaterThan(5);
        });
    });
});

describe('Common Utils - Validator', () => {
    describe('isValidEmail', () => {
        it('应该验证有效邮箱', () => {
            expect(Validator.isValidEmail('test@example.com')).toBe(true);
            expect(Validator.isValidEmail('user.name+label@domain.org')).toBe(true);
        });

        it('应该拒绝无效邮箱', () => {
            expect(Validator.isValidEmail('invalid-email')).toBe(false);
            expect(Validator.isValidEmail('@domain.com')).toBe(false);
            expect(Validator.isValidEmail('test@')).toBe(false);
        });
    });

    describe('isValidUrl', () => {
        it('应该验证有效URL', () => {
            expect(Validator.isValidUrl('https://example.com')).toBe(true);
            expect(Validator.isValidUrl('http://localhost:3000')).toBe(true);
        });

        it('应该拒绝无效URL', () => {
            expect(Validator.isValidUrl('not-a-url')).toBe(false);
            expect(Validator.isValidUrl('ftp://example.com')).toBe(false);
        });
    });

    describe('isValidPath', () => {
        it('应该验证有效路径', () => {
            expect(Validator.isValidPath('/usr/local/bin')).toBe(true);
            expect(Validator.isValidPath('./relative/path')).toBe(true);
        });

        it('应该拒绝无效路径', () => {
            expect(Validator.isValidPath('')).toBe(false);
            expect(Validator.isValidPath('con')).toBe(false); // Windows保留名
        });
    });
});

describe('Common Utils - Formatter', () => {
    describe('formatFileSize', () => {
        it('应该格式化文件大小', () => {
            expect(Formatter.formatFileSize(1024)).toBe('1.00 KB');
            expect(Formatter.formatFileSize(1048576)).toBe('1.00 MB');
            expect(Formatter.formatFileSize(1073741824)).toBe('1.00 GB');
        });

        it('应该处理小于1024字节的文件', () => {
            expect(Formatter.formatFileSize(500)).toBe('500 B');
            expect(Formatter.formatFileSize(0)).toBe('0 B');
        });
    });

    describe('formatDuration', () => {
        it('应该格式化持续时间', () => {
            expect(Formatter.formatDuration(1000)).toBe('1s');
            expect(Formatter.formatDuration(65000)).toBe('1m 5s');
            expect(Formatter.formatDuration(3665000)).toBe('1h 1m 5s');
        });

        it('应该处理零值', () => {
            expect(Formatter.formatDuration(0)).toBe('0s');
        });
    });

    describe('formatPercentage', () => {
        it('应该格式化百分比', () => {
            expect(Formatter.formatPercentage(0.5)).toBe('50.0%');
            expect(Formatter.formatPercentage(0.333)).toBe('33.3%');
            expect(Formatter.formatPercentage(1)).toBe('100.0%');
        });
    });
});

describe('Common Utils - PathHelper', () => {
    describe('joinPaths', () => {
        it('应该正确连接路径', () => {
            expect(PathHelper.joinPaths('home', 'user', 'documents')).toBe('home/user/documents');
            expect(PathHelper.joinPaths('/home/', '/user/', 'documents')).toBe('/home/user/documents');
        });

        it('应该处理空路径', () => {
            expect(PathHelper.joinPaths('', 'user', '')).toBe('user');
        });
    });

    describe('normalizePath', () => {
        it('应该规范化路径', () => {
            expect(PathHelper.normalizePath('/home//user/../user/documents')).toBe('/home/user/documents');
            expect(PathHelper.normalizePath('home\\user\\documents')).toBe('home/user/documents');
        });
    });

    describe('getExtension', () => {
        it('应该获取文件扩展名', () => {
            expect(PathHelper.getExtension('file.txt')).toBe('.txt');
            expect(PathHelper.getExtension('archive.tar.gz')).toBe('.gz');
        });

        it('应该处理无扩展名文件', () => {
            expect(PathHelper.getExtension('README')).toBe('');
        });
    });
});

describe('Common Utils - TimeHelper', () => {
    describe('delay', () => {
        it('应该延迟指定时间', async () => {
            const start = Date.now();
            await TimeHelper.delay(100);
            const end = Date.now();
            expect(end - start).toBeGreaterThanOrEqual(90);
        });
    });

    describe('formatTimestamp', () => {
        it('应该格式化时间戳', () => {
            const timestamp = new Date('2023-01-01T12:00:00Z').getTime();
            const formatted = TimeHelper.formatTimestamp(timestamp);
            expect(formatted).toMatch(/2023-01-01 \d{2}:\d{2}:\d{2}/);
        });
    });

    describe('isExpired', () => {
        it('应该检查时间是否过期', () => {
            const pastTime = Date.now() - 10000;
            const futureTime = Date.now() + 10000;

            expect(TimeHelper.isExpired(pastTime, 5000)).toBe(true);
            expect(TimeHelper.isExpired(futureTime, 5000)).toBe(false);
        });
    });

    describe('getRelativeTime', () => {
        it('应该返回相对时间', () => {
            const now = Date.now();
            const oneHourAgo = now - 3600000;
            const oneDayAgo = now - 86400000;

            expect(TimeHelper.getRelativeTime(oneHourAgo)).toContain('1小时前');
            expect(TimeHelper.getRelativeTime(oneDayAgo)).toContain('1天前');
        });
    });
});