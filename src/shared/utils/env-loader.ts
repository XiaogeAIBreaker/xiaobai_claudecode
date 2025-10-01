/**
 * 环境变量加载工具
 * 用于打包后的应用加载完整的 PATH 环境变量
 */

import { homedir, platform } from 'os';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { log } from './logger';

/**
 * 获取完整的 PATH 环境变量
 */
export function getFullPath(): string {
  const currentPath = process.env.PATH || '';
  const additionalPaths: string[] = [];

  try {
    // 1. 从 shell 配置文件中提取 PATH
    const shellPaths = extractPathFromShellConfig();
    additionalPaths.push(...shellPaths);

    // 2. 添加常见的 npm/node 安装路径
    const commonPaths = getCommonNodePaths();
    additionalPaths.push(...commonPaths);

    // 3. 去重并合并
    const allPaths = [currentPath, ...additionalPaths].join(':');
    const uniquePaths = [...new Set(allPaths.split(':'))].filter(p => p).join(':');

    log.info('加载完整 PATH', {
      originalLength: currentPath.split(':').length,
      finalLength: uniquePaths.split(':').length
    });

    return uniquePaths;
  } catch (error) {
    log.error('加载 PATH 失败，使用默认值', error as Error);
    return currentPath;
  }
}

/**
 * 从 shell 配置文件中提取 PATH
 */
function extractPathFromShellConfig(): string[] {
  const paths: string[] = [];
  const home = homedir();

  // 支持的 shell 配置文件
  const configFiles = [
    '.zshrc',
    '.bashrc',
    '.bash_profile',
    '.profile'
  ];

  for (const configFile of configFiles) {
    const configPath = join(home, configFile);

    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, 'utf-8');

        // 提取 export PATH= 语句
        const pathRegex = /export\s+PATH=["']?([^"'\n]+)["']?/g;
        let match;

        while ((match = pathRegex.exec(content)) !== null) {
          const pathValue = match[1];

          // 替换 $PATH 和 ${PATH}
          const expandedPath = pathValue
            .replace(/\$PATH/g, process.env.PATH || '')
            .replace(/\$\{PATH\}/g, process.env.PATH || '')
            .replace(/~/g, home);

          // 分割并添加路径
          expandedPath.split(':').forEach(p => {
            if (p && !p.includes('$')) {
              paths.push(p);
            }
          });
        }

        log.info(`从 ${configFile} 提取到 ${paths.length} 个路径`);
      } catch (error) {
        log.warn(`读取 ${configFile} 失败`, { error });
      }
    }
  }

  return paths;
}

/**
 * 获取常见的 Node.js/npm 安装路径
 */
function getCommonNodePaths(): string[] {
  const home = homedir();
  const paths: string[] = [];

  if (platform() === 'darwin' || platform() === 'linux') {
    // macOS 和 Linux 常见路径
    paths.push(
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      '/opt/homebrew/bin',           // Apple Silicon Homebrew
      '/usr/local/opt/node/bin',     // Homebrew Node.js
      join(home, '.npm-global', 'bin'),  // npm 本地全局安装
      join(home, '.nvm', 'current', 'bin'), // nvm
      join(home, '.local', 'bin')    // 用户本地二进制文件
    );
  } else if (platform() === 'win32') {
    // Windows 常见路径
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const appData = process.env.APPDATA || join(home, 'AppData', 'Roaming');

    paths.push(
      join(programFiles, 'nodejs'),
      join(programFilesX86, 'nodejs'),
      join(appData, 'npm')
    );
  }

  return paths.filter(p => existsSync(p));
}

/**
 * 获取增强的环境变量对象
 */
export function getEnhancedEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: getFullPath()
  };
}

/**
 * 检查命令是否可用（使用完整 PATH）
 */
export async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    const { execSync } = await import('child_process');
    const fullPath = getFullPath();
    const checkCommand = platform() === 'win32' ? `where ${command}` : `which ${command}`;

    execSync(checkCommand, {
      env: { ...process.env, PATH: fullPath },
      stdio: 'ignore'
    });

    return true;
  } catch {
    return false;
  }
}
