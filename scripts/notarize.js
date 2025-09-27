/**
 * macOS 公证脚本
 * 用于在构建后自动公证应用程序
 */

const { notarize } = require('electron-notarize');
const path = require('path');

async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  // 只在macOS平台执行公证
  if (electronPlatformName !== 'darwin') {
    console.log('跳过公证: 非macOS平台');
    return;
  }

  // 检查必要的环境变量
  if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASSWORD || !process.env.APPLE_TEAM_ID) {
    console.warn('⚠️ 缺少Apple ID凭据，跳过公证过程');
    console.warn('请设置以下环境变量:');
    console.warn('- APPLE_ID: Apple开发者账户邮箱');
    console.warn('- APPLE_ID_PASSWORD: App专用密码');
    console.warn('- APPLE_TEAM_ID: 开发者团队ID');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`🍎 开始公证: ${appPath}`);

  try {
    await notarize({
      appBundleId: 'com.claude.installer',
      appPath: appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    });

    console.log('✅ macOS公证完成');
  } catch (error) {
    console.error('❌ macOS公证失败:', error);
    throw error;
  }
}

module.exports = notarizing;