import { useState, useEffect, useRef } from 'react'
import { useBridgeStore } from '@/stores/useBridgeStore'
import { useSerialStore } from '@/stores/useSerialStore'
import { useUIStore } from '@/stores/useUIStore'
import BridgeRequestModal from './BridgeRequestModal'
import { useTranslation } from 'react-i18next'

export default function RemotePanel() {
  const { t } = useTranslation()
  const { showToast } = useUIStore()
  const { isConnected: localDeviceConnected } = useSerialStore()
  
  const {
    connectionState,
    myConnectionCode,
    localDeviceStatus,
    remoteDeviceStatus,
    bridgeMode,
    stats,
    requestStatus,
    requesterInfo,
    generateConnectionCode,
    requestBridge,
    cancelRequest,
    approveBridge,
    rejectBridge,
    disconnect,
    updateLocalDeviceStatus,
  } = useBridgeStore()
  
  const [inputCode, setInputCode] = useState('')
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showTips, setShowTips] = useState(() => {
    const saved = localStorage.getItem('remote-panel-tips-visible')
    return saved === null ? true : saved === 'true'
  })
  const hasStartedWaiting = useRef(false)
  const prevRequestStatus = useRef(requestStatus)
  const isConnecting = connectionState === 'connecting'
  const isWaitingApproval = requestStatus === 'pending_approval'
  const isApproved = requestStatus === 'approved'
  const isBridged = isApproved // 只有批准后才算真正桥接
  
  // 监听本地设备连接状态变化，实时更新桥接模式
  useEffect(() => {
    if (isBridged) {
      console.log('[RemotePanel] Local device connection changed:', localDeviceConnected)
      updateLocalDeviceStatus()
    }
  }, [localDeviceConnected, isBridged, updateLocalDeviceStatus])
  
  // 不再自动连接，由用户手动点击"生成连接码"触发
  
  // 监听房间超时，显示提示
  useEffect(() => {
    // 当连接码清空时（超时或断开），重置状态
    if (!myConnectionCode && hasStartedWaiting.current) {
      showToast('warning', t('notification.roomTimeout', { defaultValue: '10分钟无活动，房间已自动关闭' }))
      hasStartedWaiting.current = false
    }
  }, [myConnectionCode, t, showToast])
  
  // 当连接码被清空时（例如超时），重置 hasStartedWaiting
  useEffect(() => {
    if (!myConnectionCode) {
      hasStartedWaiting.current = false
    }
  }, [myConnectionCode])
  
  // 监听桥接申请，显示弹窗
  useEffect(() => {
    console.log('[RemotePanel] Checking request modal:', { 
      requesterInfo, 
      requestStatus, 
      showRequestModal 
    })
    
    if (requesterInfo && requestStatus === 'pending_approval') {
      console.log('[RemotePanel] Opening request modal for:', requesterInfo.username)
      setShowRequestModal(true)
    }
  }, [requesterInfo, requestStatus])
  
  // 监听断开连接，清空输入的申请码
  useEffect(() => {
    // 只在从approved变为idle时清空（即断开桥接后）
    if (prevRequestStatus.current === 'approved' && requestStatus === 'idle') {
      console.log('[RemotePanel] Disconnected from bridge, clearing input code')
      setInputCode('')
    }
    prevRequestStatus.current = requestStatus
  }, [requestStatus])
  
  const handleConnect = async () => {
    if (isWaitingApproval && !requesterInfo) {
      // B端：取消申请
      cancelRequest()
      showToast('info', t('bridge.cancelRequest'))
      return
    }
    
    if (isBridged) {
      disconnect()
      showToast('info', t('bridge.disconnect'))
    } else {
      if (!inputCode.trim()) {
        showToast('error', t('bridge.enterCode'))
        return
      }
      
      if (inputCode.length !== 6) {
        showToast('error', t('validation.invalidCode', { defaultValue: 'Please enter 6-digit code' }))
        return
      }
      
      if (!/^[0-9A-Z]{6}$/.test(inputCode)) {
        showToast('error', t('validation.codeFormat', { defaultValue: 'Code can only contain digits and uppercase letters' }))
        return
      }
      
      try {
        await requestBridge(inputCode)
        showToast('success', t('notification.requestSent', { defaultValue: 'Request sent, waiting for approval...' }))
      } catch (error) {
        showToast('error', error instanceof Error ? error.message : t('notification.connectFailed'))
      }
    }
  }
  
  const handleApprove = () => {
    approveBridge()
    setShowRequestModal(false)
    showToast('success', t('bridge.approveBridge'))
  }
  
  const handleReject = () => {
    rejectBridge(t('bridge.rejectBridge'))
    setShowRequestModal(false)
    showToast('info', t('notification.requestRejected', { defaultValue: 'Request rejected' }))
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(myConnectionCode)
      showToast('success', t('notification.copySuccess', { defaultValue: 'Copied successfully' }))
    } catch (err) {
      showToast('error', t('notification.copyFailed', { defaultValue: 'Copy failed' }))
    }
  }
  
  // 生成连接码并开始等待
  const handleGenerateCode = async () => {
    if (!hasStartedWaiting.current) {
      hasStartedWaiting.current = true
      try {
        // 生成连接码会自动触发 waitForRequest
        await generateConnectionCode()
        showToast('success', t('notification.codeGenerated', { defaultValue: 'Connection code generated' }))
      } catch (error) {
        console.error('[RemotePanel] Failed to generate code:', error)
        hasStartedWaiting.current = false
        showToast('error', t('notification.generateFailed', { defaultValue: 'Failed to generate code' }))
      }
    }
  }
  
  const handleCloseTips = () => {
    setShowTips(false)
    localStorage.setItem('remote-panel-tips-visible', 'false')
  }
  
  const getBridgeModeText = () => {
    switch (bridgeMode) {
      case 'device-bridge':
        return t('bridge.deviceBridgeMode')
      case 'remote-access':
        return localDeviceStatus.hasDevice ? 
          t('bridge.remoteAccessMode') + ' (' + t('common.serving', { defaultValue: 'Serving' }) + ')' : 
          t('bridge.remoteAccessMode') + ' (' + t('common.accessing', { defaultValue: 'Accessing' }) + ')'
      case 'software-test':
        return t('bridge.softwareTestMode')
      default:
        return t('bridge.notConnected')
    }
  }

  return (
    <>
      {/* 标题栏 - 固定高度 */}
      <div className="h-10 px-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">{t('bridge.smartBridge')}</h3>
        {isBridged && (
          <span className="text-xs text-gray-500">{getBridgeModeText()}</span>
        )}
      </div>
      
      {/* 内容区 - 占据剩余空间并可滚动 */}
      <div className="flex-1 overflow-y-auto p-4 pb-16">
          {/* 桥接状态卡片 */}
        <div className="status-card mb-4">
          <div className="flex items-center justify-center mb-3">
            <div className="flex items-center space-x-2.5">
              <span
                className={`status-dot ${
                  isBridged ? 'status-connected' : 
                  isWaitingApproval ? 'status-connecting' : 
                  isConnecting ? 'status-connecting' : 
                  'status-disconnected'
                }`}
                style={{ width: '12px', height: '12px' }}
              ></span>
              <span className="text-sm font-semibold text-gray-700">
                {isBridged ? t('bridge.connected') : 
                 isWaitingApproval && requesterInfo ? t('bridge.waitingApproval') :
                 isWaitingApproval && !requesterInfo ? t('bridge.requesting') :
                 isConnecting ? t('common.connecting', { defaultValue: 'Connecting...' }) : t('bridge.notConnected')}
              </span>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span>{t('common.local', { defaultValue: 'Local' })}:</span>
              <div className="flex items-center space-x-1.5">
                <span className={`status-dot ${localDeviceStatus.hasDevice ? 'status-connected' : 'status-disconnected'}`}></span>
                <span className="font-medium text-gray-700">
                  {localDeviceStatus.hasDevice 
                    ? (localDeviceStatus.deviceInfo?.name || t('serial.connected')) 
                    : t('serial.disconnected')}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span>{t('common.remote', { defaultValue: 'Remote' })}:</span>
              <div className="flex items-center space-x-1.5">
                <span className={`status-dot ${remoteDeviceStatus.hasDevice ? 'status-connected' : 'status-disconnected'}`}></span>
                <span className="font-medium text-gray-700">
                  {remoteDeviceStatus.hasDevice 
                    ? (remoteDeviceStatus.deviceInfo?.name || t('serial.connected')) 
                    : t('serial.disconnected')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 我的连接码 */}
        <div className="mb-4">
          <label className="block text-xs mb-2">
            <span className="font-medium text-gray-700">{t('bridge.myCode')}</span>
            {myConnectionCode && <span className="text-gray-500 ml-2">{t('bridge.shareCode')}</span>}
          </label>
          {myConnectionCode ? (
            <>
              <input
                type="text"
                readOnly
                value={myConnectionCode}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-700 font-mono text-center mb-2"
              />
              <button 
                className="btn-secondary w-full" 
                onClick={handleCopyCode}
              >
                {t('bridge.copyCode', { defaultValue: '复制连接码' })}
              </button>
            </>
          ) : (
            <button 
              className="btn-primary w-full" 
              onClick={handleGenerateCode}
            >
              {t('bridge.generateCode', { defaultValue: '生成连接码' })}
            </button>
          )}
        </div>

        {/* 申请桥接 */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-2">{t('bridge.requestBridge')}</label>
          <input
            type="text"
            placeholder={t('bridge.enterCode')}
            value={inputCode}
            onChange={(e) => {
              const value = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 6)
              setInputCode(value)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-center font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
            disabled={isBridged || isWaitingApproval}
            maxLength={6}
          />
          <button
            className={`w-full px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
              isBridged
                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300'
                : isWaitingApproval && !requesterInfo
                ? 'bg-yellow-50 text-yellow-600 border border-yellow-200 hover:bg-yellow-100'
                : 'btn-primary'
            }`}
            onClick={handleConnect}
            disabled={isConnecting || (!inputCode.trim() && !isBridged && !isWaitingApproval) || (isWaitingApproval && !!requesterInfo)}
          >
            {isBridged ? t('bridge.disconnect') : 
             isWaitingApproval && !requesterInfo ? t('bridge.cancelRequest') :
             isWaitingApproval && requesterInfo ? t('bridge.waitingApproval') + '...' :
             t('bridge.requestBridge')}
          </button>
        </div>
        
        {/* 桥接申请弹窗 */}
        {requesterInfo && (
          <BridgeRequestModal
            isOpen={showRequestModal}
            requesterName={requesterInfo.username}
            hasDevice={requesterInfo.deviceStatus.hasDevice}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}

        {/* 已桥接时显示统计信息 */}
        {isBridged && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <h4 className="text-xs font-medium text-gray-700 mb-2">桥接统计</h4>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>发送数据:</span>
                <span className="font-mono">{stats.bytesSent} bytes</span>
              </div>
              <div className="flex justify-between">
                <span>接收数据:</span>
                <span className="font-mono">{stats.bytesReceived} bytes</span>
              </div>
              <div className="flex justify-between">
                <span>发送消息:</span>
                <span className="font-mono">{stats.messagesSent} 条</span>
              </div>
              <div className="flex justify-between">
                <span>接收消息:</span>
                <span className="font-mono">{stats.messagesReceived} 条</span>
              </div>
            </div>
          </div>
        )}
        
        {/* 智能桥接说明 */}
        {showTips && (
          <div className="mt-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md relative">
              <button
                onClick={handleCloseTips}
                className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                title={t('common.close')}
              >
                ✕
              </button>
              <p className="text-xs text-blue-800 mb-2 font-medium pr-6">💡 {t('bridge.modeDescription', { defaultValue: 'Smart Bridge Mode Description' })}</p>
            
            <div className="text-xs text-blue-700 space-y-2">
              <div>
                <p className="font-medium mb-1">🎯 {t('bridge.coreFeatures', { defaultValue: 'Core Features' })}：</p>
                <ul className="space-y-0.5 ml-2">
                  <li>• {t('bridge.feature_oneToOne', { defaultValue: '1-to-1 exclusive connection' })}</li>
                  <li>• {t('bridge.feature_fixedPermission', { defaultValue: 'Fixed permission (based on device status)' })}</li>
                  <li>• {t('bridge.feature_deviceSharing', { defaultValue: 'Device resource sharing' })}</li>
                </ul>
              </div>
              
              <div>
                <p className="font-medium mb-1">🔄 {t('bridge.adaptiveScenarios', { defaultValue: 'Adaptive Scenarios' })}：</p>
                <ul className="space-y-0.5 ml-2">
                  <li>• <strong>{t('bridge.scenario_bothDevices', { defaultValue: 'Both devices' })}</strong>：{t('bridge.scenario_bothDevicesDesc', { defaultValue: 'Device bridge, both sides monitor only' })}</li>
                  <li>• <strong>{t('bridge.scenario_singleDevice', { defaultValue: 'Single device' })}</strong>：{t('bridge.scenario_singleDeviceDesc', { defaultValue: 'Remote access, device-less side controls' })}</li>
                  <li>• <strong>{t('bridge.scenario_noDevice', { defaultValue: 'No device' })}</strong>：{t('bridge.scenario_noDeviceDesc', { defaultValue: 'Software test, bi-directional free interaction' })}</li>
                </ul>
              </div>
              
              <div>
                <p className="font-medium mb-1">📌 {t('bridge.useCases', { defaultValue: 'Use Cases' })}：</p>
                <ul className="space-y-0.5 ml-2">
                  <li>• {t('bridge.useCase_remoteBorrow', { defaultValue: 'Remote device borrowing' })}</li>
                  <li>• {t('bridge.useCase_techSupport', { defaultValue: 'Simple technical support' })}</li>
                  <li>• {t('bridge.useCase_noHardware', { defaultValue: 'Testing without hardware' })}</li>
                </ul>
              </div>
            </div>
          </div>
          </div>
        )}
      </div>
    </>
  )
}


