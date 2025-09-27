/**
 * T045: 性能监控React Hook
 * 用于监控组件渲染性能和用户交互响应时间
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
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
 * 性能数据接口
 */
interface PerformanceData {
  renderTime: number;
  interactionTime: number;
  componentName: string;
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

  /**
   * 获取组件性能数据
   */
  const getPerformanceData = useCallback((): PerformanceData => {
    const renderEndTime = performanceMonitor.getTimeDiff(`${componentName}-render-start`);
    const interactionEndTime = performanceMonitor.getTimeDiff(`${componentName}-interaction-start`);

    return {
      renderTime: renderEndTime,
      interactionTime: interactionEndTime,
      componentName
    };
  }, [componentName]);

  return {
    measureInteraction,
    getPerformanceData
  };
};

/**
 * 高阶组件：为组件添加性能监控
 */
export const withPerformance = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  config: PerformanceConfig
) => {
  const WithPerformanceComponent: React.FC<P> = (props) => {
    const { measureInteraction } = usePerformance(config);

    // 为原组件的所有事件处理器添加性能监控
    const enhancedProps = React.useMemo(() => {
      const newProps = { ...props };

      // 增强onClick事件
      if ('onClick' in newProps && typeof newProps.onClick === 'function') {
        const originalOnClick = newProps.onClick;
        newProps.onClick = (event: any) => {
          measureInteraction('click', () => originalOnClick(event));
        };
      }

      // 增强onChange事件
      if ('onChange' in newProps && typeof newProps.onChange === 'function') {
        const originalOnChange = newProps.onChange;
        newProps.onChange = (event: any) => {
          measureInteraction('change', () => originalOnChange(event));
        };
      }

      return newProps;
    }, [props, measureInteraction]);

    return React.createElement(WrappedComponent, enhancedProps);
  };

  WithPerformanceComponent.displayName = `withPerformance(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithPerformanceComponent;
};

/**
 * 防抖Hook - 用于优化频繁的用户输入
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * 节流Hook - 用于优化滚动等频繁事件
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const throttledRef = useRef<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const throttledCallback = useCallback((...args: Parameters<T>) => {
    if (!throttledRef.current) {
      callback(...args);
      throttledRef.current = true;

      timeoutRef.current = setTimeout(() => {
        throttledRef.current = false;
      }, delay);
    }
  }, [callback, delay]) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
};

/**
 * 虚拟滚动Hook - 用于优化长列表渲染
 */
interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  itemCount: number;
  overscan?: number;
}

interface VirtualScrollResult {
  visibleStartIndex: number;
  visibleEndIndex: number;
  totalHeight: number;
  offsetY: number;
}

export const useVirtualScroll = (
  scrollTop: number,
  config: VirtualScrollConfig
): VirtualScrollResult => {
  const { itemHeight, containerHeight, itemCount, overscan = 5 } = config;

  return React.useMemo(() => {
    const visibleStartIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleEndIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return {
      visibleStartIndex,
      visibleEndIndex,
      totalHeight: itemCount * itemHeight,
      offsetY: visibleStartIndex * itemHeight
    };
  }, [scrollTop, itemHeight, containerHeight, itemCount, overscan]);
};