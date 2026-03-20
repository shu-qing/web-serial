/**
 * 复制文本到剪贴板
 * 优先使用现代 Clipboard API，如果不支持则回退到 execCommand
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 方法 1: 使用现代 Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.warn('Clipboard API 失败，尝试回退方案:', err)
      // 继续尝试回退方案
    }
  }

  // 方法 2: 回退到 execCommand（适用于不安全的上下文）
  try {
    // 创建临时 textarea 元素
    const textArea = document.createElement('textarea')
    textArea.value = text
    
    // 使元素不可见
    textArea.style.position = 'fixed'
    textArea.style.top = '-9999px'
    textArea.style.left = '-9999px'
    textArea.style.opacity = '0'
    
    document.body.appendChild(textArea)
    
    // 选择文本
    textArea.focus()
    textArea.select()
    
    // 尝试执行复制命令
    const successful = document.execCommand('copy')
    
    // 清理
    document.body.removeChild(textArea)
    
    if (successful) {
      return true
    } else {
      throw new Error('execCommand 复制失败')
    }
  } catch (err) {
    console.error('所有复制方法都失败:', err)
    return false
  }
}

/**
 * 检查是否支持剪贴板功能
 */
export function isClipboardSupported(): boolean {
  return !!(
    (navigator.clipboard && window.isSecureContext) ||
    document.queryCommandSupported?.('copy')
  )
}

