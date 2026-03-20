import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { useUIStore } from '@/stores/useUIStore'
import { api } from '@/lib/api'
import {
  UserCircleIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CameraIcon,
} from '@heroicons/react/24/outline'

type TabType = 'profile' | 'security' | 'preferences' | 'stats' | 'danger'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, isLoggedIn, logout, updateUser } = useAuthStore()
  const { showToast } = useUIStore()
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 个人信息表单
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [avatar, setAvatar] = useState('')
  const [bio, setBio] = useState('')

  // 密码修改表单
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // 注意：偏好设置现已移至主页设置面板，此处仅作展示

  // 检查登录状态
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/')
      showToast('error', '请先登录')
    } else if (user) {
      // 初始化表单数据
      setUsername(user.username || '')
      setEmail(user.email || '')
      setAvatar(user.avatar || '')
    }
  }, [isLoggedIn, user, navigate, showToast])

  const tabs = [
    { id: 'profile', name: '个人信息', icon: UserCircleIcon },
    { id: 'security', name: '安全设置', icon: ShieldCheckIcon },
    { id: 'preferences', name: '偏好设置', icon: Cog6ToothIcon },
    { id: 'stats', name: '使用统计', icon: ChartBarIcon },
    { id: 'danger', name: '账号操作', icon: ExclamationTriangleIcon },
  ] as const

  // 触发文件选择
  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  // 处理头像上传
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      showToast('error', '请选择图片文件')
      return
    }

    // 验证文件大小（2MB）
    if (file.size > 2 * 1024 * 1024) {
      showToast('error', '图片大小不能超过 2MB')
      return
    }

    // 转换为 base64
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      setAvatar(base64)
      
      // 自动保存头像
      try {
        const response = await api.updateUserProfile({
          username: username.trim(),
          avatar: base64,
        })

        if (response.success) {
          updateUser(response.data)
          showToast('success', '头像已更新')
        } else {
          showToast('error', response.message || '更新失败')
          // 回滚
          setAvatar(user?.avatar || '')
        }
      } catch (error: any) {
        showToast('error', error.message || '更新失败')
        // 回滚
        setAvatar(user?.avatar || '')
      }
    }
    reader.onerror = () => {
      showToast('error', '读取文件失败')
    }
    reader.readAsDataURL(file)
  }

  // 保存个人信息
  const handleSaveProfile = async () => {
    setIsLoading(true)
    try {
      const response = await api.updateUserProfile({
        username: username.trim(),
        avatar: avatar.trim() || undefined,
      })

      if (response.success) {
        updateUser(response.data)
        showToast('success', '个人信息已更新')
      } else {
        showToast('error', response.message || '更新失败')
      }
    } catch (error: any) {
      showToast('error', error.message || '更新失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 修改密码
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('error', '请填写所有密码字段')
      return
    }

    if (newPassword !== confirmPassword) {
      showToast('error', '两次输入的新密码不一致')
      return
    }

    if (newPassword.length < 8) {
      showToast('error', '新密码至少需要8个字符')
      return
    }

    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(newPassword)) {
      showToast('error', '新密码必须包含字母和数字')
      return
    }

    setIsLoading(true)
    try {
      const response = await api.changePassword(currentPassword, newPassword)
      
      if (response.success) {
        showToast('success', '密码修改成功')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        showToast('error', response.message || '修改密码失败')
      }
    } catch (error: any) {
      showToast('error', error.message || '修改密码失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 注销账号
  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      '确定要注销账号吗？\n\n此操作将永久删除您的所有数据，包括：\n- 个人信息\n- 所有项目\n- 所有宏命令\n- 历史记录\n\n此操作不可恢复！'
    )

    if (!confirmed) return

    const doubleConfirm = window.prompt('请输入您的邮箱以确认注销账号：')
    if (doubleConfirm !== user?.email) {
      showToast('error', '邮箱不匹配，操作已取消')
      return
    }

    setIsLoading(true)
    try {
      // TODO: 实现注销账号API
      showToast('info', '注销账号功能开发中')
    } catch (error: any) {
      showToast('error', error.message || '注销失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 退出所有设备
  const handleLogoutAllDevices = () => {
    const confirmed = window.confirm('确定要退出所有设备的登录吗？\n\n您需要在每台设备上重新登录。')
    if (!confirmed) return

    logout()
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_info')
    showToast('success', '已退出所有设备')
    navigate('/')
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      <div className="max-w-7xl mx-auto h-full py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-12 gap-6 h-full">
          {/* 左侧导航 - 固定不滚动 */}
          <aside className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-lg shadow sticky top-6">
              {/* 标题 */}
              <div className="p-4 border-b border-gray-200">
                <h1 className="text-xl font-bold text-gray-900">账号设置</h1>
                <p className="mt-1 text-xs text-gray-600">管理您的个人信息和偏好</p>
              </div>
              
              {/* 导航标签 */}
              <nav className="p-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.name}
                    </button>
                  )
                })}
              </nav>
            </div>
          </aside>

          {/* 右侧内容 - 可滚动 */}
          <main className="col-span-12 lg:col-span-9 overflow-y-auto scrollbar-thin pr-2" style={{ maxHeight: 'calc(100vh - 3rem)' }}>
            {/* 个人信息 */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* 头像 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">个人头像</h2>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt="Avatar"
                          className="w-24 h-24 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl font-semibold">
                          {username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <button 
                        onClick={handleAvatarClick}
                        className="absolute bottom-0 right-0 w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 shadow-sm transition-colors"
                        title="更换头像"
                      >
                        <CameraIcon className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-2">
                        推荐使用 JPG、PNG 格式，文件大小不超过 2MB
                      </p>
                      <div className="flex gap-2">
                        <button 
                          onClick={handleAvatarClick}
                          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          上传新头像
                        </button>
                        {avatar && (
                          <button
                            onClick={() => setAvatar('')}
                            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                          >
                            移除头像
                          </button>
                        )}
                      </div>
                      {/* 隐藏的文件输入 */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* 基本信息 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        用户名
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="请输入用户名"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        邮箱地址
                      </label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        邮箱地址不可修改，如需更换请联系管理员
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        个人简介（可选）
                      </label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="简单介绍一下自己..."
                        maxLength={200}
                      />
                      <p className="mt-1 text-xs text-gray-500 text-right">
                        {bio.length}/200
                      </p>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <button
                        onClick={handleSaveProfile}
                        disabled={isLoading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? '保存中...' : '保存更改'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 账号信息 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">账号信息</h2>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">用户 ID</span>
                      <span className="font-mono text-gray-900">{user?.id}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">注册时间</span>
                      <span className="text-gray-900">
                        {user?.createdAt
                          ? new Date(user.createdAt).toLocaleString('zh-CN')
                          : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">认证方式</span>
                      <span className="text-gray-900">邮箱密码</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">邮箱验证状态</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        已验证
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 安全设置 */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* 修改密码 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">修改密码</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        当前密码
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="请输入当前密码"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        新密码
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="至少8位，包含字母和数字"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        确认新密码
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="再次输入新密码"
                      />
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <button
                        onClick={handleChangePassword}
                        disabled={isLoading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? '修改中...' : '修改密码'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 两步验证 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">两步验证</h2>
                      <p className="mt-1 text-sm text-gray-600">
                        为您的账号增加额外的安全保护
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      未启用
                    </span>
                  </div>
                  <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100">
                    启用两步验证
                  </button>
                </div>

                {/* 登录设备 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">登录设备</h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">当前设备</p>
                          <p className="text-xs text-gray-500">
                            macOS · Chrome · 最后活跃：刚刚
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-green-600 font-medium">活跃中</span>
                    </div>
                  </div>
                </div>

                {/* 登录历史 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">最近登录记录</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">2025-11-05 18:30</span>
                      <span className="text-gray-900">macOS · Chrome</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">2025-11-04 09:15</span>
                      <span className="text-gray-900">macOS · Chrome</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">2025-11-03 14:20</span>
                      <span className="text-gray-900">macOS · Chrome</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 偏好设置 */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                {/* 偏好设置提示 */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">偏好设置已迁移</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    所有偏好设置（主题、语言、字体等）现已整合到主页的设置面板中，方便您随时访问和修改。
                  </p>
                  <button
                    onClick={() => navigate('/')}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    返回主页查看设置
                  </button>
                  <p className="text-sm text-gray-500 mt-4">
                    💡 提示：在主页点击右下角的设置图标即可打开设置面板
                  </p>
                </div>

                {/* 数据与隐私 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">数据与隐私</h2>
                  <div className="space-y-3">
                    <button className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">导出我的数据</p>
                          <p className="text-sm text-gray-600">
                            下载您的所有项目和配置数据
                          </p>
                        </div>
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 使用统计 */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                {/* 统计卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">项目总数</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">12</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">宏命令数</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">48</p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">使用天数</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">15</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 活动图表 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">最近活动</h2>
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <ChartBarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">活动图表功能开发中</p>
                    </div>
                  </div>
                </div>

                {/* 详细统计 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">详细统计</h2>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">发送数据总量</span>
                      <span className="font-medium text-gray-900">1.2 MB</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">接收数据总量</span>
                      <span className="font-medium text-gray-900">3.5 MB</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">会话总数</span>
                      <span className="font-medium text-gray-900">8</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">协作次数</span>
                      <span className="font-medium text-gray-900">3</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 账号操作 */}
            {activeTab === 'danger' && (
              <div className="space-y-6">
                {/* 退出所有设备 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">退出所有设备</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    这将使您在所有设备上的登录会话失效，您需要重新登录。
                  </p>
                  <button
                    onClick={handleLogoutAllDevices}
                    className="px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100"
                  >
                    退出所有设备
                  </button>
                </div>

                {/* 注销账号 */}
                <div className="bg-white rounded-lg shadow p-6 border-2 border-red-200">
                  <div className="flex items-start gap-3 mb-4">
                    <ExclamationTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h2 className="text-lg font-semibold text-red-900 mb-2">
                        注销账号
                      </h2>
                      <p className="text-sm text-red-700 mb-2">
                        此操作将永久删除您的账号和所有数据，包括：
                      </p>
                      <ul className="text-sm text-red-700 list-disc list-inside space-y-1 mb-4">
                        <li>个人信息和设置</li>
                        <li>所有项目和配置</li>
                        <li>所有宏命令和历史记录</li>
                        <li>使用统计和日志</li>
                      </ul>
                      <p className="text-sm font-semibold text-red-800">
                        ⚠️ 此操作不可恢复！请谨慎操作。
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? '处理中...' : '我了解风险，注销账号'}
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

