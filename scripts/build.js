#!/usr/bin/env node

/**
 * 构建脚本
 * 用于跨平台构建 Claude 安装助手
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

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

function execCommand(command, options = {}) {
  try {
    log(`📝 执行命令: ${command}`, 'cyan');
    const result = execSync(command, {
      stdio: 'inherit',
      encoding: 'utf8',
      ...options,
    });
    return result;
  } catch (error) {
    log(`❌ 命令执行失败: ${command}`, 'red');
    log(`错误信息: ${error.message}`, 'red');
    process.exit(1);
  }
}

function checkPrerequisites() {
  log('🔍 检查构建环境...', 'yellow');

  // 检查 Node.js 版本
  const nodeVersion = process.version;
  log(`Node.js 版本: ${nodeVersion}`, 'green');

  // 检查必要的文件
  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    'electron-builder.config.js',
    'src/main/main.ts',
    'src/renderer/App.tsx',
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      log(`❌ 缺少必要文件: ${file}`, 'red');
      process.exit(1);
    }
  }

  log('✅ 构建环境检查通过', 'green');
}

function cleanBuild() {
  log('🧹 清理构建目录...', 'yellow');
  execCommand('npm run clean');
  log('✅ 构建目录清理完成', 'green');
}

function installDependencies() {
  log('📦 安装依赖...', 'yellow');
  execCommand('npm ci');
  log('✅ 依赖安装完成', 'green');
}

function runLinting() {
  log('🔍 执行代码检查...', 'yellow');
  execCommand('npm run lint:check');
  execCommand('npm run typecheck');
  log('✅ 代码检查通过', 'green');
}

function runTests() {
  log('🧪 运行测试...', 'yellow');
  execCommand('npm test -- --passWithNoTests');
  log('✅ 测试通过', 'green');
}

function buildApplication() {
  log('🏗️  构建应用...', 'yellow');
  execCommand('npm run build');
  log('✅ 应用构建完成', 'green');
}

function buildElectron(platform = 'all') {
  log(`📦 构建 Electron 应用 (${platform})...`, 'yellow');

  switch (platform) {
    case 'win':
      execCommand('npm run build:win');
      break;
    case 'mac':
      execCommand('npm run build:mac');
      break;
    case 'all':
      if (os.platform() === 'win32') {
        execCommand('npm run build:win');
      } else if (os.platform() === 'darwin') {
        execCommand('npm run build:mac');
        // 在 macOS 上也可以构建 Windows 版本（需要 wine）
        // execCommand('npm run build:win');
      } else {
        log('❌ 当前平台不支持构建', 'red');
        process.exit(1);
      }
      break;
    default:
      log(`❌ 不支持的平台: ${platform}`, 'red');
      process.exit(1);
  }

  log('✅ Electron 应用构建完成', 'green');
}

function showBuildInfo() {
  log('📊 构建信息:', 'cyan');

  const distDir = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir);
    files.forEach(file => {
      const filePath = path.join(distDir, file);
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024 / 1024).toFixed(2);
      log(`  📄 ${file} (${size} MB)`, 'green');
    });
  }
}

function main() {
  const args = process.argv.slice(2);
  const platform = args[0] || 'all';
  const skipTests = args.includes('--skip-tests');

  log('🚀 开始构建 Claude 安装助手...', 'bright');
  log(`构建平台: ${platform}`, 'blue');
  log(`跳过测试: ${skipTests ? '是' : '否'}`, 'blue');

  try {
    checkPrerequisites();
    cleanBuild();
    installDependencies();
    runLinting();

    if (!skipTests) {
      runTests();
    }

    buildApplication();
    buildElectron(platform);
    showBuildInfo();

    log('🎉 构建完成！', 'green');
    log('📦 构建产物位于 dist/ 目录', 'cyan');

  } catch (error) {
    log(`❌ 构建失败: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  log(`❌ 未捕获的异常: ${error.message}`, 'red');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`❌ 未处理的 Promise 拒绝: ${reason}`, 'red');
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = {
  checkPrerequisites,
  cleanBuild,
  installDependencies,
  runLinting,
  runTests,
  buildApplication,
  buildElectron,
  showBuildInfo,
};