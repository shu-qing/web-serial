import { useEffect, useState } from 'react'
import { useAdminStore } from '@/stores/useAdminStore'
import LogTable from '@/components/Admin/LogTable'

export default function LogsPage() {
  const {
    adminLogs,
    systemLogs,
    errorLogs,
    totalAdminLogs,
    totalSystemLogs,
    totalErrorLogs,
    fetchAdminLogs,
    fetchSystemLogs,
    fetchErrorLogs,
  } = useAdminStore()

  const [logType, setLogType] = useState<'admin' | 'system' | 'error'>('admin')
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<any>({})

  useEffect(() => {
    loadLogs()
  }, [logType, currentPage, filters])

  const loadLogs = () => {
    switch (logType) {
      case 'admin':
        fetchAdminLogs(filters, currentPage)
        break
      case 'system':
        fetchSystemLogs(filters, currentPage)
        break
      case 'error':
        fetchErrorLogs(filters, currentPage)
        break
    }
  }

  const getCurrentLogs = () => {
    switch (logType) {
      case 'admin':
        return adminLogs
      case 'system':
        return systemLogs
      case 'error':
        return errorLogs
    }
  }

  const getTotalCount = () => {
    switch (logType) {
      case 'admin':
        return totalAdminLogs
      case 'system':
        return totalSystemLogs
      case 'error':
        return totalErrorLogs
    }
  }

  return (
    <div className="p-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">日志查询</h1>
        <p className="text-gray-500 mt-2">查看系统日志、管理员操作和错误记录</p>
      </div>

      {/* 日志类型选择 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setLogType('admin')
              setCurrentPage(1)
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              logType === 'admin'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            管理员日志
          </button>
          <button
            onClick={() => {
              setLogType('system')
              setCurrentPage(1)
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              logType === 'system'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            系统日志
          </button>
          <button
            onClick={() => {
              setLogType('error')
              setCurrentPage(1)
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              logType === 'error'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            错误日志
          </button>

          <div className="flex-1"></div>

          {/* 筛选器 */}
          {logType === 'system' && (
            <select
              value={filters.level || ''}
              onChange={(e) => setFilters({ ...filters, level: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">所有级别</option>
              <option value="info">INFO</option>
              <option value="warning">WARNING</option>
              <option value="error">ERROR</option>
            </select>
          )}
        </div>
      </div>

      {/* 日志列表 */}
      <LogTable logs={getCurrentLogs()} type={logType} />

      {/* 分页 */}
      {getTotalCount() > 50 && (
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
              第 {currentPage} 页 / 共 {Math.ceil(getTotalCount() / 50)} 页
            </span>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage >= Math.ceil(getTotalCount() / 50)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

