import { test } from '@playwright/test';

// TODO: 根据新 workflow map 落地 CLI 安装验证。

test.describe('安装向导 — Claude CLI 安装', () => {
  test('执行 CLI 安装并展示进度', async ({ page }) => {
    // 预期流程：
    // 1. 进入 CLI 安装步骤，读取 SharedConfigurationCatalog 获取下载源。
    // 2. 模拟安装进度事件，验证进度条与提示文本。
    // 3. 完成后确认结果页文案与下一步按钮状态。

    throw new Error('T008 未实现：CLI 安装场景待补充');
  });
});
