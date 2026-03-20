/**
 * 会话共享 WebSocket 客户端
 * 独立的客户端，避免与智能桥接的 bridgeClient 冲突
 */

export interface SessionMessage {
  type: string
  payload?: unknown
  timestamp?: number
}

export interface SerialDataMessage {
  source: 'device' | 'manual'
  data: string // Base64 编码的数据
  encoding: 'utf-8' | 'hex'
  timestamp: number
}

export type SessionConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

export class SessionClient {
  private ws: WebSocket | null = null
  private roomCode: string = ''
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000
  private pingInterval: number | null = null
  private lastPongTime = 0
  
  // 自定义事件监听器
  private customEventListeners: Map<string, (payload: any) => void> = new Map()
  private onStateChange?: (state: SessionConnectionState) => void

  constructor() {
    // 初始化
  }

  /**
   * 连接到会话房间
   */
  connect(roomCode: string, serverUrl?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 如果已经连接到相同房间，不重复连接
        if (this.ws && this.roomCode === roomCode && this.ws.readyState === WebSocket.OPEN) {
          console.log('[SessionClient] Already connected to room:', roomCode)
          resolve()
          return
        }
        
        // 如果连接到不同房间，先断开旧连接
        if (this.ws && this.roomCode !== roomCode) {
          console.log('[SessionClient] Switching room from', this.roomCode, 'to', roomCode)
          this.disconnect()
        }
        
        this.roomCode = roomCode
        const wsUrl = serverUrl || this.getDefaultServerUrl()
        const url = `${wsUrl}?room=${roomCode}`
        
        console.log('[SessionClient] Connecting to room:', roomCode, 'URL:', url)

        this.onStateChange?.('connecting')
        
        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
          console.log('[SessionClient] Connected to server')
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
          console.error('[SessionClient] WebSocket error:', error)
          this.onStateChange?.('error')
          reject(new Error('WebSocket 连接失败'))
        }

        this.ws.onclose = () => {
          console.log('[SessionClient] Connection closed')
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
    
    this.roomCode = ''
    this.onStateChange?.('disconnected')
  }

  /**
   * 发送自定义消息
   */
  sendMessage(type: string, payload?: unknown) {
    console.log('[SessionClient] Sending message:', type, payload)
    this.send({
      type,
      payload,
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
   * 注册事件监听器
   */
  on(event: 'stateChange', callback: (state: SessionConnectionState) => void): void
  on(event: string, callback: (payload: any) => void): void
  on(event: string, callback: unknown): void {
    if (event === 'stateChange') {
      this.onStateChange = callback as (state: SessionConnectionState) => void
    } else {
      // 所有其他事件都作为自定义事件
      this.customEventListeners.set(event, callback as (payload: any) => void)
      console.log('[SessionClient] Registered event listener:', event)
    }
  }

  /**
   * 移除事件监听器
   */
  off(event: string): void {
    if (event === 'stateChange') {
      this.onStateChange = undefined
    } else {
      this.customEventListeners.delete(event)
      console.log('[SessionClient] Removed event listener:', event)
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
  private send(message: SessionMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const messageStr = JSON.stringify(message)
      console.log('[SessionClient] Sending to server:', message.type, 'Room:', this.roomCode)
      this.ws.send(messageStr)
    } else {
      console.warn('[SessionClient] Cannot send message: not connected', {
        hasWs: !!this.ws,
        readyState: this.ws?.readyState,
        roomCode: this.roomCode,
      })
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: string) {
    try {
      const message: SessionMessage = JSON.parse(data)
      console.log('[SessionClient] Received message type:', message.type)

      // 特殊处理的消息类型
      if (message.type === 'ping') {
        // 忽略，由心跳机制处理
        return
      }
      
      if (message.type === 'pong') {
        this.lastPongTime = Date.now()
        return
      }
      
      if (message.type === 'notification') {
        console.log('[SessionClient] Received notification:', message.payload)
        return
      }
      
      // 处理串口数据
      if (message.type === 'serial_data') {
        const listener = this.customEventListeners.get('data')
        if (listener) {
          listener(message.payload)
        }
        return
      }
      
      // 处理其他自定义事件
      const customListener = this.customEventListeners.get(message.type)
      if (customListener) {
        console.log('[SessionClient] Handling custom event:', message.type, message.payload)
        customListener(message.payload)
      } else {
        console.warn('[SessionClient] No listener for message type:', message.type)
      }
    } catch (error) {
      console.error('[SessionClient] Failed to parse message:', error)
    }
  }

  /**
   * 启动心跳
   */
  private startPing() {
    this.stopPing()
    this.lastPongTime = Date.now()
    
    this.pingInterval = window.setInterval(() => {
      // 检查心跳超时（15秒）
      if (Date.now() - this.lastPongTime > 15000) {
        console.warn('[SessionClient] Ping timeout, reconnecting...')
        this.disconnect()
        this.attemptReconnect()
        return
      }
      
      // 发送心跳
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({
          type: 'ping',
          payload: { timestamp: Date.now() },
        })
      }
    }, 5000)
  }

  /**
   * 停止心跳
   */
  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  /**
   * 尝试重连
   */
  private attemptReconnect() {
    this.reconnectAttempts++
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 16000)
    
    console.log(`[SessionClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    setTimeout(() => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.connect(this.roomCode).catch((error) => {
          console.error('[SessionClient] Reconnect failed:', error)
        })
      } else {
        console.error('[SessionClient] Max reconnect attempts reached')
      }
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
export const sessionClient = new SessionClient()

