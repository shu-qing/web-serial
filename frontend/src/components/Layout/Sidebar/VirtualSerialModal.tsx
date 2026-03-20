import { Icon } from '@/components/common/Icons'
import { useTranslation } from 'react-i18next'

interface VirtualSerialModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (mode: 'echo' | 'at_command' | 'sensor') => void
}

export default function VirtualSerialModal({ isOpen, onClose, onSelect }: VirtualSerialModalProps) {
  const { t } = useTranslation()
  
  if (!isOpen) return null

  const virtualDevices = [
    {
      mode: 'echo' as const,
      name: t('serial.virtualEcho', { defaultValue: 'Virtual Serial (Echo Mode)' }),
      description: t('serial.virtualEchoDesc', { defaultValue: 'Echoes back what you send, for basic testing' }),
      icon: 'transfer',
      color: 'blue',
    },
    {
      mode: 'at_command' as const,
      name: t('serial.virtualAT', { defaultValue: 'Virtual Serial (AT Command Mode)' }),
      description: t('serial.virtualATDesc', { defaultValue: 'Simulates AT command responses, for debugging communication modules' }),
      icon: 'remote',
      color: 'green',
    },
    {
      mode: 'sensor' as const,
      name: t('serial.virtualSensor', { defaultValue: 'Virtual Serial (Sensor Simulation)' }),
      description: t('serial.virtualSensorDesc', { defaultValue: 'Automatically sends simulated sensor data, for testing data reception' }),
      icon: 'report',
      color: 'purple',
    },
  ]

  const handleSelect = (mode: 'echo' | 'at_command' | 'sensor') => {
    onSelect(mode)
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{t('serial.selectVirtualMode', { defaultValue: 'Select Virtual Serial Mode' })}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 模式列表 */}
        <div className="p-6 space-y-3">
          {virtualDevices.map((device) => (
            <button
              key={device.mode}
              onClick={() => handleSelect(device.mode)}
              className={`w-full text-left p-4 border-2 rounded-lg transition-all hover:shadow-md ${
                device.color === 'blue'
                  ? 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                  : device.color === 'green'
                  ? 'border-green-200 hover:border-green-400 hover:bg-green-50'
                  : 'border-purple-200 hover:border-purple-400 hover:bg-purple-50'
              }`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    device.color === 'blue'
                      ? 'bg-blue-100'
                      : device.color === 'green'
                      ? 'bg-green-100'
                      : 'bg-purple-100'
                  }`}>
                    <Icon 
                      name={device.icon} 
                      className={`w-6 h-6 ${
                        device.color === 'blue'
                          ? 'text-blue-600'
                          : device.color === 'green'
                          ? 'text-green-600'
                          : 'text-purple-600'
                      }`}
                    />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <div className="text-sm font-semibold text-gray-900 mb-1">
                    {device.name}
                  </div>
                  <div className="text-xs text-gray-600 leading-relaxed">
                    {device.description}
                  </div>
                </div>
                <div className="flex-shrink-0 ml-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 底部提示 */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <p className="text-xs text-gray-500">
            💡 {t('serial.virtualTip', { defaultValue: 'Tip: Virtual serial port requires no actual hardware, suitable for development testing and demos' })}
          </p>
        </div>
      </div>
    </div>
  )
}

