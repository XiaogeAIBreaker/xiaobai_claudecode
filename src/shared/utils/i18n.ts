/**
 * T041: 国际化工具模块
 * 处理中文本地化和消息配置
 */

import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { log } from './logger';

/**
 * 支持的语言
 */
export enum SupportedLanguage {
  ZH_CN = 'zh-CN',
  EN_US = 'en-US'
}

/**
 * 消息接口
 */
export interface Messages {
  [key: string]: string | Messages;
}

/**
 * 国际化管理器
 */
export class I18nManager {
  private messages: Messages = {};
  private currentLanguage: SupportedLanguage = SupportedLanguage.ZH_CN;
  private fallbackLanguage: SupportedLanguage = SupportedLanguage.EN_US;

  constructor() {
    this.loadMessages();
  }

  /**
   * 加载消息文件
   */
  private loadMessages(): void {
    try {
      // 获取消息文件路径
      const messagesPath = this.getMessagesPath();

      if (fs.existsSync(messagesPath)) {
        const messagesContent = fs.readFileSync(messagesPath, 'utf-8');
        this.messages = JSON.parse(messagesContent);
        log.info('消息文件加载成功', { path: messagesPath });
      } else {
        log.warn('消息文件不存在，使用默认消息', { path: messagesPath });
        this.messages = this.getDefaultMessages();
      }
    } catch (error) {
      log.error('加载消息文件失败', error as Error);
      this.messages = this.getDefaultMessages();
    }
  }

  /**
   * 获取消息文件路径
   */
  private getMessagesPath(): string {
    // 在开发环境中
    if (process.env.NODE_ENV === 'development') {
      return path.join(process.cwd(), 'config', 'messages.json');
    }

    // 在生产环境中
    const appPath = app.getAppPath();
    return path.join(appPath, 'config', 'messages.json');
  }

  /**
   * 获取默认消息
   */
  private getDefaultMessages(): Messages {
    return {
      app: {
        title: 'Claude Code CLI 安装助手',
        description: '为中国地区零基础用户设计的友好安装体验'
      },
      wizard: {
        next: '下一步',
        previous: '上一步',
        finish: '完成',
        cancel: '取消',
        retry: '重试',
        skip: '跳过'
      },
      errors: {
        unknown: '发生未知错误',
        network: '网络连接失败',
        permission: '权限不足'
      }
    };
  }

  /**
   * 设置当前语言
   */
  setLanguage(language: SupportedLanguage): void {
    this.currentLanguage = language;
    log.info('语言设置已更改', { language });
  }

  /**
   * 获取当前语言
   */
  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * 获取消息
   */
  getMessage(key: string, params?: Record<string, string | number>): string {
    const message = this.getNestedMessage(this.messages, key);

    if (typeof message === 'string') {
      return this.interpolateMessage(message, params);
    }

    // 如果找不到消息，返回键名
    log.warn('未找到消息', { key });
    return key;
  }

  /**
   * 获取嵌套消息
   */
  private getNestedMessage(obj: Messages, key: string): string | Messages {
    const keys = key.split('.');
    let current: string | Messages = obj;

    for (const k of keys) {
      if (typeof current === 'object' && current !== null && k in current) {
        current = current[k];
      } else {
        return key; // 返回原始键作为失败案例
      }
    }

    return current;
  }

  /**
   * 插值消息
   */
  private interpolateMessage(message: string, params?: Record<string, string | number>): string {
    if (!params) {
      return message;
    }

    return message.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key]?.toString() || match;
    });
  }

  /**
   * 获取所有消息
   */
  getAllMessages(): Messages {
    return this.messages;
  }

  /**
   * 重新加载消息
   */
  reload(): void {
    this.loadMessages();
    log.info('消息已重新加载');
  }

  /**
   * 检查消息是否存在
   */
  hasMessage(key: string): boolean {
    const message = this.getNestedMessage(this.messages, key);
    return typeof message === 'string';
  }
}

/**
 * 全局国际化管理器实例
 */
export const i18n = new I18nManager();

/**
 * 快捷函数：获取消息
 */
export function t(key: string, params?: Record<string, string | number>): string {
  return i18n.getMessage(key, params);
}

/**
 * 快捷函数：设置语言
 */
export function setLanguage(language: SupportedLanguage): void {
  i18n.setLanguage(language);
}

/**
 * 快捷函数：获取当前语言
 */
export function getCurrentLanguage(): SupportedLanguage {
  return i18n.getCurrentLanguage();
}

/**
 * 快捷函数：检查消息是否存在
 */
export function hasMessage(key: string): boolean {
  return i18n.hasMessage(key);
}

/**
 * 快捷函数：重新加载消息
 */
export function reloadMessages(): void {
  i18n.reload();
}

/**
 * 常用消息的预定义快捷函数
 */
export const messages = {
  // 应用相关
  appTitle: () => t('app.title'),
  appDescription: () => t('app.description'),

  // 向导相关
  next: () => t('wizard.next'),
  previous: () => t('wizard.previous'),
  finish: () => t('wizard.finish'),
  cancel: () => t('wizard.cancel'),
  retry: () => t('wizard.retry'),
  skip: () => t('wizard.skip'),

  // 步骤相关
  stepTitle: (step: string) => t(`steps.${step}.title`),
  stepDescription: (step: string) => t(`steps.${step}.description`),

  // 错误相关
  errorUnknown: () => t('errors.unknown'),
  errorNetwork: () => t('errors.network.connection'),
  errorPermission: () => t('errors.system.permission'),

  // 状态相关
  statusPending: () => t('wizard.loading'),
  statusSuccess: () => t('wizard.success'),
  statusError: () => t('wizard.error'),
};

/**
 * 类型定义：消息键
 */
export type MessageKey =
  | 'app.title'
  | 'app.description'
  | 'wizard.next'
  | 'wizard.previous'
  | 'wizard.finish'
  | 'wizard.cancel'
  | 'wizard.retry'
  | 'wizard.skip'
  | 'errors.unknown'
  | 'errors.network.connection'
  | 'errors.system.permission'
  | string; // 允许其他自定义键

/**
 * 导出默认实例
 */
export default i18n;