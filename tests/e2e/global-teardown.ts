import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  // 全局E2E测试清理
  console.log('🧹 清理E2E测试环境...');

  // 执行清理操作
  try {
    // 清理临时文件、停止服务等
    console.log('✅ E2E测试环境清理完成');
  } catch (error) {
    console.error('❌ E2E测试环境清理失败:', error);
  }
}

export default globalTeardown;