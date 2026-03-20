import { useSerialStore } from '@/stores/useSerialStore'
import { useState, useEffect } from 'react'
import Modal from '@/components/common/Modal'
import { useTranslation } from 'react-i18next'
import { detectBrowser, getBrowserDisplayName, checkBrowserVersion, BrowserInfo } from '@/utils/browserDetection'

interface SerialPanelProps {
  onShowVirtualModal: () => void
}

export default function SerialPanel({ onShowVirtualModal }: SerialPanelProps) {
  const { t } = useTranslation()
  const { isConnected, deviceName, config, setConfig, connect, disconnect } = useSerialStore()
  
  // 预设波特率列表
  const presetBaudRates = [4800, 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600]
  
  // 自定义波特率模态框
  const [showCustomBaudRateModal, setShowCustomBaudRateModal] = useState(false)
  const [customBaudRate, setCustomBaudRate] = useState('')
  const [customBaudRateError, setCustomBaudRateError] = useState('')
  
  // 浏览器检测
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null)
  
  useEffect(() => {
    const info = detectBrowser()
    setBrowserInfo(info)
  }, [])
  
  // 处理波特率选择变化
  const handleBaudRateSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    if (value === 'custom') {
      // 打开自定义波特率模态框
      setCustomBaudRate(config.baudRate.toString())
      setCustomBaudRateError('')
      setShowCustomBaudRateModal(true)
      // 重置下拉框到当前值
      e.target.value = config.baudRate.toString()
    } else {
      setConfig({ baudRate: parseInt(value) })
    }
  }
  
  // 确认自定义波特率
  const handleConfirmCustomBaudRate = () => {
    const numValue = parseInt(customBaudRate)
    
    // 验证
    if (!customBaudRate.trim()) {
      setCustomBaudRateError(t('validation.enterBaudRate', { defaultValue: 'Please enter baud rate' }))
      return
    }
    
    if (isNaN(numValue)) {
      setCustomBaudRateError(t('validation.enterValidNumber', { defaultValue: 'Please enter a valid number' }))
      return
    }
    
    if (numValue <= 0) {
      setCustomBaudRateError(t('validation.baudRatePositive', { defaultValue: 'Baud rate must be greater than 0' }))
      return
    }
    
    if (numValue > 10000000) {
      setCustomBaudRateError(t('validation.baudRateMax', { defaultValue: 'Baud rate cannot exceed 10,000,000' }))
      return
    }
    
    // 设置波特率
    setConfig({ baudRate: numValue })
    setShowCustomBaudRateModal(false)
  }

  const handleConnect = async () => {
    if (isConnected) {
      await disconnect()
    } else {
      await connect()
    }
  }

  // 打开虚拟串口选择对话框
  const handleConnectVirtual = () => {
    onShowVirtualModal()
  }

  return (
    <>
      <div className="h-10 px-4 border-b border-gray-100 flex items-center">
        <h3 className="text-sm font-semibold text-gray-900">{t('serial.serialConfig', { defaultValue: 'Serial Connection Config' })}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {/* 连接状态 */}
        <div className="status-card mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700">{t('serial.connectionStatus', { defaultValue: 'Connection Status' })}</span>
            <div className="flex items-center space-x-2">
              <span className={`status-dot ${isConnected ? 'status-connected' : 'status-disconnected'}`}></span>
              <span className="text-xs text-gray-600">{isConnected ? t('serial.connected') : t('serial.disconnected')}</span>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            <span className="font-medium">{t('serial.device', { defaultValue: 'Device' })}:</span> <span className="device-name-display">{deviceName || t('serial.noDevice', { defaultValue: 'No device' })}</span>
          </div>
        </div>

        {/* 串口配置 */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('serial.baudRate')}</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={presetBaudRates.includes(config.baudRate) ? config.baudRate : 'custom'}
              onChange={handleBaudRateSelectChange}
              disabled={isConnected}
            >
              <option value="4800">4800</option>
              <option value="9600">9600</option>
              <option value="19200">19200</option>
              <option value="38400">38400</option>
              <option value="57600">57600</option>
              <option value="115200">115200</option>
              <option value="230400">230400</option>
              <option value="460800">460800</option>
              <option value="921600">921600</option>
              <option value="custom">{t('serial.custom', { defaultValue: 'Custom' })}... {!presetBaudRates.includes(config.baudRate) ? `(${config.baudRate})` : ''}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('serial.dataBits')}</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={config.dataBits}
              onChange={(e) => setConfig({ dataBits: parseInt(e.target.value) as 7 | 8 })}
              disabled={isConnected}
            >
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="8">8</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('serial.parity')}</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={config.parity}
              onChange={(e) => setConfig({ parity: e.target.value as 'none' | 'even' | 'odd' })}
              disabled={isConnected}
            >
              <option value="none">None</option>
              <option value="even">Even</option>
              <option value="odd">Odd</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('serial.stopBits')}</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={config.stopBits}
              onChange={(e) => setConfig({ stopBits: parseInt(e.target.value) as 1 | 2 })}
              disabled={isConnected}
            >
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </div>
        </div>

        {/* 连接按钮 */}
        <div className="mt-4 space-y-2">
          <button
            className="btn-primary w-full"
            onClick={handleConnect}
          >
            {t('serial.selectAndConnect', { defaultValue: 'Select device and connect' })}
          </button>
          
          {/* 开发环境专用：虚拟串口测试 - 生产环境请删除此按钮 */}
          {/* 未连接状态 */}
          {!isConnected && (
            <button
              className="btn-secondary w-full text-xs"
              onClick={handleConnectVirtual}
              title={t('serial.forDevOnly', { defaultValue: 'For development only' })}
            >
              {t('serial.connectVirtual', { defaultValue: 'Connect Virtual Serial (Dev)' })}
            </button>
          )}
          
          {/* 已连接状态（默认隐藏，通过状态控制显示） */}
          {isConnected && (deviceName?.includes('虚拟串口') || deviceName?.includes('Virtual Serial')) && (
            <button
              className="btn-secondary w-full text-xs"
              onClick={disconnect}
              title={t('serial.disconnectVirtual', { defaultValue: 'Disconnect virtual serial' })}
            >
              {t('serial.disconnectVirtual', { defaultValue: 'Disconnect Virtual' })}
            </button>
          )}
          {/* 开发环境专用 END */}
        </div>

        {/* 浏览器支持提示 */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs">
            {!browserInfo ? (
              <div className="text-gray-500">{t('serial.detectingBrowser', { defaultValue: 'Detecting...' })}</div>
            ) : (
              <>
                {/* 当前浏览器信息 */}
                <div className="font-medium text-gray-700 mb-2">
                  {t('serial.currentBrowser', { defaultValue: 'Current Browser' })}: {getBrowserDisplayName(browserInfo)}
                </div>

                {/* 浏览器支持状态 */}
                {browserInfo.isSupported ? (
                  <>
                    {/* 支持的浏览器 */}
                    {(() => {
                      const versionCheck = checkBrowserVersion(browserInfo)
                      if (versionCheck.meetsRequirement) {
                        return (
                          <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-md">
                            <div className="flex items-center text-green-800">
                              <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="font-medium">{t('serial.browserSupported', { defaultValue: 'Browser Supported' })}</span>
                            </div>
                          </div>
                        )
                      } else {
                        return (
                          <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                            <div className="text-yellow-800 mb-1">
                              <div className="font-medium mb-1">{t('serial.browserVersionTooOld', { defaultValue: 'Browser Version Too Old' })}</div>
                              <div className="text-xs">{t('serial.browserVersionTooOldDesc', { defaultValue: 'Your browser version is too old. Please upgrade to the latest version' })}</div>
                            </div>
                          </div>
                        )
                      }
                    })()}
                  </>
                ) : (
                  <>
                    {/* 不支持的浏览器 */}
                    <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-md">
                      <div className="text-red-800 mb-2">
                        <div className="font-medium mb-1">{t('serial.browserNotSupported', { defaultValue: 'Browser Not Supported' })}</div>
                        <div className="text-xs mb-2">{t('serial.browserNotSupportedDesc', { defaultValue: 'Your browser does not support Web Serial API. Please use one of the following browsers:' })}</div>
                      </div>
                    </div>
                  </>
                )}

                {/* 支持的浏览器列表 */}
                <div className="text-gray-600 font-medium mb-1.5">{t('serial.supportedBrowsers', { defaultValue: 'Supported browsers:' })}</div>
                <div className="space-y-1 text-gray-500">
                  <div className="flex items-center">
                    <span className={`w-1.5 h-1.5 rounded-full mr-2 flex-shrink-0 ${browserInfo.name === 'Chrome' && browserInfo.isSupported ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                    <span>{t('serial.chrome', { defaultValue: 'Chrome' })} {t('serial.chromeVersion', { defaultValue: 'Chrome 89+' })}</span>
                  </div>
                  <div className="flex items-center">
                    <span className={`w-1.5 h-1.5 rounded-full mr-2 flex-shrink-0 ${browserInfo.name === 'Edge' && browserInfo.isSupported ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                    <span>{t('serial.edge', { defaultValue: 'Edge' })} {t('serial.edgeVersion', { defaultValue: 'Edge 89+' })}</span>
                  </div>
                  <div className="flex items-center">
                    <span className={`w-1.5 h-1.5 rounded-full mr-2 flex-shrink-0 ${browserInfo.name === 'Opera' && browserInfo.isSupported ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                    <span>{t('serial.opera', { defaultValue: 'Opera' })} {t('serial.operaVersion', { defaultValue: 'Opera 75+' })}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 自定义波特率模态框 */}
      <Modal
        isOpen={showCustomBaudRateModal}
        onClose={() => setShowCustomBaudRateModal(false)}
        title={t('serial.customBaudRate', { defaultValue: 'Custom Baud Rate' })}
      >
        <div className="space-y-4">
          <div>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={customBaudRate}
              onChange={(e) => {
                setCustomBaudRate(e.target.value)
                setCustomBaudRateError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirmCustomBaudRate()
                }
              }}
              placeholder={t('validation.enterBaudRate')}
              min="1"
              max="10000000"
              autoFocus
            />
            {customBaudRateError && (
              <p className="mt-1 text-xs text-red-600">{customBaudRateError}</p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              {t('serial.baudRateRange', { defaultValue: 'Range: 1 ~ 10,000,000 bps' })}
            </p>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-900 font-medium mb-1">{t('serial.commonBaudRates', { defaultValue: 'Common Baud Rates:' })}</p>
              <p className="text-xs text-blue-800">
                {t('serial.lowSpeed', { defaultValue: 'Low' })}: 4800, 9600<br />
                {t('serial.standard', { defaultValue: 'Standard' })}: 19200, 38400, 57600, 115200<br />
                {t('serial.highSpeed', { defaultValue: 'High' })}: 230400, 460800, 921600
              </p>
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowCustomBaudRateModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleConfirmCustomBaudRate}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {t('common.confirm')}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

