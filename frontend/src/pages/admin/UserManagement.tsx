import { useEffect, useState } from 'react'
import { useAdminStore } from '@/stores/useAdminStore'
import { useUIStore } from '@/stores/useUIStore'
import UserTable from '@/components/Admin/UserTable'
import Modal from '@/components/common/Modal'

export default function UserManagement() {
  const { showToast } = useUIStore()
  const {
    users,
    totalUsers,
    selectedUsers,
    currentUserDetail,
    fetchUsers,
    fetchUserDetail,
    updateUser,
    updateUserStatus,
    deleteUsers,
    toggleUserSelection,
    setSelectedUsers,
    clearSelection,
  } = useAdminStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [searchTerm, roleFilter, statusFilter, currentPage])

  const loadUsers = () => {
    fetchUsers(
      {
        search: searchTerm || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      },
      currentPage
    )
  }

  const handleViewDetail = async (userId: string) => {
    await fetchUserDetail(userId)
    setShowDetailModal(true)
  }

  const handleEditUser = (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (user) {
      setEditingUser(user)
      setShowEditModal(true)
    }
  }

  const handleSaveUser = async () => {
    if (!editingUser) return

    try {
      await updateUser(editingUser.id, {
        username: editingUser.username,
        email: editingUser.email,
        role: editingUser.role,
      })
      setShowEditModal(false)
      setEditingUser(null)
      showToast('success', '用户信息已更新')
    } catch (error) {
      showToast('error', '更新失败')
    }
  }

  const handleStatusChange = async (userId: string, status: string) => {
    try {
      await updateUserStatus(userId, status)
      showToast('success', `用户状态已更新为${status === 'active' ? '活跃' : '禁用'}`)
    } catch (error) {
      showToast('error', '状态更新失败')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedUsers.length === 0) {
      showToast('warning', '请先选择要删除的用户')
      return
    }

    if (!confirm(`确定要删除 ${selectedUsers.length} 个用户吗？此操作不可恢复！`)) {
      return
    }

    try {
      await deleteUsers(selectedUsers)
      showToast('success', `已删除 ${selectedUsers.length} 个用户`)
    } catch (error) {
      showToast('error', '删除失败')
    }
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedUsers(users.map(u => u.id))
    } else {
      clearSelection()
    }
  }

  return (
    <div className="p-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">用户管理</h1>
        <p className="text-gray-500 mt-2">查看和管理所有用户</p>
      </div>

      {/* 工具栏 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          {/* 搜索 */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="搜索用户名或邮箱..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 筛选 */}
          <div className="flex items-center gap-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有角色</option>
              <option value="user">用户</option>
              <option value="admin">管理员</option>
              <option value="superadmin">超级管理员</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有状态</option>
              <option value="active">活跃</option>
              <option value="disabled">禁用</option>
              <option value="banned">封禁</option>
            </select>
          </div>

          {/* 批量操作 */}
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">已选 {selectedUsers.length} 个</span>
              <button
                onClick={handleBatchDelete}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
              >
                批量删除
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 用户列表 */}
      <UserTable
        users={users}
        selectedUsers={selectedUsers}
        onSelectUser={toggleUserSelection}
        onSelectAll={handleSelectAll}
        onViewDetail={handleViewDetail}
        onEditUser={handleEditUser}
        onStatusChange={handleStatusChange}
      />

      {/* 分页 */}
      {totalUsers > 20 && (
        <div className="mt-6 flex justify-center">
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              第 {currentPage} 页 / 共 {Math.ceil(totalUsers / 20)} 页
            </span>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage >= Math.ceil(totalUsers / 20)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 编辑用户模态框 */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingUser(null)
        }}
        title="编辑用户"
      >
        {editingUser && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
              <input
                type="text"
                value={editingUser.username}
                onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <input
                type="email"
                value={editingUser.email}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
              <select
                value={editingUser.role}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="user">用户</option>
                <option value="admin">管理员</option>
                <option value="superadmin">超级管理员</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingUser(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSaveUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 用户详情模态框 */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
        }}
        title="用户详情"
        size="lg"
      >
        {currentUserDetail && (
          <div className="space-y-6">
            {/* 基本信息 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">基本信息</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">用户ID:</span>
                  <span className="ml-2 text-gray-900 font-mono">{currentUserDetail.id}</span>
                </div>
                <div>
                  <span className="text-gray-600">用户名:</span>
                  <span className="ml-2 text-gray-900">{currentUserDetail.username}</span>
                </div>
                <div>
                  <span className="text-gray-600">邮箱:</span>
                  <span className="ml-2 text-gray-900">{currentUserDetail.email}</span>
                </div>
                <div>
                  <span className="text-gray-600">角色:</span>
                  <span className="ml-2 text-gray-900">{currentUserDetail.role}</span>
                </div>
                <div>
                  <span className="text-gray-600">状态:</span>
                  <span className="ml-2 text-gray-900">{currentUserDetail.status}</span>
                </div>
                <div>
                  <span className="text-gray-600">登录方式:</span>
                  <span className="ml-2 text-gray-900">{currentUserDetail.authProvider}</span>
                </div>
              </div>
            </div>

            {/* 统计信息 */}
            {currentUserDetail._count && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">数据统计</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">项目数:</span>
                    <span className="ml-2 text-gray-900 font-medium">{currentUserDetail._count.projects}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">测试库:</span>
                    <span className="ml-2 text-gray-900 font-medium">{currentUserDetail._count.testLibraries}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">创建会话:</span>
                    <span className="ml-2 text-gray-900 font-medium">{currentUserDetail._count.ownedSessions}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

