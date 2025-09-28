/**
 * 性能监控工具单元测试
 * 测试性能指标收集、内存泄漏检测等功能
 */

import { PerformanceMonitor, type PerformanceMetrics, type MemoryLeakDetection } from '../../../src/utils/performance';

describe('Performance Utils - PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
        monitor = new PerformanceMonitor();
    });

    afterEach(() => {
        monitor.destroy();
    });

    describe('基础功能', () => {
        it('应该正确初始化', () => {
            expect(monitor).toBeDefined();
            expect(monitor.isEnabled()).toBe(true);
        });

        it('应该支持启用/禁用', () => {
            monitor.setEnabled(false);
            expect(monitor.isEnabled()).toBe(false);

            monitor.setEnabled(true);
            expect(monitor.isEnabled()).toBe(true);
        });
    });

    describe('性能指标收集', () => {
        it('应该收集当前性能指标', () => {
            const metrics = monitor.getCurrentMetrics();

            expect(metrics).toHaveProperty('timestamp');
            expect(metrics).toHaveProperty('memory');
            expect(metrics).toHaveProperty('cpu');
            expect(metrics).toHaveProperty('eventLoop');

            expect(typeof metrics.timestamp).toBe('number');
            expect(typeof metrics.memory.heapUsed).toBe('number');
            expect(typeof metrics.memory.heapTotal).toBe('number');
            expect(typeof metrics.memory.external).toBe('number');
            expect(typeof metrics.memory.rss).toBe('number');
        });

        it('应该记录性能快照', () => {
            monitor.takeSnapshot('test-snapshot');
            const snapshots = monitor.getSnapshots();

            expect(snapshots).toHaveLength(1);
            expect(snapshots[0]).toHaveProperty('label', 'test-snapshot');
            expect(snapshots[0]).toHaveProperty('metrics');
        });

        it('应该清理旧快照', () => {
            // 创建多个快照
            for (let i = 0; i < 25; i++) {
                monitor.takeSnapshot(`snapshot-${i}`);
            }

            const snapshots = monitor.getSnapshots();
            expect(snapshots.length).toBeLessThanOrEqual(20); // 最大快照数
        });
    });

    describe('内存泄漏检测', () => {
        it('应该检测内存泄漏', (done) => {
            // 模拟内存使用增长
            monitor.takeSnapshot('baseline');

            setTimeout(() => {
                monitor.takeSnapshot('after-growth');

                const leakDetection = monitor.detectMemoryLeaks(2);

                expect(leakDetection).toHaveProperty('isLeaking');
                expect(leakDetection).toHaveProperty('growthRate');
                expect(leakDetection).toHaveProperty('analysis');
                expect(leakDetection).toHaveProperty('recommendations');

                done();
            }, 100);
        });

        it('应该提供内存泄漏分析', () => {
            // 创建基准快照
            monitor.takeSnapshot('baseline');

            // 模拟内存泄漏场景
            const largObjects: any[] = [];
            for (let i = 0; i < 1000; i++) {
                largObjects.push(new Array(1000).fill(i));
            }

            monitor.takeSnapshot('after-allocation');

            const detection = monitor.detectMemoryLeaks();

            expect(detection.isLeaking).toBeDefined();
            expect(Array.isArray(detection.recommendations)).toBe(true);
        });
    });

    describe('性能标记和测量', () => {
        it('应该创建性能标记', () => {
            monitor.mark('test-start');
            monitor.mark('test-end');

            const marks = monitor.getMarks();
            expect(marks.has('test-start')).toBe(true);
            expect(marks.has('test-end')).toBe(true);
        });

        it('应该测量性能持续时间', () => {
            monitor.mark('operation-start');

            setTimeout(() => {
                monitor.mark('operation-end');
                const duration = monitor.measure('operation', 'operation-start', 'operation-end');

                expect(typeof duration).toBe('number');
                expect(duration).toBeGreaterThan(0);
            }, 50);
        });

        it('应该清理性能标记', () => {
            monitor.mark('temp-mark');
            expect(monitor.getMarks().has('temp-mark')).toBe(true);

            monitor.clearMarks();
            expect(monitor.getMarks().size).toBe(0);
        });
    });

    describe('资源监控', () => {
        it('应该监控资源使用', () => {
            const usage = monitor.getResourceUsage();

            expect(usage).toHaveProperty('cpu');
            expect(usage).toHaveProperty('memory');
            expect(usage).toHaveProperty('handles');
            expect(usage).toHaveProperty('timestamp');

            expect(typeof usage.cpu.user).toBe('number');
            expect(typeof usage.cpu.system).toBe('number');
            expect(typeof usage.memory.rss).toBe('number');
        });

        it('应该跟踪资源趋势', (done) => {
            monitor.startResourceTracking(50); // 50ms间隔

            setTimeout(() => {
                monitor.stopResourceTracking();
                const trend = monitor.getResourceTrend();

                expect(Array.isArray(trend)).toBe(true);
                expect(trend.length).toBeGreaterThan(0);

                done();
            }, 200);
        });
    });

    describe('性能警告', () => {
        it('应该设置性能阈值', () => {
            monitor.setThresholds({
                maxMemoryMB: 100,
                maxCpuPercent: 80,
                maxEventLoopDelay: 10
            });

            const thresholds = monitor.getThresholds();
            expect(thresholds.maxMemoryMB).toBe(100);
            expect(thresholds.maxCpuPercent).toBe(80);
            expect(thresholds.maxEventLoopDelay).toBe(10);
        });

        it('应该触发性能警告', (done) => {
            monitor.setThresholds({
                maxMemoryMB: 1, // 很低的阈值
                maxCpuPercent: 1,
                maxEventLoopDelay: 1
            });

            monitor.on('warning', (warning) => {
                expect(warning).toHaveProperty('type');
                expect(warning).toHaveProperty('value');
                expect(warning).toHaveProperty('threshold');
                expect(warning).toHaveProperty('timestamp');
                done();
            });

            // 触发检查
            monitor.checkThresholds();
        });
    });

    describe('性能报告', () => {
        it('应该生成性能报告', () => {
            monitor.takeSnapshot('test-start');

            // 模拟一些操作
            monitor.mark('operation-1');
            monitor.mark('operation-2');

            monitor.takeSnapshot('test-end');

            const report = monitor.generateReport();

            expect(report).toHaveProperty('summary');
            expect(report).toHaveProperty('snapshots');
            expect(report).toHaveProperty('marks');
            expect(report).toHaveProperty('memoryAnalysis');
            expect(report).toHaveProperty('recommendations');
        });

        it('应该导出性能数据', () => {
            monitor.takeSnapshot('export-test');

            const exportData = monitor.exportData();

            expect(exportData).toHaveProperty('version');
            expect(exportData).toHaveProperty('timestamp');
            expect(exportData).toHaveProperty('snapshots');
            expect(exportData).toHaveProperty('marks');
            expect(exportData).toHaveProperty('metadata');
        });
    });

    describe('错误处理', () => {
        it('应该处理无效的标记名', () => {
            expect(() => monitor.mark('')).toThrow();
            expect(() => monitor.mark('  ')).toThrow();
        });

        it('应该处理不存在的标记', () => {
            expect(() => monitor.measure('test', 'non-existent', 'also-non-existent')).toThrow();
        });

        it('应该处理内存不足情况', () => {
            // 模拟内存不足
            const originalTakeSnapshot = monitor.takeSnapshot;
            monitor.takeSnapshot = jest.fn().mockImplementation(() => {
                throw new Error('Out of memory');
            });

            expect(() => monitor.takeSnapshot('test')).toThrow('Out of memory');

            // 恢复原始方法
            monitor.takeSnapshot = originalTakeSnapshot;
        });
    });
});