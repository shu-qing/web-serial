import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/common/Icons'
import { useAuthStore } from '@/stores/useAuthStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { useUIStore } from '@/stores/useUIStore'
import AuthModal from '@/components/common/AuthModal'
import NewProjectModal from '@/components/common/NewProjectModal'
import Modal from '@/components/common/Modal'
import { api } from '@/lib/api'
import { useTranslation } from 'react-i18next'

export default function ProjectPanel() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isLoggedIn, logout } = useAuthStore()
  const { projects, currentProject, setCurrentProject, deleteProject: deleteProjectFromStore, addProject } = useProjectStore()
  const { showToast } = useUIStore()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login')
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [showSaveAsModal, setShowSaveAsModal] = useState(false)
  const [saveAsName, setSaveAsName] = useState('')
  const [saveAsDescription, setSaveAsDescription] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const handleOpenLogin = () => {
    setAuthModalTab('login')
    setShowAuthModal(true)
  }

  const handleOpenRegister = () => {
    setAuthModalTab('register')
    setShowAuthModal(true)
  }

  const handleLogout = async () => {
    try {
      await api.logout()
      logout()
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user_info')
      showToast('success', t('notification.logoutSuccess', { defaultValue: 'Logged out successfully' }))
      // 刷新页面以重置所有状态
      window.location.reload()
    } catch (error) {
      console.error('登出失败:', error)
      // 即使失败也清除本地状态
      logout()
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user_info')
      // 刷新页面
      window.location.reload()
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm(t('project.confirmDelete', { defaultValue: 'Are you sure you want to delete this project? This action cannot be undone.' }))) {
      return
    }

    try {
      await api.deleteProject(projectId)
      deleteProjectFromStore(projectId)
      showToast('success', t('notification.projectDeleted', { defaultValue: 'Project deleted' }))
    } catch (error) {
      console.error('删除项目失败:', error)
      showToast('error', t('notification.projectDeleteFailed', { defaultValue: 'Failed to delete project' }))
    }
  }

  const handleSelectProject = (project: any) => {
    setCurrentProject(project)
    const displayName = project.name === '__DEFAULT_PROJECT__' 
      ? t('project.defaultProject', { defaultValue: '默认项目' })
      : project.name
    showToast('success', t('notification.projectSwitched', { defaultValue: 'Switched to project: {{name}}', name: displayName }))
  }

  const handleSaveAs = () => {
    if (!currentProject) {
      showToast('error', t('notification.noProjectToSave', { defaultValue: 'No project to save' }))
      return
    }
    setSaveAsName(currentProject.name + ' - ' + t('project.copy', { defaultValue: 'Copy' }))
    setSaveAsDescription(currentProject.description || '')
    setShowSaveAsModal(true)
  }

  const handleSaveAsSubmit = async () => {
    if (!saveAsName.trim()) {
      showToast('error', t('validation.projectNameRequired'))
      return
    }

    if (!currentProject) {
      showToast('error', t('notification.noProjectToSave', { defaultValue: 'No project to save' }))
      return
    }

    try {
      const response = await api.createProject({
        name: saveAsName.trim(),
        description: saveAsDescription.trim() || undefined,
        config: currentProject.config,
      })

      if (response.success) {
        addProject(response.data)
        setCurrentProject(response.data)
        showToast('success', t('notification.projectSavedAs', { defaultValue: 'Project saved as new project' }))
        setShowSaveAsModal(false)
        setSaveAsName('')
        setSaveAsDescription('')
      } else {
        showToast('error', response.message || t('notification.saveAsFailed', { defaultValue: 'Save as failed' }))
      }
    } catch (error: any) {
      console.error('另存为失败:', error)
      showToast('error', error.message || t('notification.saveAsFailed', { defaultValue: 'Save as failed' }))
    }
  }

  const handleEditProject = (project: any) => {
    // 默认项目不能编辑
    if (project.id === 'default') {
      showToast('info', t('notification.defaultProjectNotEditable', { defaultValue: 'Default project cannot be edited, please login and save as new project' }))
      return
    }
    
    // 未登录用户不能编辑
    if (!isLoggedIn) {
      showToast('info', t('notification.pleaseLoginToEdit', { defaultValue: 'Please login to edit project' }))
      return
    }

    setEditingProject(project)
    setEditName(project.name)
    setEditDescription(project.description || '')
    setShowEditModal(true)
  }

  const handleEditSubmit = async () => {
    if (!editName.trim()) {
      showToast('error', t('validation.projectNameRequired'))
      return
    }

    if (!editingProject) {
      return
    }

    try {
      const response = await api.updateProject(editingProject.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      })

      if (response.success) {
        // 更新本地状态
        const { updateProject } = useProjectStore.getState()
        updateProject(editingProject.id, {
          name: editName.trim(),
          description: editDescription.trim(),
        })
        
        // 如果编辑的是当前项目，更新当前项目
        if (currentProject && currentProject.id === editingProject.id) {
          setCurrentProject({
            ...currentProject,
            name: editName.trim(),
            description: editDescription.trim(),
          } as any)
        }
        
        showToast('success', t('notification.projectUpdated', { defaultValue: 'Project updated' }))
        setShowEditModal(false)
        setEditingProject(null)
        setEditName('')
        setEditDescription('')
      } else {
        showToast('error', response.message || t('notification.updateFailed', { defaultValue: 'Update failed' }))
      }
    } catch (error: any) {
      console.error('更新项目失败:', error)
      showToast('error', error.message || t('notification.updateFailed', { defaultValue: 'Update failed' }))
    }
  }

  return (
    <>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultTab={authModalTab}
      />
      
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
      />

      {/* 另存为对话框 */}
      <Modal
        isOpen={showSaveAsModal}
        onClose={() => {
          setShowSaveAsModal(false)
          setSaveAsName('')
          setSaveAsDescription('')
        }}
        title={t('project.saveAsNew', { defaultValue: 'Save As New Project' })}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('project.projectName')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={saveAsName}
              onChange={(e) => setSaveAsName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('project.enterProjectName', { defaultValue: 'Enter project name' })}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('project.projectDescription')} ({t('project.optional', { defaultValue: 'Optional' })})
            </label>
            <textarea
              value={saveAsDescription}
              onChange={(e) => setSaveAsDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder={t('project.descriptionPlaceholder')}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              onClick={() => {
                setShowSaveAsModal(false)
                setSaveAsName('')
                setSaveAsDescription('')
              }}
              className="btn-secondary px-4 py-2 text-sm"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSaveAsSubmit}
              className="btn-primary px-4 py-2 text-sm"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </Modal>

      {/* 编辑项目对话框 */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingProject(null)
          setEditName('')
          setEditDescription('')
        }}
        title={t('project.editProject')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('project.projectName')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('project.enterProjectName', { defaultValue: 'Enter project name' })}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('project.projectDescription')} ({t('project.optional', { defaultValue: 'Optional' })})
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder={t('project.descriptionPlaceholder')}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              onClick={() => {
                setShowEditModal(false)
                setEditingProject(null)
                setEditName('')
                setEditDescription('')
              }}
              className="btn-secondary px-4 py-2 text-sm"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleEditSubmit}
              className="btn-primary px-4 py-2 text-sm"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </Modal>
      
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* 用户信息区 */}
        <div className="user-info-section px-4 py-4 bg-gradient-to-br from-blue-50 to-white border-b border-gray-200">
          {!isLoggedIn ? (
            /* 未登录状态 */
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                <Icon name="user" className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 mb-3">{t('auth.loginToSync', { defaultValue: 'Login to sync your projects' })}</p>
              <div className="flex gap-2">
                <button 
                  onClick={handleOpenLogin}
                  className="btn-primary flex-1 px-3 py-2 text-xs"
                >
                  {t('auth.login')}
                </button>
                <button 
                  onClick={handleOpenRegister}
                  className="btn-secondary flex-1 px-3 py-2 text-xs"
                >
                  {t('auth.register')}
                </button>
              </div>
            </div>
          ) : (
            /* 已登录状态 */
            <div>
              <div className="flex items-center space-x-3 mb-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-lg font-semibold">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <button className="absolute bottom-0 right-0 w-5 h-5 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50" title={t('auth.changeAvatar', { defaultValue: 'Change avatar' })}>
                    <Icon name="pencil-small" className="w-3 h-3 text-gray-600" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.username || t('auth.user', { defaultValue: 'User' })}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email || 'user@example.com'}</p>
                  <p className="text-xs text-gray-400">ID: {user?.id || '123456'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => navigate('/profile')}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  {t('auth.accountSettings', { defaultValue: 'Account Settings' })}
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                >
                  {t('auth.logout', { defaultValue: 'Logout' })}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 项目管理区 */}
        <div className="px-3 py-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-700">{t('project.myProjects')}</h4>
            <span className="text-xs text-gray-500">{t('project.totalCount', { defaultValue: 'Total: {{count}}', count: projects.length })}</span>
          </div>

          {/* 操作按钮 */}
          <div className="mb-3">
            {isLoggedIn ? (
              <button 
                onClick={() => setShowNewProjectModal(true)}
                className="btn-primary w-full px-2 py-2 text-xs whitespace-nowrap"
              >
                + {t('project.newProject')}
              </button>
            ) : (
              <div className="w-full px-2 py-2 text-xs text-center bg-gray-50 border border-gray-200 rounded-md text-gray-500 cursor-not-allowed">
                {t('project.loginToCreate', { defaultValue: 'Login to create more projects' })}
              </div>
            )}
          </div>

          {/* 项目列表 */}
          <div className="space-y-2">
            {projects.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                {t('project.noProjects', { defaultValue: 'No projects, click above to create' })}
              </div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleSelectProject(project)}
                  className={`p-3 rounded-md border transition-all cursor-pointer ${
                    project.id === currentProject?.id
                      ? 'bg-blue-50 border-blue-200 border-l-2 border-l-blue-500'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {project.name === '__DEFAULT_PROJECT__' 
                          ? t('project.defaultProject', { defaultValue: '默认项目' })
                          : project.name}
                      </span>
                      {project.id === currentProject?.id && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">{t('project.current', { defaultValue: 'Current' })}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {isLoggedIn && project.id === currentProject?.id && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSaveAs()
                          }}
                          className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-green-50 text-green-600 transition-colors" 
                          title={t('project.saveAs')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                          </svg>
                        </button>
                      )}
                      {/* 默认项目不显示编辑按钮 */}
                      {project.id !== 'default' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditProject(project)
                          }}
                          className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-blue-50 text-blue-600 transition-colors" 
                          title={t('common.edit')}
                        >
                          <Icon name="pencil-small" className="w-4 h-4" />
                        </button>
                      )}
                      {project.id !== currentProject?.id && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteProject(project.id)
                          }}
                          className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-red-50 text-red-600 transition-colors" 
                          title={t('common.delete')}
                        >
                          <Icon name="delete" className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {t('project.lastModified', { defaultValue: 'Last modified' })}: {new Date(project.updatedAt).toLocaleString()}
                  </div>
                  {project.description && (
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {project.description === '__DEFAULT_PROJECT_DESC__' 
                        ? t('project.defaultProjectDesc', { defaultValue: '系统默认项目，登录以同步项目' })
                        : project.description}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}

