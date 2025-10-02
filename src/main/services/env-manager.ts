/**
 * 环境变量管理服务
 * 负责读取和设置全局环境变量
 */

import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync, appendFileSync } from 'fs';
import { log } from '../../shared/utils/logger';
import { executeCommand } from '../../shared/utils/system';

/**
 * 环境变量管理器类
 */
export class EnvManager {
  /**
   * 获取环境变量
   */
  async getEnvVars(keys: string[]): Promise<Record<string, string | undefined>> {
    const result: Record<string, string | undefined> = {};

    for (const key of keys) {
      // 先从 process.env 读取
      let value = process.env[key];

      // 如果没有，尝试从 shell 配置文件读取
      if (!value) {
        value = await this.readEnvFromShellConfig(key);
      }

      result[key] = value;
    }

    log.info('获取环境变量', { keys, result });
    return result;
  }

  /**
   * 设置环境变量（全局生效）
   */
  async setEnvVars(vars: Record<string, string>): Promise<void> {
    try {
      log.info('设置环境变量', { vars });

      // 1. 更新当前进程的环境变量
      for (const [key, value] of Object.entries(vars)) {
        process.env[key] = value;
      }

      // 2. 写入 shell 配置文件
      await this.writeEnvToShellConfig(vars);

      log.info('环境变量设置成功');
    } catch (error) {
      log.error('设置环境变量失败', error as Error);
      throw error;
    }
  }

  /**
   * 从 shell 配置文件读取环境变量
   */
  private async readEnvFromShellConfig(key: string): Promise<string | undefined> {
    const home = homedir();
    const configFiles = ['.zshrc', '.bashrc', '.bash_profile', '.profile'];

    for (const configFile of configFiles) {
      const configPath = join(home, configFile);

      if (existsSync(configPath)) {
        try {
          const content = readFileSync(configPath, 'utf-8');

          // 匹配 export KEY=value 或 export KEY="value"
          const regex = new RegExp(`export\\s+${key}=["']?([^"'\\n]+)["']?`, 'i');
          const match = content.match(regex);

          if (match && match[1]) {
            log.info(`从 ${configFile} 读取到环境变量`, { key, value: match[1] });
            return match[1];
          }
        } catch (error) {
          log.warn(`读取 ${configFile} 失败`, { error });
        }
      }
    }

    return undefined;
  }

  /**
   * 写入 shell 配置文件
   */
  private async writeEnvToShellConfig(vars: Record<string, string>): Promise<void> {
    const home = homedir();

    // 确定要写入的配置文件（优先 .zshrc，其次 .bashrc）
    let targetFile = '.zshrc';
    let targetPath = join(home, targetFile);

    if (!existsSync(targetPath)) {
      targetFile = '.bashrc';
      targetPath = join(home, targetFile);

      if (!existsSync(targetPath)) {
        targetFile = '.bash_profile';
        targetPath = join(home, targetFile);
      }
    }

    log.info('目标配置文件', { targetFile, targetPath });

    // 读取现有内容
    let existingContent = '';
    if (existsSync(targetPath)) {
      existingContent = readFileSync(targetPath, 'utf-8');
    }

    // 准备要添加的内容
    const newLines: string[] = ['\n# Claude Code Environment Variables'];

    for (const [key, value] of Object.entries(vars)) {
      // 检查是否已存在
      const regex = new RegExp(`export\\s+${key}=`, 'i');

      if (regex.test(existingContent)) {
        // 如果已存在，使用 sed 替换
        const escapedValue = value.replace(/[\/&]/g, '\\$&'); // 转义特殊字符
        const sedCommand = `sed -i.bak 's|export ${key}=.*|export ${key}="${escapedValue}"|g' "${targetPath}"`;

        try {
          await executeCommand(sedCommand, { timeout: 5000 });
          log.info(`更新环境变量 ${key}`);
        } catch (error) {
          log.error(`更新环境变量 ${key} 失败`, error as Error);
        }
      } else {
        // 如果不存在，追加
        newLines.push(`export ${key}="${value}"`);
      }
    }

    // 追加新的环境变量
    if (newLines.length > 1) {
      const contentToAppend = newLines.join('\n') + '\n';
      appendFileSync(targetPath, contentToAppend);
      log.info('追加新的环境变量到配置文件');
    }

    // 立即加载到当前 shell
    try {
      await executeCommand(`source "${targetPath}"`, { timeout: 5000 });
      log.info('环境变量已生效');
    } catch (error) {
      log.warn('source 命令执行失败，环境变量将在下次启动 shell 时生效', { error });
    }
  }

  /**
   * 删除环境变量
   */
  async removeEnvVars(keys: string[]): Promise<void> {
    try {
      log.info('删除环境变量', { keys });

      // 1. 从当前进程删除
      for (const key of keys) {
        delete process.env[key];
      }

      // 2. 从配置文件删除
      const home = homedir();
      const configFiles = ['.zshrc', '.bashrc', '.bash_profile', '.profile'];

      for (const configFile of configFiles) {
        const configPath = join(home, configFile);

        if (existsSync(configPath)) {
          for (const key of keys) {
            const sedCommand = `sed -i.bak '/export ${key}=/d' "${configPath}"`;

            try {
              await executeCommand(sedCommand, { timeout: 5000 });
            } catch (error) {
              log.warn(`从 ${configFile} 删除 ${key} 失败`, { error });
            }
          }
        }
      }

      log.info('环境变量删除成功');
    } catch (error) {
      log.error('删除环境变量失败', error as Error);
      throw error;
    }
  }
}
