import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { Icon } from '@/components/common/Icons'
import Dashboard from './admin/Dashboard'
import UserManagement from './admin/UserManagement'
import FeedbackManagement from './admin/FeedbackManagement'
import SystemMonitor from './admin/SystemMonitor'
import LogsPage from './admin/LogsPage'

export default function AdminPage() {
  const location = useLocation()

  const menuItems = [
    { path: '/admin', label: '控制台', icon: 'dashboard', exact: true },
    { path: '/admin/users', label: '用户管理', icon: 'users' },
    { path: '/admin/feedback', label: '用户反馈', icon: 'megaphone' },
    { path: '/admin/monitor', label: '系统监控', icon: 'activity' },
    { path: '/admin/logs', label: '日志查询', icon: 'file-text' },
  ]

  const isActive = (path: string, exact: boolean = false) => {
    if (exact) {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="h-screen flex bg-gray-100">
      {/* 左侧导航 */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">管理后台</h1>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive(item.path, item.exact)
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon name={item.icon} className="w-5 h-5 mr-3" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* 返回主页 */}
        <div className="p-4 border-t border-gray-200">
          <Link
            to="/"
            className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Icon name="arrow-left" className="w-5 h-5 mr-3" />
            返回主页
          </Link>
        </div>
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/feedback" element={<FeedbackManagement />} />
          <Route path="/monitor" element={<SystemMonitor />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </div>
  )
}

