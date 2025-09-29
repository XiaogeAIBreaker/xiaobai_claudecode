/**
 * 权限提升助手
 * 处理需要管理员权限的操作
 */

import { exec } from 'child_process';
import * as path from 'path';

export interface PrivilegeOptions {
  name: string;  // 应用名称，用于权限对话框标题
  icns?: string; // macOS图标路径（可选）
}

export interface ExecuteResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: Error;
}

/**
 * 使用sudo权限执行脚本
 * 会弹出系统原生的密码输入对话框
 */
export class PrivilegeHelper {
  private options: PrivilegeOptions;

  constructor(options: PrivilegeOptions) {
    this.options = options;
  }

  /**
   * 执行需要sudo权限的脚本
   */
  async executeScript(scriptPath: string, args: string[] = []): Promise<ExecuteResult> {
    return new Promise((resolve) => {
      // 构建命令
      const command = `"${scriptPath}" ${args.join(' ')}`;

      // macOS和Linux的实现
      if (process.platform === 'darwin' || process.platform === 'linux') {
        this.executeSudoMac(command, resolve);
      }
      // Windows的实现
      else if (process.platform === 'win32') {
        this.executeSudoWindows(command, resolve);
      }
      else {
        resolve({
          success: false,
          stdout: '',
          stderr: 'Unsupported platform',
          error: new Error('Unsupported platform')
        });
      }
    });
  }

  /**
   * macOS下使用osascript弹出密码对话框
   */
  private executeSudoMac(command: string, resolve: (result: ExecuteResult) => void) {
    // 使用osascript创建密码输入对话框
    const osascript = `
      do shell script "${command.replace(/"/g, '\\"')}" \\
      with administrator privileges \\
      with prompt "Claude安装助手需要管理员权限来安装Node.js。请输入您的密码："
    `;

    const execCommand = `osascript -e '${osascript}'`;

    exec(execCommand, (error, stdout, stderr) => {
      if (error) {
        // 用户取消或密码错误
        if (error.message.includes('User canceled')) {
          resolve({
            success: false,
            stdout: '',
            stderr: '用户取消了权限授权',
            error: new Error('User canceled authorization')
          });
        } else {
          resolve({
            success: false,
            stdout: '',
            stderr: stderr || error.message,
            error
          });
        }
      } else {
        resolve({
          success: true,
          stdout,
          stderr,
        });
      }
    });
  }

  /**
   * Windows下使用PowerShell提升权限
   */
  private executeSudoWindows(command: string, resolve: (result: ExecuteResult) => void) {
    // Windows下需要重新启动为管理员
    const powershellCommand = `
      Start-Process PowerShell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command \\"${command}\\"" -Verb RunAs -Wait
    `;

    exec(`powershell -Command "${powershellCommand}"`, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout,
        stderr: stderr || (error ? error.message : ''),
        error: error || undefined
      });
    });
  }

  /**
   * 检查是否有管理员权限
   */
  async checkPrivileges(): Promise<boolean> {
    return new Promise((resolve) => {
      if (process.platform === 'darwin') {
        // macOS: 尝试访问需要权限的目录
        exec('[ -w /usr/local/bin ]', (error) => {
          resolve(!error);
        });
      } else if (process.platform === 'win32') {
        // Windows: 检查是否以管理员身份运行
        exec('net session >nul 2>&1', (error) => {
          resolve(!error);
        });
      } else {
        // Linux: 检查sudo权限
        exec('sudo -n true', (error) => {
          resolve(!error);
        });
      }
    });
  }
}