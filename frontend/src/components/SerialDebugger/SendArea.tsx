import { useState, useRef, useEffect, useCallback } from 'react'
import { useSerialStore } from '@/stores/useSerialStore'
import { useBridgeStore } from '@/stores/useBridgeStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { serialManager } from '@/lib/serialManager'
import { Icon } from '@/components/common/Icons'
import { formatBytes } from '@/utils/format'
import { addChecksum, ChecksumType } from '@/utils/checksum'
import { useTranslation } from 'react-i18next'

interface SendAreaProps {
  sendMode: 'text' | 'hex'
  lineEnding: string
  isLoopEnabled: boolean
  loopInterval: number
  checksumEnabled: boolean
  checksumType: ChecksumType
  onSendModeChange: (mode: 'text' | 'hex') => void
  onLineEndingChange: (ending: string) => void
  onLoopEnabledChange: (enabled: boolean) => void
  onLoopIntervalChange: (interval: number) => void
  onChecksumEnabledChange: (enabled: boolean) => void
  onChecksumTypeChange: (type: ChecksumType) => void
  bridgeDisabled?: boolean // 桥接模式下是否禁用发送
  bridgeMode?: 'device-bridge' | 'remote-access' | 'software-test' | null // 当前桥接模式
}

export default function SendArea({ 
  sendMode: _sendMode, 
  lineEnding, 
  isLoopEnabled, 
  loopInterval,
  checksumEnabled,
  checksumType,
  onSendModeChange,
  onLineEndingChange,
  onLoopEnabledChange,
  onLoopIntervalChange,
  onChecksumEnabledChange,
  onChecksumTypeChange,
  bridgeDisabled = false,
  bridgeMode = null
}: SendAreaProps) {
  const { t } = useTranslation()
  const { isConnected, addSendHistory, addLogEntry, stats } = useSerialStore()
  const bridgeStore = useBridgeStore()
  const { settings } = useSettingsStore()
  
  // 判断在当前模式下是否能发送
  const canSendInCurrentMode = (() => {
    // 如果被桥接禁用，不能发送
    if (bridgeDisabled) return false
    
    // 桥接模式下的发送判断
    if (bridgeMode) {
      if (bridgeMode === 'software-test') {
        return true // 软件测试模式，双方都能通过桥接发送
      } else if (bridgeMode === 'remote-access') {
        return !isConnected // 远程访问模式，无设备方能发送
      } else if (bridgeMode === 'device-bridge') {
        return false // 设备桥接模式，双方都不能发送（已被bridgeDisabled禁用）
      }
    }
    
    // 非桥接模式，需要本地设备连接
    return isConnected
  })()
  
  // 判断数据发送路径
  const shouldSendViaBridge = bridgeMode && !isConnected
  
  const [inputValue, setInputValue] = useState('')
  const [isLooping, setIsLooping] = useState(false)
  const loopTimerRef = useRef<NodeJS.Timeout | null>(null)
  const prevSendModeRef = useRef<'text' | 'hex'>(_sendMode)

  // 停止循环发送
  const stopLoopSend = useCallback(() => {
    if (loopTimerRef.current) {
      clearInterval(loopTimerRef.current)
      loopTimerRef.current = null
    }
    setIsLooping(false)
  }, [])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (loopTimerRef.current) {
        clearInterval(loopTimerRef.current)
      }
    }
  }, [])

  // 监听发送能力变化，不能发送时停止循环
  useEffect(() => {
    // 如果当前模式下不能发送，停止循环
    if (!canSendInCurrentMode && isLooping) {
      console.log('[SendArea] Cannot send in current mode, stopping loop')
      stopLoopSend()
    }
  }, [canSendInCurrentMode, isLooping, stopLoopSend])

  // 处理输入变化（HEX模式下自动格式化）
  const handleInputChange = (value: string) => {
    if (_sendMode === 'hex') {
      // HEX模式：只允许0-9, A-F, a-f和空格
      const filtered = value.toUpperCase().replace(/[^0-9A-F\s]/g, '')
      
      // 移除所有空格
      const noSpaces = filtered.replace(/\s/g, '')
      
      // 每2个字符添加一个空格
      const formatted = noSpaces.match(/.{1,2}/g)?.join(' ') || noSpaces
      
      setInputValue(formatted)
    } else {
      // 文本模式：不限制
      setInputValue(value)
    }
  }

  // 当发送模式切换时，自动转换格式
  useEffect(() => {
    // 检查是否真的切换了模式（避免首次渲染触发）
    if (prevSendModeRef.current === _sendMode) {
      return
    }
    
    // 更新 ref
    const oldMode = prevSendModeRef.current
    prevSendModeRef.current = _sendMode
    
    // 如果输入为空，不需要转换
    if (!inputValue.trim()) return
    
    // ASCII → HEX
    if (oldMode === 'text' && _sendMode === 'hex') {
      // 将ASCII文本转换为HEX格式
      const bytes = new TextEncoder().encode(inputValue)
      const hexString = Array.from(bytes)
        .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
        .join(' ')
      setInputValue(hexString)
    }
    // HEX → ASCII
    else if (oldMode === 'hex' && _sendMode === 'text') {
      try {
        // 将HEX格式转换为ASCII文本
        const hexBytes = inputValue.replace(/\s/g, '').match(/.{1,2}/g) || []
        const bytes = new Uint8Array(hexBytes.map(h => parseInt(h, 16)))
        const text = new TextDecoder().decode(bytes)
        setInputValue(text)
      } catch (error) {
        // 如果转换失败，清空输入
        setInputValue('')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_sendMode])

  // 单次发送数据
  const sendData = async () => {
    if (!inputValue.trim()) return
    
    // 检查当前模式下是否能发送
    if (!canSendInCurrentMode) {
      if (bridgeMode) {
        alert('当前桥接模式下不能发送')
      } else {
        alert('请先连接设备')
      }
      return
    }

    try {
      let dataToSend = inputValue

      // 添加校验码（在行结束符之前）
      if (checksumEnabled) {
        dataToSend = addChecksum(dataToSend, checksumType, _sendMode)
      }

      // 添加行结束符
      dataToSend = dataToSend + lineEnding

      // 根据发送路径处理
      if (shouldSendViaBridge) {
        // 通过桥接通道发送
        bridgeStore.sendData(dataToSend, _sendMode === 'hex' ? 'hex' : 'utf-8', 'manual')
        
        // 添加到发送历史
        addSendHistory(dataToSend)
        
        // 添加到日志（发送的数据）
        addLogEntry({
          id: Date.now().toString(),
          timestamp: new Date(),
          direction: 'send',
          data: dataToSend,
          encoding: _sendMode === 'hex' ? 'hex' : 'utf-8',
          bytes: new TextEncoder().encode(dataToSend).length,
        })
      } else {
        // 通过本地设备发送
        await serialManager.write(dataToSend)

        // 添加到发送历史
        addSendHistory(dataToSend)

        // 添加到日志（发送的数据）
        addLogEntry({
          id: Date.now().toString(),
          timestamp: new Date(),
          direction: 'send',
          data: dataToSend,
          encoding: 'utf-8',
          bytes: new TextEncoder().encode(dataToSend).length,
        })
      }
    } catch (error) {
      console.error('Send error:', error)
      alert(t('notification.sendFailed', { defaultValue: 'Send failed' }) + ': ' + (error as Error).message)
    }
  }

  // 开始循环发送
  const startLoopSend = () => {
    if (!inputValue.trim()) {
      alert(t('validation.enterData', { defaultValue: 'Please enter data to send' }))
      return
    }
    
    setIsLooping(true)
    
    // 立即发送一次
    sendData()
    
    // 设置定时器循环发送
    loopTimerRef.current = setInterval(() => {
      sendData()
    }, loopInterval)
  }

  // 监听循环设置变化
  useEffect(() => {
    // 如果取消循环发送，停止正在进行的循环
    if (!isLoopEnabled && isLooping) {
      stopLoopSend()
    }
  }, [isLoopEnabled, isLooping, stopLoopSend])

  // 处理发送按钮点击
  const handleSend = async () => {
    if (isLoopEnabled) {
      // 循环发送模式
      if (isLooping) {
        stopLoopSend()
      } else {
        startLoopSend()
      }
    } else {
      // 单次发送模式
      await sendData()
      // 单次发送后清空输入
      setInputValue('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSend()
    }
  }

  return (
    <div className="h-30 bg-white flex flex-col">
      {/* 发送区工具栏 */}
      <div className="h-8 bg-white border-b border-gray-200 flex items-center px-4">
        {/* 左侧：图标 + 发送统计 */}
        <div className="flex items-center space-x-3 shrink-0">
          <Icon name="send" className="w-5 h-5 text-blue-600" />
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {t('serial.sent')}: <strong className="text-gray-700">{formatBytes(stats.txBytes)}</strong>
          </span>
        </div>
        
        {/* Spacer */}
        <div className="flex-1"></div>
        
        {/* 右侧控件组 */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* 编码选择 */}
          <label className="flex items-center space-x-1 text-xs text-gray-600 whitespace-nowrap cursor-pointer">
            <input 
              type="radio" 
              name="encoding" 
              value="ascii" 
              checked={_sendMode === 'text'}
              onChange={() => onSendModeChange('text')}
              className="border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>ASCII</span>
          </label>
          <label className="flex items-center space-x-1 text-xs text-gray-600 whitespace-nowrap cursor-pointer">
            <input 
              type="radio" 
              name="encoding" 
              value="hex" 
              checked={_sendMode === 'hex'}
              onChange={() => onSendModeChange('hex')}
              className="border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>HEX</span>
          </label>
          
          <div className="w-px h-4 bg-gray-300"></div>
          
          {/* 校验码 */}
          <label className="flex items-center space-x-1 text-xs text-gray-600 cursor-pointer whitespace-nowrap">
            <input 
              type="checkbox" 
              checked={checksumEnabled}
              onChange={(e) => {
                const enabled = e.target.checked
                onChecksumEnabledChange(enabled)
                // 勾选时自动选择第一个校验码类型
                if (enabled && !checksumType) {
                  onChecksumTypeChange('CRC16-Modbus')
                }
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>{t('serial.checksum', { defaultValue: 'Checksum' })}</span>
          </label>
          <select 
            className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={checksumEnabled ? checksumType : ''}
            onChange={(e) => onChecksumTypeChange(e.target.value as ChecksumType)}
            disabled={!checksumEnabled}
          >
            {!checksumEnabled && <option value="">{t('serial.autoAppend', { defaultValue: 'Auto append' })}</option>}
            <option value="CRC16-Modbus">CRC16-Modbus</option>
            <option value="CRC16-CCITT">CRC16-CCITT</option>
            <option value="CRC8">CRC8</option>
            <option value="XOR">XOR</option>
            <option value="Checksum">Checksum</option>
            <option value="BCC">BCC</option>
            <option value="LRC">LRC</option>
          </select>
          
          <div className="w-px h-4 bg-gray-300"></div>
          
          {/* 行结束符 */}
          <select 
            className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={lineEnding}
            onChange={(e) => onLineEndingChange(e.target.value)}
          >
            <option value="">{t('serial.noLineEnding', { defaultValue: 'None' })}</option>
            <option value="\r\n">\r\n</option>
            <option value="\n">\n</option>
            <option value="\r">\r</option>
          </select>
          
          <div className="w-px h-4 bg-gray-300"></div>
          
          {/* 循环发送 */}
          <label className="flex items-center space-x-1 text-xs text-gray-600 cursor-pointer whitespace-nowrap">
            <input 
              type="checkbox" 
              checked={isLoopEnabled}
              onChange={(e) => onLoopEnabledChange(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>{t('serial.loopSend', { defaultValue: 'Loop Send' })}</span>
          </label>
          <div className="flex items-center space-x-1 whitespace-nowrap">
            <span className="text-xs text-gray-500">{t('serial.interval', { defaultValue: 'Interval' })}:</span>
            <input 
              type="number" 
              value={loopInterval} 
              min="100" 
              max="60000" 
              step="100" 
              onChange={(e) => onLoopIntervalChange(parseInt(e.target.value) || 1000)}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!isLoopEnabled}
            />
            <span className="text-xs text-gray-500">ms</span>
          </div>
        </div>
      </div>

      {/* 输入和发送 */}
      <div className="flex-1 flex items-stretch px-4 py-2 gap-3">
        <textarea
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={bridgeDisabled}
          className={`flex-1 resize-none border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            _sendMode === 'hex' ? 'font-mono' : ''
          } ${bridgeDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          style={{
            fontSize: `${settings.fontSize}px`,
            fontFamily: settings.fontFamily
          }}
          placeholder={
            bridgeDisabled
              ? t('serial.sendDisabled', { defaultValue: 'Send disabled in bridge mode' })
              : _sendMode === 'hex' 
              ? t('serial.enterHex', { defaultValue: 'Enter hex data (e.g., 01 03 00 0A, Ctrl+Enter to send)' })
              : t('serial.enterData', { defaultValue: 'Enter data to send (Ctrl+Enter to send)' })
          }
          rows={2}
        ></textarea>
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || !canSendInCurrentMode}
          className={`px-6 rounded-md text-sm font-medium transition-colors self-stretch ${
            !canSendInCurrentMode
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : isLooping
              ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300'
              : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:border-blue-300'
          }`}
        >
          {isLooping ? t('common.stop', { defaultValue: 'Stop' }) : t('serial.send')}
        </button>
      </div>
    </div>
  )
}

