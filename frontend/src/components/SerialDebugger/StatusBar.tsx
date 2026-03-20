import { useSerialStore } from '@/stores/useSerialStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { Icon } from '@/components/common/Icons'
import { useTranslation } from 'react-i18next'

export default function StatusBar() {
  const { t } = useTranslation()
  const { isConnected, deviceName, statusMessage, statusMessageType } = useSerialStore()
  const { currentProject, cloudSyncStatus } = useProjectStore()

  const syncStatusText = {
    'synced': t('project.synced'),
    'not-synced': t('project.notSynced'),
    'syncing': t('project.syncing'),
    'error': t('project.syncError'),
  }
  
  const syncStatusColor = {
    'synced': 'text-green-600',
    'not-synced': 'text-gray-400',
    'syncing': 'text-blue-600',
    'error': 'text-red-600',
  }

  return (
    <div className="h-7 bg-white border-t border-gray-200 flex items-center justify-between px-4 text-xs">
      {/* 左侧：项目名 + 云端同步状态 + 最后修改时间 */}
      <div className="flex items-center space-x-3 text-gray-600">
        <span className="font-medium">
          {currentProject?.name === '__DEFAULT_PROJECT__' 
            ? t('project.defaultProject', { defaultValue: '默认项目' })
            : (currentProject?.name || t('project.newProject'))}
        </span>
        <span className={syncStatusColor[cloudSyncStatus]}>{syncStatusText[cloudSyncStatus]}</span>
        <span className="text-gray-400 text-xs">
          {t('statusBar.lastModified')}: {currentProject?.updatedAt ? new Date(currentProject.updatedAt).toLocaleTimeString('zh-CN') : '--:--:--'}
        </span>
      </div>
      
      {/* 中间：状态消息 */}
      <div className="flex items-center space-x-2">
        {statusMessageType === 'success' && <Icon name="success" className="w-3.5 h-3.5 text-green-600" />}
        {statusMessageType === 'error' && <span className="text-red-600 font-bold">✗</span>}
        {statusMessageType === 'warning' && <span className="text-amber-600 font-bold">⚠</span>}
        {statusMessageType === 'info' && <span className="text-blue-600 font-bold">ℹ</span>}
        <span className={`font-medium ${
          statusMessageType === 'success' ? 'text-green-700' :
          statusMessageType === 'error' ? 'text-red-700' :
          statusMessageType === 'warning' ? 'text-amber-700' :
          'text-blue-700'
        }`}>{statusMessage}</span>
      </div>
      
      {/* 右侧：连接状态 + 设备名 + 远程状态 */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <span className={`status-dot ${isConnected ? 'status-connected' : 'status-disconnected'}`}></span>
          <span className="text-gray-600 max-w-48 truncate">
            {isConnected ? (deviceName || t('serial.connected')) : t('serial.disconnected')}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="status-dot status-disconnected"></span>
          <span className="text-gray-600">{t('bridge.notConnected')}</span>
        </div>
      </div>
    </div>
  )
}

