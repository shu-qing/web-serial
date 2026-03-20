import zhCN from '../locales/zh-CN.json';
import enUS from '../locales/en-US.json';

type LocaleData = typeof zhCN;

const locales: Record<string, LocaleData> = {
  'zh-CN': zhCN,
  'en-US': enUS,
  'zh': zhCN, // 简化中文标识
  'en': enUS, // 简化英文标识
};

/**
 * 获取翻译文本
 * @param lang 语言代码（从请求头 Accept-Language 获取）
 * @param key 翻译键，支持点号分隔的路径，如 'errors.unauthorized'
 * @param defaultText 默认文本（如果翻译不存在）
 */
export function t(lang: string | undefined, key: string, defaultText?: string): string {
  // 默认使用中文
  const locale = lang || 'zh-CN';
  
  // 获取对应的语言数据
  const data = locales[locale] || locales['zh-CN'];
  
  // 支持嵌套路径，如 'errors.unauthorized'
  const keys = key.split('.');
  let value: any = data;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // 翻译不存在，返回默认文本或key
      return defaultText || key;
    }
  }
  
  return typeof value === 'string' ? value : (defaultText || key);
}

/**
 * 从请求中获取语言偏好
 * @param acceptLanguage Accept-Language 请求头
 */
export function getLanguageFromHeader(acceptLanguage: string | undefined): string {
  if (!acceptLanguage) {
    return 'zh-CN';
  }
  
  // 解析 Accept-Language 头部
  // 示例: "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7"
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [code, qValue] = lang.trim().split(';');
      const quality = qValue ? parseFloat(qValue.split('=')[1]) : 1.0;
      return { code: code.trim(), quality };
    })
    .sort((a, b) => b.quality - a.quality);
  
  // 返回第一个支持的语言
  for (const { code } of languages) {
    if (code in locales) {
      return code;
    }
    // 尝试简化的语言代码（如 zh-CN -> zh）
    const shortCode = code.split('-')[0];
    if (shortCode in locales) {
      return shortCode;
    }
  }
  
  // 默认中文
  return 'zh-CN';
}

/**
 * Express 中间件：从请求头中提取语言并添加到 req 对象
 */
export function i18nMiddleware(req: any, _res: any, next: any) {
  const acceptLanguage = req.headers['accept-language'];
  req.language = getLanguageFromHeader(acceptLanguage);
  req.t = (key: string, defaultText?: string) => t(req.language, key, defaultText);
  next();
}

