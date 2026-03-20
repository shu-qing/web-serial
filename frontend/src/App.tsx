import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import WikiPage from '@/pages/WikiPage'
import ProfilePage from '@/pages/ProfilePage'
import AdminPage from '@/pages/AdminPage'
import EmailVerifyPage from '@/pages/EmailVerifyPage'
import ToastContainer from '@/components/common/ToastContainer'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTokenRefresh } from '@/hooks/useTokenRefresh'

// 管理员路由守卫
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  
  if (!user) {
    return <Navigate to="/" replace />
  }
  
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return <Navigate to="/" replace />
  }
  
  return <>{children}</>
}

function App() {
  const { settings } = useSettingsStore()
  
  // 自动 token 刷新
  useTokenRefresh()
  
  // 应用主题模式
  useEffect(() => {
    const applyTheme = (theme: 'light' | 'dark' | 'auto') => {
      const root = document.documentElement
      
      if (theme === 'auto') {
        // 自动模式：根据系统偏好
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (prefersDark) {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      } else if (theme === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
    
    applyTheme(settings.theme)
    
    // 监听系统主题变化（仅在 auto 模式）
    if (settings.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => {
        if (settings.theme === 'auto') {
          applyTheme('auto')
        }
      }
      
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [settings.theme])

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* HomePage 独立路由 - 全屏设计，不使用 Layout */}
        <Route path="/" element={<HomePage />} />
        
        {/* Wiki 独立路由 - 使用专用的 Wiki 布局 */}
        <Route path="/wiki" element={<WikiPage />} />
        
        {/* 个人账号管理页面 */}
        <Route path="/profile" element={<ProfilePage />} />
        
        {/* 邮箱验证页面 */}
        <Route path="/verify-email" element={<EmailVerifyPage />} />
        
        {/* 管理后台路由 - 需要管理员权限 */}
        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
        
        {/* 404 页面 - 回到 HomePage */}
        <Route path="*" element={<HomePage />} />
      </Routes>
      
      {/* 全局 Toast 容器 */}
      <ToastContainer />
    </Router>
  )
}

export default App

