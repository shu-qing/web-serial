/**
 * API 客户端
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { API_BASE_URL, API_ENDPOINTS } from '@/utils/constants'
import { ApiResponse } from '@/types'

class ApiClient {
  private client: AxiosInstance
  private isRefreshing = false
  private failedQueue: Array<{ resolve: (value: any) => void; reject: (reason: any) => void }> = []

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // 30秒超时（注册需要发送邮件，耗时较长）
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        // 添加认证 token
        const token = localStorage.getItem('auth_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        
        // 添加语言偏好（i18n支持）
        const language = localStorage.getItem('i18nextLng') || 'zh-CN'
        config.headers['Accept-Language'] = language
        
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        return response.data
      },
      async (error: AxiosError<any>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
        
        // 处理错误响应
        if (error.response) {
          const { status, data } = error.response

          // 获取请求 URL
          const requestUrl = originalRequest.url || ''
          
          // 认证相关的接口（login, register, refresh）不应该触发 token 刷新
          // 这些接口返回 401 表示认证失败（邮箱密码错误等），而不是 token 过期
          const isAuthEndpoint = requestUrl.includes('/auth/login') || 
                                requestUrl.includes('/auth/register') || 
                                requestUrl.includes('/auth/refresh')

          // 对于 401 错误，尝试刷新 token（但排除认证接口）
          if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            if (this.isRefreshing) {
              // 如果正在刷新，将请求加入队列
              return new Promise((resolve, reject) => {
                this.failedQueue.push({ resolve, reject })
              }).then(() => {
                return this.client(originalRequest)
              }).catch((err) => {
                return Promise.reject(err)
              })
            }

            originalRequest._retry = true
            this.isRefreshing = true

            const refreshToken = localStorage.getItem('refresh_token')
            
            if (refreshToken) {
              try {
                // 刷新 token
                const response = await this.refreshToken(refreshToken)
                
                if (response.success && response.data) {
                  const { token, refreshToken: newRefreshToken, expiresIn } = response.data
                  
                  // 更新存储
                  localStorage.setItem('auth_token', token)
                  localStorage.setItem('refresh_token', newRefreshToken)
                  
                  // 更新 store
                  const { useAuthStore } = await import('@/stores/useAuthStore')
                  useAuthStore.getState().updateTokens(token, newRefreshToken, expiresIn)
                  
                  // 更新原请求的 token
                  originalRequest.headers.Authorization = `Bearer ${token}`
                  
                  // 处理队列中的请求
                  this.processQueue(null)
                  
                  // 重试原请求
                  return this.client(originalRequest)
                }
              } catch (refreshError) {
                this.processQueue(refreshError)
                // 刷新失败，清除认证状态
                this.handleAuthFailure()
                return Promise.reject(refreshError)
              } finally {
                this.isRefreshing = false
              }
            } else {
              // 没有 refresh token，直接登出
              this.handleAuthFailure()
            }
          }

          // 对于特殊状态码，执行特定操作
          switch (status) {
            case 403:
              console.error('没有权限访问')
              break
            case 404:
              console.error('请求的资源不存在')
              break
            case 500:
              console.error('服务器错误')
              break
            default:
              console.error('请求失败:', data)
          }

          // 添加用户友好的错误信息到 error 对象
          if (data && typeof data === 'object') {
            // 后端统一返回格式: { success: false, error: { code, message, details } }
            const errorData = data.error || data
            const baseMessage = errorData.message || error.message
            
            // 对于验证错误(422)，优先显示 details 中的具体字段错误
            // 对于其他错误（如409冲突），使用 message
            if (status === 422 && errorData.details && typeof errorData.details === 'object') {
              // 验证错误：details 格式为 { fieldName: "具体错误消息" }
              const detailMessages = Object.values(errorData.details).filter(msg => typeof msg === 'string') as string[]
              if (detailMessages.length > 0) {
                error.message = detailMessages[0]
              } else {
                error.message = baseMessage
              }
            } else {
              // 其他错误：直接使用 message
              error.message = baseMessage
            }
          }
        } else if (error.request) {
          error.message = '网络错误，请检查网络连接'
          console.error('网络错误，请检查网络连接')
        } else {
          error.message = '请求配置错误'
          console.error('请求配置错误:', error.message)
        }

        return Promise.reject(error)
      }
    )
  }

  /**
   * 处理认证失败
   */
  private handleAuthFailure() {
    console.error('认证失败，token 已过期且无法刷新')
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_info')
    // 刷新页面回到未登录状态
    window.location.reload()
  }

  /**
   * 处理请求队列
   */
  private processQueue(error: any) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error)
      } else {
        prom.resolve(null)
      }
    })
    this.failedQueue = []
  }

  /**
   * GET 请求
   */
  async get<T = any>(url: string, params?: any): Promise<ApiResponse<T>> {
    return this.client.get(url, { params })
  }

  /**
   * POST 请求
   */
  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.client.post(url, data)
  }

  /**
   * PUT 请求
   */
  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.client.put(url, data)
  }

  /**
   * PATCH 请求
   */
  async patch<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.client.patch(url, data)
  }

  /**
   * DELETE 请求
   */
  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    return this.client.delete(url)
  }

  // ========== 用户认证 API ==========

  /**
   * 用户登录
   */
  async login(email: string, password: string) {
    return this.post(API_ENDPOINTS.AUTH_LOGIN, { email, password })
  }

  /**
   * 用户注册
   */
  async register(email: string, username: string, password: string) {
    return this.post(API_ENDPOINTS.AUTH_REGISTER, { email, username, password })
  }

  /**
   * 用户登出
   */
  async logout() {
    return this.post(API_ENDPOINTS.AUTH_LOGOUT)
  }

  /**
   * 刷新 token
   */
  async refreshToken(refreshToken: string) {
    return this.post(API_ENDPOINTS.AUTH_REFRESH, { refreshToken })
  }

  // ========== 用户信息 API ==========

  /**
   * 获取用户信息
   */
  async getUserProfile() {
    return this.get(API_ENDPOINTS.USER_PROFILE)
  }

  /**
   * 更新用户信息
   */
  async updateUserProfile(data: any) {
    return this.put(API_ENDPOINTS.USER_UPDATE, data)
  }

  /**
   * 修改密码
   */
  async changePassword(currentPassword: string, newPassword: string) {
    return this.post(API_ENDPOINTS.USER_CHANGE_PASSWORD, {
      currentPassword,
      newPassword,
    })
  }

  // ========== 用户偏好设置 API ==========

  /**
   * 获取用户偏好设置
   */
  async getUserPreference() {
    return this.get(API_ENDPOINTS.USER_PREFERENCE)
  }

  /**
   * 更新用户偏好设置
   */
  async updateUserPreference(data: any) {
    return this.put(API_ENDPOINTS.USER_PREFERENCE, data)
  }

  /**
   * 重置用户偏好设置为默认值
   */
  async resetUserPreference() {
    return this.post(API_ENDPOINTS.USER_PREFERENCE_RESET)
  }

  // ========== 项目管理 API ==========

  /**
   * 获取项目列表
   */
  async getProjects() {
    return this.get(API_ENDPOINTS.PROJECTS)
  }

  /**
   * 创建项目
   */
  async createProject(data: any) {
    return this.post(API_ENDPOINTS.PROJECTS, data)
  }

  /**
   * 获取项目详情
   */
  async getProject(id: string) {
    return this.get(API_ENDPOINTS.PROJECT_BY_ID(id))
  }

  /**
   * 更新项目
   */
  async updateProject(id: string, data: any) {
    return this.put(API_ENDPOINTS.PROJECT_BY_ID(id), data)
  }

  /**
   * 删除项目
   */
  async deleteProject(id: string) {
    return this.delete(API_ENDPOINTS.PROJECT_BY_ID(id))
  }

  // ========== 命令库 API ==========

  /**
   * 获取命令列表
   */
  async getCommands() {
    return this.get(API_ENDPOINTS.COMMANDS)
  }

  /**
   * 创建命令
   */
  async createCommand(data: any) {
    return this.post(API_ENDPOINTS.COMMANDS, data)
  }

  /**
   * 更新命令
   */
  async updateCommand(id: string, data: any) {
    return this.put(API_ENDPOINTS.COMMAND_BY_ID(id), data)
  }

  /**
   * 删除命令
   */
  async deleteCommand(id: string) {
    return this.delete(API_ENDPOINTS.COMMAND_BY_ID(id))
  }

  // ========== 远程会话 API ==========

  /**
   * 创建远程会话
   */
  async createSession(mode: 'share' | 'bridge', name?: string, description?: string) {
    return this.post(API_ENDPOINTS.SESSION_CREATE, {
      mode,
      name: name || `${mode === 'share' ? '会话共享' : '智能桥接'} ${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`,
      description,
    })
  }

  /**
   * 加入远程会话
   */
  async joinSession(code: string) {
    return this.post(API_ENDPOINTS.SESSION_JOIN, { code })
  }

  /**
   * 获取会话详情
   */
  async getSession(id: string) {
    return this.get(API_ENDPOINTS.SESSION_BY_ID(id))
  }

  // ========== 数据分析 API ==========

  /**
   * 生成分析报告
   */
  async generateAnalysisReport(projectId: string) {
    return this.post(API_ENDPOINTS.ANALYSIS_REPORT(projectId))
  }

  /**
   * 获取分析报告
   */
  async getAnalysisReport(projectId: string) {
    return this.get(API_ENDPOINTS.ANALYSIS_REPORT(projectId))
  }

  // ========== 反馈 API ==========

  /**
   * 提交反馈
   */
  async submitFeedback(data: {
    type: string
    title: string
    description: string
    contact?: string
    images?: string[]
  }) {
    return this.post('/feedback', data)
  }

  /**
   * 获取反馈列表（管理员）
   */
  async getFeedbacks(params?: { status?: string; type?: string; page?: number; limit?: number }) {
    return this.get('/feedback', { params })
  }

  /**
   * 更新反馈状态（管理员）
   */
  async updateFeedback(id: string, data: { status?: string; adminReply?: string }) {
    return this.patch(`/feedback/${id}`, data)
  }

  /**
   * 删除反馈（管理员）
   */
  async deleteFeedback(id: string) {
    return this.delete(`/feedback/${id}`)
  }

  // ========== 测试库 API ==========

  /**
   * 获取项目的测试库列表
   */
  async getTestLibraries(projectId: string, params?: { page?: number; limit?: number; deviceType?: string; protocol?: string }) {
    return this.get(API_ENDPOINTS.TEST_LIBRARIES_BY_PROJECT(projectId), params)
  }

  /**
   * 获取或创建项目的测试库
   */
  async getOrCreateTestLibrary(projectId: string) {
    return this.get(API_ENDPOINTS.TEST_LIBRARY_GET_OR_CREATE(projectId))
  }

  /**
   * 获取测试库详情
   */
  async getTestLibrary(id: string) {
    return this.get(API_ENDPOINTS.TEST_LIBRARY_BY_ID(id))
  }

  /**
   * 创建测试库
   */
  async createTestLibrary(projectId: string, data: any) {
    return this.post(API_ENDPOINTS.TEST_LIBRARIES_BY_PROJECT(projectId), data)
  }

  /**
   * 更新测试库
   */
  async updateTestLibrary(id: string, data: any) {
    return this.put(API_ENDPOINTS.TEST_LIBRARY_BY_ID(id), data)
  }

  /**
   * 删除测试库
   */
  async deleteTestLibrary(id: string) {
    return this.delete(API_ENDPOINTS.TEST_LIBRARY_BY_ID(id))
  }

  /**
   * 获取测试单列表
   */
  async getTestSuites(libraryId: string) {
    return this.get(API_ENDPOINTS.TEST_SUITES_BY_LIBRARY(libraryId))
  }

  /**
   * 获取测试单详情
   */
  async getTestSuite(id: string) {
    return this.get(API_ENDPOINTS.TEST_SUITE_BY_ID(id))
  }

  /**
   * 创建测试单
   */
  async createTestSuite(libraryId: string, data: any) {
    return this.post(API_ENDPOINTS.TEST_SUITES_BY_LIBRARY(libraryId), data)
  }

  /**
   * 更新测试单
   */
  async updateTestSuite(id: string, data: any) {
    return this.put(API_ENDPOINTS.TEST_SUITE_BY_ID(id), data)
  }

  /**
   * 删除测试单
   */
  async deleteTestSuite(id: string) {
    return this.delete(API_ENDPOINTS.TEST_SUITE_BY_ID(id))
  }

  /**
   * 复制测试单
   */
  async copyTestSuite(id: string) {
    return this.post(`${API_ENDPOINTS.TEST_SUITE_BY_ID(id)}/copy`)
  }

  /**
   * 获取测试用例列表
   */
  async getTestCases(suiteId: string) {
    return this.get(API_ENDPOINTS.TEST_CASES_BY_SUITE(suiteId))
  }

  /**
   * 获取测试用例详情
   */
  async getTestCase(id: string) {
    return this.get(API_ENDPOINTS.TEST_CASE_BY_ID(id))
  }

  /**
   * 创建测试用例
   */
  async createTestCase(suiteId: string, data: any) {
    return this.post(API_ENDPOINTS.TEST_CASES_BY_SUITE(suiteId), data)
  }

  /**
   * 更新测试用例
   */
  async updateTestCase(id: string, data: any) {
    return this.put(API_ENDPOINTS.TEST_CASE_BY_ID(id), data)
  }

  /**
   * 删除测试用例
   */
  async deleteTestCase(id: string) {
    return this.delete(API_ENDPOINTS.TEST_CASE_BY_ID(id))
  }

  /**
   * 创建测试结果
   */
  async createTestResult(testCaseId: string, data: any) {
    return this.post(`${API_ENDPOINTS.TEST_CASE_BY_ID(testCaseId)}/results`, data)
  }

  /**
   * 获取测试结果列表
   */
  async getTestResults(testCaseId: string, params?: { page?: number; limit?: number }) {
    return this.get(`${API_ENDPOINTS.TEST_CASE_BY_ID(testCaseId)}/results`, params)
  }
}

export const api = new ApiClient()
export default api

