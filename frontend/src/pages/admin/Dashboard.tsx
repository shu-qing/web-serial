import { useEffect } from 'react'
import { useAdminStore } from '@/stores/useAdminStore'
import StatCard from '@/components/Admin/StatCard'

export default function Dashboard() {
  const {
    systemStats,
    userGrowthTrend,
    errorStatsByType,
    adminLogs,
    fetchSystemStats,
    fetchUserGrowthTrend,
    fetchErrorStatsByType,
    fetchAdminLogs,
  } = useAdminStore()

  useEffect(() => {
    // 加载数据
    fetchSystemStats()
    fetchUserGrowthTrend(7)
    fetchErrorStatsByType(24)
    fetchAdminLogs({}, 1)
  }, [])

  return (
    <div className="p-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">控制台</h1>
        <p className="text-gray-500 mt-2">系统概览和关键指标</p>
      </div>

      {/* 统计卡片 */}
      {systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="总用户数"
            value={systemStats.users.total}
            icon="users"
            color="blue"
          />
          <StatCard
            title="今日活跃"
            value={systemStats.users.todayActive}
            icon="activity"
            color="green"
          />
          <StatCard
            title="活跃会话"
            value={systemStats.sessions.active}
            icon="video"
            color="yellow"
          />
          <StatCard
            title="今日错误"
            value={systemStats.errors.todayCount}
            icon="alert-triangle"
            color="red"
          />
        </div>
      )}

      {/* 用户增长趋势 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">用户增长趋势</h3>
          {userGrowthTrend.length > 0 ? (
            <div className="space-y-2">
              {userGrowthTrend.map((item) => (
                <div key={item.date} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{item.date}</span>
                  <div className="flex items-center">
                    <div
                      className="h-2 bg-blue-500 rounded"
                      style={{ width: `${item.count * 10}px`, minWidth: '20px' }}
                    ></div>
                    <span className="ml-3 text-sm font-medium text-gray-900">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">暂无数据</p>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">错误统计（24小时）</h3>
          {errorStatsByType.length > 0 ? (
            <div className="space-y-2">
              {errorStatsByType.map((item) => (
                <div key={item.type} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 truncate">{item.type}</span>
                  <div className="flex items-center">
                    <div
                      className="h-2 bg-red-500 rounded"
                      style={{ width: `${item.count * 5}px`, minWidth: '20px' }}
                    ></div>
                    <span className="ml-3 text-sm font-medium text-gray-900">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">暂无错误</p>
          )}
        </div>
      </div>

      {/* 最近操作日志 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">最近操作</h3>
        {adminLogs.length > 0 ? (
          <div className="space-y-3">
            {adminLogs.slice(0, 10).map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{log.admin.username}</span>
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">{log.action}</span>
                </div>
                <span className="text-sm text-gray-500">{log.targetType || '-'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">暂无操作记录</p>
        )}
      </div>
    </div>
  )
}

