/**
 * Web Serial API 封装
 */

import { SerialConfig } from '@/types'

export class WebSerialPort {
  private port: SerialPort | null = null
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null
  private readableStreamClosed: Promise<void> | null = null
  private writableStreamClosed: Promise<void> | null = null

  /**
   * 检查浏览器是否支持 Web Serial API
   */
  static isSupported(): boolean {
    return 'serial' in navigator
  }

  /**
   * 请求用户选择串口设备
   */
  async requestPort(): Promise<SerialPort> {
    try {
      this.port = await navigator.serial.requestPort()
      return this.port
    } catch (error) {
      console.error('Failed to request serial port:', error)
      throw new Error('用户取消选择或设备不可用')
    }
  }

  /**
   * 获取已授权的串口设备列表
   */
  async getPorts(): Promise<SerialPort[]> {
    try {
      return await navigator.serial.getPorts()
    } catch (error) {
      console.error('Failed to get serial ports:', error)
      return []
    }
  }

  /**
   * 打开串口连接
   */
  async open(port: SerialPort, config: SerialConfig): Promise<void> {
    try {
      this.port = port

      await this.port.open({
        baudRate: config.baudRate,
        dataBits: config.dataBits,
        parity: config.parity,
        stopBits: config.stopBits,
        flowControl: config.flowControl,
        bufferSize: config.bufferSize,
      })

      // 设置读写流
      if (this.port.readable) {
        this.reader = this.port.readable.getReader()
      }

      if (this.port.writable) {
        this.writer = this.port.writable.getWriter()
      }

      console.log('Serial port opened successfully')
    } catch (error) {
      console.error('Failed to open serial port:', error)
      throw new Error('打开串口失败，请检查端口是否被占用')
    }
  }

  /**
   * 关闭串口连接
   */
  async close(): Promise<void> {
    try {
      // 取消读取器
      if (this.reader) {
        await this.reader.cancel()
        this.reader.releaseLock()
        this.reader = null
      }

      // 关闭写入器
      if (this.writer) {
        await this.writer.close()
        this.writer.releaseLock()
        this.writer = null
      }

      // 等待流关闭
      if (this.readableStreamClosed) {
        await this.readableStreamClosed
      }

      if (this.writableStreamClosed) {
        await this.writableStreamClosed
      }

      // 关闭端口
      if (this.port) {
        await this.port.close()
        this.port = null
      }

      console.log('Serial port closed successfully')
    } catch (error) {
      console.error('Failed to close serial port:', error)
      throw new Error('关闭串口失败')
    }
  }

  /**
   * 读取数据（持续监听）
   */
  async read(onData: (data: Uint8Array) => void): Promise<void> {
    if (!this.reader) {
      throw new Error('读取器未初始化')
    }

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await this.reader.read()

        if (done) {
          console.log('Reader has been canceled')
          break
        }

        if (value) {
          onData(value)
        }
      }
    } catch (error) {
      console.error('Read error:', error)
      throw error
    }
  }

  /**
   * 写入数据
   */
  async write(data: string | Uint8Array): Promise<void> {
    if (!this.writer) {
      throw new Error('写入器未初始化')
    }

    try {
      const uint8Array = typeof data === 'string' ? this.stringToUint8Array(data) : data

      await this.writer.write(uint8Array)
    } catch (error) {
      console.error('Write error:', error)
      throw new Error('发送数据失败')
    }
  }

  /**
   * 设置信号控制（DTR/RTS）
   */
  async setSignals(signals: { dtr?: boolean; rts?: boolean }): Promise<void> {
    if (!this.port) {
      throw new Error('串口未打开')
    }

    try {
      await this.port.setSignals(signals)
    } catch (error) {
      console.error('Failed to set signals:', error)
      throw new Error('设置信号失败')
    }
  }

  /**
   * 获取信号状态
   */
  async getSignals(): Promise<SerialPortSignals> {
    if (!this.port) {
      throw new Error('串口未打开')
    }

    try {
      return await this.port.getSignals()
    } catch (error) {
      console.error('Failed to get signals:', error)
      throw new Error('获取信号状态失败')
    }
  }

  /**
   * 获取串口信息
   */
  getInfo(): SerialPortInfo | null {
    if (!this.port) {
      return null
    }

    return this.port.getInfo()
  }

  /**
   * 检查串口是否已连接
   */
  isConnected(): boolean {
    return this.port !== null && this.reader !== null && this.writer !== null
  }

  /**
   * 字符串转 Uint8Array
   */
  private stringToUint8Array(str: string): Uint8Array {
    const encoder = new TextEncoder()
    return encoder.encode(str)
  }

  /**
   * Uint8Array 转字符串
   */
  static uint8ArrayToString(data: Uint8Array): string {
    const decoder = new TextDecoder()
    return decoder.decode(data)
  }

  /**
   * Uint8Array 转 HEX 字符串
   */
  static uint8ArrayToHex(data: Uint8Array): string {
    return Array.from(data)
      .map((byte) => byte.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ')
  }

  /**
   * HEX 字符串转 Uint8Array
   */
  static hexToUint8Array(hex: string): Uint8Array {
    const hexArray = hex.replace(/\s/g, '').match(/.{1,2}/g) || []
    return new Uint8Array(hexArray.map((byte) => parseInt(byte, 16)))
  }
}

/**
 * 虚拟串口（用于测试）
 */
export class VirtualSerialPort {
  private onDataCallback: ((data: Uint8Array) => void) | null = null
  private isOpen = false
  private mode: 'echo' | 'at_command' | 'sensor' | 'custom' = 'echo'
  private delay: number = 50
  private autoSendTimer: NodeJS.Timeout | null = null
  private autoSendInterval: number = 2000
  private customResponses: Map<string | RegExp, string> = new Map()
  private sensorDataIndex = 0

