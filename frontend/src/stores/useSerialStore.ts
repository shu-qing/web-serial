import { create } from 'zustand'
import { SerialConfig, LogEntry, SerialStats, DeviceInfo } from '@/types'
import { DEFAULT_SERIAL_CONFIG } from '@/utils/constants'
import { serialManager } from '@/lib/serialManager'
import { ChecksumType } from '@/utils/checksum'

interface SerialStore {
  // 连接状态
  port: SerialPort | null
  isConnected: boolean
  config: SerialConfig
  currentDevice: DeviceInfo | null
  deviceName: string | null
  
  // 数据
  receiveBuffer: LogEntry[]
  sendHistory: string[]
  
  // 统计
  stats: SerialStats
  
  // 配置
  encoding: 'utf-8' | 'hex'
  lineEnding: 'none' | 'cr' | 'lf' | 'crlf'
  showTimestamp: boolean
  autoWrap: boolean
  checksumVerifyEnabled: boolean
  checksumVerifyType: ChecksumType
  
  // 状态栏消息
  statusMessage: string
  statusMessageType: 'info' | 'success' | 'warning' | 'error'
  
  // Actions
  setPort: (port: SerialPort | null) => void
  setConnected: (connected: boolean) => void
  setConfig: (config: Partial<SerialConfig>) => void
  setCurrentDevice: (device: DeviceInfo | null) => void
  addLogEntry: (entry: LogEntry) => void
  clearBuffer: () => void
  addSendHistory: (data: string) => void
  updateStats: (stats: Partial<SerialStats>) => void
  setEncoding: (encoding: 'utf-8' | 'hex') => void
  setLineEnding: (ending: 'none' | 'cr' | 'lf' | 'crlf') => void
  setShowTimestamp: (show: boolean) => void
  setAutoWrap: (wrap: boolean) => void
  setChecksumVerifyEnabled: (enabled: boolean) => void
  setChecksumVerifyType: (type: ChecksumType) => void
  setStatusMessage: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void
  toggleTimestamp: () => void
  toggleAutoWrap: () => void
  
  // 连接方法
  connect: () => Promise<void>
  connectVirtual: (device: DeviceInfo) => Promise<void>
  disconnect: () => Promise<void>
}

