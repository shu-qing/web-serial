/**
 * 验证工具函数
 */

import { SerialConfig } from '@/types'

/**
 * 验证邮箱格式
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 验证用户名格式
 */
export function isValidUsername(username: string): boolean {
  // 3-20个字符，字母数字下划线
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
  return usernameRegex.test(username)
}

/**
 * 验证密码强度
 */
export function isValidPassword(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('密码至少需要 8 个字符')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('密码需要包含小写字母')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('密码需要包含大写字母')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('密码需要包含数字')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 验证串口配置
 */
export function isValidSerialConfig(config: Partial<SerialConfig>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // 验证波特率
  if (config.baudRate !== undefined) {
    if (config.baudRate < 300 || config.baudRate > 4000000) {
      errors.push('波特率范围：300 - 4000000')
    }
  }

  // 验证数据位
  if (config.dataBits !== undefined) {
    if (![7, 8].includes(config.dataBits)) {
      errors.push('数据位必须是 7 或 8')
    }
  }

  // 验证校验位
  if (config.parity !== undefined) {
    if (!['none', 'even', 'odd', 'mark', 'space'].includes(config.parity)) {
      errors.push('无效的校验位选项')
    }
  }

  // 验证停止位
  if (config.stopBits !== undefined) {
    if (![1, 1.5, 2].includes(config.stopBits)) {
      errors.push('停止位必须是 1, 1.5 或 2')
    }
  }

  // 验证流控制
  if (config.flowControl !== undefined) {
    if (!['none', 'hardware'].includes(config.flowControl)) {
      errors.push('无效的流控制选项')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 验证邀请码格式
 */
export function isValidInviteCode(code: string): boolean {
  // 6位字母数字组合
  const inviteCodeRegex = /^[A-Z0-9]{6}$/
  return inviteCodeRegex.test(code)
}

/**
 * 验证连接码格式
 */
export function isValidConnectionCode(code: string): boolean {
  // 8位字母数字组合
  const connectionCodeRegex = /^[A-Z0-9]{8}$/
  return connectionCodeRegex.test(code)
}

/**
 * 验证项目名称
 */
export function isValidProjectName(name: string): boolean {
  // 1-50个字符，非空
  return name.trim().length > 0 && name.length <= 50
}

/**
 * 验证命令名称
 */
export function isValidCommandName(name: string): boolean {
  // 1-30个字符，非空
  return name.trim().length > 0 && name.length <= 30
}

