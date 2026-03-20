import api from './api'

export const adminApi = {
  // ============ 用户管理 ============
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  getUserDetail: (userId: string) => api.get(`/admin/users/${userId}`),
  updateUser: (userId: string, data: any) => api.put(`/admin/users/${userId}`, data),
  updateUserStatus: (userId: string, status: string) => 
    api.put(`/admin/users/${userId}/status`, { status }),
  deleteUsers: (userIds: string[]) => 
    api.post('/admin/users/batch-delete', { userIds }),
  getUserLogs: (userId: string, params?: any) => 
    api.get(`/admin/users/${userId}/logs`, { params }),

  // ============ 系统监控 ============
  getSystemStats: () => api.get('/admin/stats'),
  getActiveSessions: (params?: any) => api.get('/admin/sessions/active', { params }),
  getPerformanceMetrics: () => api.get('/admin/performance'),

  // ============ 日志查询 ============
  getAdminLogs: (params?: any) => api.get('/admin/logs/admin', { params }),
  getSystemLogs: (params?: any) => api.get('/admin/logs/system', { params }),
  getErrorLogs: (params?: any) => api.get('/admin/logs/error', { params }),

  // ============ 分析统计 ============
  getUserGrowthTrend: (days?: number) => 
    api.get('/admin/analytics/users/growth', { params: { days } }),
  getErrorStatsByType: (hours?: number) => 
    api.get('/admin/analytics/errors/by-type', { params: { hours } }),
  getSessionStats: () => api.get('/admin/analytics/sessions'),
}

