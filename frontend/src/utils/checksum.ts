/**
 * 校验码计算工具
 */

/**
 * 校验码类型
 */
export type ChecksumType = 'CRC16-Modbus' | 'CRC16-CCITT' | 'CRC8' | 'XOR' | 'Checksum' | 'BCC' | 'LRC'

/**
 * 字符串转字节数组
 */
function stringToBytes(str: string): number[] {
  return Array.from(new TextEncoder().encode(str))
}

/**
 * 十六进制字符串转字节数组
 */
function hexToBytes(hex: string): number[] {
  const cleaned = hex.replace(/\s+/g, '')
  const bytes: number[] = []
  
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes.push(parseInt(cleaned.substr(i, 2), 16))
  }
  
  return bytes
}

/**
 * 字节数组转十六进制字符串
 */
function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
}

/**
 * CRC16-Modbus 计算
 */
function calculateCRC16Modbus(data: number[]): number[] {
  let crc = 0xffff

  for (const byte of data) {
    crc ^= byte

    for (let i = 0; i < 8; i++) {
      if (crc & 0x0001) {
        crc = (crc >> 1) ^ 0xa001
      } else {
        crc = crc >> 1
      }
    }
  }

  // 低字节在前
  return [crc & 0xff, (crc >> 8) & 0xff]
}

/**
 * CRC16-CCITT 计算
 */
function calculateCRC16CCITT(data: number[]): number[] {
  let crc = 0xffff

  for (const byte of data) {
    crc ^= byte << 8

    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc = crc << 1
      }
    }
  }

  crc &= 0xffff
  return [(crc >> 8) & 0xff, crc & 0xff]
}

/**
 * CRC8 计算
 */
function calculateCRC8(data: number[]): number[] {
  let crc = 0

  for (const byte of data) {
    crc ^= byte

    for (let i = 0; i < 8; i++) {
      if (crc & 0x80) {
        crc = (crc << 1) ^ 0x07
      } else {
        crc = crc << 1
      }
    }
  }

  return [crc & 0xff]
}

/**
 * XOR 校验
 */
function calculateXOR(data: number[]): number[] {
  let xor = 0
  
  for (const byte of data) {
    xor ^= byte
  }
  
  return [xor]
}

/**
 * 简单校验和（所有字节相加）
 */
function calculateSimpleChecksum(data: number[]): number[] {
  let sum = 0
  
  for (const byte of data) {
    sum += byte
  }
  
  return [sum & 0xff]
}

/**
 * BCC 校验（异或校验）
 */
function calculateBCC(data: number[]): number[] {
  return calculateXOR(data)
}

/**
 * LRC 校验（纵向冗余校验）
 */
function calculateLRC(data: number[]): number[] {
  let lrc = 0
  
  for (const byte of data) {
    lrc = (lrc + byte) & 0xff
  }
  
  lrc = ((lrc ^ 0xff) + 1) & 0xff
  return [lrc]
}

/**
 * 计算校验码
 */
export function calculateChecksum(data: number[], type: ChecksumType): number[] {
  switch (type) {
    case 'CRC16-Modbus':
      return calculateCRC16Modbus(data)
    case 'CRC16-CCITT':
      return calculateCRC16CCITT(data)
    case 'CRC8':
      return calculateCRC8(data)
    case 'XOR':
      return calculateXOR(data)
    case 'Checksum':
      return calculateSimpleChecksum(data)
    case 'BCC':
      return calculateBCC(data)
    case 'LRC':
      return calculateLRC(data)
    default:
      throw new Error(`不支持的校验码类型: ${type}`)
  }
}

/**
 * 为命令添加校验码
 * @param command 原始命令
 * @param checksumType 校验码类型
 * @param encoding 编码格式（'text' 或 'hex'）
 * @returns 添加校验码后的命令
 */
export function addChecksum(command: string, checksumType: ChecksumType, encoding: 'text' | 'hex'): string {
  if (!command.trim()) {
    return command
  }

  // 将命令转换为字节数组
  const bytes = encoding === 'hex' ? hexToBytes(command) : stringToBytes(command)

  // 计算校验码
  const checksum = calculateChecksum(bytes, checksumType)

  // 追加校验码
  if (encoding === 'hex') {
    return command + ' ' + bytesToHex(checksum)
  } else {
    return command + String.fromCharCode(...checksum)
  }
}

/**
 * 验证数据的校验码
 * @param data 包含校验码的完整数据
 * @param checksumType 校验码类型
 * @param encoding 编码格式（'text' 或 'hex'）
 * @returns { valid: boolean, checksumPart: string, dataPart: string } 验证结果、校验码部分、数据部分
 */
export function verifyChecksum(
  data: string,
  checksumType: ChecksumType,
  encoding: 'text' | 'hex'
): { valid: boolean; checksumPart: string; dataPart: string } {
  if (!data.trim()) {
    return { valid: true, checksumPart: '', dataPart: data }
  }

  try {
    // 获取校验码长度
    const checksumLength = getChecksumLength(checksumType)
    
    if (encoding === 'hex') {
      // HEX模式：校验码是最后N个字节的十六进制表示
      const parts = data.trim().split(/\s+/)
      if (parts.length < checksumLength) {
        return { valid: false, checksumPart: '', dataPart: data }
      }
      
      const checksumPart = parts.slice(-checksumLength).join(' ')
      const dataPart = parts.slice(0, -checksumLength).join(' ')
      
      // 计算数据部分的校验码
      const dataBytes = hexToBytes(dataPart)
      const expectedChecksum = calculateChecksum(dataBytes, checksumType)
      const expectedChecksumHex = bytesToHex(expectedChecksum)
      
      const valid = checksumPart.toUpperCase() === expectedChecksumHex.toUpperCase()
      
      return {
        valid,
        checksumPart,
        dataPart,
      }
    } else {
      // ASCII模式：校验码是最后N个字符
      if (data.length < checksumLength) {
        return { valid: false, checksumPart: '', dataPart: data }
      }
      
      const checksumPart = data.slice(-checksumLength)
      const dataPart = data.slice(0, -checksumLength)
      
      // 计算数据部分的校验码
      const dataBytes = stringToBytes(dataPart)
      const expectedChecksum = calculateChecksum(dataBytes, checksumType)
      const expectedChecksumStr = String.fromCharCode(...expectedChecksum)
      
      const valid = checksumPart === expectedChecksumStr
      
      return {
        valid,
        checksumPart,
        dataPart,
      }
    }
  } catch (error) {
    console.error('校验码验证错误:', error)
    return { valid: false, checksumPart: '', dataPart: data }
  }
}

/**
 * 获取校验码的字节长度
 */
function getChecksumLength(type: ChecksumType): number {
  switch (type) {
    case 'CRC16-Modbus':
    case 'CRC16-CCITT':
      return 2
    case 'CRC8':
    case 'XOR':
    case 'Checksum':
    case 'BCC':
    case 'LRC':
      return 1
    default:
      return 1
  }
}

