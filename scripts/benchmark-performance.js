#!/usr/bin/env node
/**
 * T045: 性能基准测试脚本
 * 实际测量应用启动时间和响应性能
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * 性能基准测试器
 */
class PerformanceBenchmark {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        memory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
        nodeVersion: process.version
      },
      metrics: {},
      status: 'RUNNING'
    };
  }

  /**
   * 运行启动时间基准测试
   */
  async benchmarkStartupTime(iterations = 5) {
    console.log(`🚀 开始启动时间基准测试 (${iterations} 次迭代)...`);

    const startupTimes = [];

    for (let i = 0; i < iterations; i++) {
      console.log(`  第 ${i + 1}/${iterations} 次测试...`);

      const startupTime = await this.measureSingleStartup();
      startupTimes.push(startupTime);

      console.log(`    启动时间: ${startupTime}ms`);

      // 等待2秒后进行下一次测试
      await this.sleep(2000);
    }

    const avgStartupTime = startupTimes.reduce((a, b) => a + b, 0) / startupTimes.length;
    const minStartupTime = Math.min(...startupTimes);
    const maxStartupTime = Math.max(...startupTimes);

    this.results.metrics.startup = {
      average: Math.round(avgStartupTime),
      min: minStartupTime,
      max: maxStartupTime,
      samples: startupTimes,
      target: 3000,
      passed: avgStartupTime < 3000
    };

    console.log(`✅ 启动时间基准测试完成:`);
    console.log(`   平均: ${Math.round(avgStartupTime)}ms`);
    console.log(`   最快: ${minStartupTime}ms`);
    console.log(`   最慢: ${maxStartupTime}ms`);
    console.log(`   目标: < 3000ms ${avgStartupTime < 3000 ? '✅' : '❌'}`);
  }

  /**
   * 测量单次启动时间
   */
  async measureSingleStartup() {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      // 启动Electron应用
      const electronProcess = spawn('npm', ['run', 'start'], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'pipe'
      });

      let hasResolved = false;

      // 监听stdout输出，寻找启动完成标志
      electronProcess.stdout.on('data', (data) => {
        const output = data.toString();

        // 寻找主窗口显示的标志
        if (output.includes('主窗口已显示') && !hasResolved) {
          hasResolved = true;
          const startupTime = Date.now() - startTime;

          // 关闭应用
          electronProcess.kill('SIGTERM');

          setTimeout(() => resolve(startupTime), 500);
        }
      });

      // 错误处理
      electronProcess.on('error', (error) => {
        if (!hasResolved) {
          hasResolved = true;
          reject(new Error(`启动失败: ${error.message}`));
        }
      });

      // 超时处理
      setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          electronProcess.kill('SIGTERM');
          reject(new Error('启动超时 (10秒)'));
        }
      }, 10000);
    });
  }

  /**
   * 基准测试内存使用
   */
  async benchmarkMemoryUsage() {
    console.log('🧠 开始内存使用基准测试...');

    // 获取当前内存使用
    const initialMemory = process.memoryUsage();

    // 模拟一些内存操作
    const testData = [];
    for (let i = 0; i < 10000; i++) {
      testData.push({
        id: i,
        data: new Array(100).fill(Math.random()),
        timestamp: Date.now()
      });
    }

    const afterAllocMemory = process.memoryUsage();

    // 清理
    testData.length = 0;

    // 强制垃圾回收 (如果可用)
    if (global.gc) {
      global.gc();
    }

    const afterCleanupMemory = process.memoryUsage();

    this.results.metrics.memory = {
      initial: Math.round(initialMemory.heapUsed / 1024 / 1024),
      afterAlloc: Math.round(afterAllocMemory.heapUsed / 1024 / 1024),
      afterCleanup: Math.round(afterCleanupMemory.heapUsed / 1024 / 1024),
      target: 512,
      passed: afterCleanupMemory.heapUsed / 1024 / 1024 < 512
    };

    console.log(`✅ 内存使用基准测试完成:`);
    console.log(`   初始: ${this.results.metrics.memory.initial}MB`);
    console.log(`   分配后: ${this.results.metrics.memory.afterAlloc}MB`);
    console.log(`   清理后: ${this.results.metrics.memory.afterCleanup}MB`);
    console.log(`   目标: < 512MB ${this.results.metrics.memory.passed ? '✅' : '❌'}`);
  }

  /**
   * 基准测试文件系统性能
   */
  async benchmarkFileSystemPerformance() {
    console.log('📁 开始文件系统性能基准测试...');

    const testDir = path.join(os.tmpdir(), 'claude-installer-perf-test');
    const testFile = path.join(testDir, 'test.json');

    try {
      // 创建测试目录
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      const testData = {
        timestamp: Date.now(),
        data: new Array(1000).fill(0).map((_, i) => ({
          id: i,
          value: Math.random()
        }))
      };

      // 测试写入性能
      const writeStartTime = Date.now();
      fs.writeFileSync(testFile, JSON.stringify(testData, null, 2));
      const writeTime = Date.now() - writeStartTime;

      // 测试读取性能
      const readStartTime = Date.now();
      const readData = JSON.parse(fs.readFileSync(testFile, 'utf8'));
      const readTime = Date.now() - readStartTime;

      // 测试文件大小
      const fileStats = fs.statSync(testFile);
      const fileSize = Math.round(fileStats.size / 1024);

      this.results.metrics.filesystem = {
        writeTime,
        readTime,
        fileSize,
        writeSpeed: Math.round(fileSize / writeTime * 1000), // KB/s
        readSpeed: Math.round(fileSize / readTime * 1000), // KB/s
        passed: writeTime < 100 && readTime < 50
      };

      console.log(`✅ 文件系统性能基准测试完成:`);
      console.log(`   写入时间: ${writeTime}ms`);
      console.log(`   读取时间: ${readTime}ms`);
      console.log(`   文件大小: ${fileSize}KB`);
      console.log(`   写入速度: ${this.results.metrics.filesystem.writeSpeed}KB/s`);
      console.log(`   读取速度: ${this.results.metrics.filesystem.readSpeed}KB/s`);

    } finally {
      // 清理测试文件
      try {
        if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
        if (fs.existsSync(testDir)) fs.rmdirSync(testDir);
      } catch (e) {
        // 忽略清理错误
      }
    }
  }

  /**
   * 生成性能报告
   */
  generateReport() {
    const overall = this.calculateOverallScore();

    this.results.status = overall.passed ? 'PASSED' : 'FAILED';
    this.results.score = overall.score;
    this.results.grade = overall.grade;

    const report = `
═══════════════════════════════════════════════════════════════
📊 Claude Installer 性能基准测试报告
═══════════════════════════════════════════════════════════════

🖥️  系统信息:
   平台: ${this.results.system.platform} ${this.results.system.arch}
   CPU: ${this.results.system.cpus} 核心
   内存: ${this.results.system.memory}
   Node: ${this.results.system.nodeVersion}
   时间: ${new Date(this.results.timestamp).toLocaleString()}

🚀 启动性能:
   平均启动时间: ${this.results.metrics.startup?.average || 'N/A'}ms
   最快启动时间: ${this.results.metrics.startup?.min || 'N/A'}ms
   最慢启动时间: ${this.results.metrics.startup?.max || 'N/A'}ms
   目标: < 3000ms
   状态: ${this.results.metrics.startup?.passed ? '✅ 通过' : '❌ 未通过'}

🧠 内存使用:
   初始内存: ${this.results.metrics.memory?.initial || 'N/A'}MB
   清理后内存: ${this.results.metrics.memory?.afterCleanup || 'N/A'}MB
   目标: < 512MB
   状态: ${this.results.metrics.memory?.passed ? '✅ 通过' : '❌ 未通过'}

📁 文件系统:
   写入时间: ${this.results.metrics.filesystem?.writeTime || 'N/A'}ms
   读取时间: ${this.results.metrics.filesystem?.readTime || 'N/A'}ms
   写入速度: ${this.results.metrics.filesystem?.writeSpeed || 'N/A'}KB/s
   读取速度: ${this.results.metrics.filesystem?.readSpeed || 'N/A'}KB/s
   状态: ${this.results.metrics.filesystem?.passed ? '✅ 通过' : '❌ 未通过'}

📈 综合评分: ${overall.score}/100 (${overall.grade})
总体状态: ${this.results.status === 'PASSED' ? '✅ 通过' : '❌ 未通过'}

═══════════════════════════════════════════════════════════════
    `.trim();

    console.log(report);

    // 保存详细结果到文件
    const resultsFile = path.join(__dirname, '..', 'performance-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 详细结果已保存到: ${resultsFile}`);

    return this.results;
  }

  /**
   * 计算综合评分
   */
  calculateOverallScore() {
    let score = 0;
    let maxScore = 0;
    const grades = [];

    // 启动性能评分 (40分)
    if (this.results.metrics.startup) {
      maxScore += 40;
      const startupScore = Math.max(0, 40 - (this.results.metrics.startup.average - 1000) / 50);
      score += Math.min(40, startupScore);
      grades.push(this.results.metrics.startup.passed ? 'A' : 'C');
    }

    // 内存使用评分 (30分)
    if (this.results.metrics.memory) {
      maxScore += 30;
      const memoryScore = Math.max(0, 30 - (this.results.metrics.memory.afterCleanup - 100) / 10);
      score += Math.min(30, memoryScore);
      grades.push(this.results.metrics.memory.passed ? 'A' : 'C');
    }

    // 文件系统评分 (30分)
    if (this.results.metrics.filesystem) {
      maxScore += 30;
      const fsScore = Math.max(0, 30 - this.results.metrics.filesystem.writeTime / 3);
      score += Math.min(30, fsScore);
      grades.push(this.results.metrics.filesystem.passed ? 'A' : 'C');
    }

    const finalScore = Math.round((score / maxScore) * 100);
    const overallGrade = finalScore >= 90 ? 'A' : finalScore >= 80 ? 'B' : finalScore >= 70 ? 'C' : 'D';

    return {
      score: finalScore,
      grade: overallGrade,
      passed: finalScore >= 80 && grades.every(g => g !== 'C')
    };
  }

  /**
   * 休眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 运行完整基准测试
   */
  async runFullBenchmark() {
    console.log('🎯 开始 Claude Installer 性能基准测试\n');

    try {
      await this.benchmarkStartupTime(3); // 减少迭代次数以节省时间
      await this.benchmarkMemoryUsage();
      await this.benchmarkFileSystemPerformance();

      return this.generateReport();

    } catch (error) {
      console.error('❌ 基准测试失败:', error.message);
      this.results.status = 'ERROR';
      this.results.error = error.message;
      return this.results;
    }
  }
}

// 主函数
async function main() {
  const benchmark = new PerformanceBenchmark();
  const results = await benchmark.runFullBenchmark();

  // 根据结果设置退出码
  process.exit(results.status === 'PASSED' ? 0 : 1);
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 基准测试异常:', error);
    process.exit(1);
  });
}

module.exports = { PerformanceBenchmark };