import { AdminUser } from '@/stores/useAdminStore'
import { formatTimestamp } from '@/utils/format'

interface UserTableProps {
  users: AdminUser[]
  selectedUsers: string[]
  onSelectUser: (userId: string) => void
  onSelectAll: (selected: boolean) => void
  onViewDetail: (userId: string) => void
  onEditUser: (userId: string) => void
  onStatusChange: (userId: string, status: string) => void
}

export default function UserTable({
  users,
  selectedUsers,
  onSelectUser,
  onSelectAll,
  onViewDetail,
  onEditUser,
  onStatusChange,
}: UserTableProps) {
  const allSelected = users.length > 0 && users.every(u => selectedUsers.includes(u.id))

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-700',
      disabled: 'bg-gray-100 text-gray-700',
      banned: 'bg-red-100 text-red-700',
    }
    const labels = {
      active: '活跃',
      disabled: '禁用',
      banned: '封禁',
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${colors[status as keyof typeof colors] || colors.active}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const getRoleBadge = (role: string) => {
    const colors = {
      superadmin: 'bg-purple-100 text-purple-700',
      admin: 'bg-blue-100 text-blue-700',
      user: 'bg-gray-100 text-gray-700',
    }
    const labels = {
      superadmin: '超级管理员',
      admin: '管理员',
      user: '用户',
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${colors[role as keyof typeof colors] || colors.user}`}>
        {labels[role as keyof typeof labels] || role}
      </span>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="w-12 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                用户
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                角色
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                登录方式
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                最后登录
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                创建时间
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="w-12 px-3 py-4">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => onSelectUser(user.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {user.avatar ? (
                        <img className="h-10 w-10 rounded-full" src={user.avatar} alt="" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-600 text-sm font-medium">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.username}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRoleBadge(user.role)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(user.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.authProvider}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.lastLoginAt ? formatTimestamp(new Date(user.lastLoginAt)) : '从未登录'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatTimestamp(new Date(user.createdAt))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onViewDetail(user.id)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    查看
                  </button>
                  <button
                    onClick={() => onEditUser(user.id)}
                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    编辑
                  </button>
                  {user.status === 'active' ? (
                    <button
                      onClick={() => onStatusChange(user.id, 'disabled')}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      禁用
                    </button>
                  ) : (
                    <button
                      onClick={() => onStatusChange(user.id, 'active')}
                      className="text-green-600 hover:text-green-900"
                    >
                      启用
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {users.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">暂无用户数据</p>
        </div>
      )}
    </div>
  )
}

