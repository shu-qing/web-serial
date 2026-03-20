import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useUIStore } from '@/stores/useUIStore'

export default function SettingsPanel() {
  const { t, i18n } = useTranslation()
  const { user, isLoggedIn } = useAuthStore()
  const { showToast } = useUIStore()
  
  const {
    settings,
    isSyncing,
    lastSyncTime,
    syncError,
    hasUnsyncedChanges,
    updateSettings,
    resetSettings,
    syncToServer,
    loadFromServer,
  } = useSettingsStore()

  // 初始化：确保 store 中的语言与 i18n 当前语言同步
  useEffect(() => {
    if (settings.language !== i18n.language) {
      updateSettings({ language: i18n.language })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 只在挂载时运行

  // 监听 i18n 语言变化，同步到 store
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      if (settings.language !== lng) {
        updateSettings({ language: lng })
      }
    }
    
    i18n.on('languageChanged', handleLanguageChange)
    return () => {
      i18n.off('languageChanged', handleLanguageChange)
    }
  }, [settings.language, updateSettings, i18n])

  // 自动从服务器加载设置（登录用户）
  useEffect(() => {
    if (isLoggedIn && user?.id) {
      loadFromServer(user.id).catch((error) => {
        console.error('Failed to load settings from server:', error)
      })
    }
  }, [isLoggedIn, user?.id, loadFromServer])

  // 自动同步到服务器（登录用户）
  useEffect(() => {
    if (isLoggedIn && user?.id && hasUnsyncedChanges) {
      const timer = setTimeout(() => {
        syncToServer(user.id)
      }, 1000) // 延迟1秒后同步

      return () => clearTimeout(timer)
    }
  }, [hasUnsyncedChanges, isLoggedIn, user?.id, syncToServer])

  // 格式化同步时间
  const formatSyncTime = (timestamp: number | null) => {
    if (!timestamp) return t('settings.neverSynced', { defaultValue: '从未同步' })
    
    const now = Date.now()
    const diff = Math.floor((now - timestamp) / 1000) // 秒
    
    if (diff < 60) return t('settings.justNow', { defaultValue: '刚刚' })
    if (diff < 3600) return t('settings.minutesAgo', { defaultValue: '{{minutes}}分钟前', minutes: Math.floor(diff / 60) })
    if (diff < 86400) return t('settings.hoursAgo', { defaultValue: '{{hours}}小时前', hours: Math.floor(diff / 3600) })
    return t('settings.daysAgo', { defaultValue: '{{days}}天前', days: Math.floor(diff / 86400) })
  }

  // 处理重置设置
  const handleReset = () => {
    if (confirm(t('settings.resetConfirm', { defaultValue: '确定要恢复默认设置吗？' }))) {
      resetSettings()
      showToast('success', t('settings.resetSuccess', { defaultValue: '已恢复默认设置' }))
    }
  }

  // 处理手动同步
  const handleManualSync = async () => {
    if (isLoggedIn && user?.id) {
      await syncToServer(user.id)
      if (!syncError) {
        showToast('success', t('settings.syncSuccess', { defaultValue: '同步成功' }))
      } else {
        showToast('error', t('settings.syncFailed', { defaultValue: '同步失败' }) + ': ' + syncError)
      }
    }
  }

  // 字体选项
  const fontFamilies = [
    'Monaco',
    'Consolas',
    'Courier New',
    'Menlo',
    'Source Code Pro',
    'Roboto Mono',
  ]

  // 时间戳格式选项
  const timestampFormats = [
    { value: 'HH:mm:ss', label: 'HH:mm:ss' },
    { value: 'HH:mm:ss.SSS', label: 'HH:mm:ss.SSS' },
    { value: 'yyyy-MM-dd HH:mm:ss', label: 'yyyy-MM-dd HH:mm:ss' },
    { value: 'MM-dd HH:mm:ss.SSS', label: 'MM-dd HH:mm:ss.SSS' },
  ]

  return (
    <>
      <div className="h-10 px-4 border-b border-gray-100 flex items-center">
        <h3 className="text-sm font-semibold text-gray-900">
          {t('settings.title', { defaultValue: '偏好设置' })}
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {/* 外观设置 */}
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-gray-900 mb-3 flex items-center">
            <span className="mr-2">🎨</span>
            {t('settings.appearance', { defaultValue: '外观' })}
          </h4>
          
          <div className="space-y-3">
            {/* 主题模式 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('settings.theme', { defaultValue: '主题模式' })}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['light', 'dark', 'auto'] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => updateSettings({ theme })}
                    className={`px-3 py-2 text-xs rounded-md border transition-all ${
                      settings.theme === theme
                        ? 'border-blue-200 bg-blue-50 text-blue-700 font-medium'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    {theme === 'light' && '☀️ '}
                    {theme === 'dark' && '🌙 '}
                    {theme === 'auto' && '🌗 '}
                    {t(`settings.theme${theme.charAt(0).toUpperCase() + theme.slice(1)}`, {
                      defaultValue: theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '自动'
                    })}
                  </button>
                ))}
              </div>
            </div>

            {/* 语言 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('settings.language', { defaultValue: '语言' })}
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={settings.language}
                onChange={(e) => updateSettings({ language: e.target.value })}
              >
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
              </select>
            </div>

            {/* 字体大小 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('settings.fontSize', { defaultValue: '字体大小' })}: {settings.fontSize}px
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="12"
                  max="20"
                  step="1"
                  value={settings.fontSize}
                  onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
                  className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  style={{
                    background: `linear-gradient(to right, #BFDBFE 0%, #BFDBFE ${((settings.fontSize - 12) / (20 - 12)) * 100}%, #E5E7EB ${((settings.fontSize - 12) / (20 - 12)) * 100}%, #E5E7EB 100%)`
                  }}
                />
                <div className="flex gap-1">
                  <button
                    onClick={() => updateSettings({ fontSize: Math.max(12, settings.fontSize - 1) })}
                    className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded hover:bg-gray-50 text-gray-600"
                    disabled={settings.fontSize <= 12}
                  >
                    −
                  </button>
                  <button
                    onClick={() => updateSettings({ fontSize: Math.min(20, settings.fontSize + 1) })}
                    className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded hover:bg-gray-50 text-gray-600"
                    disabled={settings.fontSize >= 20}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* 字体族 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('settings.fontFamily', { defaultValue: '字体族' })}
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={settings.fontFamily}
                onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                style={{ fontFamily: settings.fontFamily }}
              >
                {fontFamilies.map((font) => (
                  <option key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 显示设置 */}
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-gray-900 mb-3 flex items-center">
            <span className="mr-2">📺</span>
            {t('settings.display', { defaultValue: '显示' })}
          </h4>
          
          <div className="space-y-3">
            {/* 显示行号 */}
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-xs font-medium text-gray-900">
                  {t('settings.showLineNumber', { defaultValue: '显示行号' })}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('settings.showLineNumberDesc', { defaultValue: '在接收区显示行号' })}
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.showLineNumber}
                onChange={(e) => updateSettings({ showLineNumber: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </label>

            {/* 时间戳格式 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('settings.timestampFormat', { defaultValue: '时间戳格式' })}
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={settings.timestampFormat}
                onChange={(e) => updateSettings({ timestampFormat: e.target.value })}
              >
                {timestampFormats.map((format) => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 行高 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('settings.lineHeight', { defaultValue: '行高' })}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['compact', 'normal', 'comfort'] as const).map((lineHeight) => (
                  <button
                    key={lineHeight}
                    onClick={() => updateSettings({ lineHeight })}
                    className={`px-3 py-2 text-xs rounded-md border transition-all ${
                      settings.lineHeight === lineHeight
                        ? 'border-blue-200 bg-blue-50 text-blue-700 font-medium'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    {t(`settings.lineHeight${lineHeight.charAt(0).toUpperCase() + lineHeight.slice(1)}`, {
                      defaultValue: lineHeight === 'compact' ? '紧凑' : lineHeight === 'normal' ? '正常' : '舒适'
                    })}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="border-t border-gray-200 my-4"></div>

        {/* 设置管理 */}
        <div className="mb-6">
          <button
            onClick={handleReset}
            className="w-full px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            {t('settings.resetToDefault', { defaultValue: '恢复默认' })}
          </button>
        </div>

        {/* 云端同步（仅登录用户） */}
        {isLoggedIn && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className="text-xs font-medium text-blue-900 mb-1">
                  ☁️ {t('settings.cloudSync', { defaultValue: '云端同步' })}
                </p>
                <p className="text-xs text-blue-700">
                  {t('settings.lastSync', { defaultValue: '最后同步' })}: {formatSyncTime(lastSyncTime)}
                </p>
              </div>
              {hasUnsyncedChanges && !isSyncing && (
                <span className="text-xs text-orange-600 font-medium">
                  {t('settings.unsyncedChanges', { defaultValue: '有未同步更改' })}
                </span>
              )}
            </div>
            
            {syncError && (
              <div className="text-xs text-red-600 mb-2">
                ⚠️ {syncError}
              </div>
            )}
            
            <button
              onClick={handleManualSync}
              disabled={isSyncing || !hasUnsyncedChanges}
              className="btn-primary w-full"
            >
              {isSyncing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('settings.syncing', { defaultValue: '同步中...' })}
                </span>
              ) : (
                t('settings.syncToCloud', { defaultValue: '同步到云端' })
              )}
            </button>
          </div>
        )}

        {/* 未登录提示 */}
        {!isLoggedIn && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-2">
              💡 {t('settings.loginToSync', { defaultValue: '登录后可将设置同步到云端' })}
            </p>
            <p className="text-xs text-gray-500">
              {t('settings.localStorageNote', { defaultValue: '当前设置保存在本地浏览器中' })}
            </p>
          </div>
        )}
      </div>
    </>
  )
}

