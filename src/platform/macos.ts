/**
 * macOS平台特定功能集成
 * 负责权限管理、文件系统操作、钥匙串访问等macOS专用功能
 */

import { spawn, exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * macOS权限配置接口
 */
interface MacOSPermissionConfig {
  requestFullDiskAccess: boolean;
  requestPrivacyPermissions: boolean;
  checkCodeSigning: boolean;
  useKeychain: boolean;
}

/**
 * macOS权限信息接口
 */
interface MacOSPermission {
  path: string;
  owner: string;
  group: string;
  permissions: {
    owner: { read: boolean; write: boolean; execute: boolean };
    group: { read: boolean; write: boolean; execute: boolean };
    others: { read: boolean; write: boolean; execute: boolean };
  };
  extendedAttributes: Record<string, string>;
  acl?: string[];
}

/**
 * macOS系统信息接口
 */
interface MacOSSystemInfo {
  version: string;
  build: string;
  codename: string;
  architecture: string;
  kernelVersion: string;
  hostname: string;
  userName: string;
  homeDirectory: string;
  isAppleSilicon: boolean;
  hasAdminRights: boolean;
}

/**
 * macOS钥匙串项接口
 */
interface MacOSKeychainItem {
  service: string;
  account: string;
  password?: string;
  type: 'internet' | 'generic';
  attributes?: Record<string, string>;
}

/**
 * macOS启动项接口
 */
interface MacOSLaunchAgent {
  label: string;
  programPath: string;
  arguments?: string[];
  workingDirectory?: string;
  runAtLoad?: boolean;
  keepAlive?: boolean;
  standardOutPath?: string;
  standardErrorPath?: string;
}

/**
 * macOS平台功能类
 */
class MacOSPlatform {
  private permissionConfig: MacOSPermissionConfig = {
    requestFullDiskAccess: false,
    requestPrivacyPermissions: true,
    checkCodeSigning: true,
    useKeychain: true
  };

  /**
   * 检查是否为macOS平台
   */
  static isMacOS(): boolean {
    return os.platform() === 'darwin';
  }

  /**
   * 初始化macOS平台功能
   */
  async initialize(config?: Partial<MacOSPermissionConfig>): Promise<void> {
    if (!MacOSPlatform.isMacOS()) {
      throw new Error('此功能只能在macOS平台上使用');
    }

    if (config) {
      this.permissionConfig = { ...this.permissionConfig, ...config };
    }

    console.log('macOS平台功能初始化完成');
  }

  /**
   * 获取文件或目录的权限信息
   */
  async getPermissions(targetPath: string): Promise<MacOSPermission> {
    try {
      // 使用 ls -la 获取基本权限信息
      const { stdout: lsOutput } = await execAsync(`ls -la "${targetPath}"`);

      // 使用 xattr 获取扩展属性
      let extendedAttributes: Record<string, string> = {};
      try {
        const { stdout: xattrOutput } = await execAsync(`xattr -l "${targetPath}"`);
        extendedAttributes = this.parseExtendedAttributes(xattrOutput);
      } catch (error) {
        // 扩展属性可能不存在，忽略错误
      }

      // 使用 ls -le 获取ACL信息
      let acl: string[] = [];
      try {
        const { stdout: aclOutput } = await execAsync(`ls -le "${targetPath}"`);
        acl = this.parseACL(aclOutput);
      } catch (error) {
        // ACL可能不存在，忽略错误
      }

      return this.parseLsOutput(lsOutput, targetPath, extendedAttributes, acl);
    } catch (error) {
      throw new Error(`获取权限信息失败: ${error}`);
    }
  }

  /**
   * 设置文件或目录权限
   */
  async setPermissions(targetPath: string, mode: string, recursive: boolean = false): Promise<void> {
    try {
      const args = recursive ? ['-R', mode, targetPath] : [mode, targetPath];
      await execAsync(`chmod ${args.join(' ')}`);
    } catch (error) {
      throw new Error(`设置权限失败: ${error}`);
    }
  }

  /**
   * 设置文件或目录所有者
   */
  async setOwner(targetPath: string, owner: string, group?: string, recursive: boolean = false): Promise<void> {
    try {
      const ownerGroup = group ? `${owner}:${group}` : owner;
      const args = recursive ? ['-R', ownerGroup, targetPath] : [ownerGroup, targetPath];
      await execAsync(`chown ${args.join(' ')}`);
    } catch (error) {
      throw new Error(`设置所有者失败: ${error}`);
    }
  }

  /**
   * 检查是否有管理员权限
   */
  async hasAdminRights(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('groups');
      return stdout.includes('admin') || stdout.includes('wheel');
    } catch (error) {
      return false;
    }
  }

  /**
   * 请求管理员权限执行命令
   */
  async runWithSudo(command: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const osascript = `
        do shell script "${command.join(' ')}" with administrator privileges
      `;

      const cmd = spawn('osascript', ['-e', osascript], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      cmd.stdout.on('data', (data) => {
        output += data.toString();
      });

      cmd.stderr.on('data', (data) => {
        error += data.toString();
      });

      cmd.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`命令执行失败: ${error || '用户取消了权限请求'}`));
        }
      });

      cmd.on('error', reject);
    });
  }

  /**
   * 获取macOS系统信息
   */
  async getSystemInfo(): Promise<MacOSSystemInfo> {
    try {
      const [swVersion, kernelVersion, hostname, hasAdminRights] = await Promise.all([
        this.getSwVersion(),
        this.getKernelVersion(),
        this.getHostname(),
        this.hasAdminRights()
      ]);

      const userInfo = os.userInfo();
      const isAppleSilicon = process.arch === 'arm64';

      return {
        version: swVersion.version,
        build: swVersion.build,
        codename: swVersion.codename,
        architecture: process.arch,
        kernelVersion,
        hostname,
        userName: userInfo.username,
        homeDirectory: userInfo.homedir,
        isAppleSilicon,
        hasAdminRights
      };
    } catch (error) {
      throw new Error(`获取系统信息失败: ${error}`);
    }
  }

  /**
   * 保存密码到钥匙串
   */
  async saveToKeychain(item: MacOSKeychainItem): Promise<void> {
    if (!this.permissionConfig.useKeychain) {
      throw new Error('钥匙串功能未启用');
    }

    try {
      const args = [
        'add-generic-password',
        '-a', item.account,
        '-s', item.service,
        '-w', item.password || ''
      ];

      if (item.type === 'internet') {
        args[0] = 'add-internet-password';
      }

      await execAsync(`security ${args.join(' ')}`);
    } catch (error) {
      throw new Error(`保存到钥匙串失败: ${error}`);
    }
  }

  /**
   * 从钥匙串获取密码
   */
  async getFromKeychain(service: string, account: string, type: 'internet' | 'generic' = 'generic'): Promise<string> {
    if (!this.permissionConfig.useKeychain) {
      throw new Error('钥匙串功能未启用');
    }

    try {
      const command = type === 'internet' ? 'find-internet-password' : 'find-generic-password';
      const { stdout } = await execAsync(`security ${command} -a "${account}" -s "${service}" -w`);
      return stdout.trim();
    } catch (error) {
      throw new Error(`从钥匙串获取密码失败: ${error}`);
    }
  }

  /**
   * 从钥匙串删除密码
   */
  async deleteFromKeychain(service: string, account: string, type: 'internet' | 'generic' = 'generic'): Promise<void> {
    if (!this.permissionConfig.useKeychain) {
      throw new Error('钥匙串功能未启用');
    }

    try {
      const command = type === 'internet' ? 'delete-internet-password' : 'delete-generic-password';
      await execAsync(`security ${command} -a "${account}" -s "${service}"`);
    } catch (error) {
      throw new Error(`从钥匙串删除密码失败: ${error}`);
    }
  }

  /**
   * 创建启动项（Launch Agent）
   */
  async createLaunchAgent(agent: MacOSLaunchAgent): Promise<void> {
    const launchAgentsDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
    const plistPath = path.join(launchAgentsDir, `${agent.label}.plist`);

    // 确保目录存在
    await fs.mkdir(launchAgentsDir, { recursive: true });

    const plistContent = this.generateLaunchAgentPlist(agent);

    try {
      await fs.writeFile(plistPath, plistContent);

      // 加载启动项
      await execAsync(`launchctl load "${plistPath}"`);
    } catch (error) {
      throw new Error(`创建启动项失败: ${error}`);
    }
  }

  /**
   * 删除启动项
   */
  async removeLaunchAgent(label: string): Promise<void> {
    const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', `${label}.plist`);

    try {
      // 卸载启动项
      await execAsync(`launchctl unload "${plistPath}"`);

      // 删除plist文件
      await fs.unlink(plistPath);
    } catch (error) {
      throw new Error(`删除启动项失败: ${error}`);
    }
  }

  /**
   * 检查应用是否已签名
   */
  async checkCodeSigning(appPath: string): Promise<boolean> {
    if (!this.permissionConfig.checkCodeSigning) {
      return true;
    }

    try {
      await execAsync(`codesign -dv "${appPath}"`);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取应用包信息
   */
  async getAppBundleInfo(appPath: string): Promise<Record<string, any>> {
    try {
      const infoPlistPath = path.join(appPath, 'Contents', 'Info.plist');
      const { stdout } = await execAsync(`plutil -convert json -o - "${infoPlistPath}"`);
      return JSON.parse(stdout);
    } catch (error) {
      throw new Error(`获取应用包信息失败: ${error}`);
    }
  }

  /**
   * 打开Finder到指定路径
   */
  async openInFinder(targetPath: string): Promise<void> {
    try {
      await execAsync(`open -R "${targetPath}"`);
    } catch (error) {
      throw new Error(`在Finder中打开失败: ${error}`);
    }
  }

  /**
   * 显示通知
   */
  async showNotification(title: string, message: string, subtitle?: string): Promise<void> {
    try {
      let osascript = `display notification "${message}" with title "${title}"`;
      if (subtitle) {
        osascript += ` subtitle "${subtitle}"`;
      }

      await execAsync(`osascript -e '${osascript}'`);
    } catch (error) {
      throw new Error(`显示通知失败: ${error}`);
    }
  }

  /**
   * 获取系统偏好设置中的权限状态
   */
  async getPrivacyPermissions(): Promise<Record<string, boolean>> {
    if (!this.permissionConfig.requestPrivacyPermissions) {
      return {};
    }

    const permissions: Record<string, boolean> = {};

    try {
      // 检查全盘访问权限
      const { stdout: tccOutput } = await execAsync('sqlite3 /Library/Application\\ Support/com.apple.TCC/TCC.db "SELECT service, allowed FROM access WHERE client = \'com.apple.dt.Xcode\'"');

      // 这里简化处理，实际应用中需要更复杂的权限检查逻辑
      permissions.fullDiskAccess = tccOutput.includes('kTCCServiceSystemPolicyAllFiles|1');
      permissions.accessibility = tccOutput.includes('kTCCServiceAccessibility|1');

    } catch (error) {
      // 权限检查失败，返回默认值
      permissions.fullDiskAccess = false;
      permissions.accessibility = false;
    }

    return permissions;
  }

  /**
   * 获取特殊目录路径
   */
  async getSpecialDirectory(directory: 'Desktop' | 'Documents' | 'Downloads' | 'Pictures' | 'Music' | 'Movies' | 'Applications' | 'Library'): Promise<string> {
    const homeDir = os.homedir();

    const directoryMap: Record<string, string> = {
      'Desktop': path.join(homeDir, 'Desktop'),
      'Documents': path.join(homeDir, 'Documents'),
      'Downloads': path.join(homeDir, 'Downloads'),
      'Pictures': path.join(homeDir, 'Pictures'),
      'Music': path.join(homeDir, 'Music'),
      'Movies': path.join(homeDir, 'Movies'),
      'Applications': '/Applications',
      'Library': path.join(homeDir, 'Library')
    };

    return directoryMap[directory] || homeDir;
  }

  /**
   * 检查命令行工具是否安装
   */
  async checkCommandLineTools(): Promise<boolean> {
    try {
      await execAsync('xcode-select -p');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 安装命令行工具
   */
  async installCommandLineTools(): Promise<void> {
    try {
      await execAsync('xcode-select --install');
    } catch (error) {
      throw new Error(`安装命令行工具失败: ${error}`);
    }
  }

  /**
   * 解析ls命令输出
   */
  private parseLsOutput(output: string, targetPath: string, extendedAttributes: Record<string, string>, acl: string[]): MacOSPermission {
    const lines = output.trim().split('\n');
    const firstLine = lines[0];

    if (!firstLine) {
      throw new Error('无法解析权限信息');
    }

    // 解析权限字符串（例如：-rwxr-xr-x）
    const permissionString = firstLine.substring(0, 10);
    const parts = firstLine.split(/\s+/);

    const owner = parts[2] || '未知';
    const group = parts[3] || '未知';

    return {
      path: targetPath,
      owner,
      group,
      permissions: {
        owner: {
          read: permissionString[1] === 'r',
          write: permissionString[2] === 'w',
          execute: permissionString[3] === 'x'
        },
        group: {
          read: permissionString[4] === 'r',
          write: permissionString[5] === 'w',
          execute: permissionString[6] === 'x'
        },
        others: {
          read: permissionString[7] === 'r',
          write: permissionString[8] === 'w',
          execute: permissionString[9] === 'x'
        }
      },
      extendedAttributes,
      acl: acl.length > 0 ? acl : undefined
    };
  }

  /**
   * 解析扩展属性
   */
  private parseExtendedAttributes(output: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    const lines = output.trim().split('\n');

    for (const line of lines) {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        attributes[match[1]] = match[2];
      }
    }

    return attributes;
  }

  /**
   * 解析ACL信息
   */
  private parseACL(output: string): string[] {
    const acl: string[] = [];
    const lines = output.trim().split('\n');

    for (const line of lines) {
      if (line.includes(':')) {
        const aclMatch = line.match(/\s+\d+:\s+(.+)/);
        if (aclMatch) {
          acl.push(aclMatch[1]);
        }
      }
    }

    return acl;
  }

  /**
   * 获取软件版本信息
   */
  private async getSwVersion(): Promise<{ version: string; build: string; codename: string }> {
    try {
      const { stdout } = await execAsync('sw_vers');
      const lines = stdout.split('\n');

      let version = '未知';
      let build = '未知';
      let codename = '未知';

      for (const line of lines) {
        if (line.includes('ProductVersion:')) {
          version = line.split(':')[1].trim();
        } else if (line.includes('BuildVersion:')) {
          build = line.split(':')[1].trim();
        } else if (line.includes('ProductName:')) {
          codename = line.split(':')[1].trim();
        }
      }

      return { version, build, codename };
    } catch (error) {
      return { version: '未知', build: '未知', codename: '未知' };
    }
  }

  /**
   * 获取内核版本
   */
  private async getKernelVersion(): Promise<string> {
    try {
      const { stdout } = await execAsync('uname -r');
      return stdout.trim();
    } catch (error) {
      return '未知';
    }
  }

  /**
   * 获取主机名
   */
  private async getHostname(): Promise<string> {
    try {
      const { stdout } = await execAsync('hostname');
      return stdout.trim();
    } catch (error) {
      return os.hostname();
    }
  }

  /**
   * 生成Launch Agent plist文件内容
   */
  private generateLaunchAgentPlist(agent: MacOSLaunchAgent): string {
    const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${agent.label}</string>
    <key>Program</key>
    <string>${agent.programPath}</string>
    ${agent.arguments ? `
    <key>ProgramArguments</key>
    <array>
        <string>${agent.programPath}</string>
        ${agent.arguments.map(arg => `        <string>${arg}</string>`).join('\n')}
    </array>` : ''}
    ${agent.workingDirectory ? `
    <key>WorkingDirectory</key>
    <string>${agent.workingDirectory}</string>` : ''}
    ${agent.runAtLoad !== undefined ? `
    <key>RunAtLoad</key>
    <${agent.runAtLoad ? 'true' : 'false'}/>` : ''}
    ${agent.keepAlive !== undefined ? `
    <key>KeepAlive</key>
    <${agent.keepAlive ? 'true' : 'false'}/>` : ''}
    ${agent.standardOutPath ? `
    <key>StandardOutPath</key>
    <string>${agent.standardOutPath}</string>` : ''}
    ${agent.standardErrorPath ? `
    <key>StandardErrorPath</key>
    <string>${agent.standardErrorPath}</string>` : ''}
</dict>
</plist>`;

    return plist;
  }
}

/**
 * 全局macOS平台实例
 */
export const macOSPlatform = new MacOSPlatform();

/**
 * 导出类型定义
 */
export type { MacOSPermissionConfig, MacOSPermission, MacOSSystemInfo, MacOSKeychainItem, MacOSLaunchAgent };

/**
 * 导出macOS平台类
 */
export { MacOSPlatform };