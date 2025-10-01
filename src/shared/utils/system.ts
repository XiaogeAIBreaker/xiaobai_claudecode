/**
 * T019: 系统工具函数
 * 提供跨平台系统信息获取、文件操作和进程管理功能
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync, spawn, ChildProcess } from 'child_process';
import { PlatformType, ArchType, SystemInfo } from '../types/environment';
import { log } from './logger';
import { getEnhancedEnv } from './env-loader';

/**
 * 获取系统信息
 */
export function getSystemInfo(): SystemInfo {
  const platform = os.platform() as PlatformType;
  const arch = os.arch() as ArchType;
  
  return {
    platform,
    arch,
    osVersion: getOSVersion(),
    osName: getOSName(),
    cpu: getCPUInfo(),
    memory: getMemoryInfo(),
    disk: getDiskInfo(),
    user: getUserInfo(),
    environment: process.env as Record<string, string>
  };
}

/**
 * 获取操作系统版本
 */
export function getOSVersion(): string {
  const platform = os.platform();
  
  try {
    switch (platform) {
      case 'win32':
        return execSync('ver', { encoding: 'utf8' }).trim();
      case 'darwin':
        return execSync('sw_vers -productVersion', { encoding: 'utf8' }).trim();
      case 'linux':
        return execSync('uname -r', { encoding: 'utf8' }).trim();
      default:
        return os.release();
    }
  } catch (error) {
    log.warn('获取操作系统版本失败', { error });
    return os.release();
  }
}

/**
 * 获取操作系统名称
 */
export function getOSName(): string {
  const platform = os.platform();
  
  switch (platform) {
    case 'win32':
      return 'Windows';
    case 'darwin':
      return 'macOS';
    case 'linux':
      return 'Linux';
    default:
      return platform;
  }
}

/**
 * 获取CPU信息
 */
export function getCPUInfo() {
  const cpus = os.cpus();
  return {
    model: cpus[0]?.model || 'Unknown',
    cores: cpus.length,
    speed: cpus[0]?.speed ? cpus[0].speed / 1000 : 0 // 转换为GHz
  };
}

/**
 * 获取内存信息
 */
export function getMemoryInfo() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  return {
    total: Math.round(totalMem / (1024 * 1024 * 1024)), // GB
    free: Math.round(freeMem / (1024 * 1024 * 1024)),   // GB
    used: Math.round(usedMem / (1024 * 1024 * 1024))    // GB
  };
}

/**
 * 获取磁盘信息
 */
export function getDiskInfo() {
  try {
    const platform = os.platform();
    let command: string;
    
    switch (platform) {
      case 'win32':
        command = 'wmic logicaldisk get size,freespace,caption /format:csv';
        break;
      case 'darwin':
        command = 'df -h /';
        break;
      case 'linux':
        command = 'df -h /';
        break;
      default:
        throw new Error(`不支持的平台: ${platform}`);
    }
    
    const output = execSync(command, { encoding: 'utf8' });
    return parseDiskInfo(output, platform);
  } catch (error) {
    log.warn('获取磁盘信息失败', { error });
    return {
      total: 0,
      free: 0,
      used: 0
    };
  }
}

/**
 * 解析磁盘信息
 */
function parseDiskInfo(output: string, platform: string) {
  if (platform === 'win32') {
    // 解析Windows wmic输出
    const lines = output.split('\n').filter(line => line.includes(','));
    if (lines.length > 1) {
      const data = lines[1].split(',');
      const freeBytes = parseInt(data[1]) || 0;
      const totalBytes = parseInt(data[2]) || 0;
      const usedBytes = totalBytes - freeBytes;
      
      return {
        total: Math.round(totalBytes / (1024 * 1024 * 1024)),
        free: Math.round(freeBytes / (1024 * 1024 * 1024)),
        used: Math.round(usedBytes / (1024 * 1024 * 1024))
      };
    }
  } else {
    // 解析Unix/Linux df输出
    const lines = output.split('\n');
    if (lines.length > 1) {
      const parts = lines[1].split(/\s+/);
      if (parts.length >= 4) {
        const total = parseFloat(parts[1].replace('G', ''));
        const used = parseFloat(parts[2].replace('G', ''));
        const free = parseFloat(parts[3].replace('G', ''));
        
        return { total, used, free };
      }
    }
  }
  
  return { total: 0, free: 0, used: 0 };
}

/**
 * 获取用户信息
 */
export function getUserInfo() {
  const userInfo = os.userInfo();
  return {
    name: userInfo.username,
    home: userInfo.homedir,
    isAdmin: checkAdminRights()
  };
}

/**
 * 检查管理员权限
 */
export function checkAdminRights(): boolean {
  try {
    const platform = os.platform();
    
    switch (platform) {
      case 'win32':
        // Windows: 尝试执行需要管理员权限的命令
        execSync('net session', { stdio: 'ignore' });
        return true;
      case 'darwin':
      case 'linux':
        // Unix/Linux: 检查是否为root或在sudo组中
        return process.getuid?.() === 0;
      default:
        return false;
    }
  } catch {
    return false;
  }
}

/**
 * 检查文件是否存在
 */
export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * 确保目录存在
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 安全删除文件/目录
 */
export function safeRemove(targetPath: string): boolean {
  try {
    if (fs.existsSync(targetPath)) {
      const stats = fs.statSync(targetPath);
      if (stats.isDirectory()) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(targetPath);
      }
    }
    return true;
  } catch (error) {
    log.warn(`删除文件失败: ${targetPath}`, { error });
    return false;
  }
}

/**
 * 复制文件
 */
