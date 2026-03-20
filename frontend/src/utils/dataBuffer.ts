/**
 * 数据缓冲管理器
 * 实现混合分割策略：优先换行符分割，超时强制分割
 */

/**
 * 合并两个 Uint8Array
 */
function mergeUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length + b.length)
  result.set(a, 0)
  result.set(b, a.length)
  return result
}

/**
 * 查找换行符位置
 * 支持三种换行符：\r\n (Windows), \n (Unix/Linux), \r (Mac旧)
 * @returns 换行符的结束位置，未找到返回 -1
 */
function findLineBreak(data: Uint8Array): number {
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 0x0A) {  // \n (LF)
      return i
    }
    if (data[i] === 0x0D) {  // \r (CR)
      // 检查下一个是否是 \n，形成 \r\n
      if (i + 1 < data.length && data[i + 1] === 0x0A) {
        return i + 1  // \r\n，返回 \n 的位置
      }
      return i  // 单独的 \r
    }
  }
  return -1  // 未找到换行符
}

/**
 * 数据缓冲器类
 * 负责智能分割串口接收的数据流
 */
export class DataBuffer {
  private buffer: Uint8Array = new Uint8Array()
  private timer: NodeJS.Timeout | null = null
  private readonly timeout: number

  /**
   * @param onLine 输出完整行的回调函数
   * @param timeout 超时时间（毫秒），默认 100ms
   */
  constructor(
    private onLine: (data: Uint8Array) => void,
    timeout: number = 100
  ) {
    this.timeout = timeout
  }

  /**
   * 追加新数据到缓冲区
   * 核心逻辑：优先按换行符分割，无换行符则等待超时
   */
  append(data: Uint8Array): void {
    // 合并新数据到缓冲区
    this.buffer = mergeUint8Arrays(this.buffer, data)

    // 持续检查并输出所有完整行
    let lineBreakPos = findLineBreak(this.buffer)
    
    while (lineBreakPos !== -1) {
      // 找到换行符，输出完整行（包含换行符）
      const line = this.buffer.slice(0, lineBreakPos + 1)
      this.onLine(line)

      // 保留换行符之后的数据
      this.buffer = this.buffer.slice(lineBreakPos + 1)

      // 继续检查剩余数据是否还有换行符
      lineBreakPos = findLineBreak(this.buffer)
    }

    // 如果缓冲区还有数据但没有换行符
    if (this.buffer.length > 0) {
      // 重置超时定时器
      this.resetTimer()
    } else {
      // 缓冲区为空，清除定时器
      this.clearTimer()
    }
  }

  /**
   * 强制输出缓冲区内容（超时触发）
   */
  private flush(): void {
    if (this.buffer.length > 0) {
      this.onLine(this.buffer)
      this.buffer = new Uint8Array()
    }
    this.clearTimer()
  }

  /**
   * 重置超时定时器
   */
  private resetTimer(): void {
    this.clearTimer()
    this.timer = setTimeout(() => {
      this.flush()
    }, this.timeout)
  }

  /**
   * 清除定时器
   */
  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  /**
   * 清空缓冲区和定时器
   * 用于断开连接或组件卸载时
   */
  clear(): void {
    this.clearTimer()
    
    // 如果缓冲区有剩余数据，强制输出
    if (this.buffer.length > 0) {
      this.onLine(this.buffer)
      this.buffer = new Uint8Array()
    }
  }

  /**
   * 获取当前缓冲区大小
   */
  getBufferSize(): number {
    return this.buffer.length
  }
}

