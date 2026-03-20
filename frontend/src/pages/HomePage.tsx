import { useState, useEffect } from 'react'
import { Icons } from '@/components/common/Icons'
import ReceiveArea from '@/components/SerialDebugger/ReceiveArea'
import SendArea from '@/components/SerialDebugger/SendArea'
import StatusBar from '@/components/SerialDebugger/StatusBar'
import VerticalNavbar from '@/components/Layout/VerticalNavbar'
import Sidebar from '@/components/Layout/Sidebar'
import VirtualSerialModal from '@/components/Layout/Sidebar/VirtualSerialModal'
import { useSerialStore } from '@/stores/useSerialStore'
import { useBridgeStore } from '@/stores/useBridgeStore'
import { useSessionStore } from '@/stores/useSessionStore'
import { ChecksumType } from '@/utils/checksum'
import { useTranslation } from 'react-i18next'

export default function HomePage() {
  const { t } = useTranslation()
  // 发送设置状态（在 HomePage 中统一管理）
  const [sendMode, setSendMode] = useState<'text' | 'hex'>('text')
  const [lineEnding, setLineEnding] = useState('')
  const [isLoopEnabled, setIsLoopEnabled] = useState(false)
  const [loopInterval, setLoopInterval] = useState(1000)
  const [checksumEnabled, setChecksumEnabled] = useState(false)
  const [checksumType, setChecksumType] = useState<ChecksumType>('CRC16-Modbus')
  
  // 桥接状态
  const { localDeviceStatus, bridgeMode, requestStatus, updateLocalDeviceStatus } = useBridgeStore()
  const isBridged = requestStatus === 'approved' // 只有批准后才算真正桥接
  
  // 会话共享状态
  const { 
    state: sessionState, 
    hasSendPermission: hasSessionSendPermission 
  } = useSessionStore()
  const isInSession = sessionState === 'active' || sessionState === 'created'
  const currentHasSendPermission = hasSessionSendPermission()
  
  // 判断发送区是否应该禁用
  // 1. 桥接模式下有设备时禁用
  // 2. 会话共享模式下无发送权时禁用
  const sendAreaDisabled = (isBridged && localDeviceStatus.hasDevice) || (isInSession && !currentHasSendPermission)
  
  const { setStatusMessage, isConnected: localDeviceConnected } = useSerialStore()
  
  // 监听本地设备连接状态变化，如果正在桥接则更新状态
  useEffect(() => {
    if (isBridged) {
      console.log('[HomePage] Device connection changed:', localDeviceConnected, 'updating bridge status')
      updateLocalDeviceStatus()
    }
  }, [localDeviceConnected, isBridged, updateLocalDeviceStatus])
  
  // 监听模式变化，在StatusBar中统一显示提示消息
  useEffect(() => {
    // 桥接模式
    if (isBridged && bridgeMode) {
      if (bridgeMode === 'device-bridge') {
        // 设备桥接：双方都有设备，都不能发送
        setStatusMessage(t('statusBar.deviceBridge'), 'warning')
      } else if (bridgeMode === 'remote-access') {
        if (localDeviceStatus.hasDevice) {
          // 远程访问：本地有设备，被对方控制
          setStatusMessage(t('statusBar.remoteAccessLocal'), 'warning')
        } else {
          // 远程访问：本地无设备，可以控制对方
          setStatusMessage(t('statusBar.remoteAccessRemote'), 'success')
        }
      } else if (bridgeMode === 'software-test') {
        // 软件测试：双方都无设备，可以自由交互
        setStatusMessage(t('statusBar.softwareTest'), 'success')
      }
    } 
    // 会话共享模式
    else if (isInSession) {
      if (currentHasSendPermission) {
        setStatusMessage(t('statusBar.sessionHasPermission'), 'success')
      } else {
        setStatusMessage(t('statusBar.sessionNoPermission'), 'warning')
      }
    }
    // 正常模式
    else {
      setStatusMessage(t('statusBar.ready'), 'info')
    }
  }, [isBridged, bridgeMode, localDeviceStatus.hasDevice, isInSession, currentHasSendPermission, setStatusMessage])
  
  // 侧边栏面板管理
  // 首次加载时，如果是新用户（没有保存过状态），默认展开串口连接面板
  const [activePanel, setActivePanel] = useState<string | null>(() => {
    try {
      // 检查是否有保存的面板状态
      const savedPanel = localStorage.getItem('sidebarActivePanel')
      if (savedPanel !== null && savedPanel !== '') {
        // 用户之前有选择，使用保存的值（可能是 'null' 字符串，表示关闭）
        const panel = savedPanel === 'null' ? null : savedPanel
        console.log('[HomePage] Restored panel from localStorage:', panel)
        return panel
      }
      // 首次访问或 localStorage 为空，默认展开串口连接面板
      console.log('[HomePage] First visit or empty localStorage, defaulting to serial panel')
      return 'serial'
    } catch (error) {
      // localStorage 可能被禁用（某些隐私模式）
      console.warn('[HomePage] localStorage access failed, defaulting to serial panel:', error)
      return 'serial'
    }
  })
  
  // 监听侧边栏状态变化，保存到 localStorage
  useEffect(() => {
    console.log('[HomePage] Active panel changed to:', activePanel)
    // 保存当前面板状态，方便下次访问时恢复
    if (activePanel !== null) {
      localStorage.setItem('sidebarActivePanel', activePanel)
    } else {
      // 如果关闭了面板，也保存 null（但存储为字符串 'null'）
      localStorage.setItem('sidebarActivePanel', 'null')
    }
  }, [activePanel])
  
  // 虚拟串口模态框管理
  const [showVirtualModal, setShowVirtualModal] = useState(false)

  const handlePanelToggle = (panel: string) => {
    const newPanel = activePanel === panel ? null : panel
    console.log('[HomePage] Panel toggle:', { from: activePanel, to: newPanel, requested: panel })
    setActivePanel(newPanel)
  }

  // 处理虚拟串口模式选择
  const handleVirtualModeSelect = async (mode: 'echo' | 'at_command' | 'sensor') => {
    try {
      // 根据模式创建虚拟设备
      const modeNames = {
        echo: t('serial.virtualEcho', { defaultValue: 'Virtual Serial (Echo Mode)' }),
        at_command: t('serial.virtualAT', { defaultValue: 'Virtual Serial (AT Command Mode)' }),
        sensor: t('serial.virtualSensor', { defaultValue: 'Virtual Serial (Sensor Simulation)' }),
      }
      
      const virtualDevice = {
        id: `virtual-${mode}`,
        type: 'virtual' as const,
        name: modeNames[mode],
        description: t('serial.forDevelopment', { defaultValue: 'For development testing' }),
        mode: mode,
      }
      
      // 使用 store 的 connectVirtual 方法（统一管理回调）
      await useSerialStore.getState().connectVirtual(virtualDevice)
    } catch (error) {
      console.error('虚拟串口连接失败:', error)
      alert(t('notification.virtualConnectFailed', { defaultValue: 'Virtual serial connection failed' }) + ': ' + (error as Error).message)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* SVG 图标系统 */}
      <Icons />
      
      {/* 虚拟串口模式选择对话框（渲染在顶层） */}
      <VirtualSerialModal
        isOpen={showVirtualModal}
        onClose={() => setShowVirtualModal(false)}
        onSelect={handleVirtualModeSelect}
      />
      
      {/* 串口工具面板 */}
      <main className="flex-1 min-w-0 flex flex-col bg-gray-50">
        {/* 1. 接收区 (自适应) */}
        <ReceiveArea />
        
        {/* 2. 发送区 (120px) */}
        <SendArea
          sendMode={sendMode}
          lineEnding={lineEnding}
          isLoopEnabled={isLoopEnabled}
          loopInterval={loopInterval}
          checksumEnabled={checksumEnabled}
          checksumType={checksumType}
          onSendModeChange={setSendMode}
          onLineEndingChange={setLineEnding}
          onLoopEnabledChange={setIsLoopEnabled}
          onLoopIntervalChange={setLoopInterval}
          onChecksumEnabledChange={setChecksumEnabled}
          onChecksumTypeChange={setChecksumType}
          bridgeDisabled={sendAreaDisabled}
          bridgeMode={isBridged ? bridgeMode : null}
        />
        
        {/* 3. 状态栏 */}
        <StatusBar />
      </main>
      
      {/* 右侧区域容器：导航栏 + 侧边栏（无间隙） */}
      <div className="flex">
        {/* 侧边栏容器 (可折叠，占据全高) */}
        <Sidebar 
          activePanel={activePanel}
          onShowVirtualModal={() => setShowVirtualModal(true)}
        />
        
        {/* 右侧垂直导航栏 */}
        <VerticalNavbar activePanel={activePanel} onPanelToggle={handlePanelToggle} />
      </div>
    </div>
  )
}

