/**
 * T030: React应用入口
 * 初始化React应用并设置全局状态管理
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { performanceMonitor } from '../shared/utils/performance';

// 标记渲染器开始初始化
performanceMonitor.checkpoint('renderer-start');

// 检查Electron API是否可用
if (!window.electronAPI) {
  // 在启动阶段，需要明确日志记录API加载状态
  // eslint-disable-next-line no-console
  console.error('Electron API 未正确加载');
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('根元素未找到');
}

const root = createRoot(container);

// 渲染应用并标记完成
root.render(<App />);

// 标记渲染器初始化完成
performanceMonitor.markRendererReady();

// DOM加载完成后输出性能报告
document.addEventListener('DOMContentLoaded', () => {
  performanceMonitor.checkpoint('dom-loaded');

  // 延迟获取性能指标，确保所有组件都已初始化
  setTimeout(() => {
    const report = performanceMonitor.generateReport();
    // 在开发环境输出性能报告
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('渲染器性能报告:', report);
    }
  }, 1000);
});