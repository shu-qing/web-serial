import { create } from 'zustand'
import { adminApi } from '@/lib/adminApi'

// 类型定义
export interface AdminUser {
  id: string
  email: string
  username: string
  avatar?: string
  role: string
  status: string
  authProvider: string
  isEmailVerified: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
  _count?: {
    projects: number
    testLibraries: number
    ownedSessions: number
  }
}

export interface SystemStats {
  users: {
    total: number
    active: number
    todayNew: number
    weekNew: number
    todayActive: number
  }
  content: {
    projects: number
    testLibraries: number
  }
  sessions: {
    total: number
    active: number
  }
  errors: {
    todayCount: number
  }
  timestamp: Date
}

export interface PerformanceMetrics {
  system: {
    platform: string
    arch: string
    cpuCount: number
    totalMemory: number
    freeMemory: number
    uptime: number
  }
  process: {
    pid: number
    cpuUsage: {
      user: number
      system: number
    }
    memory: {
      rss: number
      heapTotal: number
      heapUsed: number
      external: number
    }
    uptime: number
  }
  errors: {
    recentCount: number
  }
  timestamp: Date
}

export interface AdminLog {
  id: string
  adminId: string
  action: string
  targetId?: string
  targetType?: string
  details?: any
  ipAddress?: string
  createdAt: Date
  admin: {
    id: string
    username: string
    email: string
  }
}

export interface SystemLog {
  id: string
  level: string
  category: string
  message: string
  details?: any
  createdAt: Date
}

export interface ErrorLog {
  id: string
  userId?: string
  errorType: string
  message: string
  stack?: string
  request?: any
  createdAt: Date
  user?: {
    id: string
    username: string
    email: string
  }
}

interface AdminStore {
  // 用户管理
  users: AdminUser[]
  totalUsers: number
  selectedUsers: string[]
  currentUserDetail: AdminUser | null

  // 系统统计
  systemStats: SystemStats | null
  activeSessions: any[]
  performanceMetrics: PerformanceMetrics | null

  // 日志
  adminLogs: AdminLog[]
  systemLogs: SystemLog[]
  errorLogs: ErrorLog[]
  totalAdminLogs: number
  totalSystemLogs: number
  totalErrorLogs: number

  // 分析数据
  userGrowthTrend: Array<{ date: string; count: number }>
  errorStatsByType: Array<{ type: string; count: number }>

  // Loading状态
  loading: boolean
  error: string | null

  // Actions - 用户管理
  fetchUsers: (filters?: any, page?: number) => Promise<void>
  fetchUserDetail: (userId: string) => Promise<void>
  updateUser: (userId: string, data: any) => Promise<void>
  updateUserStatus: (userId: string, status: string) => Promise<void>
  deleteUsers: (userIds: string[]) => Promise<void>
  setSelectedUsers: (userIds: string[]) => void
  toggleUserSelection: (userId: string) => void
  clearSelection: () => void

  // Actions - 系统监控
  fetchSystemStats: () => Promise<void>
  fetchActiveSessions: (page?: number) => Promise<void>
  fetchPerformanceMetrics: () => Promise<void>

  // Actions - 日志查询
  fetchAdminLogs: (filters?: any, page?: number) => Promise<void>
  fetchSystemLogs: (filters?: any, page?: number) => Promise<void>
  fetchErrorLogs: (filters?: any, page?: number) => Promise<void>

  // Actions - 分析统计
  fetchUserGrowthTrend: (days?: number) => Promise<void>
  fetchErrorStatsByType: (hours?: number) => Promise<void>

  // Utility
  clearError: () => void
}

