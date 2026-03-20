import { useState, useEffect } from 'react'
import { DeviceInfo } from '@/types'
import { serialManager } from '@/lib/serialManager'
import Modal from '@/components/common/Modal'
import {
  WrenchScrewdriverIcon,
  SignalIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

interface DeviceSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onDeviceSelected: (device: DeviceInfo) => void
}

export default function DeviceSelectionModal({
  isOpen,
  onClose,
  onDeviceSelected,
}: DeviceSelectionModalProps) {
  const { t } = useTranslation()
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)

  // 加载可用设备
  useEffect(() => {
    if (isOpen) {
      loadDevices()
    }
  }, [isOpen])

  const loadDevices = async () => {
    setLoading(true)
    try {
      const availableDevices = await serialManager.getAvailableDevices()
      setDevices(availableDevices)
      
      // 默认选中第一个设备
      if (availableDevices.length > 0) {
        setSelectedDeviceId(availableDevices[0].id)
      }
    } catch (error) {
      console.error('Failed to load devices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBrowseMore = async () => {
    try {
      const newDevice = await serialManager.requestNewDevice()
      if (newDevice) {
        // 重新加载设备列表
        await loadDevices()
        setSelectedDeviceId(newDevice.id)
      }
    } catch (error) {
      console.error('Failed to request new device:', error)
      alert(t('notification.cannotRequestDevice', { defaultValue: 'Cannot request new device' }) + ': ' + (error as Error).message)
    }
  }

  const handleConfirm = () => {
    const device = devices.find((d) => d.id === selectedDeviceId)
    if (device) {
      onDeviceSelected(device)
      onClose()
    }
  }

  const getDeviceIcon = (device: DeviceInfo) => {
    if (device.type === 'virtual') {
      return <WrenchScrewdriverIcon className="w-6 h-6 text-orange-500" />
    }
    return <SignalIcon className="w-6 h-6 text-blue-500" />
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('serial.selectDevice')}>
      <div className="space-y-4">
        {/* 设备列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="spinner w-8 h-8" />
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {t('serial.noDeviceAvailable', { defaultValue: 'No devices available' })}
            </p>
            <button
              onClick={handleBrowseMore}
              className="btn btn-primary btn-sm"
            >
              <PlusCircleIcon className="w-4 h-4 mr-1" />
              {t('serial.browseDevice', { defaultValue: 'Browse devices' })}
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {devices.map((device) => (
              <button
                key={device.id}
                onClick={() => setSelectedDeviceId(device.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedDeviceId === device.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* 图标 */}
                  <div className="mt-1">{getDeviceIcon(device)}</div>

                  {/* 设备信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {device.name}
                      </h3>
                      {device.type === 'virtual' && (
                        <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 rounded">
                          {t('common.test', { defaultValue: 'Test' })}
                        </span>
                      )}
                    </div>
                    
                    {device.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {device.description}
                      </p>
                    )}

                    {/* 真实设备显示 VID/PID */}
                    {device.type === 'real' && device.info && (
                      <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {device.info.usbVendorId && (
                          <span>
                            VID: 0x{device.info.usbVendorId.toString(16).toUpperCase()}
                          </span>
                        )}
                        {device.info.usbProductId && (
                          <span>
                            PID: 0x{device.info.usbProductId.toString(16).toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 选中标识 */}
                  {selectedDeviceId === device.id && (
                    <div className="mt-1">
                      <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 浏览更多设备按钮 */}
        {devices.length > 0 && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleBrowseMore}
              className="w-full p-3 text-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-500 transition-colors text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
            >
              <PlusCircleIcon className="w-5 h-5 inline-block mr-2" />
              {t('serial.browseMoreDevices', { defaultValue: 'Browse more devices...' })}
            </button>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="btn btn-secondary">
            {t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedDeviceId}
            className="btn btn-primary"
          >
            {t('serial.connect')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

