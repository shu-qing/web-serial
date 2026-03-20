import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, AuthState } from '@/types'

interface AuthStore extends AuthState {
  isLoggedIn: boolean // 添加 isLoggedIn 别名，与 isAuthenticated 保持同步
  refreshToken: string | null // 添加 refresh token
  tokenExpiresAt: number | null // token 过期时间戳
  setAuth: (user: User, token: string, refreshToken?: string, expiresIn?: number) => void
  updateTokens: (token: string, refreshToken: string, expiresIn: number) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isAuthenticated: false,
      isLoggedIn: false,

      setAuth: (user, token, refreshToken, expiresIn) => {
        const expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : null
        set({
          user,
          token,
          refreshToken: refreshToken || null,
          tokenExpiresAt: expiresAt,
          isAuthenticated: true,
          isLoggedIn: true,
        })
      },

      updateTokens: (token, refreshToken, expiresIn) => {
        const expiresAt = Date.now() + expiresIn * 1000
        set({
          token,
          refreshToken,
          tokenExpiresAt: expiresAt,
        })
      },

      logout: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          tokenExpiresAt: null,
          isAuthenticated: false,
          isLoggedIn: false,
        }),

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
    }),
    {
      name: 'auth-storage',
    }
  )
)

