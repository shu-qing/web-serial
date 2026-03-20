import { create } from 'zustand'
import { bridgeClient, BridgeConnectionState, DeviceStatus } from '@/lib/bridgeClient'
import { serialManager } from '@/lib/serialManager'
import { useSerialStore } from './useSerialStore'
import { useAuthStore } from './useAuthStore'

interface BridgeStore {
  // 连接状态
  connectionState: BridgeConnectionState
  myConnectionCode: string
  remoteConnectionCode: string
  
  // 申请状态
  requestStatus: 'idle' | 'requesting' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled'
  requesterInfo: { username: string; deviceStatus: DeviceStatus } | null
  
  // 设备状态
  localDeviceStatus: DeviceStatus
  remoteDeviceStatus: DeviceStatus
  
  // 桥接模式
  bridgeMode: 'device-bridge' | 'remote-access' | 'software-test' | null
  
  // 统计信息
  stats: {
    bytesSent: number
    bytesReceived: number
    messagesSent: number
    messagesReceived: number
    connectedTime: number
    latency: number
  }
  
  // 数据监听器
  dataListener: ((data: Uint8Array) => void) | null
  
  // 是否已经收到过对方的设备状态
  hasReceivedRemoteStatus: boolean
  
  // Actions
  generateConnectionCode: () => Promise<void>
  setRemoteConnectionCode: (code: string) => void
  waitForRequest: () => Promise<void>
  requestBridge: (connectionCode: string) => Promise<void>
  cancelRequest: () => void
  approveBridge: () => void
  rejectBridge: (reason?: string) => void
  disconnect: () => void
  updateLocalDeviceStatus: () => void
  sendData: (data: string, encoding: 'utf-8' | 'hex', source: 'device' | 'manual') => void
  clearStats: () => void
}

