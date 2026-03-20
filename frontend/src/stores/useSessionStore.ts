import { create } from 'zustand'
import { sessionClient, SerialDataMessage } from '@/lib/sessionClient'
import { serialManager } from '@/lib/serialManager'
import { useSerialStore } from './useSerialStore'

export type SessionRole = 'owner' | 'guest'
export type SessionState = 'created' | 'active' | 'paused' | 'ended'

export interface Participant {
  id: string
  name: string
  role: SessionRole
  isOnline: boolean
  hasDevice: boolean
  hasSendPermission: boolean
  joinedAt: Date
  lastActiveAt: Date
}

export interface SessionConfig {
  name?: string
  password?: string
  maxParticipants: number
  duration?: number // 有效期（小时），undefined表示永久
}

interface SessionStore {
  // 会话状态
  sessionId: string | null
  inviteCode: string
  role: SessionRole | null
  state: SessionState
  config: SessionConfig
  
  // 参与者
  participants: Participant[]
  currentUserId: string
  sendPermissionOwner: string | null // 当前拥有发送权的用户ID
  
  // 连接状态
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error'
  
  // 统计
  stats: {
    sessionStartTime: Date | null
    totalDataSent: number
    totalDataReceived: number
    sendPermissionChanges: number
  }
  
  // 数据监听器
  dataListener: ((data: Uint8Array) => void) | null
  
  // Actions
  createSession: (config?: Partial<SessionConfig>) => Promise<void>
  joinSession: (inviteCode: string, password?: string) => Promise<void>
  endSession: () => void
  leaveSession: () => void
  
  // 发送权管理
  requestSendPermission: () => void
  releaseSendPermission: () => void
  hasSendPermission: () => boolean
  
  // 参与者管理
  addParticipant: (participant: Participant) => void
  removeParticipant: (participantId: string) => void
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void
  
  // 消息监听
  registerMessageListeners: () => void
  
  // 设备监听
  setupDeviceListener: () => void
  
  // 数据发送
  sendDataToDevice: (data: string, encoding: 'utf-8' | 'hex') => void
  
  // 统计
  clearStats: () => void
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  // 初始状态
  sessionId: null,
  inviteCode: '',
  role: null,
  state: 'ended',
  config: {
    maxParticipants: 5,
  },
  
  participants: [],
  currentUserId: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  sendPermissionOwner: null,
  
  connectionState: 'disconnected',
  
  stats: {
    sessionStartTime: null,
    totalDataSent: 0,
    totalDataReceived: 0,
    sendPermissionChanges: 0,
  },
  
  dataListener: null,
  
  // Actions
  
  /**
   * 创建会话（发起者）
   */
  createSession: async (config = {}) => {
    try {
      // 调用后端 API 创建会话
      const { api } = await import('@/lib/api')
      const response = await api.createSession('share')
      
      if (!response.success || !response.data) {
        throw new Error(response.message || '创建会话失败')
      }
      
      const session = response.data
      const inviteCode = session.inviteCode
      
      const currentUserId = get().currentUserId
      
      // 检查当前是否有设备连接
      const serialStore = useSerialStore.getState()
      const hasDevice = serialStore.isConnected
      
      set({
        sessionId: session.id,
        inviteCode,
        role: 'owner',
        state: 'created',
        config: {
          maxParticipants: 5,
          ...config,
        },
      participants: [{
        id: currentUserId,
        name: '发起者',
        role: 'owner',
        isOnline: true,
        hasDevice, // 根据实际设备连接状态
        hasSendPermission: true, // 发起者默认拥有发送权
        joinedAt: new Date(),
        lastActiveAt: new Date(),
      }],
        sendPermissionOwner: currentUserId,
        stats: {
          sessionStartTime: new Date(),
          totalDataSent: 0,
          totalDataReceived: 0,
          sendPermissionChanges: 0,
        },
        connectionState: 'connecting',
      })
      
      // 连接到 WebSocket
      await sessionClient.connect(inviteCode)
      
      set({ connectionState: 'connected' })
      
      // 注册消息监听器
      console.log('[SessionStore] Registering message listeners for owner...')
      get().registerMessageListeners()
      
      // 设置设备数据监听器
      console.log('[SessionStore] Setting up device listener for owner...')
      get().setupDeviceListener()
      
      console.log('[SessionStore] Session created successfully:', {
        sessionId: session.id,
        inviteCode,
        role: 'owner',
        participantsCount: 1,
      })
      
    } catch (error) {
      set({ connectionState: 'error', state: 'ended' })
      throw error
    }
  },
  
