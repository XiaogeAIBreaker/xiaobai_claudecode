import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // 全局E2E测试设置
  console.log('🚀 启动E2E测试环境...');

  // 创建浏览器实例用于预热
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // 预热操作（可选）
  try {
    // 等待开发服务器启动
    await page.waitForTimeout(5000);
    console.log('✅ 开发服务器预热完成');
  } catch (error) {
    console.warn('⚠️ 预热过程中出现警告:', error);
  } finally {
    await browser.close();
  }

  console.log('✅ E2E测试环境准备完成');
}

export default globalSetup;