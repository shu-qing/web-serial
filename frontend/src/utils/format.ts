/**
 * 格式化工具函数
 */

import { format as formatDate } from 'date-fns'

/**
 * 格式化字节数
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * 格式化速率
 */
export function formatRate(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(date: Date, pattern = 'HH:mm:ss.SSS'): string {
  return formatDate(date, pattern)
}

/**
 * 格式化持续时间
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const parts = []
  if (hours > 0) parts.push(`${hours.toString().padStart(2, '0')}`)
  parts.push(`${minutes.toString().padStart(2, '0')}`)
  parts.push(`${secs.toString().padStart(2, '0')}`)

  return parts.join(':')
}

/**
 * 字符串转 HEX
 */
export function stringToHex(str: string): string {
  return Array.from(str)
    .map(char => char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))
    .join(' ')
}

/**
 * HEX 转字符串
 */
export function hexToString(hex: string): string {
  const hexArray = hex.replace(/\s/g, '').match(/.{1,2}/g) || []
  return hexArray.map(byte => String.fromCharCode(parseInt(byte, 16))).join('')
}

/**
 * 验证 HEX 格式
 */
export function isValidHex(hex: string): boolean {
  const cleanHex = hex.replace(/\s/g, '')
  return /^[0-9A-Fa-f]*$/.test(cleanHex) && cleanHex.length % 2 === 0
}

/**
 * 格式化行结束符
 */
export function formatLineEnding(text: string, ending: 'none' | 'cr' | 'lf' | 'crlf'): string {
  switch (ending) {
    case 'none':
      return text
    case 'cr':
      return text + '\r'
    case 'lf':
      return text + '\n'
    case 'crlf':
      return text + '\r\n'
    default:
      return text
  }
}

/**
 * 解析行结束符
 */
export function parseLineEnding(text: string): {
  content: string
  ending: 'none' | 'cr' | 'lf' | 'crlf'
} {
  if (text.endsWith('\r\n')) {
    return { content: text.slice(0, -2), ending: 'crlf' }
  } else if (text.endsWith('\n')) {
    return { content: text.slice(0, -1), ending: 'lf' }
  } else if (text.endsWith('\r')) {
    return { content: text.slice(0, -1), ending: 'cr' }
  }
  return { content: text, ending: 'none' }
}

/**
 * 格式化数字为千分位
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 下载文件
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Failed to copy:', err)
    return false
  }
}

/**
 * 截断文本
 */
export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - suffix.length) + suffix
}

