/**
 * Node.js安装服务
 * 处理Node.js的自动安装
 */

import { PrivilegeHelper, ExecuteResult } from './privilege-helper';
import { InstallStep, ProgressEvent } from '../../shared/types/installer';
import { getSharedConfigEntry } from '@shared/config';
import * as path from 'path';
import { app } from 'electron';

const nodeMessagesEntry = getSharedConfigEntry<Record<string, string>>('installer.node.progressMessages');
const NODE_MESSAGES = {
  permissionCheck: '检查系统权限',
  permissionGranted: '已具有管理员权限',
  permissionPrompt: '请在弹出的对话框中输入管理员密码',
  download: '正在下载 Node.js 安装包...',
  verify: '验证安装包完整性...',
  install: '正在安装 Node.js...',
  configureEnv: '配置环境变量...',
  finalize: '完成安装配置...',
  success: 'Node.js 安装成功！',
  genericError: '安装失败，请检查网络连接后重试',
  ...nodeMessagesEntry?.value,
};

export interface InstallProgress {
  step: InstallStep;
  progress: number;
  message: string;
  status: 'running' | 'success' | 'error';
  nodeVersion?: string;
  npmVersion?: string;
}

export class NodeJSInstaller {
  private privilegeHelper: PrivilegeHelper;
  private onProgress?: (progress: InstallProgress) => void;

  constructor() {
    this.privilegeHelper = new PrivilegeHelper({
      name: 'Claude安装助手',
      icns: path.join(__dirname, '../../../assets/icon.icns') // 如果有应用图标
    });
  }

  /**
   * 设置进度回调
   */
  setProgressCallback(callback: (progress: InstallProgress) => void) {
    this.onProgress = callback;
  }

