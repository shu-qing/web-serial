/**
 * 串口管理器
 * 统一管理真实串口和虚拟串口
 */

import { WebSerialPort, VirtualSerialPort } from './serial'
import { SerialConfig, DeviceInfo, VirtualSerialMode } from '@/types'

export class SerialManager {
  private realPort: WebSerialPort | null = null
  private virtualPort: VirtualSerialPort | null = null
  private currentDevice: DeviceInfo | null = null
  private readCallback: ((data: Uint8Array) => void) | null = null
  private dataListeners: Array<(data: Uint8Array) => void> = []
  private isReading = false

  /**
   * 获取可用设备列表（真实设备 + 虚拟设备）
   */
  async getAvailableDevices(): Promise<DeviceInfo[]> {
    const devices: DeviceInfo[] = []

    // 添加虚拟设备（总是可用）
    devices.push({
      id: 'virtual-echo',
      type: 'virtual',
      name: '虚拟串口（回显模式）',
      description: '发送什么返回什么，用于基础测试',
      mode: 'echo',
    })

    devices.push({
      id: 'virtual-at',
      type: 'virtual',
      name: '虚拟串口（AT 命令模式）',
      description: '模拟 AT 命令响应，用于调试通信模块',
      mode: 'at_command',
    })

    devices.push({
      id: 'virtual-sensor',
      type: 'virtual',
      name: '虚拟串口（传感器模拟）',
      description: '自动发送模拟传感器数据，用于测试数据接收',
      mode: 'sensor',
    })

    // 获取真实串口设备
    if (WebSerialPort.isSupported()) {
      try {
        const ports = await navigator.serial.getPorts()
        for (let i = 0; i < ports.length; i++) {
          const port = ports[i]
          const info = port.getInfo()
          
          devices.push({
            id: `real-${i}`,
            type: 'real',
            name: this.getPortName(info),
            description: this.getPortDescription(info),
            port,
            info,
          })
        }
      } catch (error) {
        console.error('Failed to get serial ports:', error)
      }
    }

    return devices
  }

  /**
   * 请求新的串口设备（浏览器对话框）
   */
  async requestNewDevice(): Promise<DeviceInfo | null> {
    if (!WebSerialPort.isSupported()) {
      throw new Error('浏览器不支持 Web Serial API')
    }

    try {
      const port = await navigator.serial.requestPort()
      const info = port.getInfo()

      return {
        id: `real-${Date.now()}`,
        type: 'real',
        name: this.getPortName(info),
        description: this.getPortDescription(info),
        port,
        info,
      }
    } catch (error) {
      console.error('User cancelled device selection:', error)
      return null
    }
  }

