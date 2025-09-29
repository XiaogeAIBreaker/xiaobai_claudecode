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
    console.log('开始执行权限脚本:', { scriptPath, args });

    // 先验证脚本路径
    const isValid = await this.validateScriptPath(scriptPath);
    if (!isValid) {
      return {
        success: false,
        stdout: '',
        stderr: `脚本文件不存在或不可访问: ${scriptPath}`,
        error: new Error('Invalid script path')
      };
    }

    return new Promise((resolve) => {
      // 构建命令
      const command = `"${scriptPath}" ${args.join(' ')}`;
      console.log('构建的命令:', command);

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
    console.log('执行macOS权限提升命令:', command);

    // 使用临时文件方式避免复杂的转义问题
    const fs = require('fs');
    const os = require('os');
    const tempScript = path.join(os.tmpdir(), `claude-install-${Date.now()}.scpt`);

    // 构建AppleScript内容
    const appleScript = `
on run
  try
    do shell script "${command.replace(/"/g, '\\"')}" with administrator privileges with prompt "Claude安装助手需要管理员权限来安装Node.js。请输入您的密码："
  on error errMsg number errNum
    return "ERROR:" & errNum & ":" & errMsg
  end try
end run
    `.trim();

    try {
      // 写入临时脚本文件
      fs.writeFileSync(tempScript, appleScript, 'utf8');
      console.log('临时脚本已创建:', tempScript);

      // 执行脚本
      exec(`osascript "${tempScript}"`, {
        timeout: 300000,
        maxBuffer: 1024 * 1024 // 增加输出缓冲区到1MB
      }, (error, stdout, stderr) => {
        // 清理临时文件
        try {
          fs.unlinkSync(tempScript);
          console.log('临时脚本已清理');
        } catch (cleanupError) {
          console.warn('清理临时文件失败:', cleanupError);
        }

        console.log('完整脚本输出:', {
          error: error?.message,
          stdout: stdout,
          stderr: stderr,
          stdoutLength: stdout?.length,
          stderrLength: stderr?.length
        });

        if (stdout && stdout.startsWith('ERROR:')) {
          // 处理AppleScript内部错误
          const match = stdout.match(/ERROR:(-?\d+):(.*)/);
          const errNum = match ? match[1] : 'unknown';
          const errMsg = match ? match[2] : stdout;

          const friendlyError = this.parseOsascriptError(errNum, errMsg);
          resolve({
            success: false,
            stdout: '',
            stderr: friendlyError,
            error: new Error(`osascript error ${errNum}: ${errMsg}`)
          });
        } else if (error) {
          const friendlyError = this.parseOsascriptError(error.message, stderr);
          resolve({
            success: false,
            stdout: '',
            stderr: friendlyError,
            error
          });
        } else {
          resolve({
            success: true,
            stdout,
            stderr
          });
        }
      });
    } catch (writeError) {
      console.error('创建临时脚本失败:', writeError);
      resolve({
        success: false,
        stdout: '',
        stderr: '无法创建临时脚本文件',
        error: writeError as Error
      });
    }
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
   * 解析osascript特定错误
   */
  private parseOsascriptError(errorCode: string, errorMessage: string): string {
    console.log('解析osascript错误:', { errorCode, errorMessage });

    if (errorCode === '-2741' || errorMessage.includes('syntax error')) {
      return '脚本语法错误，请重新下载应用程序';
    } else if (errorCode === '-128' || errorMessage.includes('User canceled')) {
      return '用户取消了权限授权';
    } else if (errorCode === '-1712' || errorMessage.includes('authentication failed')) {
      return '认证失败，请检查密码';
    } else if (errorCode === '-1743' || errorMessage.includes('not allowed')) {
      return '权限被拒绝，请检查系统设置';
    } else if (errorMessage.includes('No such file')) {
      return '安装脚本文件不存在';
    } else if (errorMessage.includes('Permission denied')) {
      return '权限不足，请确保以管理员身份运行';
    } else {
      return `权限提升失败: ${errorMessage}`;
    }
  }

  /**
   * 验证脚本路径的有效性
   */
  private async validateScriptPath(scriptPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      const fs = require('fs');
      fs.access(scriptPath, fs.constants.F_OK | fs.constants.R_OK, (err: any) => {
        if (err) {
          console.error('脚本文件不可访问:', scriptPath, err.message);
          resolve(false);
        } else {
          console.log('脚本文件验证通过:', scriptPath);
          resolve(true);
        }
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