  /**
   * 开始安装Node.js
   */
  async install(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('开始Node.js安装流程...');

      // 1. 检查当前权限
      this.emitProgress({
        step: InstallStep.NODEJS_INSTALL,
        progress: 5,
        message: NODE_MESSAGES.permissionCheck,
        status: 'running'
      });

      const hasPrivileges = await this.privilegeHelper.checkPrivileges();
      console.log('权限检查结果:', hasPrivileges);

      if (hasPrivileges) {
        this.emitProgress({
          step: InstallStep.NODEJS_INSTALL,
          progress: 10,
          message: NODE_MESSAGES.permissionGranted,
          status: 'running'
        });
      }

      // 2. 获取安装脚本路径
      const scriptPath = this.getInstallScriptPath();
      console.log('脚本路径:', scriptPath);

      // 检查脚本是否存在
      const fs = require('fs');
      if (!fs.existsSync(scriptPath)) {
        const error = `安装脚本不存在: ${scriptPath}`;
        console.error(error);
        this.emitProgress({
          step: InstallStep.NODEJS_INSTALL,
          progress: 0,
          message: error,
          status: 'error'
        });
        return { success: false, error };
      }

      // 3. 弹出权限对话框并执行安装
      this.emitProgress({
        step: InstallStep.NODEJS_INSTALL,
        progress: 15,
        message: NODE_MESSAGES.permissionPrompt,
        status: 'running'
      });

      console.log('执行安装脚本...');
      const result = await this.privilegeHelper.executeScript(scriptPath);
      console.log('脚本执行结果:', {
        success: result.success,
        stderr: result.stderr?.substring(0, 200),
        stdout: result.stdout?.substring(0, 200)
      });

      if (result.success) {
        // 解析安装脚本的JSON输出
        await this.parseInstallOutput(result.stdout);
        console.log('Node.js安装成功');
        return { success: true };
      } else {
        const errorMessage = this.parseErrorMessage(result.stderr, result.error);
        console.error('脚本执行失败:', errorMessage);
        this.emitProgress({
          step: InstallStep.NODEJS_INSTALL,
          progress: 0,
          message: errorMessage,
          status: 'error'
        });
        return { success: false, error: errorMessage };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('安装过程异常:', errorMessage);
      this.emitProgress({
        step: InstallStep.NODEJS_INSTALL,
        progress: 0,
        message: `${NODE_MESSAGES.genericError}: ${errorMessage}`,
        status: 'error'
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 获取安装脚本路径
   */
  private getInstallScriptPath(): string {
    const isDev = !app.isPackaged;
    console.log('环境信息:', {
      isDev,
      platform: process.platform,
      resourcesPath: process.resourcesPath,
      __dirname
    });

    let scriptPath: string;
    if (process.platform === 'darwin') {
      if (isDev) {
        scriptPath = path.join(__dirname, '../../../scripts/install-nodejs-with-progress.sh');
      } else {
        scriptPath = path.join(process.resourcesPath, 'scripts/install-nodejs-with-progress.sh');
      }
    } else if (process.platform === 'win32') {
      if (isDev) {
        scriptPath = path.join(__dirname, '../../../scripts/install-nodejs-with-progress.ps1');
      } else {
        scriptPath = path.join(process.resourcesPath, 'scripts/install-nodejs-with-progress.ps1');
      }
    } else {
      throw new Error('不支持的操作系统');
    }

    console.log('计算出的脚本路径:', scriptPath);
    return scriptPath;
  }

  /**
   * 解析安装脚本的输出
   */
  private async parseInstallOutput(output: string) {
    console.log('开始解析安装脚本输出:', output.substring(0, 500));

    if (!output || output.trim() === '') {
      console.warn('安装脚本输出为空，使用模拟进度');
      await this.simulateProgress();
      return;
    }

    const lines = output.split('\n').filter(line => line.trim());
    console.log('解析到的输出行数:', lines.length);

    let hasValidProgress = false;

    for (const [index, line] of lines.entries()) {
      try {
        console.log(`解析第${index + 1}行:`, line);
        const progress = JSON.parse(line) as InstallProgress;

        console.log('解析成功的进度:', progress);
        this.emitProgress(progress);
        hasValidProgress = true;

        // 增加延迟以便用户看到进度变化
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.log('非JSON行，跳过:', line);
        // 可能是其他输出，不是错误
      }
    }

    // 如果没有找到有效的进度信息，使用模拟进度
    if (!hasValidProgress) {
      console.log('未找到有效进度信息，使用模拟进度');
      await this.simulateProgress();
    }
  }

  /**
   * 模拟进度显示（当脚本输出不可用时）
   */
  private async simulateProgress() {
    const steps = [
      { progress: 20, message: NODE_MESSAGES.download, status: 'running' as const },
      { progress: 40, message: NODE_MESSAGES.verify, status: 'running' as const },
      { progress: 60, message: NODE_MESSAGES.install, status: 'running' as const },
      { progress: 80, message: NODE_MESSAGES.configureEnv, status: 'running' as const },
      { progress: 95, message: NODE_MESSAGES.finalize, status: 'running' as const },
      { progress: 100, message: NODE_MESSAGES.success, status: 'success' as const }
    ];

    for (const step of steps) {
      this.emitProgress({
        step: InstallStep.NODEJS_INSTALL,
        ...step
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * 解析错误信息
   */
  private parseErrorMessage(stderr: string, error?: Error): string {
    console.log('解析错误信息:', { stderr, error: error?.message });

    if (stderr.includes('User canceled')) {
      return '用户取消了权限授权，安装已中止';
    } else if (stderr.includes('authentication failed')) {
      return '密码验证失败，请重试';
    } else if (stderr.includes('network') || stderr.includes('download')) {
      return '网络连接失败，请检查网络设置后重试';
    } else if (stderr.includes('No such file')) {
      return '安装脚本文件缺失，请重新下载应用程序';
    } else if (stderr.includes('Permission denied')) {
      return '权限不足，请确保以管理员身份运行';
    } else if (stderr.includes('command not found')) {
      return '系统命令缺失，请检查系统环境';
    } else if (error) {
      return `安装失败: ${error.message}`;
    } else if (stderr) {
      return `安装失败: ${stderr}`;
    } else {
      return NODE_MESSAGES.genericError;
    }
  }

  /**
   * 发送进度事件
   */
  private emitProgress(progress: InstallProgress) {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }

  /**
   * 检查Node.js是否已安装
   */
  async checkNodeJS(): Promise<{ installed: boolean; version?: string; npmVersion?: string }> {
    return new Promise((resolve) => {
      const { exec } = require('child_process');

      // 常见的Node.js安装路径，确保PATH包含这些路径
      const commonPaths = [
        '/usr/local/bin',           // 常见的macOS安装路径
        '/opt/homebrew/bin',        // Homebrew on Apple Silicon
        '/usr/bin',                 // 系统默认路径
        '/bin',                     // 基本系统路径
        process.env.PATH || ''      // 现有PATH
      ].filter(Boolean).join(':');

      const options = {
        env: {
          ...process.env,
          PATH: commonPaths
        }
      };

      exec('node -v && npm -v', options, (error: any, stdout: string) => {
        if (error) {
          console.log('Node.js检测失败:', error.message);
          resolve({ installed: false });
        } else {
          const lines = stdout.trim().split('\n');
          console.log('Node.js检测成功:', lines);
          resolve({
            installed: true,
            version: lines[0],
            npmVersion: lines[1]
          });
        }
      });
    });
  }
}
