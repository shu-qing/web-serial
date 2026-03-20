import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { api } from '@/lib/api'

/**
 * 自动 Token 刷新 Hook
 * 
 * 在 token 过期前 5 分钟自动刷新
 */
export const useTokenRefresh = () => {
  const { isLoggedIn, tokenExpiresAt, refreshToken, updateTokens, logout } = useAuthStore()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // 清除之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    // 如果未登录或没有 token 过期时间，不处理
    if (!isLoggedIn || !tokenExpiresAt || !refreshToken) {
      return
    }

    const now = Date.now()
    const expiresAt = tokenExpiresAt
    
    // 计算刷新时间：过期前 5 分钟刷新
    const refreshTime = expiresAt - 5 * 60 * 1000
    const timeUntilRefresh = refreshTime - now

    // 如果已经过期或即将过期（1分钟内），立即刷新
    if (timeUntilRefresh <= 60 * 1000) {
      console.log('[TokenRefresh] Token 即将过期，立即刷新')
      refreshTokenNow()
    } else {
      // 否则设置定时器
      console.log(`[TokenRefresh] 将在 ${Math.floor(timeUntilRefresh / 1000 / 60)} 分钟后刷新 token`)
      timerRef.current = setTimeout(() => {
        refreshTokenNow()
      }, timeUntilRefresh)
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isLoggedIn, tokenExpiresAt, refreshToken])

  const refreshTokenNow = async () => {
    const currentRefreshToken = useAuthStore.getState().refreshToken
    
    if (!currentRefreshToken) {
      console.error('[TokenRefresh] 没有 refresh token')
      return
    }

    try {
      console.log('[TokenRefresh] 开始刷新 token...')
      const response = await api.refreshToken(currentRefreshToken)
      
      if (response.success && response.data) {
        const { token, refreshToken: newRefreshToken, expiresIn } = response.data
        
        // 更新存储
        localStorage.setItem('auth_token', token)
        localStorage.setItem('refresh_token', newRefreshToken)
        
        // 更新 store
        updateTokens(token, newRefreshToken, expiresIn)
        
        console.log('[TokenRefresh] Token 刷新成功')
      } else {
        console.error('[TokenRefresh] 刷新失败:', response.message)
        // 刷新失败，登出
        logout()
        localStorage.removeItem('auth_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user_info')
        window.location.reload()
      }
    } catch (error) {
      console.error('[TokenRefresh] 刷新出错:', error)
      // 刷新失败，登出
      logout()
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user_info')
      window.location.reload()
    }
  }
}

