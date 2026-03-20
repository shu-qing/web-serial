import { useState, useRef, useEffect } from 'react'
import { useSerialStore } from '@/stores/useSerialStore'
import { serialManager } from '@/lib/serialManager'
import { DeviceInfo } from '@/types'
import DeviceSelectionModal from './DeviceSelectionModal'
import {
  TrashIcon,
  ArrowDownTrayIcon,
  PauseCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { DataBuffer } from '@/utils/dataBuffer'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

export default function Toolbar() {
  const { t } = useTranslation()
  const { isConnected, config, currentDevice, setPort, setConnected, setCurrentDevice, addLogEntry, clearBuffer, stats } = useSerialStore()
  const [isConnecting, setIsConnecting] = useState(false)
  const [showDeviceModal, setShowDeviceModal] = useState(false)
  const dataBufferRef = useRef<DataBuffer | null>(null)

  // 初始化数据缓冲器
  useEffect(() => {
    dataBufferRef.current = new DataBuffer((lineData) => {
      const decoder = new TextDecoder()
      const text = decoder.decode(lineData)
      
      addLogEntry({
        id: Date.now().toString(),
        timestamp: new Date(),
        direction: 'receive',
        data: text,
        encoding: 'utf-8',
        bytes: lineData.length,
      })
    })

    return () => {
      dataBufferRef.current?.clear()
    }
  }, [addLogEntry])

  const handleConnect = () => {
    setShowDeviceModal(true)
  }

  const handleDeviceSelected = async (device: DeviceInfo) => {
    try {
      setIsConnecting(true)

      // 连接到设备
      await serialManager.connect(device, config)

      // 设置数据接收回调
      serialManager.onData((data) => {
        handleDataReceived(data)
      })

      // 更新状态
      setCurrentDevice(device)
      setPort(device.port || null)
      setConnected(true)

      console.log('Connected to device:', device.name)
    } catch (error) {
      console.error('Connect error:', error)
      alert(t('notification.connectFailed') + ': ' + (error as Error).message)
      setConnected(false)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      // 清空缓冲区
      dataBufferRef.current?.clear()
      
      await serialManager.disconnect()
      setPort(null)
      setCurrentDevice(null)
      setConnected(false)
    } catch (error) {
      console.error('Disconnect error:', error)
      alert(t('notification.disconnectFailed', { defaultValue: 'Disconnect failed' }))
    }
  }

  const handleDataReceived = (data: Uint8Array) => {
    // 使用缓冲器处理数据（智能分割）
    dataBufferRef.current?.append(data)
  }

  return (
    <>
      <div className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 flex-shrink-0">
        {/* 左侧按钮组 */}
        <div className="flex items-center space-x-3">
          {/* 连接状态指示器 */}
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-md">
            <span className={clsx(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-400'
            )}></span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isConnected && currentDevice ? (
                <>
                  {currentDevice.type === 'virtual' ? t('serial.connectedVirtual', { defaultValue: 'Connected (Virtual)' }) : t('serial.connected')}
                </>
              ) : t('serial.disconnected')}
            </span>
          </div>

          {/* 连接/断开按钮 */}
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className={clsx(
                'px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm',
                isConnecting && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isConnecting ? t('common.connecting') : t('serial.connectDevice', { defaultValue: 'Connect Device' })}
            </button>
          ) : (
            <button 
              onClick={handleDisconnect}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('serial.disconnect')}
            </button>
          )}

          <div className="w-px h-8 bg-gray-300 dark:bg-gray-600"></div>

          {/* 工具按钮 */}
          <button 
            onClick={() => clearBuffer()}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            title={t('serial.clearScreen', { defaultValue: 'Clear Screen' })}
          >
            <TrashIcon className="w-5 h-5" />
          </button>
          <button 
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            title={t('serial.exportLogs', { defaultValue: 'Export Logs' })}
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
          </button>
          <button 
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            title={t('serial.pauseResume', { defaultValue: 'Pause/Resume' })}
          >
            <PauseCircleIcon className="w-5 h-5" />
          </button>
        </div>

        {/* 右侧统计信息 */}
        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <ArrowRightIcon className="w-4 h-4 rotate-180" />
            <span>{t('serial.receive')}: {stats.rxBytes} {t('serial.bytes', { defaultValue: 'bytes' })}</span>
          </div>
          <div className="flex items-center space-x-1">
            <ArrowRightIcon className="w-4 h-4" />
            <span>{t('serial.sent')}: {stats.txBytes} {t('serial.bytes', { defaultValue: 'bytes' })}</span>
          </div>
        </div>
      </div>

      {/* 设备选择对话框 */}
      <DeviceSelectionModal
        isOpen={showDeviceModal}
        onClose={() => setShowDeviceModal(false)}
        onDeviceSelected={handleDeviceSelected}
      />
    </>
  )
}

