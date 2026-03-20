import { useEffect } from 'react'
import { useAdminStore } from '@/stores/useAdminStore'
import { formatBytes } from '@/utils/format'

export default function SystemMonitor() {
  const {
    performanceMetrics,
    activeSessions,
    fetchPerformanceMetrics,
    fetchActiveSessions,
  } = useAdminStore()

  useEffect(() => {
    // 初始加载
    fetchPerformanceMetrics()
    fetchActiveSessions()

    // 每30秒刷新一次
    const interval = setInterval(() => {
      fetchPerformanceMetrics()
      fetchActiveSessions()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) return `${days}天 ${hours}小时`
    if (hours > 0) return `${hours}小时 ${minutes}分钟`
    return `${minutes}分钟`
  }

  return (
    <div className="p-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">系统监控</h1>
        <p className="text-gray-500 mt-2">实时性能指标和活跃会话</p>
      </div>

      {/* 性能指标 */}
      {performanceMetrics && (
        <>
          {/* 系统信息 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">系统信息</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600">操作系统</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {performanceMetrics.system.platform} ({performanceMetrics.system.arch})
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">CPU核心数</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {performanceMetrics.system.cpuCount} 核
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">总内存</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {formatBytes(performanceMetrics.system.totalMemory)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">系统运行时间</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {formatUptime(performanceMetrics.system.uptime)}
                </p>
              </div>
            </div>
          </div>

          {/* 进程信息 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">进程信息</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600">进程ID</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">{performanceMetrics.process.pid}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">堆内存使用</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {formatBytes(performanceMetrics.process.memory.heapUsed)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  / {formatBytes(performanceMetrics.process.memory.heapTotal)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">RSS内存</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {formatBytes(performanceMetrics.process.memory.rss)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">运行时间</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {formatUptime(performanceMetrics.process.uptime)}
                </p>
              </div>
            </div>
          </div>

          {/* CPU使用率 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">CPU使用情况</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">用户态CPU时间</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {performanceMetrics.process.cpuUsage.user.toFixed(2)} ms
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">系统态CPU时间</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {performanceMetrics.process.cpuUsage.system.toFixed(2)} ms
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 活跃会话 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">活跃会话 ({activeSessions.length})</h3>
        {activeSessions.length > 0 ? (
          <div className="space-y-3">
            {activeSessions.map((session) => (
              <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{session.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      发起者: {session.owner.username} · 模式: {session.mode}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                      {session.status}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      {session.participants.length} 参与者
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">暂无活跃会话</p>
        )}
      </div>
    </div>
  )
}

