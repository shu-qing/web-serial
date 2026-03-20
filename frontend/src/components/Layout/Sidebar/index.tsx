import { useState, useEffect, useRef } from 'react'
import SerialPanel from './SerialPanel'
import RemotePanel from './RemotePanel'
import SharePanel from './SharePanel'
import TestLibPanel from './TestLibPanel'
import ProjectPanel from './ProjectPanel'
import SettingsPanel from './SettingsPanel'

interface SidebarProps {
  activePanel: string | null
  onShowVirtualModal: () => void
}

export default function Sidebar({ activePanel, onShowVirtualModal }: SidebarProps) {
  const [width, setWidth] = useState(360)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const isCollapsed = !activePanel

  useEffect(() => {
    // 恢复保存的宽度，如果没有保存过则使用默认值360
    const savedWidth = localStorage.getItem('sidebarWidth')
    if (savedWidth) {
      const w = parseInt(savedWidth)
      const maxWidth = window.innerWidth * 0.5
      setWidth(Math.min(w, maxWidth))
    } else {
      // 首次使用，保存默认宽度
      localStorage.setItem('sidebarWidth', '360')
    }
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!sidebarRef.current) return
      
      const rect = sidebarRef.current.getBoundingClientRect()
      const newWidth = rect.right - e.clientX
      
      const minWidth = 360
      const maxWidth = window.innerWidth * 0.5
      const clampedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth))
      
      setWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      
      // 保存宽度
      localStorage.setItem('sidebarWidth', width.toString())
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, width])

  const handleResizeStart = () => {
    setIsResizing(true)
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <aside
      ref={sidebarRef}
      className={`sidebar-container bg-white flex flex-col overflow-hidden ${isCollapsed ? 'collapsed' : ''} ${isResizing ? 'resizing' : ''}`}
      style={!isCollapsed ? { width: `${width}px`, minWidth: `${width}px` } : {}}
    >
      {/* 拖拽调整手柄 */}
      {!isCollapsed && (
        <div
          className="sidebar-resize-handle"
          onMouseDown={handleResizeStart}
        />
      )}

      {/* 条件渲染面板，只有打开时才挂载组件 */}
      {activePanel === 'serial' && (
        <div className="sidebar-panel flex-1 flex flex-col overflow-hidden">
          <SerialPanel onShowVirtualModal={onShowVirtualModal} />
        </div>
      )}

      {activePanel === 'remote' && (
        <div className="sidebar-panel flex-1 flex flex-col overflow-hidden">
          <RemotePanel />
        </div>
      )}

      {activePanel === 'share' && (
        <div className="sidebar-panel flex-1 flex flex-col overflow-hidden">
          <SharePanel />
        </div>
      )}

      {activePanel === 'testlib' && (
        <div className="sidebar-panel flex-1 flex flex-col overflow-hidden">
          <TestLibPanel />
        </div>
      )}

      {activePanel === 'project' && (
        <div className="sidebar-panel flex-1 flex flex-col overflow-hidden">
          <ProjectPanel />
        </div>
      )}

      {activePanel === 'settings' && (
        <div className="sidebar-panel flex-1 flex flex-col overflow-hidden">
          <SettingsPanel />
        </div>
      )}
    </aside>
  )
}

