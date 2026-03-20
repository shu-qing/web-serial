import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

// 根据浏览器语言和地区智能判断语言
function detectLanguage(): string {
  // 1. 检查 localStorage 中是否有用户手动选择
  const savedLang = localStorage.getItem('i18nextLng');
  if (savedLang && (savedLang === 'zh-CN' || savedLang === 'en-US')) {
    return savedLang;
  }

  // 2. 获取浏览器语言
  const browserLang = navigator.language || (navigator as any).userLanguage || 'en-US';
  
  // 3. 获取浏览器语言代码（简化，如 'zh', 'en'）
  const langCode = browserLang.toLowerCase().split('-')[0];
  
  // 4. 获取时区信息（辅助判断）
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // 5. 中文地区判断
  const chineseRegions = [
    'Asia/Shanghai',      // 中国
    'Asia/Hong_Kong',     // 香港
    'Asia/Taipei',        // 台湾
    'Asia/Macau',         // 澳门
    'Asia/Singapore',     // 新加坡（部分中文用户）
  ];
  
  // 6. 判断逻辑
  // 如果浏览器语言是中文，或者时区在中国地区，使用中文
  if (langCode === 'zh' || chineseRegions.includes(timezone)) {
    return 'zh-CN';
  }
  
  // 7. 其他情况默认使用英文
  return 'en-US';
}

// 配置 i18next
i18n
  // 检测用户语言
  .use(LanguageDetector)
  // 将 i18next 传递给 react-i18next
  .use(initReactI18next)
  // 初始化 i18next
  .init({
    resources: {
      'zh-CN': {
        translation: zhCN,
      },
      'en-US': {
        translation: enUS,
      },
    },
    // 默认语言（通过智能检测函数获取）
    lng: detectLanguage(),
    // 备用语言
    fallbackLng: 'zh-CN',
    // 支持的语言列表
    supportedLngs: ['zh-CN', 'en-US'],
    // 调试模式（开发时可以看到缺失的翻译）
    debug: false,
    // 插值配置
    interpolation: {
      escapeValue: false, // React 已经保护了 XSS
    },
    // 语言检测选项
    detection: {
      // 检测顺序：localStorage > 浏览器语言 > HTML标签
      order: ['localStorage', 'navigator', 'htmlTag'],
      // 缓存用户语言选择到 localStorage
      caches: ['localStorage'],
      // localStorage 的 key
      lookupLocalStorage: 'i18nextLng',
      // 语言映射（将相似语言映射到支持的语言）
      convertDetectedLanguage: (lng: string) => {
        // 将所有中文变体映射到 zh-CN
        if (lng.startsWith('zh')) {
          return 'zh-CN';
        }
        // 将所有英文变体映射到 en-US
        if (lng.startsWith('en')) {
          return 'en-US';
        }
        // 其他语言默认返回英文
        return 'en-US';
      },
    },
  });

export default i18n;

