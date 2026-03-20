import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'
import i18n from '@/i18n'

/**
 * 用户设置接口
 */
export interface UserSettings {
  theme: 'light' | 'dark' | 'auto'
  language: string
  fontSize: number
  fontFamily: string
  lineHeight: 'compact' | 'normal' | 'comfort'
  autoScroll: boolean
  showLineNumber: boolean
  timestampFormat: string
}

/**
 * 默认设置（与后端数据库默认值一致）
 */
export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  language: 'zh-CN',
  fontSize: 14,
  fontFamily: 'Monaco',
  lineHeight: 'normal',
  autoScroll: true,
  showLineNumber: false,
  timestampFormat: 'HH:mm:ss.SSS',
}

/**
 * 设置 Store 状态
 */
interface SettingsStore {
  // 设置数据
  settings: UserSettings
  
  // 同步状态
  isSyncing: boolean
  lastSyncTime: number | null
  syncError: string | null
  
  // 是否有未同步的本地更改（仅登录用户）
  hasUnsyncedChanges: boolean
  
  // 操作方法
  updateSettings: (newSettings: Partial<UserSettings>) => void
  resetSettings: () => void
  syncToServer: (userId?: string) => Promise<void>
  loadFromServer: (userId: string) => Promise<void>
}

/**
 * 设置 Store
 */
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      settings: DEFAULT_SETTINGS,
      isSyncing: false,
      lastSyncTime: null,
      syncError: null,
      hasUnsyncedChanges: false,

      /**
       * 更新设置
       */
      updateSettings: (newSettings: Partial<UserSettings>) => {
        // 修复旧的日期格式（YYYY → yyyy）
        const fixedSettings = { ...newSettings }
        if (fixedSettings.timestampFormat) {
          fixedSettings.timestampFormat = fixedSettings.timestampFormat
            .replace(/YYYY/g, 'yyyy')
            .replace(/DD/g, 'dd')
        }
        
        set((state) => ({
          settings: { ...state.settings, ...fixedSettings },
          hasUnsyncedChanges: true,
          syncError: null,
        }))
        
        // 如果更新了语言，立即同步到 i18n
        if (fixedSettings.language) {
          i18n.changeLanguage(fixedSettings.language)
        }
      },

      /**
       * 重置为默认设置
       */
      resetSettings: () => {
        set({
          settings: DEFAULT_SETTINGS,
          hasUnsyncedChanges: true,
          syncError: null,
        })
        
        // 同步语言到 i18n
        i18n.changeLanguage(DEFAULT_SETTINGS.language)
      },

      /**
       * 同步到服务器（仅登录用户）
       */
      syncToServer: async (userId?: string) => {
        // 如果未登录，不执行同步
        if (!userId) {
          return
        }

        const { settings } = get()
        
        // 语言由 i18n 自己管理，不同步到服务器
        const { language, ...serverSettings } = settings
        
        set({ isSyncing: true, syncError: null })

        try {
          await api.updateUserPreference(serverSettings)
          
          set({
            isSyncing: false,
            lastSyncTime: Date.now(),
            hasUnsyncedChanges: false,
            syncError: null,
          })
        } catch (error: any) {
          console.error('同步设置到服务器失败:', error)
          set({
            isSyncing: false,
            syncError: error.message || '同步失败',
          })
        }
      },

      /**
       * 从服务器加载设置（仅登录用户）
       */
      loadFromServer: async (_userId: string) => {
        set({ isSyncing: true, syncError: null })

        try {
          const response = await api.getUserPreference()
          
          if (response.success && response.data) {
            // 语言从 i18n localStorage 中读取（由 i18n 自己管理）
            const currentLanguage = localStorage.getItem('i18nextLng') || DEFAULT_SETTINGS.language
            
            const serverSettings: UserSettings = {
              theme: response.data.theme || DEFAULT_SETTINGS.theme,
              language: currentLanguage,
              fontSize: response.data.fontSize || DEFAULT_SETTINGS.fontSize,
              fontFamily: response.data.fontFamily || DEFAULT_SETTINGS.fontFamily,
              lineHeight: response.data.lineHeight || DEFAULT_SETTINGS.lineHeight,
              autoScroll: response.data.autoScroll ?? DEFAULT_SETTINGS.autoScroll,
              showLineNumber: response.data.showLineNumber ?? DEFAULT_SETTINGS.showLineNumber,
              timestampFormat: response.data.timestampFormat || DEFAULT_SETTINGS.timestampFormat,
            }
            
            set({
              settings: serverSettings,
              isSyncing: false,
              lastSyncTime: Date.now(),
              hasUnsyncedChanges: false,
              syncError: null,
            })

          } else {
            // 如果服务器没有设置，使用本地设置并上传
            const { settings } = get()
            const { language, ...serverSettings } = settings
            await api.updateUserPreference(serverSettings)
            
            set({
              isSyncing: false,
              lastSyncTime: Date.now(),
              hasUnsyncedChanges: false,
              syncError: null,
            })
          }
        } catch (error: any) {
          console.error('从服务器加载设置失败:', error)
          // 如果是404错误（用户没有偏好设置记录），使用本地设置
          if (error.response?.status === 404) {
            set({
              isSyncing: false,
              syncError: null,
            })
          } else {
            set({
              isSyncing: false,
              syncError: error.message || '加载失败',
            })
          }
        }
      },

    }),
    {
      name: 'user-settings', // localStorage key
      // 只持久化 settings，其他状态不需要持久化
      partialize: (state) => ({ settings: state.settings }),
      // 从 localStorage 恢复后，修复旧格式
      onRehydrateStorage: () => (state) => {
        if (state?.settings.timestampFormat) {
          const fixedFormat = state.settings.timestampFormat
            .replace(/YYYY/g, 'yyyy')
            .replace(/DD/g, 'dd')
          
          if (fixedFormat !== state.settings.timestampFormat) {
            console.log('[SettingsStore] 修复旧的时间戳格式:', state.settings.timestampFormat, '→', fixedFormat)
            state.settings.timestampFormat = fixedFormat
          }
        }
      },
    }
  )
)

