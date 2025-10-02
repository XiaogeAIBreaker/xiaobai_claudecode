import * as fs from 'fs';
import * as path from 'path';

describe('构建体积与启动性能守护', () => {
  it('产物体积差异应 ≤5%，启动时间 ≤3000ms', () => {
    // TODO: 后续通过 scripts/audit/shared-config-usage.ts 及 build 产物记录真实数据。
    const baseline = {
      bundleSizeBytes: Number.POSITIVE_INFINITY,
      startupMs: Number.POSITIVE_INFINITY,
    };

    const current = {
      bundleSizeBytes: Number.NEGATIVE_INFINITY,
      startupMs: Number.NEGATIVE_INFINITY,
    };

    const sizeDiff = ((current.bundleSizeBytes - baseline.bundleSizeBytes) / baseline.bundleSizeBytes) * 100;

    if (!Number.isFinite(sizeDiff)) {
      throw new Error('T011 未实现：缺少基线数据，请在实现阶段补齐 build 体积比较逻辑');
    }

    expect(sizeDiff).toBeLessThanOrEqual(5);
    expect(current.startupMs).toBeLessThanOrEqual(3000);
  });
});
