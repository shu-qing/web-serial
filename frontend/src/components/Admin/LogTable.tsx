import { AdminLog, SystemLog, ErrorLog } from '@/stores/useAdminStore'
import { formatTimestamp } from '@/utils/format'
import { useState } from 'react'

interface LogTableProps {
  logs: (AdminLog | SystemLog | ErrorLog)[]
  type: 'admin' | 'system' | 'error'
  onViewDetail?: (log: any) => void
}

export default function LogTable({ logs, type }: LogTableProps) {
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  const getLevelBadge = (level: string) => {
    const colors = {
      info: 'bg-blue-100 text-blue-700',
      warning: 'bg-yellow-100 text-yellow-700',
      error: 'bg-red-100 text-red-700',
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${colors[level as keyof typeof colors] || colors.info}`}>
        {level.toUpperCase()}
      </span>
    )
  }

  const renderAdminLog = (log: AdminLog) => (
    <tr key={log.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatTimestamp(new Date(log.createdAt))}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{log.admin.username}</div>
        <div className="text-sm text-gray-500">{log.admin.email}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
          {log.action}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {log.targetType || '-'}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        <button
          onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
          className="text-blue-600 hover:text-blue-900"
        >
          {expandedLog === log.id ? '收起' : '详情'}
        </button>
      </td>
    </tr>
  )

  const renderSystemLog = (log: SystemLog) => (
    <tr key={log.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatTimestamp(new Date(log.createdAt))}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {getLevelBadge(log.level)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
          {log.category}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
        {log.message}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        {log.details && (
          <button
            onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
            className="text-blue-600 hover:text-blue-900"
          >
            {expandedLog === log.id ? '收起' : '详情'}
          </button>
        )}
      </td>
    </tr>
  )

  const renderErrorLog = (log: ErrorLog) => (
    <tr key={log.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatTimestamp(new Date(log.createdAt))}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-700">
          {log.errorType}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {log.user ? (
          <div>
            <div className="text-sm font-medium text-gray-900">{log.user.username}</div>
            <div className="text-sm text-gray-500">{log.user.email}</div>
          </div>
        ) : (
          <span className="text-sm text-gray-500">系统</span>
        )}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
        {log.message}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        <button
          onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
          className="text-blue-600 hover:text-blue-900"
        >
          {expandedLog === log.id ? '收起' : '详情'}
        </button>
      </td>
    </tr>
  )

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {type === 'admin' && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    管理员
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    目标类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    详情
                  </th>
                </>
              )}
              {type === 'system' && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    级别
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    类别
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    消息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    详情
                  </th>
                </>
              )}
              {type === 'error' && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    错误类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用户
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    错误消息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    详情
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => {
              const row = type === 'admin' 
                ? renderAdminLog(log as AdminLog)
                : type === 'system'
                ? renderSystemLog(log as SystemLog)
                : renderErrorLog(log as ErrorLog)
              
              return (
                <>
                  {row}
                  {expandedLog === log.id && (
                    <tr key={`${log.id}-detail`}>
                      <td colSpan={5} className="px-6 py-4 bg-gray-50">
                        <div className="text-xs">
                          <pre className="bg-white p-3 rounded border border-gray-200 overflow-auto max-h-64">
                            {JSON.stringify(
                              type === 'admin' ? (log as AdminLog).details :
                              type === 'system' ? (log as SystemLog).details :
                              { stack: (log as ErrorLog).stack, request: (log as ErrorLog).request },
                              null,
                              2
                            )}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
      
      {logs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">暂无日志数据</p>
        </div>
      )}
    </div>
  )
}

