/**
 * 智能桥接 WebSocket 客户端
 * 用于建立用户间的数据桥接连接
 */

export interface BridgeMessage {
  type: 'device_status' | 'serial_data' | 'ping' | 'pong' | 'notification' | 'error' | 'bridge_request' | 'bridge_approve' | 'bridge_reject' | 'bridge_cancel' | 'bridge_disconnect'
  payload?: unknown
  timestamp?: number
  from?: string
}

export interface DeviceStatus {
  hasDevice: boolean
  deviceInfo?: {
    name: string
    type?: string
    baudRate?: number
  }
}

export interface SerialDataMessage {
  source: 'device' | 'manual'
  data: string // Base64 编码的数据
  encoding: 'utf-8' | 'hex'
  timestamp: number
}

export type BridgeConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

export class BridgeClient {
  private ws: WebSocket | null = null
  private connectionCode: string = ''
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000
  private pingInterval: number | null = null
  private lastPongTime = 0
  private visibilityChangeHandler: (() => void) | null = null
  
  // 事件回调
  private onStateChange?: (state: BridgeConnectionState) => void
  private onDeviceStatusReceived?: (status: DeviceStatus) => void
  private onDataReceived?: (data: SerialDataMessage) => void
  private onNotification?: (notification: unknown) => void
  private onError?: (error: string) => void
  
  // 自定义事件监听器（支持会话共享等扩展功能）
  private customEventListeners: Map<string, (payload: any) => void> = new Map()

  constructor() {
    // 初始化
  }

  /**
   * 连接到桥接服务器
   */
  connect(connectionCode: string, serverUrl?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.connectionCode = connectionCode
        const wsUrl = serverUrl || this.getDefaultServerUrl()
        const url = `${wsUrl}?room=${connectionCode}`
        
        console.log('[BridgeClient] Connecting to room:', connectionCode, 'URL:', url)

        this.onStateChange?.('connecting')
        
        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
          console.log('[BridgeClient] Connected to server')
          this.onStateChange?.('connected')
          this.reconnectAttempts = 0
          this.startPing()
          resolve()
        }

        this.ws.onmessage = async (event) => {
          // 处理Blob数据
          let data = event.data
          if (data instanceof Blob) {
            data = await data.text()
          }
          this.handleMessage(data)
        }

        this.ws.onerror = (error) => {
          console.error('[BridgeClient] WebSocket error:', error)
          this.onStateChange?.('error')
          this.onError?.('WebSocket 连接错误')
          reject(new Error('WebSocket 连接失败'))
        }

