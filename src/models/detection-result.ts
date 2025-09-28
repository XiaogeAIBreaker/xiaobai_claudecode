/**
 * DetectionResult实体定义和验证
 * 定义自动检测结果的数据结构和业务规则
 */

/**
 * 检测类型枚举
 */
export enum ComponentType {
  NODEJS = 'nodejs',
  NPM = 'npm',
  CLAUDE_CLI = 'claude-cli',
  NETWORK = 'network',
  GOOGLE_AUTH = 'google-auth',
  ANTHROPIC_API = 'anthropic-api'
}

/**
 * 检测状态枚举
 */
export enum DetectionStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  WARNING = 'warning',
  TIMEOUT = 'timeout'
}

/**
 * 检测结果接口
 */
export interface DetectionResult {
  component: ComponentType;         // 检测的组件类型
  installed: boolean;              // 是否已安装
  version?: string;                // 版本号
  path?: string;                   // 安装路径
  compatible: boolean;             // 是否兼容
  issues: string[];               // 发现的问题
  recommendations: string[];       // 推荐操作
  detectedAt: string;             // 检测时间（ISO字符串）
  metadata?: Record<string, any>; // 额外的元数据
}

/**
 * 验证检测结果数据
 */
export function validateDetectionResult(result: DetectionResult): void {
  if (!Object.values(ComponentType).includes(result.component)) {
    throw new Error(`DetectionResult.component 必须是有效的组件类型: ${Object.values(ComponentType).join(', ')}`);
  }

  if (typeof result.installed !== 'boolean') {
    throw new Error('DetectionResult.installed 必须是布尔值');
  }

  if (result.version !== undefined && (typeof result.version !== 'string' || result.version.trim() === '')) {
    throw new Error('DetectionResult.version 必须是非空字符串或undefined');
  }

  if (result.path !== undefined && (typeof result.path !== 'string' || result.path.trim() === '')) {
    throw new Error('DetectionResult.path 必须是非空字符串或undefined');
  }

  if (typeof result.compatible !== 'boolean') {
    throw new Error('DetectionResult.compatible 必须是布尔值');
  }

  if (!Array.isArray(result.issues)) {
    throw new Error('DetectionResult.issues 必须是字符串数组');
  }

  if (!Array.isArray(result.recommendations)) {
    throw new Error('DetectionResult.recommendations 必须是字符串数组');
  }

  if (typeof result.detectedAt !== 'string') {
    throw new Error('DetectionResult.detectedAt 必须是ISO时间字符串');
  }

  // 验证时间格式
  try {
    new Date(result.detectedAt);
  } catch (error) {
    throw new Error('DetectionResult.detectedAt 必须是有效的ISO时间字符串');
  }
}

/**
 * 验证版本号格式
 */
export function validateVersion(version: string): boolean {
  if (!version || version.trim() === '') {
    return false;
  }

  // 支持语义化版本号: x.y.z, x.y.z-beta, 等
  const semanticVersionRegex = /^\d+\.\d+\.\d+(\-[a-zA-Z0-9\-]+)?$/;
  return semanticVersionRegex.test(version.trim());
}

/**
 * 验证路径存在性（简单格式检查）
 */
export function validatePath(path: string): boolean {
  if (!path || path.trim() === '') {
    return false;
  }

  // 简单的路径格式验证（支持Unix和Windows路径）
  const pathRegex = /^([a-zA-Z]:|\/)[^\0<>:"|?*\n\r\t]+$/;
  return pathRegex.test(path.trim());
}

/**
 * 检查Node.js版本兼容性
 */
export function checkNodeCompatibility(version: string): boolean {
  if (!validateVersion(version)) {
    return false;
  }

  // 要求Node.js 18+
  const majorVersion = parseInt(version.split('.')[0], 10);
  return majorVersion >= 18;
}

/**
 * 生成推荐操作
 */
export function generateRecommendations(result: DetectionResult): string[] {
  const recommendations: string[] = [];

  if (!result.installed) {
    switch (result.component) {
      case ComponentType.NODEJS:
        recommendations.push('请安装Node.js 18或更高版本');
        break;
      case ComponentType.CLAUDE_CLI:
        recommendations.push('将自动安装Claude CLI');
        break;
      case ComponentType.NETWORK:
        recommendations.push('请检查网络连接');
        break;
      default:
        recommendations.push(`请安装${result.component}`);
    }
  } else if (!result.compatible) {
    switch (result.component) {
      case ComponentType.NODEJS:
        recommendations.push('请升级Node.js到18或更高版本');
        break;
      default:
        recommendations.push(`请升级${result.component}到兼容版本`);
    }
  } else if (result.issues.length > 0) {
    recommendations.push('发现一些问题，但不影响使用');
  } else {
    recommendations.push('检测通过，无需操作');
  }

  return recommendations;
}

/**
 * 处理特定组件的元数据
 */
export function processComponentMetadata(component: ComponentType, metadata: Record<string, any>): Record<string, any> {
  const processed = { ...metadata };

  switch (component) {
    case ComponentType.NODEJS:
      // Node.js特定的元数据处理
      if (metadata.npmVersion) {
        processed.npmCompatible = validateVersion(metadata.npmVersion);
      }
      if (metadata.architecture) {
        processed.supportedArch = ['x64', 'arm64'].includes(metadata.architecture);
      }
      break;

    case ComponentType.NETWORK:
      // 网络特定的元数据处理
      if (metadata.responseTime !== undefined) {
        processed.performance = metadata.responseTime < 1000 ? 'good' : 'slow';
      }
      break;

    case ComponentType.CLAUDE_CLI:
      // Claude CLI特定的元数据处理
      if (metadata.globalInstall !== undefined) {
        processed.installType = metadata.globalInstall ? 'global' : 'local';
      }
      break;
  }

  return processed;
}

/**
 * 创建默认的检测结果
 */
export function createDetectionResult(
  component: ComponentType,
  installed: boolean,
  options: Partial<Omit<DetectionResult, 'component' | 'installed' | 'detectedAt'>> = {}
): DetectionResult {
  const result: DetectionResult = {
    component,
    installed,
    version: options.version,
    path: options.path,
    compatible: options.compatible ?? installed,
    issues: options.issues ?? [],
    recommendations: options.recommendations ?? [],
    detectedAt: new Date().toISOString(),
    metadata: options.metadata
  };

  // 自动生成推荐操作（如果没有提供）
  if (result.recommendations.length === 0) {
    result.recommendations = generateRecommendations(result);
  }

  validateDetectionResult(result);
  return result;
}

/**
 * 合并多个检测结果
 */
export function mergeDetectionResults(results: DetectionResult[]): DetectionResult[] {
  const merged = new Map<ComponentType, DetectionResult>();

  results.forEach(result => {
    const existing = merged.get(result.component);
    if (!existing || new Date(result.detectedAt) > new Date(existing.detectedAt)) {
      merged.set(result.component, result);
    }
  });

  return Array.from(merged.values());
}

/**
 * 检查检测结果是否表示成功状态
 */
export function isDetectionSuccessful(result: DetectionResult): boolean {
  return result.installed && result.compatible && result.issues.length === 0;
}

/**
 * 获取检测结果的严重程度
 */
export function getDetectionSeverity(result: DetectionResult): 'success' | 'warning' | 'error' {
  if (isDetectionSuccessful(result)) {
    return 'success';
  }

  if (!result.installed || !result.compatible) {
    return 'error';
  }

  if (result.issues.length > 0) {
    return 'warning';
  }

  return 'success';
}