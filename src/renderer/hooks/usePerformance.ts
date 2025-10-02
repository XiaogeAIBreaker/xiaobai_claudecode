/**
 * T045: 性能监控React Hook
 * 用于监控组件渲染性能和用户交互响应时间
 */

import { useEffect, useCallback, useRef } from 'react';
import { performanceMonitor } from '../../shared/utils/performance';

/**
 * 性能监控配置
 */
interface PerformanceConfig {
  /** 组件名称，用于标识 */
  componentName: string;
  /** 是否监控渲染性能 */
  trackRender?: boolean;
  /** 是否监控用户交互 */
  trackInteraction?: boolean;
  /** 性能阈值(毫秒) */
  threshold?: number;
}

/**
 * 性能监控Hook
 */
export const usePerformance = (config: PerformanceConfig) => {
  const {
    componentName,
    trackRender = true,
    trackInteraction = true,
    threshold = 1000
  } = config;

  const renderStartTime = useRef<number>(0);
  const interactionStartTime = useRef<number>(0);

  /**
   * 组件挂载时记录渲染开始时间
   */
  useEffect(() => {
    if (trackRender) {
      renderStartTime.current = performance.now();
      performanceMonitor.checkpoint(`${componentName}-render-start`);

      return () => {
        const renderTime = performance.now() - renderStartTime.current;
        if (renderTime > threshold) {
          console.warn(`组件 ${componentName} 渲染时间过长: ${renderTime.toFixed(2)}ms`);
        }
        performanceMonitor.checkpoint(`${componentName}-render-end`);
      };
    }
  }, [componentName, trackRender, threshold]);

  /**
   * 测量用户交互响应时间
   */
  const measureInteraction = useCallback(async (
    actionName: string,
    action: () => Promise<void> | void
  ): Promise<void> => {
    if (!trackInteraction) {
      await action();
      return;
    }

    const startTime = performance.now();
    interactionStartTime.current = startTime;
    performanceMonitor.checkpoint(`${componentName}-${actionName}-start`);

    try {
      await action();
    } finally {
      const interactionTime = performance.now() - startTime;
      performanceMonitor.checkpoint(`${componentName}-${actionName}-end`);

      // 检查是否超过阈值
      if (interactionTime > threshold) {
        console.warn(
          `组件 ${componentName} 操作 ${actionName} 响应时间过长: ${interactionTime.toFixed(2)}ms`
        );
      }

      // 记录到全局性能监控
      performanceMonitor.measureResponseTime(async () => {
        // 已经执行完毕，这里只是为了记录
      });
    }
  }, [componentName, trackInteraction, threshold]);

  return {
    measureInteraction,
  };
};