  /**
   * 连接到指定设备
   */
  async connect(device: DeviceInfo, config: SerialConfig): Promise<void> {
    // 先断开现有连接
    await this.disconnect()

    this.currentDevice = device

    if (device.type === 'virtual') {
      await this.connectVirtual(device, config)
    } else {
      await this.connectReal(device, config)
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    this.isReading = false

    if (this.realPort) {
      await this.realPort.close()
      this.realPort = null
    }

    if (this.virtualPort) {
      await this.virtualPort.close()
      this.virtualPort = null
    }

    this.currentDevice = null
    this.readCallback = null
    // 注意：不清理 dataListeners，因为 testExecutor 等可能需要持续监听
  }

  /**
   * 发送数据
   */
  async write(data: string | Uint8Array): Promise<void> {
    if (this.realPort) {
      await this.realPort.write(data)
    } else if (this.virtualPort) {
      await this.virtualPort.write(data)
    } else {
      throw new Error('未连接到设备')
    }
  }

  /**
   * 设置数据接收回调（主回调）
   */
  onData(callback: (data: Uint8Array) => void): void {
    this.readCallback = callback
  }

  /**
   * 添加额外的数据监听器（不覆盖主回调）
   */
  addDataListener(listener: (data: Uint8Array) => void): void {
    if (!this.dataListeners.includes(listener)) {
      this.dataListeners.push(listener)
    }
  }

  /**
   * 移除数据监听器
   */
  removeDataListener(listener: (data: Uint8Array) => void): void {
    const index = this.dataListeners.indexOf(listener)
    if (index > -1) {
      this.dataListeners.splice(index, 1)
    }
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    if (this.realPort) {
      return this.realPort.isConnected()
    }
    if (this.virtualPort) {
      return this.virtualPort.isConnected()
    }
    return false
  }

  /**
   * 获取当前设备信息
   */
  getCurrentDevice(): DeviceInfo | null {
    return this.currentDevice
  }

  /**
   * 获取当前端口实例（用于测试执行等高级功能）
   */
  getCurrentPort(): WebSerialPort | VirtualSerialPort | null {
    return this.realPort || this.virtualPort
  }

  /**
   * 设置虚拟串口模式（仅虚拟设备）
   */
  setVirtualMode(mode: VirtualSerialMode): void {
    if (this.virtualPort) {
      this.virtualPort.setMode(mode)
    }
  }

  /**
   * 添加自定义响应（仅虚拟设备）
   */
  addCustomResponse(pattern: string | RegExp, response: string): void {
    if (this.virtualPort) {
      this.virtualPort.addCustomResponse(pattern, response)
    }
  }

  /**
   * 连接到真实串口
   */
  private async connectReal(device: DeviceInfo, config: SerialConfig): Promise<void> {
    if (!device.port) {
      throw new Error('设备端口不存在')
    }

    this.realPort = new WebSerialPort()
    await this.realPort.open(device.port, config)

    // 启动数据读取
    this.isReading = true
    this.startReading()
  }

  /**
   * 连接到虚拟串口
   */
  private async connectVirtual(device: DeviceInfo, _config: SerialConfig): Promise<void> {
    const virtualConfig: any = {
      mode: device.mode || 'echo',
      delay: 50,
    }

    // 传感器模式自动发送数据
    if (device.mode === 'sensor') {
      virtualConfig.autoSendInterval = 2000 // 每2秒发送一次
    }

    this.virtualPort = new VirtualSerialPort(virtualConfig)
    await this.virtualPort.open()

    // 设置数据接收回调
    this.virtualPort.onData((data) => {
      // 调用主回调
      if (this.readCallback) {
        this.readCallback(data)
      }
      
      // 通知所有额外的监听器
      this.dataListeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error('[SerialManager] Listener error:', error)
        }
      })
    })
  }

  /**
   * 启动数据读取（真实串口）
   */
  private async startReading(): Promise<void> {
    if (!this.realPort) return

    try {
      await this.realPort.read((data) => {
        if (this.isReading) {
          // 调用主回调
          if (this.readCallback) {
            this.readCallback(data)
          }
          
          // 通知所有额外的监听器
          this.dataListeners.forEach(listener => {
            try {
              listener(data)
            } catch (error) {
              console.error('[SerialManager] Listener error:', error)
            }
          })
        }
      })
    } catch (error) {
      console.error('Read error:', error)
      if (this.isReading) {
        // 连接断开，触发错误处理
        this.isReading = false
      }
    }
  }

  /**
   * 获取端口名称
   */
  private getPortName(info: SerialPortInfo): string {
    if (info.usbVendorId && info.usbProductId) {
      return `USB Serial Device (VID: 0x${info.usbVendorId.toString(16).toUpperCase()})`
    }
    return 'Serial Device'
  }

  /**
   * 获取端口描述
   */
  private getPortDescription(info: SerialPortInfo): string {
    const parts: string[] = []
    
    if (info.usbVendorId) {
      parts.push(`VID: 0x${info.usbVendorId.toString(16).toUpperCase()}`)
    }
    
    if (info.usbProductId) {
      parts.push(`PID: 0x${info.usbProductId.toString(16).toUpperCase()}`)
    }

    return parts.length > 0 ? parts.join(', ') : '真实串口设备'
  }
}

// 导出单例
export const serialManager = new SerialManager()

