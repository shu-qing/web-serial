import { useSerialStore } from '@/stores/useSerialStore'
import { useSettingsStore } from '@/stores/useSettingsStore'

/**
 * 串口工具栏 - 接收设置和发送设置左右并排
 * 对应设计文档中合并的工具栏布局
 */

interface SerialToolbarProps {
  sendMode: 'text' | 'hex'
  setSendMode: (mode: 'text' | 'hex') => void
  lineEnding: string
  setLineEnding: (ending: string) => void
  isLoopEnabled: boolean
  setIsLoopEnabled: (enabled: boolean) => void
  loopInterval: number
  setLoopInterval: (interval: number) => void
}

export default function SerialToolbar({
  sendMode,
  setSendMode,
  lineEnding,
  setLineEnding,
  isLoopEnabled,
  setIsLoopEnabled,
  loopInterval,
  setLoopInterval,
}: SerialToolbarProps) {
  const { 
    encoding, 
    setEncoding,
    showTimestamp, 
    autoWrap, 
    toggleTimestamp, 
    toggleAutoWrap,
    clearBuffer
  } = useSerialStore()
  
  // 从 useSettingsStore 读取 autoScroll
  const { settings, updateSettings } = useSettingsStore()
  const autoScroll = settings.autoScroll

  return (
    <div className="flex items-center gap-1 mb-1">
      {/* 左侧：接收区设置 */}
      <div className="flex-1 h-10 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
        {/* 左侧控件组 */}
        <div className="flex items-center space-x-2">
          {/* 显示格式 */}
          <label className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="radio"
              name="displayFormat"
              checked={encoding === 'utf-8'}
              onChange={() => setEncoding('utf-8')}
              className="border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>ASCII</span>
          </label>
          <label className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="radio"
              name="displayFormat"
              checked={encoding === 'hex'}
              onChange={() => setEncoding('hex')}
              className="border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>HEX</span>
          </label>
          
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
          
          {/* 时间戳/自动滚动/自动换行 */}
          <label className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showTimestamp}
              onChange={toggleTimestamp}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>时间戳</span>
          </label>
          <label className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => updateSettings({ autoScroll: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>自动滚动</span>
          </label>
          <label className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoWrap}
              onChange={toggleAutoWrap}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>自动换行</span>
          </label>
          
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
          
          {/* 清屏/导出/搜索按钮 */}
          <div className="flex items-center space-x-1">
            <button
              onClick={clearBuffer}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="清屏"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
            <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="导出">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
            </button>
            <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="搜索">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </button>
          </div>
        </div>
        
        {/* 右侧标题 */}
        <div className="flex items-center space-x-1">
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16l-4-4m0 0l4-4m-4 4h18"></path>
          </svg>
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">接收</h3>
        </div>
      </div>
      
      {/* 右侧：发送区设置 */}
      <div className="flex-1 h-10 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
        {/* 左侧标题 */}
        <div className="flex items-center space-x-1">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">发送</h3>
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
          </svg>
        </div>
        
        {/* 右侧控件组 */}
        <div className="flex items-center space-x-2">
          {/* 编码选择 */}
          <label className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="radio"
              name="encoding"
              checked={sendMode === 'text'}
              onChange={() => setSendMode('text')}
              className="border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>ASCII</span>
          </label>
          <label className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="radio"
              name="encoding"
              checked={sendMode === 'hex'}
              onChange={() => setSendMode('hex')}
              className="border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>HEX</span>
          </label>
          
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
          
          {/* 行结束符 */}
          <select
            value={lineEnding}
            onChange={(e) => setLineEnding(e.target.value)}
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">无结束符</option>
            <option value="\r\n">\r\n</option>
            <option value="\n">\n</option>
            <option value="\r">\r</option>
          </select>
          
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
          
          {/* 循环发送 */}
          <label className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={isLoopEnabled}
              onChange={(e) => setIsLoopEnabled(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>循环发送</span>
          </label>
          <div className="flex items-center space-x-1">
            <span className="text-[11px] text-gray-600 dark:text-gray-400">间隔:</span>
            <input
              type="number"
              value={loopInterval}
              onChange={(e) => setLoopInterval(Number(e.target.value))}
              min={100}
              max={60000}
              step={100}
              disabled={!isLoopEnabled}
              className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">ms</span>
          </div>
        </div>
      </div>
    </div>
  )
}