export const useSerialStore = create<SerialStore>((set, get) => ({
  // 初始状态
  port: null,
  isConnected: false,
  config: DEFAULT_SERIAL_CONFIG,
  currentDevice: null,
  deviceName: null,
  receiveBuffer: [],
  sendHistory: [],
  stats: {
    rxBytes: 0,
    txBytes: 0,
    rxRate: 0,
    txRate: 0,
    lines: 0,
    connectedTime: 0,
  },
  encoding: 'utf-8',
  lineEnding: 'none',
  showTimestamp: true,
  autoWrap: true,
  checksumVerifyEnabled: false,
  checksumVerifyType: 'CRC16-Modbus',
  statusMessage: '就绪',
  statusMessageType: 'info',

  // Actions
  setPort: (port) => set({ port }),
  
  setConnected: (connected) => {
    set({ isConnected: connected })
    
    // 如果在会话中，通知其他参与者设备状态变化
    // 动态导入避免循环依赖
    import('./useSessionStore').then(({ useSessionStore }) => {
      const sessionStore = useSessionStore.getState()
      if (sessionStore.sessionId && typeof (sessionStore as any).updateDeviceStatus === 'function') {
        (sessionStore as any).updateDeviceStatus(connected)
      }
    }).catch(() => {
      // 忽略错误，会话功能可能未初始化
    })
  },
  
  setConfig: (newConfig) =>
    set((state) => ({
      config: { ...state.config, ...newConfig },
    })),

  setCurrentDevice: (device) => set({ currentDevice: device }),
  
  addLogEntry: (entry) =>
    set((state) => ({
      receiveBuffer: [...state.receiveBuffer, entry],
      stats: {
        ...state.stats,
        lines: state.stats.lines + 1,
        rxBytes: entry.direction === 'receive' 
          ? state.stats.rxBytes + entry.bytes 
          : state.stats.rxBytes,
        txBytes: entry.direction === 'send' 
          ? state.stats.txBytes + entry.bytes 
          : state.stats.txBytes,
      },
    })),
  
  clearBuffer: () =>
    set({
      receiveBuffer: [],
      stats: {
        rxBytes: 0,
        txBytes: 0,
        rxRate: 0,
        txRate: 0,
        lines: 0,
        connectedTime: 0,
      },
    }),
  
  addSendHistory: (data) =>
    set((state) => ({
      sendHistory: [data, ...state.sendHistory].slice(0, 100),
    })),
  
  updateStats: (newStats) =>
    set((state) => ({
      stats: { ...state.stats, ...newStats },
    })),
  
  setEncoding: (encoding) => set({ encoding }),
  
  setLineEnding: (ending) => set({ lineEnding: ending }),
  
  setShowTimestamp: (show) => set({ showTimestamp: show }),
  
  setAutoWrap: (wrap) => set({ autoWrap: wrap }),
  
  setChecksumVerifyEnabled: (enabled) => set({ checksumVerifyEnabled: enabled }),
  
  setChecksumVerifyType: (type) => set({ checksumVerifyType: type }),
  
  setStatusMessage: (message, type = 'info') => set({ 
    statusMessage: message, 
    statusMessageType: type 
  }),
  
  toggleTimestamp: () =>
    set((state) => ({ showTimestamp: !state.showTimestamp })),
  
  toggleAutoWrap: () =>
    set((state) => ({ autoWrap: !state.autoWrap })),
  
  // 连接到设备
  connect: async () => {
    try {
      // 请求选择设备
      const device = await serialManager.requestNewDevice()
      
      if (!device) {
        // 用户取消选择
        return
      }
      
      // 获取当前配置
      const config = get().config
      
      // 连接设备
      await serialManager.connect(device, config)
      
      // 设置数据接收回调
      serialManager.onData((data) => {
        const decoder = new TextDecoder()
        const text = decoder.decode(data)
        
        get().addLogEntry({
          id: Date.now().toString() + Math.random(),
          timestamp: new Date(),
          direction: 'receive',
          data: text,
          encoding: 'utf-8',
          bytes: data.length,
        })
      })
      
      // 更新状态
      set({
        isConnected: true,
        currentDevice: device,
        deviceName: device.name,
      })
      
      console.log('连接成功:', device.name)
    } catch (error) {
      console.error('连接失败:', error)
      alert('连接失败: ' + (error as Error).message)
    }
  },
  
  // 连接虚拟设备（不需要用户选择）
  connectVirtual: async (device: DeviceInfo) => {
    try {
      // 获取当前配置
      const config = get().config
      
      // 连接虚拟设备（内部会先 disconnect，清空 readCallback）
      await serialManager.connect(device, config)
      
      // ⚠️ 重要：必须在 connect 之后设置回调
      // 因为 connect() 内部会调用 disconnect() 清空 readCallback
      serialManager.onData((data) => {
        const decoder = new TextDecoder()
        const text = decoder.decode(data)
        
        get().addLogEntry({
          id: Date.now().toString() + Math.random(),
          timestamp: new Date(),
          direction: 'receive',
          data: text,
          encoding: 'utf-8',
          bytes: data.length,
        })
      })
      
      // 更新状态
      set({
        isConnected: true,
        currentDevice: device,
        deviceName: device.name,
      })
    } catch (error) {
      console.error('[Store] 虚拟设备连接失败:', error)
      throw error
    }
  },
  
  // 断开连接
  disconnect: async () => {
    try {
      await serialManager.disconnect()
      
      set({
        isConnected: false,
        currentDevice: null,
        deviceName: null,
      })
      
      console.log('已断开连接')
    } catch (error) {
      console.error('断开连接失败:', error)
      alert('断开连接失败: ' + (error as Error).message)
    }
  },
}))