export const useBridgeStore = create<BridgeStore>((set, get) => ({
  // 初始状态
  connectionState: 'disconnected',
  myConnectionCode: '',
  remoteConnectionCode: '',
  
  requestStatus: 'idle',
  requesterInfo: null,
  
  localDeviceStatus: {
    hasDevice: false,
  },
  
  remoteDeviceStatus: {
    hasDevice: false,
  },
  
  bridgeMode: null,
  
  stats: {
    bytesSent: 0,
    bytesReceived: 0,
    messagesSent: 0,
    messagesReceived: 0,
    connectedTime: 0,
    latency: 0,
  },
  
  dataListener: null,
  
  hasReceivedRemoteStatus: false,
  
  // Actions
  
  /**
   * 生成6位数字+大写字母连接码并立即开始等待
   */
  generateConnectionCode: async () => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    set({ myConnectionCode: code })
    
    // 立即开始等待桥接申请
    console.log('[BridgeStore] Code generated, starting to wait for requests...')
    await get().waitForRequest()
  },
  
  /**
   * 设置远程连接码
   */
  setRemoteConnectionCode: (code: string) => {
    set({ remoteConnectionCode: code })
  },
  
  /**
   * 建立桥接连接
   * @param codeToUse 可选的连接码，如果不提供则从state读取
   */
  connect: async (codeToUse?: string) => {
    const { myConnectionCode, remoteConnectionCode } = get()
    
    // 使用传入的连接码，或从state读取（优先使用remoteConnectionCode）
    const connectionCode = codeToUse || remoteConnectionCode || myConnectionCode
    
    if (!connectionCode) {
      throw new Error('请先生成或输入连接码')
    }
    
    console.log('[BridgeStore] Connecting with code:', connectionCode, 'mode:', (codeToUse || remoteConnectionCode) ? 'join' : 'create')
    
    try {
      // 重置状态标记
      set({ hasReceivedRemoteStatus: false })
      
      // 更新本地设备状态
      get().updateLocalDeviceStatus()
      
      // 只在第一次连接时注册事件监听（避免重复注册）
      const isFirstConnect = get().connectionState === 'disconnected'
      
      if (isFirstConnect) {
        // 注册事件监听（只注册一次）
        bridgeClient.on('stateChange', (state) => {
          console.log('[BridgeStore] Connection state changed:', state)
          set({ connectionState: state })
          
          // 连接成功后立即发送设备状态
          if (state === 'connected') {
            const localStatus = get().localDeviceStatus
            console.log('[BridgeStore] Sending local device status:', localStatus)
            bridgeClient.sendDeviceStatus(localStatus)
          }
        })
        
        bridgeClient.on('deviceStatus', (status) => {
          console.log('[BridgeStore] Received remote device status:', status)
          set({ remoteDeviceStatus: status as DeviceStatus })
          
          // 根据设备状态确定桥接模式
          const local = get().localDeviceStatus
          const remote = status as DeviceStatus
          
          let mode: 'device-bridge' | 'remote-access' | 'software-test' | null
          if (local.hasDevice && remote.hasDevice) {
            mode = 'device-bridge'
          } else if (!local.hasDevice && !remote.hasDevice) {
            mode = 'software-test'
          } else {
            mode = 'remote-access'
          }
          
          console.log('[BridgeStore] Bridge mode determined:', mode)
          set({ bridgeMode: mode })
          
          // 只在第一次收到对方状态时回复（避免消息循环）
          if (!get().hasReceivedRemoteStatus) {
            set({ hasReceivedRemoteStatus: true })
            setTimeout(() => {
              const currentLocal = get().localDeviceStatus
              console.log('[BridgeStore] Replying with local device status:', currentLocal)
              bridgeClient.sendDeviceStatus(currentLocal)
            }, 200)
          }
        })
        
        bridgeClient.on('data', (dataMsg) => {
        // 接收到远程数据
        const bytes = Uint8Array.from(atob(dataMsg.data), c => c.charCodeAt(0))
        
        // 更新统计
        set((state) => ({
          stats: {
            ...state.stats,
            bytesReceived: state.stats.bytesReceived + bytes.length,
            messagesReceived: state.stats.messagesReceived + 1,
          },
        }))
        
        // 如果本地有设备且数据来自手动发送，写入设备
        const local = get().localDeviceStatus
        if (local.hasDevice && dataMsg.source === 'manual') {
          const port = serialManager.getCurrentPort()
          if (port && port.isConnected()) {
            port.write(dataMsg.data).catch((error) => {
              console.error('[BridgeClient] Failed to write to device:', error)
            })
          }
        }
        
        // 在接收区显示（添加标识）
        const serialStore = useSerialStore.getState()
        serialStore.addLogEntry({
          id: Date.now().toString() + Math.random(),
          timestamp: new Date(dataMsg.timestamp),
          direction: 'receive',
          data: dataMsg.data,
          encoding: dataMsg.encoding,
          bytes: bytes.length,
        })
      })
      
        bridgeClient.on('notification', (notification) => {
          // 可选：处理通知消息
          console.log('[Bridge] Notification:', notification)
        })
        
        bridgeClient.on('error', (error) => {
          console.error('[Bridge] Error:', error)
          set({ connectionState: 'error' })
        })
      }
      
      // 连接到服务器（使用正确的连接码）
      await bridgeClient.connect(connectionCode)
      
    } catch (error) {
      set({ connectionState: 'error' })
      throw error
    }
  },
  
  /**
   * 等待桥接申请（A端使用）
   */
  waitForRequest: async () => {
    const { myConnectionCode } = get()
    
    if (!myConnectionCode) {
      throw new Error('请先生成连接码')
    }
    
    try {
      // 先断开之前的连接（如果有）
      if (get().connectionState !== 'disconnected') {
        console.log('[BridgeStore] A端 Disconnecting previous connection before waiting')
        bridgeClient.disconnect()
        set({ connectionState: 'disconnected' })
      }
      
      // 更新本地设备状态
      get().updateLocalDeviceStatus()
      
      // 每次都重新注册事件监听（确保刷新后能正常工作）
      console.log('[BridgeStore] A端 Registering all listeners')
      
      // 注册连接状态变化
      bridgeClient.on('stateChange', (state) => {
        console.log('[BridgeStore] A端 Connection state changed:', state)
        set({ connectionState: state })
      })
      
      // 监听房间超时错误（A端）
      bridgeClient.on('error', (error: any) => {
        if (error.code === 'ROOM_TIMEOUT') {
          console.log('[BridgeStore] A端 Room timeout, clearing connection code')
          // 清空连接码，让用户重新生成
          set({
            myConnectionCode: '',
            connectionState: 'disconnected',
            requestStatus: 'idle',
            requesterInfo: null,
            remoteDeviceStatus: { hasDevice: false },
            bridgeMode: null,
          })
        }
      })
      
      // 注册桥接申请相关事件（A端）
      console.log('[BridgeStore] A端 Registering bridgeRequest listener')
      bridgeClient.on('bridgeRequest', (requester) => {
        console.log('[BridgeStore] A端 Received bridge request from:', requester.username, requester)
        set({ 
          requesterInfo: requester,
          requestStatus: 'pending_approval',
        })
      })
        
      bridgeClient.on('bridgeCancel', () => {
        console.log('[BridgeStore] Request cancelled')
        set({ 
          requestStatus: 'idle',
          requesterInfo: null,
        })
      })
      
      // 监听对方断开桥接（A端）
      bridgeClient.on('bridgeDisconnect', () => {
        console.log('[BridgeStore] A端 Peer disconnected, resetting state')
        // 移除数据监听器
        const { dataListener } = get()
        if (dataListener) {
          serialManager.removeDataListener(dataListener)
          set({ dataListener: null })
        }
        
        // 断开连接并重置状态
        bridgeClient.disconnect()
        set({
          connectionState: 'disconnected',
          remoteDeviceStatus: { hasDevice: false },
          bridgeMode: null,
          hasReceivedRemoteStatus: false,
          requestStatus: 'idle',
          requesterInfo: null,
        })
        
        // A端断开后自动重新开始等待新的申请
        console.log('[BridgeStore] A端 Restarting wait for new requests')
        setTimeout(() => {
          get().waitForRequest().catch((error) => {
            console.error('[BridgeStore] A端 Failed to restart waiting:', error)
          })
        }, 500)
      })
      
      // 设备状态同步（A端）
      bridgeClient.on('deviceStatus', (status) => {
        console.log('[BridgeStore] A端 Received device status:', status)
        set({ remoteDeviceStatus: status as DeviceStatus })
        
        // 如果已桥接，重新计算桥接模式
        if (get().requestStatus === 'approved') {
          const local = get().localDeviceStatus
          let mode: 'device-bridge' | 'remote-access' | 'software-test' | null
          
          if (local.hasDevice && status.hasDevice) {
            mode = 'device-bridge'
          } else if (!local.hasDevice && !status.hasDevice) {
            mode = 'software-test'
          } else {
            mode = 'remote-access'
          }
          
          console.log('[BridgeStore] A端 Remote device status changed, new mode:', mode)
          set({ bridgeMode: mode })
        }
      })
      
      // 数据传输（A端）
      bridgeClient.on('data', (dataMsg) => {
        // 解码base64数据
        const decodedData = atob(dataMsg.data)
        const bytes = Uint8Array.from(decodedData, c => c.charCodeAt(0))
        
        // 只在需要调试时打印（避免循环发送时日志过多）
        // console.log('[BridgeStore] A端 Received data:', decodedData, 'source:', dataMsg.source)
        
        set((state) => ({
          stats: {
            ...state.stats,
            bytesReceived: state.stats.bytesReceived + bytes.length,
            messagesReceived: state.stats.messagesReceived + 1,
          },
        }))
        
        const local = get().localDeviceStatus
        // 桥接模式下，只要本地有设备，就写入（不区分数据来源）
        // - 设备桥接模式：对方设备数据透传到本地设备
        // - 远程访问模式：对方手动发送写入本地设备
        if (local.hasDevice) {
          const port = serialManager.getCurrentPort()
          if (port && port.isConnected()) {
            console.log('[BridgeStore] A端 Writing data to device, source:', dataMsg.source)
            port.write(decodedData).catch((error) => {
              console.error('[BridgeClient] Failed to write to device:', error)
            })
          }
        }
        
        const serialStore = useSerialStore.getState()
        serialStore.addLogEntry({
          id: Date.now().toString() + Math.random(),
          timestamp: new Date(dataMsg.timestamp),
          direction: 'receive',
          data: decodedData, // 使用解码后的数据
          encoding: dataMsg.encoding,
          bytes: bytes.length,
        })
      })
      
      // 连接到WebSocket服务器（使用自己的连接码）
      await bridgeClient.connect(myConnectionCode)
      
      console.log('[BridgeStore] Waiting for bridge request...')
      
    } catch (error) {
      set({ connectionState: 'error' })
      throw error
    }
  },

  /**
   * 申请桥接（B端使用）
   */
  requestBridge: async (connectionCode: string) => {
    try {
      // 先断开之前的连接（如果有）
      if (get().connectionState !== 'disconnected') {
        console.log('[BridgeStore] B端 Disconnecting previous connection before requesting')
        bridgeClient.disconnect()
        set({ connectionState: 'disconnected' })
      }
      
      set({ remoteConnectionCode: connectionCode, requestStatus: 'requesting' })
      
      // 更新本地设备状态
      get().updateLocalDeviceStatus()
      
      // 每次都重新注册事件监听（确保刷新后能正常工作）
      console.log('[BridgeStore] B端 Registering all listeners')
      
      // 注册连接状态变化
      bridgeClient.on('stateChange', (state) => {
        console.log('[BridgeStore] B端 Connection state changed:', state, 'requestStatus:', get().requestStatus)
        set({ connectionState: state })
        
        // 连接成功后发送桥接申请
        if (state === 'connected') {
          const currentRequestStatus = get().requestStatus
          console.log('[BridgeStore] B端 Connected, requestStatus:', currentRequestStatus)
          
          if (currentRequestStatus === 'requesting') {
            console.log('[BridgeStore] B端 Will send bridge request in 500ms')
            setTimeout(() => {
              const localStatus = get().localDeviceStatus
              // 获取当前用户名
              const authStore = useAuthStore.getState()
              const username = authStore.user?.username || '访客'
              
              console.log('[BridgeStore] B端 Sending bridge request', localStatus)
              bridgeClient.sendBridgeRequest({
                username,
                deviceStatus: localStatus,
              })
              set({ requestStatus: 'pending_approval' })
            }, 500)
          }
        }
      })
      
      // 监听房间超时错误（B端）
      bridgeClient.on('error', (error: any) => {
        if (error.code === 'ROOM_TIMEOUT') {
          console.log('[BridgeStore] B端 Room timeout')
          // B端重置状态（不清空连接码，因为可能需要重试）
          set({
            connectionState: 'disconnected',
            requestStatus: 'idle',
            remoteDeviceStatus: { hasDevice: false },
            bridgeMode: null,
          })
        }
      })
      
      // 注册桥接申请相关事件
      bridgeClient.on('bridgeApprove', (remoteStatus) => {
        console.log('[BridgeStore] Bridge approved, remote status:', remoteStatus)
        set({ 
          remoteDeviceStatus: remoteStatus,
          requestStatus: 'approved',
        })
        
        // 确定桥接模式
        const local = get().localDeviceStatus
        let mode: 'device-bridge' | 'remote-access' | 'software-test' | null
        if (local.hasDevice && remoteStatus.hasDevice) {
          mode = 'device-bridge'
        } else if (!local.hasDevice && !remoteStatus.hasDevice) {
          mode = 'software-test'
        } else {
          mode = 'remote-access'
        }
        set({ bridgeMode: mode })
        
        // 回复自己的设备状态
        bridgeClient.sendDeviceStatus(local)
      })
      
      bridgeClient.on('bridgeReject', (reason) => {
        console.log('[BridgeStore] Bridge rejected:', reason)
        set({ requestStatus: 'rejected' })
      })
      
      // B端也可能收到其他人的申请（不太可能，但为了完整性）
      bridgeClient.on('bridgeRequest', (requester) => {
        console.log('[BridgeStore] B端 Received bridge request from:', requester.username)
        set({ 
          requesterInfo: requester,
          requestStatus: 'pending_approval',
        })
      })
      
      bridgeClient.on('bridgeCancel', () => {
        console.log('[BridgeStore] Request cancelled')
        set({ 
          requestStatus: 'idle',
          requesterInfo: null,
        })
      })
      
      // 监听对方断开桥接（B端）
      bridgeClient.on('bridgeDisconnect', () => {
        console.log('[BridgeStore] B端 Peer disconnected, resetting state')
        // 移除数据监听器
        const { dataListener } = get()
        if (dataListener) {
          serialManager.removeDataListener(dataListener)
          set({ dataListener: null })
        }
        
        // 断开连接并重置状态
        bridgeClient.disconnect()
        set({
          connectionState: 'disconnected',
          remoteDeviceStatus: { hasDevice: false },
          bridgeMode: null,
          hasReceivedRemoteStatus: false,
          requestStatus: 'idle',
          requesterInfo: null,
        })
      })
      
      // 设备状态同步（B端）
      bridgeClient.on('deviceStatus', (status) => {
        console.log('[BridgeStore] B端 Received device status:', status)
        set({ remoteDeviceStatus: status as DeviceStatus })
        
        // 如果已桥接，重新计算桥接模式
        if (get().requestStatus === 'approved') {
          const local = get().localDeviceStatus
          let mode: 'device-bridge' | 'remote-access' | 'software-test' | null
          
          if (local.hasDevice && status.hasDevice) {
            mode = 'device-bridge'
          } else if (!local.hasDevice && !status.hasDevice) {
            mode = 'software-test'
          } else {
            mode = 'remote-access'
          }
          
          console.log('[BridgeStore] B端 Remote device status changed, new mode:', mode)
          set({ bridgeMode: mode })
        }
      })
      
      // 数据传输（B端）
      bridgeClient.on('data', (dataMsg) => {
        // 解码base64数据
        const decodedData = atob(dataMsg.data)
        const bytes = Uint8Array.from(decodedData, c => c.charCodeAt(0))
        
        // 只在需要调试时打印（避免循环发送时日志过多）
        // console.log('[BridgeStore] B端 Received data:', decodedData, 'source:', dataMsg.source)
        
        set((state) => ({
          stats: {
            ...state.stats,
            bytesReceived: state.stats.bytesReceived + bytes.length,
            messagesReceived: state.stats.messagesReceived + 1,
          },
        }))
        
        const local = get().localDeviceStatus
        // 桥接模式下，只要本地有设备，就写入（不区分数据来源）
        // - 设备桥接模式：对方设备数据透传到本地设备
        // - 远程访问模式：对方手动发送写入本地设备
        if (local.hasDevice) {
          const port = serialManager.getCurrentPort()
          if (port && port.isConnected()) {
            console.log('[BridgeStore] B端 Writing data to device, source:', dataMsg.source)
            port.write(decodedData).catch((error) => {
              console.error('[BridgeClient] Failed to write to device:', error)
            })
          }
        }
        
        const serialStore = useSerialStore.getState()
        serialStore.addLogEntry({
          id: Date.now().toString() + Math.random(),
          timestamp: new Date(dataMsg.timestamp),
          direction: 'receive',
          data: decodedData, // 使用解码后的数据
          encoding: dataMsg.encoding,
          bytes: bytes.length,
        })
      })
      
      // 连接到WebSocket服务器
      await bridgeClient.connect(connectionCode)
      
    } catch (error) {
      set({ connectionState: 'error', requestStatus: 'idle' })
      throw error
    }
  },
  
  /**
   * 取消申请（B端）
   */
  cancelRequest: () => {
    bridgeClient.sendBridgeCancel()
    set({ requestStatus: 'cancelled' })
    setTimeout(() => {
      get().disconnect()
    }, 500)
  },
  
  /**
   * 批准申请（A端）
   */
  approveBridge: () => {
    const localStatus = get().localDeviceStatus
    bridgeClient.sendBridgeApprove(localStatus)
    
    const requester = get().requesterInfo
    if (requester) {
      set({ 
        remoteDeviceStatus: requester.deviceStatus,
        requestStatus: 'approved',
      })
      
      // 确定桥接模式
      let mode: 'device-bridge' | 'remote-access' | 'software-test' | null
      if (localStatus.hasDevice && requester.deviceStatus.hasDevice) {
        mode = 'device-bridge'
      } else if (!localStatus.hasDevice && !requester.deviceStatus.hasDevice) {
        mode = 'software-test'
      } else {
        mode = 'remote-access'
      }
      set({ bridgeMode: mode })
    }
  },
  
  /**
   * 拒绝申请（A端）
   */
  rejectBridge: (reason?: string) => {
    bridgeClient.sendBridgeReject(reason)
    set({ 
      requestStatus: 'idle',
      requesterInfo: null,
    })
  },

  /**
   * 断开桥接
   */
  disconnect: () => {
    console.log('[BridgeStore] Disconnecting bridge')
    
    const wasApproved = get().requestStatus === 'approved'
    
    // 如果已建立桥接，先通知对方
    if (wasApproved) {
      console.log('[BridgeStore] Sending disconnect notification to peer')
      bridgeClient.sendBridgeDisconnect()
      
      // 等待消息发送后再断开
      setTimeout(() => {
        // 移除数据监听器
        const { dataListener } = get()
        if (dataListener) {
          serialManager.removeDataListener(dataListener)
          set({ dataListener: null })
        }
        
        bridgeClient.disconnect()
        
        set({
          connectionState: 'disconnected',
          myConnectionCode: '', // 清空连接码
          remoteDeviceStatus: { hasDevice: false },
          bridgeMode: null,
          hasReceivedRemoteStatus: false,
          requestStatus: 'idle',
          requesterInfo: null,
        })
      }, 100)
    } else {
      // 未建立桥接，直接断开
      const { dataListener } = get()
      if (dataListener) {
        serialManager.removeDataListener(dataListener)
        set({ dataListener: null })
      }
      
      bridgeClient.disconnect()
      
      set({
        connectionState: 'disconnected',
        remoteDeviceStatus: { hasDevice: false },
        bridgeMode: null,
        hasReceivedRemoteStatus: false,
        requestStatus: 'idle',
        requesterInfo: null,
      })
    }
  },
  
  /**
   * 更新本地设备状态
   */
  updateLocalDeviceStatus: () => {
    const serialStore = useSerialStore.getState()
    
    const status: DeviceStatus = {
      hasDevice: serialStore.isConnected,
      deviceInfo: serialStore.isConnected
        ? {
            name: serialStore.deviceName || '未知设备',
            baudRate: serialStore.config.baudRate,
          }
        : undefined,
    }
    
    set({ localDeviceStatus: status })
    
    // 如果已桥接，重新计算桥接模式
    if (get().requestStatus === 'approved') {
      const remote = get().remoteDeviceStatus
      let mode: 'device-bridge' | 'remote-access' | 'software-test' | null
      
      if (status.hasDevice && remote.hasDevice) {
        mode = 'device-bridge'
      } else if (!status.hasDevice && !remote.hasDevice) {
        mode = 'software-test'
      } else {
        mode = 'remote-access'
      }
      
      console.log('[BridgeStore] Local device status changed, new mode:', mode)
      set({ bridgeMode: mode })
    }
    
    // 如果已连接，通知对方
    if (get().connectionState === 'connected') {
      bridgeClient.sendDeviceStatus(status)
    }
    
    // 如果本地有设备，设置数据监听器（自动转发设备数据）
    if (status.hasDevice && !get().dataListener) {
      const listener = (data: Uint8Array) => {
        // 将设备数据转发给对方
        const text = new TextDecoder().decode(data)
        const base64 = btoa(text)
        
        bridgeClient.sendSerialData({
          source: 'device',
          data: base64,
          encoding: 'utf-8',
          timestamp: Date.now(),
        })
        
        // 更新统计
        set((state) => ({
          stats: {
            ...state.stats,
            bytesSent: state.stats.bytesSent + data.length,
            messagesSent: state.stats.messagesSent + 1,
          },
        }))
      }
      
      serialManager.addDataListener(listener)
      set({ dataListener: listener })
    } else if (!status.hasDevice && get().dataListener) {
      // 设备断开，移除监听器
      const listener = get().dataListener
      if (listener) {
        serialManager.removeDataListener(listener)
        set({ dataListener: null })
      }
    }
  },
  
  /**
   * 手动发送数据到对方
   */
  sendData: (data: string, encoding: 'utf-8' | 'hex', source: 'device' | 'manual') => {
    const base64 = btoa(data)
    
    bridgeClient.sendSerialData({
      source,
      data: base64,
      encoding,
      timestamp: Date.now(),
    })
    
    // 更新统计
    set((state) => ({
      stats: {
        ...state.stats,
        bytesSent: state.stats.bytesSent + data.length,
        messagesSent: state.stats.messagesSent + 1,
      },
    }))
  },
  
  /**
   * 清空统计
   */
  clearStats: () => {
    set({
      stats: {
        bytesSent: 0,
        bytesReceived: 0,
        messagesSent: 0,
        messagesReceived: 0,
        connectedTime: 0,
        latency: 0,
      },
    })
  },
}))

