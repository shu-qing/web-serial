import Modal from '@/components/common/Modal'
import { useTranslation } from 'react-i18next'

interface BridgeRequestModalProps {
  isOpen: boolean
  requesterName: string
  hasDevice: boolean
  onApprove: () => void
  onReject: () => void
}

export default function BridgeRequestModal({
  isOpen,
  requesterName,
  hasDevice,
  onApprove,
  onReject,
}: BridgeRequestModalProps) {
  const { t } = useTranslation()
  
  return (
    <Modal isOpen={isOpen} onClose={onReject} title={t('bridge.bridgeRequest')}>
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-900">
            <strong>{requesterName}</strong> {t('bridge.requestMessage', { defaultValue: 'requests to establish a bridge connection with you' })}
          </p>
          <div className="mt-2 text-xs text-blue-700">
            <p>{t('bridge.theirDevice', { defaultValue: 'Their device' })}: {hasDevice ? '🟢 ' + t('serial.connected') : '🔴 ' + t('serial.disconnected')}</p>
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded-md">
          <p className="text-xs text-gray-600">
            {t('bridge.afterBridge', { defaultValue: 'After establishing bridge, both sides can:' })}
          </p>
          <ul className="mt-2 text-xs text-gray-600 space-y-1">
            <li>• {t('bridge.feature1', { defaultValue: 'View serial data in real-time' })}</li>
            <li>• {t('bridge.feature2', { defaultValue: 'Remote control device (if connected)' })}</li>
            <li>• {t('bridge.feature3', { defaultValue: 'Bi-directional data transmission' })}</li>
          </ul>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onReject}
            className="flex-1 px-4 py-2.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            {t('common.reject', { defaultValue: 'Reject' })}
          </button>
          <button
            onClick={onApprove}
            className="flex-1 px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {t('bridge.approveBridge')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