  /**
   * 加入会话（协作者）
   */
  joinSession: async (inviteCode: string, _password?: string) => {
    try {
      console.log('[SessionStore] 🚀 Starting to join session:', inviteCode)
      set({ connectionState: 'connecting', inviteCode })
      
      // 调用后端 API 加入会话
      console.log('[SessionStore] 📡 Calling backend API to join session...')
      const { api } = await import('@/lib/api')
      const response = await api.joinSession(inviteCode)
      
      console.log('[SessionStore] 📥 Backend response:', response)
      
      if (!response.success || !response.data) {
        throw new Error(response.message || '加入会话失败')
      }
      
      const responseData = response.data
      const session = responseData.session  // 注意：后端返回的是 { session: {...}, participant: {...}, participants: [...] }
      const currentUserId = get().currentUserId
      
      console.log('[SessionStore] 📦 Session data:', session)
      console.log('[SessionStore] 🔌 Connecting to WebSocket room:', session.inviteCode)
      
      // 连接到 WebSocket
      await sessionClient.connect(session.inviteCode)
      
      console.log('[SessionStore] ✅ WebSocket connected')
      
      // 从后端获取的参与者列表转换为前端格式
      const participants: Participant[] = (responseData.participants || []).map((p: any) => ({
        id: p.userId || p.id,
        name: p.username,
        role: p.role,
        isOnline: true,
        hasDevice: p.hasDevice || false,
        hasSendPermission: p.hasControl || false,
        joinedAt: new Date(p.joinedAt),
        lastActiveAt: new Date(p.lastActiveAt),
      }))
      
      // 找出当前持有发送权的人
      const ownerParticipant = participants.find(p => p.role === 'owner')
      const permissionOwner = ownerParticipant?.id || null
      
      console.log('[SessionStore] 🎯 Setting initial send permission owner:', {
        ownerParticipant: ownerParticipant ? { id: ownerParticipant.id, name: ownerParticipant.name } : null,
        permissionOwner,
      })
      
      set({
        sessionId: session.id,
        role: 'guest',
        state: 'active',
        connectionState: 'connected',
        participants, // 使用后端返回的完整参与者列表
        sendPermissionOwner: permissionOwner, // 设置发起者为发送权拥有者
        stats: {
          sessionStartTime: new Date(),
          totalDataSent: 0,
          totalDataReceived: 0,
          sendPermissionChanges: 0,
        },
      })
      
      // 注册消息监听器
      console.log('[SessionStore] Registering message listeners for guest...')
      get().registerMessageListeners()
      
      // 设置设备数据监听器
      console.log('[SessionStore] Setting up device listener for guest...')
      get().setupDeviceListener()
      
      console.log('[SessionStore] Joined session successfully:', {
        sessionId: session.id,
        inviteCode: session.inviteCode,
        role: 'guest',
        participantsCount: participants.length,
      })
      
      // 检查当前是否有设备连接
      const serialStore = useSerialStore.getState()
      const hasDevice = serialStore.isConnected
      
      // 通知其他人我加入了
      const myParticipant = participants.find(p => p.id === currentUserId)
      const participantJoinedPayload = {
        userId: currentUserId,
        name: myParticipant?.name || '协作者',
        role: 'guest',
        hasDevice,
      }
      console.log('[SessionStore] Sending participant_joined message:', {
        payload: participantJoinedPayload,
        inviteCode: session.inviteCode,
        totalParticipants: participants.length,
        myParticipant,
      })
      sessionClient.sendMessage('participant_joined', participantJoinedPayload)
      
    } catch (error) {
      set({ connectionState: 'error' })
      throw error
    }
  },
  
  /**
   * 结束会话（发起者）
   */
  endSession: () => {
    const currentUserId = get().currentUserId
    
    // 通知所有人会话已结束
    sessionClient.sendMessage('session_ended', {
      userId: currentUserId,
      timestamp: Date.now(),
    })
    
    // 移除设备监听器
    const { dataListener } = get()
    if (dataListener) {
      serialManager.removeDataListener(dataListener)
    }
    
    // 断开所有连接
    sessionClient.disconnect()
    
    set({
      sessionId: null,
      state: 'ended',
      participants: [],
      sendPermissionOwner: null,
      connectionState: 'disconnected',
      dataListener: null,
    })
  },
  
  /**
   * 离开会话（协作者）
   */
  leaveSession: () => {
    const currentUserId = get().currentUserId
    
    // 通知其他人我离开了
    sessionClient.sendMessage('participant_left', {
      userId: currentUserId,
      timestamp: Date.now(),
    })
    
    // 断开连接
    sessionClient.disconnect()
    
    set({
      sessionId: null,
      role: null,
      state: 'ended',
      participants: [],
      sendPermissionOwner: null,
      connectionState: 'disconnected',
    })
  },
  
