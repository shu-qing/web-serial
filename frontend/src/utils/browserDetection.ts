/**
 * 浏览器检测工具
 * 用于检测当前浏览器类型、版本和支持情况
 */

export interface BrowserInfo {
  name: string
  version: string
  isSupported: boolean
  isChromium: boolean
  userAgent: string
}

/**
 * 检测当前浏览器信息
 */
export function detectBrowser(): BrowserInfo {
  const userAgent = navigator.userAgent
  let name = 'Unknown'
  let version = 'Unknown'
  let isChromium = false

  // 检测 Chrome
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg') && !userAgent.includes('OPR')) {
    name = 'Chrome'
    isChromium = true
    const match = userAgent.match(/Chrome\/(\d+)/)
    if (match) {
      version = match[1]
    }
  }
  // 检测 Edge (Chromium)
  else if (userAgent.includes('Edg')) {
    name = 'Edge'
    isChromium = true
    const match = userAgent.match(/Edg\/(\d+)/)
    if (match) {
      version = match[1]
    }
  }
  // 检测 Opera
  else if (userAgent.includes('OPR')) {
    name = 'Opera'
    isChromium = true
    const match = userAgent.match(/OPR\/(\d+)/)
    if (match) {
      version = match[1]
    }
  }
  // 检测 Firefox
  else if (userAgent.includes('Firefox')) {
    name = 'Firefox'
    const match = userAgent.match(/Firefox\/(\d+)/)
    if (match) {
      version = match[1]
    }
  }
  // 检测 Safari
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    name = 'Safari'
    const match = userAgent.match(/Version\/(\d+)/)
    if (match) {
      version = match[1]
    }
  }

  // 检测是否支持 Web Serial API
  const isSupported = 'serial' in navigator

  return {
    name,
    version,
    isSupported,
    isChromium,
    userAgent,
  }
}

/**
 * 检查浏览器是否支持 Web Serial API
 */
export function isWebSerialSupported(): boolean {
  return 'serial' in navigator
}

/**
 * 获取浏览器显示名称（带版本）
 */
export function getBrowserDisplayName(browserInfo: BrowserInfo): string {
  if (browserInfo.version === 'Unknown') {
    return browserInfo.name
  }
  return `${browserInfo.name} ${browserInfo.version}`
}

/**
 * 检查浏览器版本是否满足最低要求
 */
export function checkBrowserVersion(browserInfo: BrowserInfo): {
  meetsRequirement: boolean
  message: string
} {
  if (!browserInfo.isChromium) {
    return {
      meetsRequirement: false,
      message: 'Web Serial API requires Chromium-based browsers',
    }
  }

  const version = parseInt(browserInfo.version)
  if (isNaN(version)) {
    return {
      meetsRequirement: browserInfo.isSupported,
      message: browserInfo.isSupported ? 'Supported' : 'Version check failed',
    }
  }

  // Web Serial API 最低版本要求
  const minVersions: Record<string, number> = {
    Chrome: 89,
    Edge: 89,
    Opera: 75,
  }

  const minVersion = minVersions[browserInfo.name] || 0
  const meetsRequirement = version >= minVersion && browserInfo.isSupported

  return {
    meetsRequirement,
    message: meetsRequirement
      ? 'Supported'
      : `Requires ${browserInfo.name} ${minVersion}+`,
  }
}

