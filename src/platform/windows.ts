/**
 * Windows平台特定功能集成
 * 负责路径处理、权限管理、注册表操作等Windows专用功能
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

/**
 * Windows路径处理配置接口
 */
interface WindowsPathConfig {
  useShortPaths: boolean;
  handleLongPaths: boolean;
  normalizeSlashes: boolean;
  validatePaths: boolean;
}

/**
 * Windows权限信息接口
 */
interface WindowsPermission {
  path: string;
  owner: string;
  permissions: {
    read: boolean;
    write: boolean;
    execute: boolean;
    fullControl: boolean;
  };
  inherited: boolean;
}

/**
 * Windows注册表项接口
 */
interface WindowsRegistryEntry {
  key: string;
  valueName: string;
  valueType: 'REG_SZ' | 'REG_DWORD' | 'REG_BINARY' | 'REG_MULTI_SZ';
  value: string | number | Buffer;
}

/**
 * Windows系统信息接口
 */
interface WindowsSystemInfo {
  version: string;
  build: string;
  edition: string;
  architecture: string;
  isAdmin: boolean;
  isDomainJoined: boolean;
  userName: string;
  computerName: string;
}

/**
 * Windows平台功能类
 */
class WindowsPlatform {
  private pathConfig: WindowsPathConfig = {
    useShortPaths: false,
    handleLongPaths: true,
    normalizeSlashes: true,
    validatePaths: true
  };

  /**
   * 检查是否为Windows平台
   */
  static isWindows(): boolean {
    return os.platform() === 'win32';
  }

  /**
   * 初始化Windows平台功能
   */
  async initialize(config?: Partial<WindowsPathConfig>): Promise<void> {
    if (!WindowsPlatform.isWindows()) {
      throw new Error('此功能只能在Windows平台上使用');
    }

    if (config) {
      this.pathConfig = { ...this.pathConfig, ...config };
    }

    console.log('Windows平台功能初始化完成');
  }

