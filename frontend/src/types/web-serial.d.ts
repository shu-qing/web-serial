// Web Serial API 类型定义
// https://developer.mozilla.org/en-US/docs/Web/API/Serial

interface SerialPort {
  readable: ReadableStream<Uint8Array> | null
  writable: WritableStream<Uint8Array> | null
  
  open(options: SerialOptions): Promise<void>
  close(): Promise<void>
  
  getSignals(): Promise<SerialPortSignals>
  setSignals(signals?: SerialPortSetSignals): Promise<void>
  
  getInfo(): SerialPortInfo
  
  forget(): Promise<void>
  
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void
  
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void
}

interface SerialOptions {
  baudRate: number
  dataBits?: 7 | 8
  stopBits?: 1 | 1.5 | 2
  parity?: 'none' | 'even' | 'odd' | 'mark' | 'space'
  bufferSize?: number
  flowControl?: 'none' | 'hardware'
}

interface SerialPortInfo {
  usbVendorId?: number
  usbProductId?: number
}

interface SerialPortSignals {
  dataCarrierDetect: boolean
  clearToSend: boolean
  ringIndicator: boolean
  dataSetReady: boolean
}

interface SerialPortSetSignals {
  dataTerminalReady?: boolean
  requestToSend?: boolean
  break?: boolean
  dtr?: boolean
  rts?: boolean
}

interface SerialPortFilter {
  usbVendorId?: number
  usbProductId?: number
}

interface SerialPortRequestOptions {
  filters?: SerialPortFilter[]
}

interface Serial extends EventTarget {
  getPorts(): Promise<SerialPort[]>
  requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>
  
  addEventListener(
    type: 'connect' | 'disconnect',
    listener: (this: Serial, ev: Event) => any,
    options?: boolean | AddEventListenerOptions
  ): void
  
  removeEventListener(
    type: 'connect' | 'disconnect',
    listener: (this: Serial, ev: Event) => any,
    options?: boolean | EventListenerOptions
  ): void
}

interface Navigator {
  serial: Serial
}

// NodeJS 类型定义
declare namespace NodeJS {
  type Timeout = number
}

