import { create } from 'zustand'
import { HighlightRule } from '@/types'
import { PRESET_HIGHLIGHT_RULES } from '@/utils/constants'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
}

interface UIStore {
  highlightRules: HighlightRule[]
  toasts: ToastMessage[]
  
  addHighlightRule: (rule: HighlightRule) => void
  updateHighlightRule: (id: string, updates: Partial<HighlightRule>) => void
  deleteHighlightRule: (id: string) => void
  toggleHighlightRule: (id: string) => void
  showToast: (type: ToastType, message: string) => void
  hideToast: (id: string) => void
}

export const useUIStore = create<UIStore>((set) => ({
  highlightRules: PRESET_HIGHLIGHT_RULES.map((rule, index) => ({
    id: `preset-${index}`,
    pattern: rule.pattern,
    color: rule.color,
    enabled: false,  // 默认禁用，用户需要时手动启用
  })),
  toasts: [],

  addHighlightRule: (rule) =>
    set((state) => ({
      highlightRules: [...state.highlightRules, rule],
    })),

  updateHighlightRule: (id, updates) =>
    set((state) => ({
      highlightRules: state.highlightRules.map((rule) =>
        rule.id === id ? { ...rule, ...updates } : rule
      ),
    })),

  deleteHighlightRule: (id) =>
    set((state) => ({
      highlightRules: state.highlightRules.filter((rule) => rule.id !== id),
    })),

  toggleHighlightRule: (id) =>
    set((state) => ({
      highlightRules: state.highlightRules.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      ),
    })),

  showToast: (type, message) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    set((state) => ({
      toasts: [...state.toasts, { id, type, message }],
    }))
    // 3秒后自动隐藏
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      }))
    }, 3000)
  },

  hideToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}))

