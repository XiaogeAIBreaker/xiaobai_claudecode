/**
 * Claude CLI 安装服务
 * 负责检测和安装 Claude CLI
 */

import { spawn } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';
import * as sudo from '@vscode/sudo-prompt';
import { log } from '../../shared/utils/logger';
import { ProgressEvent, InstallResult } from '../../shared/types/installer';
import { executeCommand } from '../../shared/utils/system';
import { getEnhancedEnv } from '../../shared/utils/env-loader';

/**
 * Claude CLI 安装器类
 */
export class ClaudeCliInstaller {
  private progressCallback?: (progress: ProgressEvent) => void;

  /**
   * 设置进度回调
   */
  setProgressCallback(callback: (progress: ProgressEvent) => void): void {
    this.progressCallback = callback;
  }

  /**
   * 检查 Claude CLI 是否已安装
   */
  async checkInstalled(): Promise<{ installed: boolean; version?: string }> {
    try {
      log.info('检查 Claude CLI 安装状态');

      const result = await executeCommand('claude --version', { timeout: 10000 });

      if (result.exitCode === 0) {
        const version = result.stdout.trim();
        log.info('Claude CLI 已安装', { version });
        return { installed: true, version };
      }

      log.info('Claude CLI 未安装');
      return { installed: false };
    } catch (error) {
      log.info('Claude CLI 未安装', { error });
      return { installed: false };
    }
  }

  /**
   * 安装 Claude CLI
   */
  async install(): Promise<InstallResult> {
    try {
      log.info('开始安装 Claude CLI');

      // 通知开始安装
      this.notifyProgress({
        step: 'claude-cli-install',
        progress: 0,
        message: '准备安装 Claude CLI...',
        status: 'running'
      });

      // 检查 npm 是否可用
      const npmCheck = await executeCommand('npm --version', { timeout: 5000 });
      if (npmCheck.exitCode !== 0) {
        throw new Error('npm 不可用，请先安装 Node.js');
      }

      this.notifyProgress({
        step: 'claude-cli-install',
        progress: 10,
        message: 'npm 检查完成，尝试本地安装...',
        status: 'running'
      });

      // 优先尝试本地安装（不需要 sudo）
      let installSuccess = false;
      let localInstallError: Error | null = null;

      try {
        await this.runLocalInstall();
        installSuccess = true;
        log.info('本地安装成功');
      } catch (error) {
        localInstallError = error as Error;
        log.warn('本地安装失败，将尝试全局安装', { error: localInstallError.message });
      }

      // 如果本地安装失败，尝试使用 sudo 进行全局安装
      if (!installSuccess) {
        this.notifyProgress({
          step: 'claude-cli-install',
          progress: 15,
          message: '本地安装失败，尝试全局安装（需要管理员权限）...',
          status: 'running'
        });

        await this.runGlobalInstallWithSudo();
        log.info('全局安装成功');
      }

      // 验证安装
      this.notifyProgress({
        step: 'claude-cli-install',
        progress: 90,
        message: '验证安装...',
        status: 'running'
      });

      const checkResult = await this.checkInstalled();
      if (!checkResult.installed) {
        throw new Error('安装完成但无法验证，请手动检查');
      }

      // 安装成功
      this.notifyProgress({
        step: 'claude-cli-install',
        progress: 100,
        message: `安装完成！版本: ${checkResult.version}`,
        status: 'success'
      });

      log.info('Claude CLI 安装成功', { version: checkResult.version });

      return {
        success: true,
        message: `Claude CLI 安装成功（版本 ${checkResult.version}）`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error('Claude CLI 安装失败', error as Error);

      this.notifyProgress({
        step: 'claude-cli-install',
        progress: 0,
        message: `安装失败: ${errorMessage}`,
        status: 'error'
      });

      return {
        success: false,
        error: errorMessage,
        errors: [{ message: errorMessage, recoverable: true }]
      };
    }
  }

  /**
   * 本地安装（安装到 ~/.npm-global）
   */
  private async runLocalInstall(): Promise<void> {
    return new Promise((resolve, reject) => {
      const npmGlobalPath = join(homedir(), '.npm-global');
      log.info('执行本地安装到', { path: npmGlobalPath });

      // 配置 npm prefix 到用户目录
      const enhancedEnv = getEnhancedEnv();
      const npmProcess = spawn('npm', ['install', '-g', '@anthropic-ai/claude-code', `--prefix=${npmGlobalPath}`], {
        shell: true,
        env: enhancedEnv
      });

      let stdoutData = '';
      let stderrData = '';
      let currentProgress = 20;

      // 监听标准输出
      npmProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        stdoutData += output;
        log.info('npm 本地安装输出', { output: output.substring(0, 200) });

        // 根据输出更新进度
        if (output.includes('http fetch')) {
          currentProgress = Math.min(currentProgress + 5, 50);
          this.notifyProgress({
            step: 'claude-cli-install',
            progress: currentProgress,
            message: '正在下载依赖包...',
            status: 'running'
          });
        } else if (output.includes('idealTree')) {
          currentProgress = 60;
          this.notifyProgress({
            step: 'claude-cli-install',
            progress: currentProgress,
            message: '正在解析依赖树...',
            status: 'running'
          });
        } else if (output.includes('reify')) {
          currentProgress = 70;
          this.notifyProgress({
            step: 'claude-cli-install',
            progress: currentProgress,
            message: '正在安装包...',
            status: 'running'
          });
        } else if (output.includes('added') || output.includes('changed')) {
          currentProgress = 85;
          this.notifyProgress({
            step: 'claude-cli-install',
            progress: currentProgress,
            message: '正在完成本地安装...',
            status: 'running'
          });
        }
      });

      // 监听标准错误
      npmProcess.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        stderrData += output;
        log.warn('npm 本地安装错误输出', { output: output.substring(0, 200) });
      });