  /**
   * 请求发送权（抢占）
   * 规则：
   * - 发起者（owner）可以随时抢占
   * - 参与者（guest）只能在无人持有发送权时抢占
   */
  requestSendPermission: () => {
    const { currentUserId, role, sendPermissionOwner } = get()
    const currentParticipant = get().participants.find(p => p.id === currentUserId)
    
    console.log('[SessionStore] Request send permission:', {
      currentUserId,
      role,
      sendPermissionOwner,
      canRequest: role === 'owner' || sendPermissionOwner === null,
    })
    
    // 参与者只能在无人持有发送权时抢占
    if (role === 'guest' && sendPermissionOwner !== null) {
      console.warn('[SessionStore] Guest cannot request send permission when someone already has it')
      return false
    }
    
    // 发送抢占消息给所有人（通过 WebSocket 广播）
    sessionClient.sendMessage('send_permission_changed', {
      userId: currentUserId,
      name: currentParticipant?.name || '未知用户',
      granted: true,
      timestamp: Date.now(),
    })
    
    // 立即更新本地状态（乐观更新）
    set((state) => ({
      participants: state.participants.map(p => ({
        ...p,
        hasSendPermission: p.id === currentUserId,
      })),
      sendPermissionOwner: currentUserId,
      stats: {
        ...state.stats,
        sendPermissionChanges: state.stats.sendPermissionChanges + 1,
      },
    }))
    
    console.log('[SessionStore] Send permission granted to:', currentUserId)
    
    return true
  },
  
  /**
   * 释放发送权
   */
  releaseSendPermission: () => {
    const currentUserId = get().currentUserId
    
    // 通知所有人发送权已释放
    sessionClient.sendMessage('send_permission_changed', {
      userId: currentUserId,
      granted: false,
      timestamp: Date.now(),
    })
    
    set((state) => ({
      participants: state.participants.map(p => ({
        ...p,
        hasSendPermission: false,
      })),
      sendPermissionOwner: null,
    }))
  },
  
  /**
   * 判断当前用户是否拥有发送权
   */
  hasSendPermission: () => {
    const { currentUserId, sendPermissionOwner } = get()
    return sendPermissionOwner === currentUserId
  },
  
  /**
   * 添加参与者
   */
  addParticipant: (participant: Participant) => {
    set((state) => ({
      participants: [...state.participants, participant],
    }))
  },
  
  /**
   * 移除参与者
   */
  removeParticipant: (participantId: string) => {
    set((state) => ({
      participants: state.participants.filter(p => p.id !== participantId),
    }))
  },
  
  /**
   * 更新参与者
   */
  updateParticipant: (participantId: string, updates: Partial<Participant>) => {
    set((state) => ({
      participants: state.participants.map(p =>
        p.id === participantId ? { ...p, ...updates } : p
      ),
    }))
  },
  
  /**
   * 发送数据到设备（需要发送权）
   */
  sendDataToDevice: (data: string, encoding: 'utf-8' | 'hex') => {
    if (!get().hasSendPermission()) {
      console.warn('[SessionStore] No send permission')
      return
    }
    
    const base64 = btoa(data)
    
    sessionClient.sendSerialData({
      source: 'manual',
      data: base64,
      encoding,
      timestamp: Date.now(),
    })
    
    // 更新统计
    set((state) => ({
      stats: {
        ...state.stats,
        totalDataSent: state.stats.totalDataSent + data.length,
      },
    }))
  },
  