  constructor(config?: {
    mode?: 'echo' | 'at_command' | 'sensor' | 'custom'
    delay?: number
    autoSendInterval?: number
    customResponses?: Array<{ pattern: string | RegExp; response: string }>
  }) {
    if (config) {
      this.mode = config.mode || 'echo'
      this.delay = config.delay || 50
      this.autoSendInterval = config.autoSendInterval || 2000
      
      if (config.customResponses) {
        config.customResponses.forEach((rule) => {
          this.customResponses.set(rule.pattern, rule.response)
        })
      }
    }
  }

  async open(): Promise<void> {
    this.isOpen = true
    
    // 如果是传感器模式，在打开后启动自动发送
    if (this.mode === 'sensor') {
      this.startAutoSend(this.autoSendInterval)
    }
  }

  async close(): Promise<void> {
    this.isOpen = false
    this.onDataCallback = null
    this.stopAutoSend()
  }

  async write(data: string | Uint8Array): Promise<void> {
    if (!this.isOpen) {
      throw new Error('Virtual port is not open')
    }

    const dataStr = typeof data === 'string' ? data : WebSerialPort.uint8ArrayToString(data)
    
    // 根据模式生成响应
    setTimeout(() => {
      if (this.onDataCallback) {
        const response = this.generateResponse(dataStr)
        if (response) {
          const encoder = new TextEncoder()
          this.onDataCallback(encoder.encode(response))
        }
      }
    }, this.delay)
  }

  /**
   * 设置数据接收回调
   */
  onData(callback: (data: Uint8Array) => void): void {
    this.onDataCallback = callback
    
    // 如果是传感器模式且串口已打开，确保自动发送已启动
    if (this.mode === 'sensor' && this.isOpen && !this.autoSendTimer) {
      this.startAutoSend(this.autoSendInterval)
    }
  }

  /**
   * 设置模拟模式
   */
  setMode(mode: 'echo' | 'at_command' | 'sensor' | 'custom'): void {
    this.mode = mode
  }

  /**
   * 添加自定义响应规则
   */
  addCustomResponse(pattern: string | RegExp, response: string): void {
    this.customResponses.set(pattern, response)
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.isOpen
  }

  /**
   * 获取虚拟设备信息
   */
  getInfo(): { usbVendorId: number; usbProductId: number } {
    return {
      usbVendorId: 0x9999, // 虚拟设备 VID
      usbProductId: 0x0001, // 虚拟设备 PID
    }
  }

  /**
   * 生成响应数据
   */
  private generateResponse(input: string): string | null {
    switch (this.mode) {
      case 'echo':
        return input

      case 'at_command':
        return this.handleATCommand(input.trim())

      case 'sensor':
        // 传感器模式不响应输入，只自动发送数据
        return null

      case 'custom':
        return this.handleCustomResponse(input)

      default:
        return input
    }
  }

  /**
   * 处理 AT 命令
   */
  private handleATCommand(cmd: string): string {
    const upperCmd = cmd.toUpperCase()

    if (upperCmd === 'AT') {
      return 'OK\r\n'
    }

    if (upperCmd.startsWith('AT+')) {
      const command = upperCmd.substring(3)

      // 模拟常见 AT 命令
      switch (command) {
        case 'GMR':
          return '+GMR: Virtual Serial v1.0.0\r\nOK\r\n'
        
        case 'CGMI':
          return '+CGMI: Virtual Device Inc.\r\nOK\r\n'
        
        case 'CGMM':
          return '+CGMM: Virtual Serial Port\r\nOK\r\n'
        
        case 'CGSN':
          return '+CGSN: 123456789ABCDEF\r\nOK\r\n'
        
        case 'CSQ':
          return '+CSQ: 25,0\r\nOK\r\n'
        
        case 'CREG?':
          return '+CREG: 0,1\r\nOK\r\n'
        
        default:
          return 'OK\r\n'
      }
    }

    return 'ERROR\r\n'
  }

  /**
   * 处理自定义响应
   */
  private handleCustomResponse(input: string): string | null {
    for (const [pattern, response] of this.customResponses) {
      if (typeof pattern === 'string') {
        if (input.includes(pattern)) {
          return response
        }
      } else {
        if (pattern.test(input)) {
          return response
        }
      }
    }
    
    // 如果没有匹配的规则，返回回显
    return input
  }

  /**
   * 启动自动发送（传感器模式）
   */
  private startAutoSend(interval: number): void {
    this.stopAutoSend()
    
    this.autoSendTimer = setInterval(() => {
      if (this.isOpen && this.onDataCallback) {
        const data = this.generateSensorData()
        const encoder = new TextEncoder()
        this.onDataCallback(encoder.encode(data))
      }
    }, interval)
  }

  /**
   * 停止自动发送
   */
  private stopAutoSend(): void {
    if (this.autoSendTimer) {
      clearInterval(this.autoSendTimer)
      this.autoSendTimer = null
    }
  }

  /**
   * 生成传感器模拟数据
   */
  private generateSensorData(): string {
    this.sensorDataIndex++
    
    const temperature = (20 + Math.random() * 15).toFixed(2)
    const humidity = (40 + Math.random() * 40).toFixed(2)
    const pressure = (1000 + Math.random() * 50).toFixed(2)
    
    const timestamp = new Date().toISOString()
    
    return `[${timestamp}] Temp: ${temperature}°C, Humidity: ${humidity}%, Pressure: ${pressure}hPa\r\n`
  }
}

