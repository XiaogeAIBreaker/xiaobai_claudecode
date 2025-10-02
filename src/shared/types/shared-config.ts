export type SharedConfigSourceModule = 'main' | 'renderer' | 'preload' | 'shared' | 'scripts';

export interface SharedConfigurationEntry<TValue = unknown> {
  /** 全局唯一 ID，形如 domain.namespace */
  id: string;
  /** 实际配置值 */
  value: TValue;
  /** 用途说明，便于文档同步 */
  description: string;
  /** 负责维护该配置的团队或个人 */
  owner: string;
  /** 原始存放模块，便于排查依赖 */
  sourceModule: SharedConfigSourceModule;
  /** 最近一次按照 quickstart 完成验证的时间 */
  lastValidatedAt: string;
  /** 可选标签，辅助审计脚本分类 */
  tags?: string[];
  /** 可选版本号，适用于包含下载信息的条目 */
  version?: string;
}

export type SharedConfigurationCatalog = Record<string, SharedConfigurationEntry>;

export interface SharedConfigUsageRecord {
  id: string;
  files: string[];
}

export interface SharedConfigUsageMatrix {
  generatedAt: string;
  entries: SharedConfigUsageRecord[];
}
