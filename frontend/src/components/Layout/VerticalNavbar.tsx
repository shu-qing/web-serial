import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/common/Icons'
import { useAuthStore } from '@/stores/useAuthStore'
import { useTranslation } from 'react-i18next'
import FeedbackModal from '@/components/common/FeedbackModal'

interface VerticalNavbarProps {
  activePanel: string | null
  onPanelToggle: (panel: string) => void
}

export default function VerticalNavbar({ activePanel, onPanelToggle }: VerticalNavbarProps) {
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  
  return (
    <nav className="vertical-navbar w-16 bg-white border-l border-gray-200 flex flex-col items-center py-4">
      {/* 用户头像 - 点击弹出项目管理 */}
      <button
        className={`vertical-navbar-item mb-2 ${activePanel === 'project' ? 'active' : ''}`}
        title={t('nav.project')}
        data-panel="project"
        onClick={() => onPanelToggle('project')}
      >
        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
          {user?.username?.charAt(0).toUpperCase() || 'U'}
        </div>
      </button>
      
      {/* 串口连接 */}
      <button
        className={`vertical-navbar-item mb-2 ${activePanel === 'serial' ? 'active' : ''}`}
        title={t('nav.serial')}
        data-panel="serial"
        onClick={() => onPanelToggle('serial')}
      >
        <Icon name="unplug" className="w-6 h-6" />
      </button>
      
      {/* 测试 */}
      <button
        className={`vertical-navbar-item mb-2 ${activePanel === 'testlib' ? 'active' : ''}`}
        title={t('nav.testLib')}
        data-panel="testlib"
        onClick={() => onPanelToggle('testlib')}
      >
        <Icon name="list" className="w-6 h-6" />
      </button>
      
      {/* 远程桥接 */}
      <button
        className={`vertical-navbar-item mb-2 ${activePanel === 'remote' ? 'active' : ''}`}
        title={t('nav.remote')}
        data-panel="remote"
        onClick={() => onPanelToggle('remote')}
      >
        <Icon name="remote" className="w-6 h-6" />
      </button>
      
      {/* 会话共享 */}
      <button
        className={`vertical-navbar-item mb-2 ${activePanel === 'share' ? 'active' : ''}`}
        title={t('nav.share')}
        data-panel="share"
        onClick={() => {
          console.log('[VerticalNavbar] Share button clicked')
          onPanelToggle('share')
        }}
      >
        <Icon name="share" className="w-6 h-6" />
      </button>
      
      {/* Spacer - 自动占据剩余空间 */}
      <div className="flex-1"></div>
      
      {/* 管理后台 - 仅管理员可见 */}
      {(user?.role === 'admin' || user?.role === 'superadmin') && (
        <Link
          to="/admin"
          className="vertical-navbar-item mb-2"
          title={t('admin.adminPanel')}
        >
          <Icon name="shield" className="w-6 h-6" />
        </Link>
      )}
      
      {/* 反馈 */}
      <button
        className="vertical-navbar-item mb-2"
        title={t('feedback.feedback', { defaultValue: '反馈' })}
        onClick={() => setShowFeedbackModal(true)}
      >
        <Icon name="message-circle" className="w-6 h-6" />
      </button>
      
      {/* Wiki */}
      <Link
        to="/wiki"
        className="vertical-navbar-item mb-2"
        title="Wiki"
      >
        <Icon name="book" className="w-6 h-6" />
      </Link>
      
      {/* 设置 */}
      <button
        className={`vertical-navbar-item ${activePanel === 'settings' ? 'active' : ''}`}
        title={t('nav.settings')}
        onClick={() => onPanelToggle('settings')}
      >
        <Icon name="settings" className="w-6 h-6" />
      </button>

      {/* 反馈模态框 */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />
    </nav>
  )
}

