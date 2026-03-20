// 这是一个示例文件，展示如何在组件中使用 i18n
// 不要在实际项目中使用此文件

import { useTranslation } from 'react-i18next';

/**
 * 示例 1: 基础按钮组件with翻译
 */
export function BasicButton() {
  const { t } = useTranslation();
  
  return (
    <div className="space-x-2">
      <button className="btn-primary">{t('common.save')}</button>
      <button className="btn-secondary">{t('common.cancel')}</button>
      <button className="btn-danger">{t('common.delete')}</button>
    </div>
  );
}

/**
 * 示例 2: 表单组件with翻译
 */
export function LoginForm() {
  const { t } = useTranslation();
  
  return (
    <form className="space-y-4">
      <div>
        <label>{t('auth.email')}</label>
        <input type="email" placeholder={t('auth.email')} />
      </div>
      <div>
        <label>{t('auth.password')}</label>
        <input type="password" placeholder={t('auth.password')} />
      </div>
      <button type="submit">{t('auth.login')}</button>
    </form>
  );
}

/**
 * 示例 3: 带变量的翻译
 */
export function Welcome({ username }: { username: string }) {
  const { t } = useTranslation();
  
  // 需要在 locales 文件中添加：
  // "welcome": "欢迎回来，{{username}}！"
  return <h1>{t('welcome', { username })}</h1>;
}

/**
 * 示例 4: 条件渲染with翻译
 */
export function Status({ isConnected }: { isConnected: boolean }) {
  const { t } = useTranslation();
  
  return (
    <span className={isConnected ? 'text-green-600' : 'text-gray-400'}>
      {isConnected ? t('serial.connected') : t('serial.disconnected')}
    </span>
  );
}

/**
 * 示例 5: 列表渲染with翻译
 */
export function Menu() {
  const { t } = useTranslation();
  
  const menuItems = [
    { key: 'nav.home', path: '/' },
    { key: 'nav.serial', path: '/serial' },
    { key: 'nav.project', path: '/projects' },
  ];
  
  return (
    <ul>
      {menuItems.map((item) => (
        <li key={item.key}>
          <a href={item.path}>{t(item.key)}</a>
        </li>
      ))}
    </ul>
  );
}

/**
 * 示例 6: 获取当前语言
 */
export function LanguageInfo() {
  const { i18n } = useTranslation();
  
  return (
    <div>
      <p>Current Language: {i18n.language}</p>
      <p>Is Chinese: {i18n.language === 'zh-CN' ? 'Yes' : 'No'}</p>
    </div>
  );
}

/**
 * 示例 7: 编程式切换语言
 */
export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh-CN' ? 'en-US' : 'zh-CN';
    i18n.changeLanguage(newLang);
  };
  
  return (
    <button onClick={toggleLanguage}>
      {t('common.language')}: {i18n.language === 'zh-CN' ? '中文' : 'English'}
    </button>
  );
}

