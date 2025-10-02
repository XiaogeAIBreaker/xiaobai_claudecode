import { test } from '@playwright/test';

// TODO: 完成账号关联路径的 UI 自动化。

test.describe('安装向导 — Account Link', () => {
  test('完成账号绑定并同步状态', async ({ page }) => {
    // 预期流程：
    // 1. 进入账号关联页面，加载 workflow map 中的步骤文案。
    // 2. 模拟跳转外部浏览器完成授权，验证预加载桥接返回结果。
    // 3. 校验完成状态与下一步导航。

    throw new Error('T009 未实现：账号关联 E2E 待实现');
  });
});