export function copyFile(src: string, dest: string): boolean {
  try {
    // 确保目标目录存在
    const destDir = path.dirname(dest);
    ensureDir(destDir);
    
    fs.copyFileSync(src, dest);
    return true;
  } catch (error) {
    log.warn(`复制文件失败: ${src} -> ${dest}`, { error });
    return false;
  }
}

/**
 * 移动文件
 */
export function moveFile(src: string, dest: string): boolean {
  try {
    // 确保目标目录存在
    const destDir = path.dirname(dest);
    ensureDir(destDir);
    
    fs.renameSync(src, dest);
    return true;
  } catch (error) {
    log.warn(`移动文件失败: ${src} -> ${dest}`, { error });
    // 尝试复制后删除
    if (copyFile(src, dest)) {
      return safeRemove(src);
    }
    return false;
  }
}

/**
 * 获取文件大小
 */
export function getFileSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * 获取临时文件路径
 */
export function getTempFilePath(prefix: string, extension?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const filename = `${prefix}_${timestamp}_${random}${extension || ''}`;
  return path.join(os.tmpdir(), filename);
}

/**
 * 执行命令
 */
export function executeCommand(command: string, options?: {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const { cwd, timeout = 30000, env } = options || {};

    // 使用增强的环境变量（包含完整 PATH）
    const enhancedEnv = getEnhancedEnv();

    const childProcess = spawn(command, {
      shell: true,
      cwd,
      env: { ...enhancedEnv, ...env },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    let timeoutId: NodeJS.Timeout;
    
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        childProcess.kill('SIGTERM');
        reject(new Error(`命令执行超时: ${command}`));
      }, timeout);
    }
    
    childProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    childProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    childProcess.on('close', (exitCode) => {
      if (timeoutId) clearTimeout(timeoutId);
      resolve({ stdout, stderr, exitCode: exitCode || 0 });
    });
    
    childProcess.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(error);
    });
  });
}

/**
 * 执行命令并获取实时输出
 */
export function executeCommandWithProgress(
  command: string,
  onProgress: (data: string) => void,
  options?: {
    cwd?: string;
    timeout?: number;
    env?: Record<string, string>;
  }
): Promise<{ exitCode: number }> {
  return new Promise((resolve, reject) => {
    const { cwd, timeout = 30000, env } = options || {};

    // 使用增强的环境变量（包含完整 PATH）
    const enhancedEnv = getEnhancedEnv();

    const childProcess = spawn(command, {
      shell: true,
      cwd,
      env: { ...enhancedEnv, ...env },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let timeoutId: NodeJS.Timeout;
    
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        childProcess.kill('SIGTERM');
        reject(new Error(`命令执行超时: ${command}`));
      }, timeout);
    }
    
    childProcess.stdout?.on('data', (data) => {
      onProgress(data.toString());
    });
    
    childProcess.stderr?.on('data', (data) => {
      onProgress(data.toString());
    });
    
    childProcess.on('close', (exitCode) => {
      if (timeoutId) clearTimeout(timeoutId);
      resolve({ exitCode: exitCode || 0 });
    });
    
    childProcess.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(error);
    });
  });
}

/**
 * 检查程序是否存在于PATH中
 */
export function isProgramInPath(program: string): boolean {
  try {
    const platform = os.platform();
    const command = platform === 'win32' ? `where ${program}` : `which ${program}`;
    const enhancedEnv = getEnhancedEnv();
    execSync(command, { stdio: 'ignore', env: enhancedEnv });
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取程序路径
 */
export function getProgramPath(program: string): string | null {
  try {
    const platform = os.platform();
    const command = platform === 'win32' ? `where ${program}` : `which ${program}`;
    const enhancedEnv = getEnhancedEnv();
    const output = execSync(command, { encoding: 'utf8', env: enhancedEnv });
    return output.trim().split('\n')[0] || null;
  } catch {
    return null;
  }
}

/**
 * 获取程序版本
 */
export function getProgramVersion(program: string, versionFlag = '--version'): string | null {
  try {
    const enhancedEnv = getEnhancedEnv();
    const output = execSync(`${program} ${versionFlag}`, { encoding: 'utf8', env: enhancedEnv });
    // 提取版本号（通常在第一行）
    const versionMatch = output.match(/v?([0-9]+\.[0-9]+\.[0-9]+[^\s]*)/i);
    return versionMatch ? versionMatch[1] : null;
  } catch {
    return null;
  }
}

/**
 * 比较版本号
 */
export function compareVersions(version1: string, version2: string): number {
  const v1parts = version1.split('.').map(Number);
  const v2parts = version2.split('.').map(Number);
  
  const maxLength = Math.max(v1parts.length, v2parts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const v1part = v1parts[i] || 0;
    const v2part = v2parts[i] || 0;
    
    if (v1part > v2part) return 1;
    if (v1part < v2part) return -1;
  }
  
  return 0;
}

/**
 * 生成唯一ID
 */
export function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 获取机器唯一标识符
 */
export function getMachineId(): string {
  const platform = os.platform();
  const arch = os.arch();
  const hostname = os.hostname();
  const userInfo = os.userInfo();
  
  // 组合多个系统信息生成唯一ID
  const machineInfo = `${platform}-${arch}-${hostname}-${userInfo.username}`;
  
  // 使用简单的哈希算法
  let hash = 0;
  for (let i = 0; i < machineInfo.length; i++) {
    const char = machineInfo.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * 等待指定时间
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试执行函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        log.warn(`操作失败，${delay}ms后重试 (${i + 1}/${maxRetries})`, { error });
        await sleep(delay);
        delay *= 2; // 指数退避
      }
    }
  }
  
  throw lastError!;
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 格式化持续时间
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟${seconds % 60}秒`;
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds % 60}秒`;
  } else {
    return `${seconds}秒`;
  }
}
