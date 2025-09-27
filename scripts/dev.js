#!/usr/bin/env node

/**
 * 开发脚本
 * 用于启动开发环境
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 颜色输出函数
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function spawnProcess(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`进程退出，代码: ${code}`));
      }
    });

    child.on('error', reject);
    return child;
  });
}

async function checkEnvironment() {
  log('🔍 检查开发环境...', 'yellow');

  // 检查 Node.js 版本
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion < 18) {
    log(`❌ Node.js 版本过低 (${nodeVersion})，需要 18.0.0 或更高版本`, 'red');
    process.exit(1);
  }

  log(`✅ Node.js 版本: ${nodeVersion}`, 'green');

  // 检查必要文件
  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    'webpack.main.config.js',
    'webpack.renderer.config.js',
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      log(`❌ 缺少必要文件: ${file}`, 'red');
      process.exit(1);
    }
  }

  // 检查 node_modules
  if (!fs.existsSync('node_modules')) {
    log('📦 安装依赖...', 'yellow');
    await spawnProcess('npm', ['install']);
    log('✅ 依赖安装完成', 'green');
  }

  log('✅ 开发环境检查通过', 'green');
}

async function startDevelopment() {
  log('🚀 启动开发环境...', 'bright');

  // 设置环境变量
  process.env.NODE_ENV = 'development';
  process.env.ELECTRON_IS_DEV = '1';

  try {
    // 并行启动渲染进程和主进程的开发服务器
    const rendererProcess = spawnProcess('npm', ['run', 'dev:renderer'], {
      env: { ...process.env, FORCE_COLOR: '1' },
    });

    // 等待一段时间让渲染进程服务器启动
    setTimeout(async () => {
      const mainProcess = spawnProcess('npm', ['run', 'dev:main'], {
        env: { ...process.env, FORCE_COLOR: '1' },
      });

      // 再等待一段时间让主进程编译完成
      setTimeout(async () => {
        log('🖥️  启动 Electron...', 'cyan');
        const electronProcess = spawnProcess('npx', ['electron', 'build/main/main.js'], {
          env: { ...process.env, FORCE_COLOR: '1' },
        });

        // 监听进程退出
        Promise.all([rendererProcess, mainProcess, electronProcess])
          .then(() => {
            log('✅ 开发环境已关闭', 'green');
          })
          .catch((error) => {
            log(`❌ 开发环境出错: ${error.message}`, 'red');
            process.exit(1);
          });

      }, 3000);

    }, 2000);

  } catch (error) {
    log(`❌ 启动开发环境失败: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function main() {
  try {
    await checkEnvironment();
    await startDevelopment();
  } catch (error) {
    log(`❌ 开发环境启动失败: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 处理 Ctrl+C 优雅退出
process.on('SIGINT', () => {
  log('\n🛑 正在关闭开发环境...', 'yellow');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n🛑 正在关闭开发环境...', 'yellow');
  process.exit(0);
});

if (require.main === module) {
  main();
}