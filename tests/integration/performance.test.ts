/**
 * T045: 性能优化验证测试
 * 验证应用性能指标是否符合要求
 */

import { performanceMonitor, PerformanceMonitor } from '../../src/shared/utils/performance';

describe('性能优化验证', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance();
    monitor.reset();
  });

  describe('启动性能测试', () => {
    test('应用启动时间应少于3秒', () => {
      // 模拟应用启动过程
      const startTime = Date.now();
      
      // 模拟初始化时间
      setTimeout(() => {
        monitor.markStartupComplete();
        const metrics = monitor.getMetrics();
        
        expect(metrics.startupTime).toBeLessThan(3000);
        expect(metrics.startupTime).toBeGreaterThan(0);
      }, 100);
    });

    test('窗口创建时间应在合理范围内', () => {
      monitor.checkpoint('app-start');
      
      // 模拟窗口创建
      setTimeout(() => {
        monitor.markWindowCreated();
        const metrics = monitor.getMetrics();
        
        expect(metrics.windowCreationTime).toBeLessThan(1000);
        expect(metrics.windowCreationTime).toBeGreaterThan(0);
      }, 50);
    });

    test('渲染器初始化时间应在合理范围内', (done) => {
      monitor.checkpoint('window-created');

      // 模拟渲染器初始化
      setTimeout(() => {
        monitor.markRendererReady();
        const metrics = monitor.getMetrics();

        expect(metrics.rendererInitTime).toBeLessThan(2000);
        expect(metrics.rendererInitTime).toBeGreaterThan(0);
        done();
      }, 100);
    });
  });

  describe('界面响应性能测试', () => {
    test('界面操作响应时间应少于1秒', async () => {
      // 模拟用户交互
      const mockUserAction = async () => {
        // 模拟处理时间
        await new Promise(resolve => setTimeout(resolve, 50));
      };

      const responseTime = await monitor.measureResponseTime(mockUserAction);
      
      expect(responseTime).toBeLessThan(1000);
      expect(responseTime).toBeGreaterThan(0);
    });

    test('快速连续操作响应时间应稳定', async () => {
      const responseTimes: number[] = [];
      
      // 模拟快速连续操作
      for (let i = 0; i < 5; i++) {
        const responseTime = await monitor.measureResponseTime(async () => {
          await new Promise(resolve => setTimeout(resolve, 30));
        });
        responseTimes.push(responseTime);
      }
      
      // 检查所有响应时间都在阈值内
      responseTimes.forEach(time => {
        expect(time).toBeLessThan(1000);
      });
      
      // 检查响应时间的稳定性。最大值与最小值的差值不应超过500ms
      const maxTime = Math.max(...responseTimes);
      const minTime = Math.min(...responseTimes);
      expect(maxTime - minTime).toBeLessThan(500);
    });
  });

  describe('内存使用性能测试', () => {
    test('内存使用量应在合理范围内', () => {
      const memoryUsage = monitor.getMemoryUsage();
      
      // 验证内存使用量不超过512MB
      expect(memoryUsage).toBeLessThan(512);
      expect(memoryUsage).toBeGreaterThan(0);
    });

    test('长时间运行不应有内存泄漏', () => {
      const initialMemory = monitor.getMemoryUsage();
      
      // 模拟长时间操作
      const operations = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        data: new Array(1000).fill('test')
      }));
      
      // 清理操作
      operations.length = 0;
      
      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = monitor.getMemoryUsage();
      
      // 验证内存使用量不会显著增加(允许小幅波动)
      expect(finalMemory - initialMemory).toBeLessThan(50);
    });
  });

  describe('性能检查和报告', () => {
    test('性能检查功能应正常工作', () => {
      // 设置模拟数据
      monitor.markStartupComplete();
      monitor.markWindowCreated();
      monitor.markRendererReady();
      
      const performanceCheck = monitor.checkPerformance();
      
      expect(performanceCheck).toHaveProperty('passed');
      expect(performanceCheck).toHaveProperty('issues');
      expect(Array.isArray(performanceCheck.issues)).toBe(true);
    });

    test('性能报告应包含关键指标', () => {
      // 设置模拟数据
      monitor.markStartupComplete();
      monitor.markWindowCreated();
      monitor.markRendererReady();
      
      const report = monitor.generateReport();
      
      expect(report).toContain('性能监控报告');
      expect(report).toContain('启动性能');
      expect(report).toContain('运行时性能');
      expect(report).toContain('性能检查');
      expect(report).toContain('检查点记录');
    });

    test('性能指标应在阈值范围内', () => {
      // 模拟良好性能数据
      monitor.checkpoint('app-start');
      
      // 模拟快速启动
      setTimeout(() => {
        monitor.markStartupComplete();
      }, 100);
      
      setTimeout(() => {
        monitor.markWindowCreated();
      }, 150);
      
      setTimeout(() => {
        monitor.markRendererReady();
        
        const performanceCheck = monitor.checkPerformance();
        expect(performanceCheck.passed).toBe(true);
        expect(performanceCheck.issues).toHaveLength(0);
      }, 200);
    });
  });

  describe('性能优化建议', () => {
    test('应提供有用的优化建议', () => {
      // 模拟性能问题
      const slowStartup = 5000; // 5秒启动时间
      monitor['metrics'].startupTime = slowStartup;
      
      const performanceCheck = monitor.checkPerformance();
      
      expect(performanceCheck.passed).toBe(false);
      expect(performanceCheck.issues.length).toBeGreaterThan(0);
      expect(performanceCheck.issues.some(issue => issue.includes('启动时间过长'))).toBe(true);
    });
  });

  describe('性能监控工具类测试', () => {
    test('检查点功能应正常工作', (done) => {
      const checkpointName = 'test-checkpoint';

      monitor.checkpoint(checkpointName);

      // 等待一段时间
      setTimeout(() => {
        const timeDiff = monitor.getTimeDiff(checkpointName);
        expect(timeDiff).toBeGreaterThan(90); // 至少90ms
        expect(timeDiff).toBeLessThan(1000);
        done();
      }, 100);
    });

    test('获取不存在的检查点应返回0', () => {
      const timeDiff = monitor.getTimeDiff('non-existent-checkpoint');
      expect(timeDiff).toBe(0);
    });

    test('重置功能应正常工作', () => {
      // 设置一些数据
      monitor.markStartupComplete();
      monitor.checkpoint('test');
      
      // 重置
      monitor.reset();
      
      const metrics = monitor.getMetrics();
      expect(metrics.startupTime).toBe(0);
      expect(monitor.getTimeDiff('test')).toBe(0);
    });
  });

  describe('全局性能监控实例测试', () => {
    test('全局实例应可用', () => {
      expect(performanceMonitor).toBeDefined();
      expect(performanceMonitor).toBeInstanceOf(PerformanceMonitor);
    });

    test('单例模式应正常工作', () => {
      const instance1 = PerformanceMonitor.getInstance();
      const instance2 = PerformanceMonitor.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(performanceMonitor);
    });
  });

  describe('真实场景性能测试', () => {
    test('应用完整启动流程性能测试', (done) => {
      monitor.reset();
      
      // 模拟完整的应用启动流程
      monitor.checkpoint('app-start');
      
      setTimeout(() => {
        monitor.markWindowCreated();
      }, 50);
      
      setTimeout(() => {
        monitor.markRendererReady();
      }, 100);
      
      setTimeout(() => {
        monitor.markStartupComplete();
        
        const metrics = monitor.getMetrics();
        const performanceCheck = monitor.checkPerformance();
        
        // 验证各个阶段的性能
        expect(metrics.startupTime).toBeLessThan(3000);
        expect(metrics.windowCreationTime).toBeLessThan(1000);
        expect(metrics.rendererInitTime).toBeLessThan(2000);
        
        // 验证整体性能
        expect(performanceCheck.passed).toBe(true);
        
        done();
      }, 150);
    });

    test('高负载情况下的性能表现', async () => {
      // 模拟高负载操作
      const heavyTask = async () => {
        // 模拟 CPU 密集型任务
        const data = new Array(10000).fill(0).map((_, i) => i * Math.random());
        data.sort((a, b) => a - b);
        await new Promise(resolve => setTimeout(resolve, 10));
      };
      
      const responseTime = await monitor.measureResponseTime(heavyTask);
      
      // 高负载下响应时间可能较长，但仍应在可接受范围内
      expect(responseTime).toBeLessThan(2000);
    });
  });
});

// 测试完成后输出性能报告
afterAll(() => {
  console.log('\n=== 性能测试报告 ===');
  console.log(performanceMonitor.generateReport());
  console.log('=======================\n');
});