      // 监听进程退出
      npmProcess.on('close', async (code: number) => {
        log.info('npm 本地安装进程退出', { code, stdoutLength: stdoutData.length, stderrLength: stderrData.length });

        if (code === 0) {
          // 本地安装成功后，需要配置 PATH
          await this.setupPath(npmGlobalPath);
          resolve();
        } else {
          const errorMsg = stderrData || stdoutData || `npm 本地安装失败，退出码: ${code}`;
          reject(new Error(errorMsg));
        }
      });

      // 监听错误
      npmProcess.on('error', (error: Error) => {
        log.error('npm 本地安装进程错误', error);
        reject(error);
      });
    });
  }

  /**
   * 使用 sudo 进行全局安装
   */
  private async runGlobalInstallWithSudo(): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = 'npm install -g @anthropic-ai/claude-code';
      log.info('使用 sudo 执行全局安装');

      let currentProgress = 20;

      sudo.exec(command, { name: 'Claude Installer' }, (error, stdout, stderr) => {
        if (error) {
          log.error('sudo 安装失败', error);
          reject(error);
          return;
        }

        log.info('sudo 安装完成', {
          stdoutLength: stdout?.toString().length || 0,
          stderrLength: stderr?.toString().length || 0
        });

        // 更新进度到 85%
        this.notifyProgress({
          step: 'claude-cli-install',
          progress: 85,
          message: '全局安装完成...',
          status: 'running'
        });

        resolve();
      });

      // 显示权限请求提示
      this.notifyProgress({
        step: 'claude-cli-install',
        progress: 20,
        message: '请在弹出的对话框中输入密码以授权全局安装...',
        status: 'running'
      });
    });
  }

  /**
   * 配置 PATH 环境变量（本地安装时需要）
   */
  private async setupPath(npmGlobalPath: string): Promise<void> {
    try {
      log.info('配置 PATH 环境变量');

      const binPath = join(npmGlobalPath, 'bin');
      const shellConfigFiles = ['.zshrc', '.bashrc', '.bash_profile'];
      const pathExport = `\n# Claude CLI Path\nexport PATH="${binPath}:$PATH"\n`;

      for (const configFile of shellConfigFiles) {
        const configPath = join(homedir(), configFile);

        try {
          // 检查文件是否存在
          const checkResult = await executeCommand(`test -f "${configPath}" && echo "exists"`, { timeout: 1000 });

          if (checkResult.stdout.trim() === 'exists') {
            // 检查是否已经配置过
            const grepResult = await executeCommand(`grep -q "Claude CLI Path" "${configPath}" && echo "found"`, { timeout: 1000 });

            if (grepResult.stdout.trim() !== 'found') {
              // 追加配置
              await executeCommand(`echo '${pathExport}' >> "${configPath}"`, { timeout: 1000 });
              log.info('PATH 已添加到', { file: configFile });
            } else {
              log.info('PATH 已存在于', { file: configFile });
            }
          }
        } catch (error) {
          // 文件不存在或其他错误，继续处理下一个文件
          log.warn('处理配置文件失败', { file: configFile, error });
        }
      }

      log.info('PATH 配置完成');
    } catch (error) {
      log.error('配置 PATH 失败', error as Error);
      // 不抛出错误，因为 PATH 配置失败不应该导致整个安装失败
    }
  }

  /**
   * 通知进度更新
   */
  private notifyProgress(progress: ProgressEvent): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }
}