  /**
   * 规范化Windows路径
   */
  normalizePath(inputPath: string): string {
    if (!this.pathConfig.normalizeSlashes) {
      return inputPath;
    }

    // 转换为Windows风格的路径分隔符
    let normalized = inputPath.replace(/\//g, '\\');

    // 处理UNC路径
    if (normalized.startsWith('\\\\')) {
      normalized = '\\\\' + normalized.slice(2).replace(/\\\\/g, '\\');
    }

    // 处理驱动器路径
    if (normalized.match(/^[a-zA-Z]:\\/)) {
      normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }

    // 移除重复的反斜杠
    normalized = normalized.replace(/\\+/g, '\\');

    // 移除尾部反斜杠（除非是根目录）
    if (normalized.length > 3 && normalized.endsWith('\\')) {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  }

  /**
   * 获取短路径（8.3格式）
   */
  async getShortPath(longPath: string): Promise<string> {
    if (!this.pathConfig.useShortPaths) {
      return longPath;
    }

    return new Promise((resolve, reject) => {
      const cmd = spawn('cmd', ['/c', 'for', '%i', 'in', `("${longPath}")`, 'do', '@echo', '%~si'], {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      cmd.stdout.on('data', (data) => {
        output += data.toString();
      });

      cmd.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`获取短路径失败: ${longPath}`));
        }
      });

      cmd.on('error', reject);
    });
  }

  /**
   * 验证路径是否有效
   */
  async validatePath(inputPath: string): Promise<boolean> {
    if (!this.pathConfig.validatePaths) {
      return true;
    }

    try {
      const normalized = this.normalizePath(inputPath);

      // 检查路径长度（Windows限制）
      if (normalized.length > 260 && !this.pathConfig.handleLongPaths) {
        return false;
      }

      // 检查无效字符
      const invalidChars = /[<>:"|?*]/;
      if (invalidChars.test(normalized)) {
        return false;
      }

      // 检查保留名称
      const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
      const basename = path.basename(normalized).toUpperCase();
      if (reservedNames.includes(basename)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查管理员权限
   */
  async isAdmin(): Promise<boolean> {
    return new Promise((resolve) => {
      const cmd = spawn('net', ['session'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      cmd.on('close', (code) => {
        // net session 命令需要管理员权限
        // 如果返回码为0，说明有管理员权限
        resolve(code === 0);
      });

      cmd.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * 获取文件或目录的权限信息
   */
  async getPermissions(targetPath: string): Promise<WindowsPermission> {
    const normalized = this.normalizePath(targetPath);

    return new Promise((resolve, reject) => {
      // 使用icacls命令获取权限信息
      const cmd = spawn('icacls', [normalized], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      cmd.stdout.on('data', (data) => {
        output += data.toString();
      });

      cmd.on('close', (code) => {
        if (code === 0) {
          try {
            const permission = this.parseIcaclsOutput(output, normalized);
            resolve(permission);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`获取权限信息失败: ${normalized}`));
        }
      });

      cmd.on('error', reject);
    });
  }

  /**
   * 设置文件或目录权限
   */
  async setPermissions(targetPath: string, permissions: string): Promise<void> {
    const normalized = this.normalizePath(targetPath);

    return new Promise((resolve, reject) => {
      // 使用icacls命令设置权限
      const cmd = spawn('icacls', [normalized, '/grant', permissions], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      cmd.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`设置权限失败: ${normalized}`));
        }
      });

      cmd.on('error', reject);
    });
  }

  /**
   * 读取注册表值
   */
  async readRegistry(key: string, valueName: string): Promise<WindowsRegistryEntry | null> {
    return new Promise((resolve, reject) => {
      const cmd = spawn('reg', ['query', key, '/v', valueName], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      cmd.stdout.on('data', (data) => {
        output += data.toString();
      });

      cmd.on('close', (code) => {
        if (code === 0) {
          try {
            const entry = this.parseRegistryOutput(output, key, valueName);
            resolve(entry);
          } catch (error) {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });

      cmd.on('error', () => resolve(null));
    });
  }

  /**
   * 写入注册表值
   */
  async writeRegistry(entry: WindowsRegistryEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = ['add', entry.key, '/v', entry.valueName, '/t', entry.valueType, '/d', String(entry.value), '/f'];

      const cmd = spawn('reg', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      cmd.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`写入注册表失败: ${entry.key}\\${entry.valueName}`));
        }
      });

      cmd.on('error', reject);
    });
  }

  /**
   * 获取Windows系统信息
   */
  async getSystemInfo(): Promise<WindowsSystemInfo> {
    const [version, userName, computerName, isAdmin] = await Promise.all([
      this.getWindowsVersion(),
      this.getUserName(),
      this.getComputerName(),
      this.isAdmin()
    ]);

    return {
      version: version.version,
      build: version.build,
      edition: version.edition,
      architecture: process.arch,
      isAdmin,
      isDomainJoined: await this.isDomainJoined(),
      userName,
      computerName
    };
  }

  /**
   * 获取Windows版本信息
   */
  private async getWindowsVersion(): Promise<{ version: string; build: string; edition: string }> {
    return new Promise((resolve, reject) => {
      const cmd = spawn('wmic', ['os', 'get', 'Caption,Version,BuildNumber', '/format:csv'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      cmd.stdout.on('data', (data) => {
        output += data.toString();
      });

      cmd.on('close', (code) => {
        if (code === 0) {
          try {
            const lines = output.split('\n').filter(line => line.trim() && !line.includes('Node'));
            if (lines.length >= 1) {
              const parts = lines[1].split(',');
              resolve({
                build: parts[1] || '未知',
                edition: parts[2] || '未知',
                version: parts[3] || '未知'
              });
            } else {
              resolve({ version: '未知', build: '未知', edition: '未知' });
            }
          } catch (error) {
            resolve({ version: '未知', build: '未知', edition: '未知' });
          }
        } else {
          reject(new Error('获取Windows版本信息失败'));
        }
      });

      cmd.on('error', reject);
    });
  }

  /**
   * 获取用户名
   */
  private async getUserName(): Promise<string> {
    return process.env.USERNAME || os.userInfo().username;
  }

  /**
   * 获取计算机名
   */
  private async getComputerName(): Promise<string> {
    return process.env.COMPUTERNAME || os.hostname();
  }

  /**
   * 检查是否加入域
   */
  private async isDomainJoined(): Promise<boolean> {
    return new Promise((resolve) => {
      const cmd = spawn('wmic', ['computersystem', 'get', 'PartOfDomain'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      cmd.stdout.on('data', (data) => {
        output += data.toString();
      });

      cmd.on('close', () => {
        resolve(output.toLowerCase().includes('true'));
      });

      cmd.on('error', () => resolve(false));
    });
  }

  /**
   * 解析icacls命令输出
   */
  private parseIcaclsOutput(output: string, targetPath: string): WindowsPermission {
    const lines = output.split('\n').filter(line => line.trim());

    // 默认权限信息
    const permission: WindowsPermission = {
      path: targetPath,
      owner: '未知',
      permissions: {
        read: false,
        write: false,
        execute: false,
        fullControl: false
      },
      inherited: false
    };

    // 解析权限信息（简化版本）
    for (const line of lines) {
      if (line.includes('(F)')) {
        permission.permissions.fullControl = true;
        permission.permissions.read = true;
        permission.permissions.write = true;
        permission.permissions.execute = true;
      } else if (line.includes('(M)')) {
        permission.permissions.read = true;
        permission.permissions.write = true;
        permission.permissions.execute = true;
      } else if (line.includes('(RX)')) {
        permission.permissions.read = true;
        permission.permissions.execute = true;
      } else if (line.includes('(R)')) {
        permission.permissions.read = true;
      }

      if (line.includes('(I)')) {
        permission.inherited = true;
      }
    }

    return permission;
  }

  /**
   * 解析注册表命令输出
   */
  private parseRegistryOutput(output: string, key: string, valueName: string): WindowsRegistryEntry {
    const lines = output.split('\n').filter(line => line.trim());

    for (const line of lines) {
      if (line.includes(valueName)) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          const valueType = parts[1] as WindowsRegistryEntry['valueType'];
          const value = parts.slice(2).join(' ');

          return {
            key,
            valueName,
            valueType,
            value: valueType === 'REG_DWORD' ? parseInt(value, 16) : value
          };
        }
      }
    }

    throw new Error(`注册表值不存在: ${key}\\${valueName}`);
  }

  /**
   * 创建Windows快捷方式
   */
  async createShortcut(targetPath: string, shortcutPath: string, options?: {
    description?: string;
    iconPath?: string;
    workingDirectory?: string;
    arguments?: string;
  }): Promise<void> {
    const vbsScript = `
Set WshShell = CreateObject("WScript.Shell")
Set oShellLink = WshShell.CreateShortcut("${shortcutPath}")
oShellLink.TargetPath = "${targetPath}"
${options?.description ? `oShellLink.Description = "${options.description}"` : ''}
${options?.iconPath ? `oShellLink.IconLocation = "${options.iconPath}"` : ''}
${options?.workingDirectory ? `oShellLink.WorkingDirectory = "${options.workingDirectory}"` : ''}
${options?.arguments ? `oShellLink.Arguments = "${options.arguments}"` : ''}
oShellLink.Save
`;

    const tempVbsFile = path.join(os.tmpdir(), `create_shortcut_${Date.now()}.vbs`);

    try {
      await fs.writeFile(tempVbsFile, vbsScript);

      return new Promise((resolve, reject) => {
        const cmd = spawn('cscript', ['/nologo', tempVbsFile], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        cmd.on('close', async (code) => {
          try {
            await fs.unlink(tempVbsFile);
          } catch (error) {
            // 忽略清理错误
          }

          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`创建快捷方式失败: ${shortcutPath}`));
          }
        });

        cmd.on('error', async (error) => {
          try {
            await fs.unlink(tempVbsFile);
          } catch (cleanupError) {
            // 忽略清理错误
          }
          reject(error);
        });
      });
    } catch (error) {
      throw new Error(`创建快捷方式失败: ${error}`);
    }
  }

  /**
   * 获取环境变量
   */
  getEnvironmentVariable(name: string): string | undefined {
    return process.env[name];
  }

  /**
   * 设置环境变量（当前进程）
   */
  setEnvironmentVariable(name: string, value: string): void {
    process.env[name] = value;
  }

  /**
   * 检查文件关联
   */
  async getFileAssociation(extension: string): Promise<string | null> {
    if (!extension.startsWith('.')) {
      extension = '.' + extension;
    }

    const entry = await this.readRegistry(`HKEY_CLASSES_ROOT\\${extension}`, '');
    return entry ? String(entry.value) : null;
  }

  /**
   * 获取特殊文件夹路径
   */
  async getSpecialFolder(folder: 'Desktop' | 'Documents' | 'Downloads' | 'Pictures' | 'Music' | 'Videos' | 'AppData' | 'LocalAppData' | 'ProgramFiles' | 'System'): Promise<string> {
    const folderMap: Record<string, string> = {
      'Desktop': 'USERPROFILE\\Desktop',
      'Documents': 'USERPROFILE\\Documents',
      'Downloads': 'USERPROFILE\\Downloads',
      'Pictures': 'USERPROFILE\\Pictures',
      'Music': 'USERPROFILE\\Music',
      'Videos': 'USERPROFILE\\Videos',
      'AppData': 'APPDATA',
      'LocalAppData': 'LOCALAPPDATA',
      'ProgramFiles': 'PROGRAMFILES',
      'System': 'SYSTEMROOT\\System32'
    };

    const envVar = folderMap[folder];
    if (!envVar) {
      throw new Error(`未知的特殊文件夹: ${folder}`);
    }

    // 简单的环境变量替换
    if (envVar.includes('\\')) {
      const [baseVar, subPath] = envVar.split('\\', 2);
      const basePath = process.env[baseVar];
      return basePath ? path.join(basePath, subPath) : '';
    } else {
      return process.env[envVar] || '';
    }
  }
}

/**
 * 全局Windows平台实例
 */
export const windowsPlatform = new WindowsPlatform();

/**
 * 导出类型定义
 */
export type { WindowsPathConfig, WindowsPermission, WindowsRegistryEntry, WindowsSystemInfo };

/**
 * 导出Windows平台类
 */
export { WindowsPlatform };