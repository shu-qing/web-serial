import { useState, useEffect } from 'react'
import { useSessionStore } from '@/stores/useSessionStore'
import { useSerialStore } from '@/stores/useSerialStore'
import { useUIStore } from '@/stores/useUIStore'
import { useTranslation } from 'react-i18next'

export default function SharePanel() {
  const { t } = useTranslation()
  const { showToast } = useUIStore()
  const { isConnected: _deviceConnected } = useSerialStore()
  
  const {
    inviteCode,
    role,
    state,
    participants,
    sendPermissionOwner,
    currentUserId,
    stats,
    createSession,
    joinSession,
    endSession,
    leaveSession,
    requestSendPermission,
    releaseSendPermission,
    hasSendPermission,
  } = useSessionStore()
  
  const [joinCode, setJoinCode] = useState('')
  const [sessionDuration, setSessionDuration] = useState(0)
  const [showTips, setShowTips] = useState(() => {
    const saved = localStorage.getItem('share-panel-tips-visible')
    return saved === null ? true : saved === 'true'
  })
  
  const isSessionActive = state === 'active' || state === 'created'
  const isOwner = role === 'owner'
  const currentHasSendPermission = hasSendPermission()
  
  // 会话时长计时器
  useEffect(() => {
    if (!isSessionActive || !stats.sessionStartTime) {
      setSessionDuration(0)
      return
    }
    
    const timer = setInterval(() => {
      const duration = Math.floor((Date.now() - stats.sessionStartTime!.getTime()) / 1000)
      setSessionDuration(duration)
    }, 1000)
    
    return () => clearInterval(timer)
  }, [isSessionActive, stats.sessionStartTime])
  
  const handleCreateSession = async () => {
    console.log('[SharePanel] 🎬 Start creating session...')
    try {
      await createSession({
        password: undefined, // MVP暂不支持密码功能
      })
      console.log('[SharePanel] ✅ Session created successfully')
      showToast('success', '会话创建成功')
      // 注意：设备连接状态会自动显示在 StatusBar
    } catch (error) {
      console.error('[SharePanel] ❌ Session creation failed:', error)
      showToast('error', error instanceof Error ? error.message : '创建会话失败')
    }
    console.log('[SharePanel] 🏁 handleCreateSession completed')
  }

  const handleJoinSession = async () => {
    if (!joinCode || joinCode.length !== 6) {
      showToast('error', t('validation.enterInviteCode'))
      return
    }
    
    if (!/^[0-9A-Z]{6}$/.test(joinCode)) {
      showToast('error', t('validation.codeFormat'))
      return
    }
    
    try {
      await joinSession(joinCode, undefined) // MVP暂不支持密码
      showToast('success', t('notification.sessionJoined'))
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : '加入失败')
    }
  }

  const handleEndSession = () => {
    if (isOwner) {
      endSession()
      showToast('info', '会话已结束')
    } else {
      leaveSession()
      showToast('info', t('notification.sessionLeft'))
    }
    // 清空邀请码输入框
    setJoinCode('')
  }
  
  const handleCloseTips = () => {
    setShowTips(false)
    localStorage.setItem('share-panel-tips-visible', 'false')
  }

  const handleCopyInviteCode = async () => {
    if (!isSessionActive) {
      handleCreateSession()
      return
    }
    
    try {
      await navigator.clipboard.writeText(inviteCode)
      showToast('success', t('notification.copySuccess'))
    } catch (err) {
      showToast('error', '复制失败')
    }
  }
  
  const handleRequestSendPermission = () => {
    const shouldBeDisabled = !isOwner && sendPermissionOwner !== null
    
    console.log('[SharePanel] 🔍 Requesting send permission - FULL STATE:', {
      isOwner,
      role,
      sendPermissionOwner,
      currentUserId,
      shouldBeDisabled,
      buttonWillWork: !shouldBeDisabled,
    })
    
    // 双重检查：UI 层面的验证
    if (!isOwner && sendPermissionOwner !== null) {
      console.error('[SharePanel] ❌ Blocked by UI: Guest cannot grab when someone has permission')
      showToast('error', '参与者不能在有人持有发送权时抢占')
      return
    }
    
    requestSendPermission()
    // 注意：发送权状态变化会自动显示在 StatusBar（由 HomePage useEffect 监听）
  }
  
  const handleReleaseSendPermission = () => {
    releaseSendPermission()
    // 注意：发送权状态变化会自动显示在 StatusBar（由 HomePage useEffect 监听）
  }
  
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0')
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${h}:${m}:${s}`
  }
  
  const getSendPermissionOwnerName = () => {
    if (!sendPermissionOwner) return '未分配'
    const participant = participants.find(p => p.id === sendPermissionOwner)
    if (!participant) return '未知'
    return participant.id === currentUserId ? '您' : participant.name
  }

  return (
    <>
      {/* 标题栏 - 固定高度 */}
      <div className="h-10 px-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">{t('share.sessionShare')}</h3>
        {isSessionActive && (
          <span className="text-xs text-gray-500">
            {isOwner ? t('share.owner') : t('share.guest')}
          </span>
        )}
      </div>
      
      {/* 内容区 - 占据剩余空间并可滚动 */}
      <div className="flex-1 overflow-y-auto p-4 pb-16 space-y-4">
          {/* 会话状态卡片 */}
        <div className="status-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-700">{t('share.sessionStatus')}</span>
            <div className="flex items-center space-x-2">
              <span className={`status-dot ${isSessionActive ? 'status-connected' : 'status-disconnected'}`}></span>
              <span className="text-xs text-gray-600">
                {isSessionActive 
                  ? (isOwner 
                      ? t('share.statusCreated', { defaultValue: '已创建' }) 
                      : t('share.statusJoined', { defaultValue: '已加入' })) 
                  : t('share.statusNotCreated', { defaultValue: '未创建' })}
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-500 space-y-1.5">
            <div className="flex items-center justify-between">
              <span>{t('share.participantsCount', { defaultValue: '参与者' })}:</span>
              <span className="font-medium text-gray-700">{participants.length}/5</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{t('share.sessionDuration', { defaultValue: '会话时长' })}:</span>
              <span className="font-mono text-gray-700">{formatDuration(sessionDuration)}</span>
            </div>
            {isSessionActive && (
              <>
                <div className="flex items-center justify-between">
                  <span>{t('share.dataSent', { defaultValue: '发送数据' })}:</span>
                  <span className="font-mono text-gray-700">{stats.totalDataSent} bytes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('share.dataReceived', { defaultValue: '接收数据' })}:</span>
                  <span className="font-mono text-gray-700">{stats.totalDataReceived} bytes</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 创建/分享会话 */}
        {!isSessionActive && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">{t('share.createSession')}</label>
            <div className="space-y-2">
                <button
                  className="btn-primary w-full"
                  onClick={handleCreateSession}
                >
                  {t('share.createSession')}
                </button>
              <p className="text-xs text-gray-500 text-center">
                {t('share.createSessionHint', { defaultValue: 'A 6-digit invite code will be generated after creating session' })}
              </p>
            </div>
          </div>
        )}
        
        {/* 邀请码显示（已创建会话后） */}
        {isSessionActive && isOwner && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">{t('share.inviteCode')}</label>
            <input
              type="text"
              readOnly
              value={inviteCode}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-700 font-mono text-center"
            />
            <div className="flex gap-2 mt-2">
              <button
                className="btn-primary flex-1"
                onClick={handleCopyInviteCode}
              >
                {t('share.copyInviteCode', { defaultValue: '复制邀请码' })}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {t('share.shareInviteCode', { defaultValue: 'Share invite code for collaborators to join' })}
            </p>
          </div>
        )}

        {/* 加入会话 */}
        {!isSessionActive && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">{t('share.joinSession')}</label>
            <input
              type="text"
              placeholder={t('share.enterInviteCode')}
              maxLength={6}
              value={joinCode}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '')
                setJoinCode(value)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              className="btn-primary w-full mt-2"
              onClick={handleJoinSession}
            >
              {t('share.joinSession')}
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {t('share.enterInviteCodeHint', { defaultValue: 'Enter the invite code provided by the creator' })}
            </p>
          </div>
        )}

        {/* 发送权控制 */}
        {isSessionActive && (
          <div className={`p-3 rounded-md border ${currentHasSendPermission ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700">发送权</span>
              <span className={`text-xs font-medium ${currentHasSendPermission ? 'text-green-700' : 'text-gray-500'}`}>
                {getSendPermissionOwnerName()}
              </span>
            </div>
            {!currentHasSendPermission ? (
              <>
                <button
                  className="btn-primary w-full"
                  onClick={handleRequestSendPermission}
                  disabled={!isOwner && sendPermissionOwner !== null}
                >
                  {t('share.grabPermission')}
                </button>
                {!isOwner && sendPermissionOwner !== null && (
                  <p className="text-xs text-orange-600 mt-1 text-center">
                    ⚠️ 参与者需等待发送权释放后才能抢占
                  </p>
                )}
              </>
            ) : (
              <button
                className="btn-primary w-full"
                onClick={handleReleaseSendPermission}
              >
                释放发送权
              </button>
            )}
          </div>
        )}

        {/* 参与者列表 */}
        {isSessionActive && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">参与者 ({participants.length})</label>
            <div className="space-y-1">
              {participants.length === 0 ? (
                <div className="flex items-center justify-center p-2 bg-gray-50 rounded text-xs text-gray-400">
                  暂无参与者
                </div>
              ) : (
                participants.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                    <div className="flex items-center space-x-2">
                      <span className={`status-dot ${participant.isOnline ? 'status-connected' : 'status-disconnected'}`}></span>
                      <span className="font-medium">
                        {participant.id === currentUserId ? `您（${participant.name}）` : participant.name}
                      </span>
                      {participant.hasDevice && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">📟</span>
                      )}
                      {participant.hasSendPermission && (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">发送权</span>
                      )}
                    </div>
                    <span className="text-gray-500">
                      {participant.isOnline ? '在线' : '离线'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 结束/离开会话 */}
        {isSessionActive && (
          <div>
            <button
              className="w-full px-4 py-2.5 text-sm font-medium rounded-md transition-colors bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300"
              onClick={handleEndSession}
            >
              {isOwner ? t('share.endSession') : t('share.leaveSession')}
            </button>
          </div>
        )}
        
        {/* 会话共享说明 */}
        {showTips && (
          <div className="mt-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-md relative">
              <button
                onClick={handleCloseTips}
                className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-green-600 hover:text-green-800 hover:bg-green-100 rounded transition-colors"
                title={t('common.close')}
              >
                ✕
              </button>
              <p className="text-xs text-green-800 mb-2 font-medium pr-6">💡 {t('share.modeDescription', { defaultValue: 'Session Share Mode Description' })}</p>
            
            <div className="text-xs text-green-700 space-y-2">
              <div>
                <p className="font-medium mb-1">🎯 {t('share.coreFeatures', { defaultValue: 'Core Features' })}：</p>
                <ul className="space-y-0.5 ml-2">
                  <li>• {t('share.feature_oneToMany', { defaultValue: '1-to-many collaboration (up to 5 people)' })}</li>
                  <li>• {t('share.feature_dynamicPermission', { defaultValue: 'Dynamic send permission (grabbable)' })}</li>
                  <li>• {t('share.feature_realTimeMirror', { defaultValue: 'Real-time data mirroring' })}</li>
                </ul>
              </div>
              
              <div>
                <p className="font-medium mb-1">🔑 {t('share.permissionControl', { defaultValue: 'Send Permission Control' })}：</p>
                <ul className="space-y-0.5 ml-2">
                  <li>• {t('share.permission_ownerDefault', { defaultValue: '发起者默认持有发送权' })}</li>
                  <li>• {t('share.permission_ownerCanAlways', { defaultValue: '发起者可随时抢占发送权' })}</li>
                  <li>• {t('share.permission_guestWaitRelease', { defaultValue: '参与者需等待所有人释放后才能抢占' })}</li>
                  <li>• {t('share.permission_onlyHolder', { defaultValue: '只有持有者可以发送数据' })}</li>
                </ul>
              </div>
              
              <div>
                <p className="font-medium mb-1">📌 {t('share.useCases', { defaultValue: 'Use Cases' })}：</p>
                <ul className="space-y-0.5 ml-2">
                  <li>• {t('share.useCase_teamDebug', { defaultValue: 'Team collaborative debugging' })}</li>
                  <li>• {t('share.useCase_teaching', { defaultValue: 'Teaching demonstration (take turns)' })}</li>
                  <li>• {t('share.useCase_techSupport', { defaultValue: 'Remote tech support (flexible handover)' })}</li>
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