export const useAdminStore = create<AdminStore>((set, get) => ({
  // 初始状态
  users: [],
  totalUsers: 0,
  selectedUsers: [],
  currentUserDetail: null,

  systemStats: null,
  activeSessions: [],
  performanceMetrics: null,

  adminLogs: [],
  systemLogs: [],
  errorLogs: [],
  totalAdminLogs: 0,
  totalSystemLogs: 0,
  totalErrorLogs: 0,

  userGrowthTrend: [],
  errorStatsByType: [],

  loading: false,
  error: null,

  // ============ 用户管理 ============

  fetchUsers: async (filters = {}, page = 1) => {
    try {
      set({ loading: true, error: null })
      const response = await adminApi.getUsers({ ...filters, page, limit: 20 })
      set({
        users: response.data.users,
        totalUsers: response.data.total,
        loading: false,
      })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  fetchUserDetail: async (userId: string) => {
    try {
      set({ loading: true, error: null })
      const response = await adminApi.getUserDetail(userId)
      set({ currentUserDetail: response.data, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  updateUser: async (userId: string, data: any) => {
    try {
      set({ loading: true, error: null })
      await adminApi.updateUser(userId, data)
      
      // 刷新用户列表
      await get().fetchUsers()
      set({ loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  updateUserStatus: async (userId: string, status: string) => {
    try {
      set({ loading: true, error: null })
      await adminApi.updateUserStatus(userId, status)
      
      // 更新本地用户列表
      set((state) => ({
        users: state.users.map(u =>
          u.id === userId ? { ...u, status } : u
        ),
        loading: false,
      }))
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  deleteUsers: async (userIds: string[]) => {
    try {
      set({ loading: true, error: null })
      await adminApi.deleteUsers(userIds)
      
      // 从本地列表移除
      set((state) => ({
        users: state.users.filter(u => !userIds.includes(u.id)),
        totalUsers: state.totalUsers - userIds.length,
        selectedUsers: [],
        loading: false,
      }))
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  setSelectedUsers: (userIds: string[]) => {
    set({ selectedUsers: userIds })
  },

  toggleUserSelection: (userId: string) => {
    set((state) => ({
      selectedUsers: state.selectedUsers.includes(userId)
        ? state.selectedUsers.filter(id => id !== userId)
        : [...state.selectedUsers, userId],
    }))
  },

  clearSelection: () => {
    set({ selectedUsers: [] })
  },

  // ============ 系统监控 ============

  fetchSystemStats: async () => {
    try {
      set({ loading: true, error: null })
      const response = await adminApi.getSystemStats()
      set({ systemStats: response.data, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  fetchActiveSessions: async (page = 1) => {
    try {
      set({ loading: true, error: null })
      const response = await adminApi.getActiveSessions({ page, limit: 20 })
      set({ activeSessions: response.data.sessions, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  fetchPerformanceMetrics: async () => {
    try {
      set({ loading: true, error: null })
      const response = await adminApi.getPerformanceMetrics()
      set({ performanceMetrics: response.data, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  // ============ 日志查询 ============

  fetchAdminLogs: async (filters = {}, page = 1) => {
    try {
      set({ loading: true, error: null })
      const response = await adminApi.getAdminLogs({ ...filters, page, limit: 50 })
      set({
        adminLogs: response.data.logs,
        totalAdminLogs: response.data.total,
        loading: false,
      })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  fetchSystemLogs: async (filters = {}, page = 1) => {
    try {
      set({ loading: true, error: null })
      const response = await adminApi.getSystemLogs({ ...filters, page, limit: 50 })
      set({
        systemLogs: response.data.logs,
        totalSystemLogs: response.data.total,
        loading: false,
      })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  fetchErrorLogs: async (filters = {}, page = 1) => {
    try {
      set({ loading: true, error: null })
      const response = await adminApi.getErrorLogs({ ...filters, page, limit: 50 })
      set({
        errorLogs: response.data.logs,
        totalErrorLogs: response.data.total,
        loading: false,
      })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  // ============ 分析统计 ============

  fetchUserGrowthTrend: async (days = 7) => {
    try {
      const response = await adminApi.getUserGrowthTrend(days)
      set({ userGrowthTrend: response.data })
    } catch (error: any) {
      console.error('Failed to fetch user growth trend:', error)
    }
  },

  fetchErrorStatsByType: async (hours = 24) => {
    try {
      const response = await adminApi.getErrorStatsByType(hours)
      set({ errorStatsByType: response.data })
    } catch (error: any) {
      console.error('Failed to fetch error stats:', error)
    }
  },

  // ============ Utility ============

  clearError: () => {
    set({ error: null })
  },
}))

