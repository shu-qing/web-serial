import { useRef, useEffect, useState, useMemo } from 'react'
import { useSerialStore } from '@/stores/useSerialStore'
import { useUIStore } from '@/stores/useUIStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { formatTimestamp, formatBytes } from '@/utils/format'
import { WebSerialPort } from '@/lib/serial'
import { Icon } from '@/components/common/Icons'
import Modal from '@/components/common/Modal'
import clsx from 'clsx'
import { verifyChecksum, ChecksumType } from '@/utils/checksum'
import { useTranslation } from 'react-i18next'

export default function ReceiveArea() {
  const { t } = useTranslation()
  const { 
    receiveBuffer, 
    encoding, 
    showTimestamp, 
    autoWrap,
    stats,
    checksumVerifyEnabled,
    checksumVerifyType,
    setEncoding,
    setShowTimestamp,
    setAutoWrap,
    setChecksumVerifyEnabled,
    setChecksumVerifyType,
    clearBuffer
  } = useSerialStore()
  const { highlightRules } = useUIStore()
  const { settings, updateSettings } = useSettingsStore()
  const containerRef = useRef<HTMLDivElement>(null)
  
  // 从 useSettingsStore 读取 UI 设置
  const autoScroll = settings.autoScroll
  const showLineNumber = settings.showLineNumber
  const { fontSize, fontFamily, lineHeight, timestampFormat } = settings
  
  // 搜索相关状态
  const [showSearch, setShowSearch] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  // 导出相关状态
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<'txt' | 'csv' | 'json'>('txt')
  const [exportFilter, setExportFilter] = useState<'all' | 'receive' | 'send'>('all')
  const [includeTimestamp, setIncludeTimestamp] = useState(true)
  const [includeDirection, setIncludeDirection] = useState(true)

  // 计算搜索匹配项
  const searchMatches = useMemo(() => {
    if (!searchTerm.trim()) return []
    
    const matches: Array<{ entryId: string; index: number }> = []
    const searchLower = searchTerm.toLowerCase()
    
    receiveBuffer.forEach((entry) => {
      const dataLower = entry.data.toLowerCase()
      let index = dataLower.indexOf(searchLower)
      
      while (index !== -1) {
        matches.push({ entryId: entry.id, index })
        index = dataLower.indexOf(searchLower, index + 1)
      }
    })
    
    return matches
  }, [receiveBuffer, searchTerm])

  // 切换搜索显示
  const toggleSearch = () => {
    setShowSearch(!showSearch)
    if (!showSearch) {
      // 打开搜索时聚焦输入框
      setTimeout(() => searchInputRef.current?.focus(), 100)
    } else {
      // 关闭搜索时清空搜索词
      setSearchTerm('')
      setCurrentMatchIndex(0)
    }
  }

  // 上一个匹配
  const previousMatch = () => {
    if (searchMatches.length === 0) return
    setCurrentMatchIndex((prev) => (prev - 1 + searchMatches.length) % searchMatches.length)
  }

  // 下一个匹配
  const nextMatch = () => {
    if (searchMatches.length === 0) return
    setCurrentMatchIndex((prev) => (prev + 1) % searchMatches.length)
  }

  // 搜索词变化时重置当前索引
  useEffect(() => {
    setCurrentMatchIndex(0)
  }, [searchTerm])

  // 自动滚动到当前搜索匹配项
  useEffect(() => {
    if (searchMatches.length > 0 && currentMatchIndex >= 0) {
      const currentMatch = searchMatches[currentMatchIndex]
      const entryElement = document.querySelector(`[data-entry-id="${currentMatch.entryId}"]`)
      if (entryElement) {
        entryElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [currentMatchIndex, searchMatches])

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && containerRef.current && receiveBuffer.length > 0 && !searchTerm) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [receiveBuffer, autoScroll, searchTerm])

  // 快捷键支持：Ctrl+F 打开搜索
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearch(true)
        setTimeout(() => searchInputRef.current?.focus(), 100)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 导出数据函数
  const handleExport = () => {
    // 过滤数据
    let dataToExport = receiveBuffer
    if (exportFilter === 'receive') {
      dataToExport = receiveBuffer.filter(entry => entry.direction === 'receive')
    } else if (exportFilter === 'send') {
      dataToExport = receiveBuffer.filter(entry => entry.direction === 'send')
    }

    if (dataToExport.length === 0) {
      alert(t('notification.noDataToExport', { defaultValue: 'No data to export' }))
      return
    }

    let content = ''
    const filename = `serial-data-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`

    if (exportFormat === 'txt') {
      // TXT 格式
      content = dataToExport.map(entry => {
        let line = ''
        if (includeTimestamp) {
          line += formatTimestamp(entry.timestamp) + ' '
        }
        if (includeDirection) {
          line += (entry.direction === 'send' ? '→ ' : '← ')
        }
        line += entry.data
        return line
      }).join('\n')
      
      downloadFile(content, `${filename}.txt`, 'text/plain')
    } else if (exportFormat === 'csv') {
      // CSV 格式 - 根据选项动态构建列
      const headers: string[] = []
      if (includeTimestamp) headers.push(t('serial.timestamp', { defaultValue: 'Timestamp' }))
      if (includeDirection) headers.push(t('serial.direction', { defaultValue: 'Direction' }))
      headers.push(t('serial.data', { defaultValue: 'Data' }))
      headers.push(t('serial.bytes', { defaultValue: 'Bytes' }))
      
      const rows = dataToExport.map(entry => {
        const row: string[] = []
        if (includeTimestamp) row.push(formatTimestamp(entry.timestamp))
        if (includeDirection) row.push(entry.direction === 'send' ? t('serial.send') : t('serial.receive'))
        row.push(`"${entry.data.replace(/"/g, '""')}"`) // CSV 转义
        row.push(entry.bytes.toString())
        return row
      })
      
      content = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
      downloadFile(content, `${filename}.csv`, 'text/csv')
    } else if (exportFormat === 'json') {
      // JSON 格式 - 根据选项动态构建对象
      const jsonData = dataToExport.map(entry => {
        const obj: any = {}
        if (includeTimestamp) obj.timestamp = entry.timestamp.toISOString()
        if (includeDirection) obj.direction = entry.direction
        obj.data = entry.data
        obj.encoding = entry.encoding
        obj.bytes = entry.bytes
        return obj
      })
      
      content = JSON.stringify(jsonData, null, 2)
      downloadFile(content, `${filename}.json`, 'application/json')
    }

    setShowExportModal(false)
    const { showToast } = useUIStore.getState()
    showToast('success', t('notification.dataExported', { defaultValue: 'Exported {{count}} entries', count: dataToExport.length }))
  }

  // 下载文件
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType + ';charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // 渲染带高亮规则的文本（只高亮匹配部分）
  const renderWithHighlight = (text: string, rule: { pattern: string | RegExp; color: string }) => {
    const parts: React.ReactNode[] = []
    
    if (typeof rule.pattern === 'string') {
      // 字符串匹配
      let lastIndex = 0
      let index = text.indexOf(rule.pattern)
      
      while (index !== -1) {
        // 添加匹配前的文本
        if (index > lastIndex) {
          parts.push(text.substring(lastIndex, index))
        }
        
        // 添加高亮的匹配文本
        parts.push(
          <mark
            key={`highlight-${index}`}
            style={{
              backgroundColor: rule.color,
              color: '#000',
              padding: '2px 4px',
              borderRadius: '2px',
              fontWeight: 'bold',
            }}
          >
            {text.substring(index, index + rule.pattern.length)}
          </mark>
        )
        
        lastIndex = index + rule.pattern.length
        index = text.indexOf(rule.pattern, lastIndex)
      }
      
      // 添加剩余文本
      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex))
      }
    } else {
      // 正则表达式匹配
      const matches = text.match(rule.pattern)
      if (matches) {
        let lastIndex = 0
        let match
        const regex = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g')
        
        while ((match = regex.exec(text)) !== null) {
          // 添加匹配前的文本
          if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index))
          }
          
          // 添加高亮的匹配文本
          parts.push(
            <mark
              key={`highlight-${match.index}`}
              style={{
                backgroundColor: rule.color,
                color: '#000',
                padding: '2px 4px',
                borderRadius: '2px',
                fontWeight: 'bold',
              }}
            >
              {match[0]}
            </mark>
          )
          
          lastIndex = match.index + match[0].length
        }
        
        // 添加剩余文本
        if (lastIndex < text.length) {
          parts.push(text.substring(lastIndex))
        }
      } else {
        return text
      }
    }
    
    return parts.length > 0 ? parts : text
  }

  const renderLogEntry = (entry: typeof receiveBuffer[0], entryIndex: number) => {
    // 数据显示（根据编码格式）
    let displayData = entry.data
    
    // 自动转换显示格式
    if (encoding === 'hex' && entry.encoding === 'utf-8') {
      // ASCII → HEX：将UTF-8文本转换为十六进制显示
      displayData = WebSerialPort.uint8ArrayToHex(new TextEncoder().encode(entry.data))
    } else if (encoding === 'utf-8' && entry.encoding === 'hex') {
      // HEX → ASCII：将十六进制转换为文本显示
      try {
        const hexBytes = entry.data.replace(/\s/g, '').match(/.{1,2}/g) || []
        const bytes = new Uint8Array(hexBytes.map(h => parseInt(h, 16)))
        displayData = new TextDecoder().decode(bytes)
      } catch (error) {
        // 转换失败，保持原样
        displayData = entry.data
      }
    }

    // 校验码验证（仅对接收的数据进行验证）
    let checksumVerifyResult: { valid: boolean; checksumPart: string; dataPart: string } | null = null
    if (checksumVerifyEnabled && entry.direction === 'receive') {
      checksumVerifyResult = verifyChecksum(displayData, checksumVerifyType, encoding as 'hex' | 'text')
    }

    // 应用高亮规则
    const enabledRules = highlightRules.filter((rule) => rule.enabled)
    let matchedRule: { pattern: string | RegExp; color: string } | null = null

    for (const rule of enabledRules) {
      if (typeof rule.pattern === 'string') {
        if (displayData.includes(rule.pattern)) {
          matchedRule = rule
          break
        }
      } else {
        if (rule.pattern.test(displayData)) {
          matchedRule = rule
          break
        }
      }
    }

    // 检查是否有搜索匹配
    const hasSearchMatch = searchTerm && displayData.toLowerCase().includes(searchTerm.toLowerCase())
    
    // 渲染带搜索高亮和校验码高亮的文本
    const renderContent = () => {
      // 如果有校验码验证结果且校验失败，高亮显示校验码部分
      if (checksumVerifyResult && !checksumVerifyResult.valid && checksumVerifyResult.checksumPart) {
        return (
          <>
            <span>{checksumVerifyResult.dataPart}</span>
            {checksumVerifyResult.dataPart && checksumVerifyResult.checksumPart && (
              encoding === 'hex' ? <span> </span> : null
            )}
            <span
              className="font-bold"
              style={{
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                padding: '2px 4px',
                borderRadius: '2px',
                border: '1px solid #DC2626',
              }}
              title={t('serial.checksumError', { defaultValue: 'Checksum error' })}
            >
              {checksumVerifyResult.checksumPart}
            </span>
          </>
        )
      }
      
      // 如果有高亮规则匹配，只高亮匹配的部分
      if (matchedRule && !searchTerm) {
        return renderWithHighlight(displayData, matchedRule)
      }
      
      if (!searchTerm || !hasSearchMatch) {
        return displayData
      }

      const parts: React.ReactNode[] = []
      const searchLower = searchTerm.toLowerCase()
      const dataLower = displayData.toLowerCase()
      let lastIndex = 0
      let matchIndexInEntry = 0
      
      let searchIndex = dataLower.indexOf(searchLower)
      while (searchIndex !== -1) {
        // 添加匹配前的文本
        if (searchIndex > lastIndex) {
          parts.push(displayData.substring(lastIndex, searchIndex))
        }
        
        // 判断这个匹配是否是当前高亮的
        const globalMatchIndex = searchMatches.findIndex(
          m => m.entryId === entry.id && m.index === searchIndex
        )
        const isCurrent = globalMatchIndex === currentMatchIndex
        
        // 添加高亮的匹配文本
        parts.push(
          <mark
            key={`match-${searchIndex}`}
            className={isCurrent ? 'bg-yellow-400 text-gray-900' : 'bg-yellow-200 text-gray-900'}
            style={{ padding: '2px 4px', borderRadius: '2px' }}
          >
            {displayData.substring(searchIndex, searchIndex + searchTerm.length)}
          </mark>
        )
        
        lastIndex = searchIndex + searchTerm.length
        searchIndex = dataLower.indexOf(searchLower, lastIndex)
        matchIndexInEntry++
      }
      
      // 添加剩余文本
      if (lastIndex < displayData.length) {
        parts.push(displayData.substring(lastIndex))
      }
      
      return parts
    }

    const lineHeightClass = {
      compact: 'leading-tight',
      normal: 'leading-normal',
      comfort: 'leading-relaxed'
    }[lineHeight]

    return (
      <div
        key={entry.id}
        data-entry-id={entry.id}
        className={clsx(
          'font-mono px-4 py-1 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-start min-w-0',
          hasSearchMatch && 'bg-yellow-50',
          lineHeightClass
        )}
        style={{
          fontSize: `${fontSize}px`,
          fontFamily: fontFamily
        }}
      >
        {/* 行号 */}
        {showLineNumber && (
          <span className="text-gray-400 dark:text-gray-500 mr-3 text-xs shrink-0 w-10 text-right">
            {entryIndex + 1}
          </span>
        )}
        
        {/* 时间戳 */}
        {showTimestamp && (
          <span className="text-gray-500 dark:text-gray-400 mr-3 text-xs shrink-0">
            {formatTimestamp(entry.timestamp, timestampFormat)}
          </span>
        )}

        {/* 方向标识 */}
        <span
          className={clsx(
            'mr-2 font-semibold shrink-0',
            entry.direction === 'send' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'
          )}
        >
          {entry.direction === 'send' ? '→' : '←'}
        </span>

        {/* 数据内容 */}
        <span
          className={clsx(
            'text-gray-700 dark:text-gray-300 flex-1 min-w-0',
            autoWrap 
              ? 'whitespace-normal break-words' 
              : 'whitespace-nowrap overflow-hidden text-ellipsis block'
          )}
        >
          {renderContent()}
        </span>
      </div>
    )
  }

  return (
    <>
      {/* 导出对话框 */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title={t('serial.exportData', { defaultValue: 'Export Data' })}
      >
        <div className="space-y-4">
          {/* 数据统计 */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-900">
              <strong>{t('serial.totalData', { defaultValue: 'Total data' })}：</strong>{receiveBuffer.length} {t('serial.entries', { defaultValue: 'entries' })}
              {exportFilter === 'receive' && ` (${t('serial.receiveOnly', { defaultValue: 'Receive only' })}: ${receiveBuffer.filter(e => e.direction === 'receive').length})`}
              {exportFilter === 'send' && ` (${t('serial.sendOnly', { defaultValue: 'Send only' })}: ${receiveBuffer.filter(e => e.direction === 'send').length})`}
            </p>
          </div>

          {/* 导出格式 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('serial.exportFormat', { defaultValue: 'Export Format' })}</label>
            <div className="flex gap-4">
              {(['txt', 'csv', 'json'] as const).map((format) => (
                <label key={format} className="flex items-center">
                  <input
                    type="radio"
                    checked={exportFormat === format}
                    onChange={() => setExportFormat(format)}
                    className="border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                  />
                  <span className="text-sm text-gray-700">
                    {format.toUpperCase()}
                    <span className="text-xs text-gray-500 ml-1">
                      ({format === 'txt' && t('serial.text', { defaultValue: 'Text' })}
                      {format === 'csv' && t('serial.table', { defaultValue: 'Table' })}
                      {format === 'json' && t('serial.data', { defaultValue: 'Data' })})
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 数据筛选 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('serial.dataFilter', { defaultValue: 'Data Filter' })}</label>
            <div className="flex gap-6">
              {(['all', 'receive', 'send'] as const).map((filter) => (
                <label key={filter} className="flex items-center">
                  <input
                    type="radio"
                    checked={exportFilter === filter}
                    onChange={() => setExportFilter(filter)}
                    className="border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                  />
                  <span className="text-sm text-gray-700">
                    {filter === 'all' && t('serial.allData', { defaultValue: 'All data' })}
                    {filter === 'receive' && t('serial.receiveOnly', { defaultValue: 'Receive only' })}
                    {filter === 'send' && t('serial.sendOnly', { defaultValue: 'Send only' })}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 导出选项（所有格式） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('serial.exportOptions', { defaultValue: 'Export Options' })}</label>
            <div className="flex gap-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeTimestamp}
                  onChange={(e) => setIncludeTimestamp(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-700">{t('serial.includeTimestamp', { defaultValue: 'Include timestamp' })}</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeDirection}
                  onChange={(e) => setIncludeDirection(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-700">{t('serial.includeDirection', { defaultValue: 'Include direction' })}</span>
              </label>
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowExportModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {t('common.export', { defaultValue: 'Export' })}
            </button>
          </div>
        </div>
      </Modal>

      <div className="flex-1 min-w-0 bg-white border-b border-gray-200 overflow-hidden flex flex-col">
      {/* 工具栏：接收图标 + 统计 + 设置 */}
      <div className="toolbar bg-white border-b border-gray-200 h-10 flex items-center px-3">
        {/* 接收图标 */}
        <div className="flex items-center space-x-2 shrink-0 mr-3">
          <Icon name="transfer" className="w-5 h-5 text-green-600" />
        </div>
        
        {/* 接收统计 */}
        <div className="flex items-center text-xs text-gray-500 shrink-0">
          <span className="whitespace-nowrap">
            {t('serial.receive')}: <strong className="text-gray-700">{formatBytes(stats.rxBytes)}</strong>
          </span>
        </div>
        
        {/* Spacer */}
        <div className="flex-1"></div>
        
        {/* 接收设置 */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* 功能按钮 */}
          <div className="flex items-center">
            {/* 搜索：展开时显示输入框和导航 */}
            {showSearch ? (
              <>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (e.shiftKey) {
                        previousMatch()
                      } else {
                        nextMatch()
                      }
                    } else if (e.key === 'Escape') {
                      toggleSearch()
                    }
                  }}
                  placeholder={t('common.search', { defaultValue: 'Search' }) + '...'}
                  className="w-32 px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-xs text-gray-600 whitespace-nowrap mx-2">
                  {searchMatches.length > 0 ? `${currentMatchIndex + 1}/${searchMatches.length}` : '0/0'}
                </span>
                <button
                  onClick={previousMatch}
                  disabled={searchMatches.length === 0}
                  className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  title={t('common.previous', { defaultValue: 'Previous' })}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextMatch}
                  disabled={searchMatches.length === 0}
                  className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  title={t('common.next', { defaultValue: 'Next' })}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={toggleSearch}
                  className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                  title={t('serial.closeSearch', { defaultValue: 'Close search' })}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            ) : (
              <button 
                className="text-gray-500 hover:text-gray-700 text-xs px-1" 
                title={t('serial.search', { defaultValue: 'Search' }) + ' (Ctrl+F)'}
                onClick={toggleSearch}
              >
                <Icon name="search" className="w-4 h-4" />
              </button>
            )}
            
            {/* 分隔线 */}
            <div className="w-px h-4 bg-gray-300 mx-1"></div>
            
            {/* 清屏 */}
            <button 
              className="text-gray-500 hover:text-gray-700 text-xs px-1" 
              title={t('serial.clearScreen', { defaultValue: 'Clear Screen' })}
              onClick={clearBuffer}
            >
              <Icon name="brush" className="w-4 h-4" />
            </button>
            
            {/* 分隔线 */}
            <div className="w-px h-4 bg-gray-300 mx-1"></div>
            
            {/* 导出 */}
            <button 
              className="text-gray-500 hover:text-gray-700 text-xs px-1" 
              title={t('common.export', { defaultValue: 'Export' })}
              onClick={() => setShowExportModal(true)}
            >
              <Icon name="export" className="w-4 h-4" />
            </button>
          </div>
          
          <div className="w-px h-4 bg-gray-300"></div>
          
          {/* 显示格式 */}
          <label className="flex items-center space-x-1 text-xs text-gray-600 cursor-pointer">
            <input 
              type="radio" 
              name="displayFormat" 
              value="ascii" 
              checked={encoding === 'utf-8'}
              onChange={() => setEncoding('utf-8')}
              className="border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>ASCII</span>
          </label>
          <label className="flex items-center space-x-1 text-xs text-gray-600 cursor-pointer">
            <input 
              type="radio" 
              name="displayFormat" 
              value="hex" 
              checked={encoding === 'hex'}
              onChange={() => setEncoding('hex')}
              className="border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>HEX</span>
          </label>
          
          <div className="w-px h-4 bg-gray-300"></div>
          
          {/* 校验码验证 */}
          <label className="flex items-center space-x-1 text-xs text-gray-600 cursor-pointer whitespace-nowrap">
            <input 
              type="checkbox" 
              checked={checksumVerifyEnabled}
              onChange={(e) => {
                const enabled = e.target.checked
                setChecksumVerifyEnabled(enabled)
                // 勾选时自动选择第一个校验码类型（如果需要）
                if (enabled && !checksumVerifyType) {
                  setChecksumVerifyType('CRC16-Modbus')
                }
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>{t('serial.checksum')}</span>
          </label>
          <select 
            className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={checksumVerifyEnabled ? checksumVerifyType : ''}
            onChange={(e) => setChecksumVerifyType(e.target.value as ChecksumType)}
            disabled={!checksumVerifyEnabled}
          >
            {!checksumVerifyEnabled && <option value="">{t('serial.autoVerify', { defaultValue: 'Auto verify' })}</option>}
            <option value="CRC16-Modbus">CRC16-Modbus</option>
            <option value="CRC16-CCITT">CRC16-CCITT</option>
            <option value="CRC8">CRC8</option>
            <option value="XOR">XOR</option>
            <option value="Checksum">Checksum</option>
            <option value="BCC">BCC</option>
            <option value="LRC">LRC</option>
          </select>
          
          <div className="w-px h-4 bg-gray-300"></div>
          
          {/* 复选框选项 */}
          <label className="flex items-center space-x-1 text-xs text-gray-600 cursor-pointer">
            <input 
              type="checkbox" 
              checked={showTimestamp}
              onChange={(e) => setShowTimestamp(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>{t('serial.timestamp')}</span>
          </label>
          <label className="flex items-center space-x-1 text-xs text-gray-600 cursor-pointer">
            <input 
              type="checkbox" 
              checked={autoScroll}
              onChange={(e) => updateSettings({ autoScroll: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>{t('serial.autoScroll')}</span>
          </label>
          <label className="flex items-center space-x-1 text-xs text-gray-600 cursor-pointer">
            <input 
              type="checkbox" 
              checked={autoWrap}
              onChange={(e) => setAutoWrap(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>{t('serial.autoWrap', { defaultValue: 'Auto wrap' })}</span>
          </label>
        </div>
      </div>

      {/* 数据显示区 */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin bg-white relative"
      >
        {receiveBuffer.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <img src="/logo.svg" alt="Logo" className="w-24 h-24 mx-auto opacity-20" />
            </div>
          </div>
        ) : (
          receiveBuffer.map((entry, index) => renderLogEntry(entry, index))
        )}
      </div>
      </div>
    </>
  )
}