  /**
   * 注册 WebSocket 消息监听器
   */
  registerMessageListeners: () => {
    // 监听串口数据
    sessionClient.on('data', (dataMsg: SerialDataMessage) => {
      // 接收数据并显示
      const serialStore = useSerialStore.getState()
      const decodedData = atob(dataMsg.data)
      
      serialStore.addLogEntry({
        id: Date.now().toString() + Math.random(),
        timestamp: new Date(dataMsg.timestamp),
        direction: 'receive',
        data: decodedData,
        encoding: dataMsg.encoding,
        bytes: decodedData.length,
      })
      
      // 更新统计
      set((state) => ({
        stats: {
          ...state.stats,
          totalDataReceived: state.stats.totalDataReceived + decodedData.length,
        },
      }))
    })
    
    // 监听参与者加入
    sessionClient.on('participant_joined', (payload: any) => {
      console.log('[SessionStore] Participant joined:', payload)
      
      const participantId = payload.userId || `guest-${Date.now()}`
      
      // 检查是否已存在（避免重复添加）
      const existingParticipant = get().participants.find(p => p.id === participantId)
      if (existingParticipant) {
        console.log('[SessionStore] Participant already exists, skipping')
        return
      }
      
      const newParticipant: Participant = {
        id: participantId,
        name: payload.name || '协作者',
        role: payload.role || 'guest',
        isOnline: true,
        hasDevice: payload.hasDevice || false,
        hasSendPermission: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
      }
      
      console.log('[SessionStore] Adding new participant:', newParticipant)
      
      set((state) => ({
        participants: [...state.participants, newParticipant],
      }))
    })
    
    // 监听参与者离开
    sessionClient.on('participant_left', (payload: any) => {
      console.log('[SessionStore] Participant left:', payload)
      
      set((state) => ({
        participants: state.participants.filter(p => p.id !== payload.userId),
      }))
    })
    
    // 监听发送权变更
    sessionClient.on('send_permission_changed', (payload: any) => {
      console.log('[SessionStore] 📨 Received send_permission_changed message:', payload)
      
      const { userId, granted } = payload
      const currentState = get()
      const requester = currentState.participants.find(p => p.id === userId)
      
      console.log('[SessionStore] 🔍 Current state before update:', {
        currentUserId: currentState.currentUserId,
        myRole: currentState.role,
        currentOwner: currentState.sendPermissionOwner,
        requesterRole: requester?.role,
      })
      
      // 🔒 服务端权限验证：参与者只能在无人持有时抢占
      if (granted && requester?.role === 'guest' && currentState.sendPermissionOwner !== null) {
        console.error('[SessionStore] ❌ BLOCKED: Guest tried to grab permission while owner has it', {
          guestId: userId,
          guestName: requester.name,
          currentOwner: currentState.sendPermissionOwner,
        })
        // 拒绝此次权限变更
        return
      }
      
      // 更新参与者的发送权状态
      set((state) => {
        const newSendPermissionOwner = granted ? userId : null
        
        console.log('[SessionStore] ✅ Updating send permission:', {
          userId,
          granted,
          oldOwner: state.sendPermissionOwner,
          newOwner: newSendPermissionOwner,
          participants: state.participants.map(p => ({ id: p.id, name: p.name, role: p.role })),
        })
        
        return {
          participants: state.participants.map(p => ({
            ...p,
            hasSendPermission: granted && p.id === userId, // 只有 granted=true 且是该用户时才有发送权
          })),
          sendPermissionOwner: newSendPermissionOwner,
          stats: {
            ...state.stats,
            sendPermissionChanges: state.stats.sendPermissionChanges + 1,
          },
        }
      })
    })
    
    // 监听设备状态变化
    sessionClient.on('device_status_changed', (payload: any) => {
      console.log('[SessionStore] Device status changed:', payload)
      
      const { userId, hasDevice } = payload
      
      // 更新参与者的设备状态
      set((state) => ({
        participants: state.participants.map(p =>
          p.id === userId ? { ...p, hasDevice } : p
        ),
      }))
    })
  },
  
  /**
   * 设置设备数据监听器
   */
  setupDeviceListener: () => {
    const { dataListener } = get()
    
    // 如果已经有监听器，先移除
    if (dataListener) {
      serialManager.removeDataListener(dataListener)
    }
    
    // 创建新监听器
    const listener = (data: Uint8Array) => {
      const text = new TextDecoder().decode(data)
      const base64 = btoa(text)
      
      // 转发给所有协作者
      sessionClient.sendSerialData({
        source: 'device',
        data: base64,
        encoding: 'utf-8',
        timestamp: Date.now(),
      })
      
      // 更新统计
      set((state) => ({
        stats: {
          ...state.stats,
          totalDataSent: state.stats.totalDataSent + data.length,
        },
      }))
    }
    
    serialManager.addDataListener(listener)
    set({ dataListener: listener })
  },
  
  /**
   * 清空统计
   */
  /**
   * 更新设备连接状态
   */
  updateDeviceStatus: (hasDevice: boolean) => {
    const currentUserId = get().currentUserId
    
    // 更新本地状态
    set((state) => ({
      participants: state.participants.map(p =>
        p.id === currentUserId ? { ...p, hasDevice } : p
      ),
    }))
    
    // 通知其他参与者
    if (get().sessionId) {
      sessionClient.sendMessage('device_status_changed', {
        userId: currentUserId,
        hasDevice,
        timestamp: Date.now(),
      })
    }
  },

  clearStats: () => {
    set({
      stats: {
        sessionStartTime: null,
        totalDataSent: 0,
        totalDataReceived: 0,
        sendPermissionChanges: 0,
      },
    })
  },
}))