        this.ws.onclose = () => {
          console.log('[BridgeClient] Connection closed')
          this.onStateChange?.('disconnected')
          this.stopPing()
          
          // 尝试重连
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect()
          }
        }
      } catch (error) {
        this.onStateChange?.('error')
        reject(error)
      }
    })
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.reconnectAttempts = this.maxReconnectAttempts // 阻止自动重连
    this.stopPing()
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    this.onStateChange?.('disconnected')
  }

  /**
   * 发送设备状态
   */
  sendDeviceStatus(status: DeviceStatus) {
    this.send({
      type: 'device_status',
      payload: status,
      timestamp: Date.now(),
    })
  }

  /**
   * 发送串口数据
   */
  sendSerialData(data: SerialDataMessage) {
    this.send({
      type: 'serial_data',
      payload: data,
      timestamp: Date.now(),
    })
  }

  /**
   * 发送桥接申请
   */
  sendBridgeRequest(requesterInfo: { username: string; deviceStatus: DeviceStatus }) {
    console.log('[BridgeClient] Sending bridge request:', requesterInfo)
    const message = {
      type: 'bridge_request' as const,
      payload: requesterInfo,
      timestamp: Date.now(),
    }
    console.log('[BridgeClient] Bridge request message:', JSON.stringify(message))
    this.send(message)
  }

  /**
   * 批准桥接申请
   */
  sendBridgeApprove(approverDeviceStatus: DeviceStatus) {
    this.send({
      type: 'bridge_approve',
      payload: approverDeviceStatus,
      timestamp: Date.now(),
    })
  }

  /**
   * 拒绝桥接申请
   */
  sendBridgeReject(reason?: string) {
    this.send({
      type: 'bridge_reject',
      payload: { reason },
      timestamp: Date.now(),
    })
  }

  /**
   * 取消桥接申请
   */
  sendBridgeCancel() {
    this.send({
      type: 'bridge_cancel',
      timestamp: Date.now(),
    })
  }

  /**
   * 通知对方断开桥接
   */
  sendBridgeDisconnect() {
    console.log('[BridgeClient] Sending bridge disconnect notification')
    this.send({
      type: 'bridge_disconnect',
      timestamp: Date.now(),
    })
  }

  /**
   * 发送自定义消息（用于会话共享等扩展功能）
   */
  sendCustomMessage(type: string, payload?: unknown) {
    console.log('[BridgeClient] Sending custom message:', type, payload)
    this.send({
      type: type as any,
      payload,
      timestamp: Date.now(),
    })
  }

  /**
   * 注册事件监听器
   */
  // 添加桥接申请相关的回调
  private onBridgeRequest?: (requester: { username: string; deviceStatus: DeviceStatus }) => void
  private onBridgeApprove?: (deviceStatus: DeviceStatus) => void
  private onBridgeReject?: (reason?: string) => void
  private onBridgeCancel?: () => void
  private onBridgeDisconnect?: () => void

  on(event: 'stateChange', callback: (state: BridgeConnectionState) => void): void
  on(event: 'deviceStatus', callback: (status: DeviceStatus) => void): void
  on(event: 'data', callback: (data: SerialDataMessage) => void): void
  on(event: 'notification', callback: (notification: unknown) => void): void
  on(event: 'error', callback: (error: string) => void): void
  on(event: 'bridgeRequest', callback: (requester: { username: string; deviceStatus: DeviceStatus }) => void): void
  on(event: 'bridgeApprove', callback: (deviceStatus: DeviceStatus) => void): void
  on(event: 'bridgeReject', callback: (reason?: string) => void): void
  on(event: 'bridgeCancel', callback: () => void): void
  on(event: 'bridgeDisconnect', callback: () => void): void
  on(event: string, callback: unknown): void {
    switch (event) {
      case 'stateChange':
        this.onStateChange = callback as (state: BridgeConnectionState) => void
        break
      case 'deviceStatus':
        this.onDeviceStatusReceived = callback as (status: DeviceStatus) => void
        break
      case 'data':
        this.onDataReceived = callback as (data: SerialDataMessage) => void
        break
      case 'notification':
        this.onNotification = callback as (notification: unknown) => void
        break
      case 'error':
        this.onError = callback as (error: string) => void
        break
      case 'bridgeRequest':
        this.onBridgeRequest = callback as (requester: { username: string; deviceStatus: DeviceStatus }) => void
        break
      case 'bridgeApprove':
        this.onBridgeApprove = callback as (deviceStatus: DeviceStatus) => void
        break
      case 'bridgeReject':
        this.onBridgeReject = callback as (reason?: string) => void
        break
      case 'bridgeCancel':
        this.onBridgeCancel = callback as () => void
        break
      case 'bridgeDisconnect':
        this.onBridgeDisconnect = callback as () => void
        break
      default:
        // 自定义事件（如 participant_joined, send_permission_changed 等）
        this.customEventListeners.set(event, callback as (payload: any) => void)
        console.log('[BridgeClient] Registered custom event listener:', event)
        break
    }
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  /**
   * 发送消息
   */
  private send(message: BridgeMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('[BridgeClient] Cannot send message: not connected')
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: string) {
    try {
      const message: BridgeMessage = JSON.parse(data)
      
      // 只记录重要消息，避免日志过多影响性能
      if (message.type !== 'pong' && message.type !== 'serial_data') {
        console.log('[BridgeClient] Received message type:', message.type)
      }

      switch (message.type) {
        case 'device_status':
          this.onDeviceStatusReceived?.(message.payload as DeviceStatus)
          break
          
        case 'serial_data':
          this.onDataReceived?.(message.payload as SerialDataMessage)
          break
          
        case 'pong':
          this.lastPongTime = Date.now()
          console.log('[BridgeClient] Received pong, updated lastPongTime')
          break
          
        case 'notification': {
          if (this.onNotification && message.payload) {
            // 类型安全的payload传递
            this.onNotification(message.payload as Record<string, unknown>)
          }
          break
        }
          
        case 'error': {
          const errorPayload = message.payload as { message?: string } | undefined
          this.onError?.(errorPayload?.message || '未知错误')
          break
        }

        case 'bridge_request':
          console.log('[BridgeClient] Received bridge_request message:', message.payload)
          if (this.onBridgeRequest && message.payload) {
            console.log('[BridgeClient] Calling onBridgeRequest callback')
            this.onBridgeRequest(message.payload as { username: string; deviceStatus: DeviceStatus })
          } else {
            console.warn('[BridgeClient] No onBridgeRequest callback registered or no payload')
          }
          break

        case 'bridge_approve':
          if (this.onBridgeApprove && message.payload) {
            this.onBridgeApprove(message.payload as DeviceStatus)
          }
          break

        case 'bridge_reject': {
          const rejectPayload = message.payload as { reason?: string } | undefined
          if (this.onBridgeReject) {
            this.onBridgeReject(rejectPayload?.reason)
          }
          break
        }

        case 'bridge_cancel':
          if (this.onBridgeCancel) {
            this.onBridgeCancel()
          }
          break

        case 'bridge_disconnect':
          console.log('[BridgeClient] Received bridge disconnect notification')
          if (this.onBridgeDisconnect) {
            this.onBridgeDisconnect()
          }
          break
          
        default: {
          // 处理自定义事件
          const customListener = this.customEventListeners.get(message.type)
          if (customListener) {
            console.log('[BridgeClient] Handling custom event:', message.type, message.payload)
            customListener(message.payload)
          } else {
            console.warn('[BridgeClient] Unknown message type:', message.type)
          }
          break
        }
      }
    } catch (error) {
      console.error('[BridgeClient] Failed to parse message:', error)
    }
  }

  /**
   * 启动心跳
   */
  private startPing() {
    this.stopPing()
    this.lastPongTime = Date.now()
    
    // 监听页面可见性变化
    this.visibilityChangeHandler = () => {
      if (document.visibilityState === 'visible') {
        // 页面重新可见时，重置心跳时间，避免误判超时
        console.log('[BridgeClient] Page became visible, resetting lastPongTime')
        this.lastPongTime = Date.now()
      }
    }
    document.addEventListener('visibilitychange', this.visibilityChangeHandler)
    
    this.pingInterval = window.setInterval(() => {
      // 如果页面不可见，跳过心跳检查（避免后台限流导致的误判）
      if (document.visibilityState === 'hidden') {
        console.log('[BridgeClient] Page hidden, skipping ping')
        this.lastPongTime = Date.now() // 重置时间，避免恢复后立即超时
        return
      }
      
      const timeSinceLastPong = Date.now() - this.lastPongTime
      
      // 检查心跳超时（60秒）- 给后端足够的响应时间
      if (timeSinceLastPong > 60000) {
        console.warn('[BridgeClient] Ping timeout, reconnecting...', {
          timeSinceLastPong,
          lastPongTime: new Date(this.lastPongTime).toISOString()
        })
        // 关闭当前连接
        if (this.ws) {
          this.ws.close()
        }
        // attemptReconnect 会在 onclose 中自动触发
        return
      }
      
      // 发送心跳
      console.log('[BridgeClient] Sending ping, time since last pong:', timeSinceLastPong, 'ms')
      this.send({
        type: 'ping',
        payload: { timestamp: Date.now() },
      })
    }, 5000) // 每5秒发送一次心跳
  }

  /**
   * 停止心跳
   */
  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
    
    // 移除页面可见性监听
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler)
      this.visibilityChangeHandler = null
    }
  }

  /**
   * 尝试重连
   */
  private attemptReconnect() {
    // 检查是否已超过最大重连次数
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[BridgeClient] Max reconnect attempts reached')
      this.onError?.('连接已断开，重连失败')
      return
    }
    
    this.reconnectAttempts++
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 16000)
    
    console.log(`[BridgeClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    setTimeout(() => {
      this.connect(this.connectionCode).catch((error) => {
        console.error('[BridgeClient] Reconnect failed:', error)
      })
    }, delay)
  }

  /**
   * 获取默认服务器地址
   */
  private getDefaultServerUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = import.meta.env.VITE_WS_PORT || '3001'
    return `${protocol}//${host}:${port}/ws/signal`
  }
}

// 单例
export const bridgeClient = new BridgeClient()

