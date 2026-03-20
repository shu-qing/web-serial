import { useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useProjectStore } from '@/stores/useProjectStore'
import { useUIStore } from '@/stores/useUIStore'
import { api } from '@/lib/api'
import { useTranslation } from 'react-i18next'

interface NewProjectModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
  const { t } = useTranslation()
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { addProject } = useProjectStore()
  const { showToast } = useUIStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!projectName.trim()) {
      showToast('error', t('validation.projectNameRequired', { defaultValue: 'Please enter project name' }))
      return
    }

    setIsLoading(true)
    try {
      const response = await api.createProject({
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
      })

      if (response.success) {
        addProject(response.data)
        showToast('success', t('notification.projectCreated', { defaultValue: 'Project created successfully' }))
        handleClose()
      } else {
        showToast('error', response.message || t('notification.projectCreateFailed', { defaultValue: 'Failed to create project' }))
      }
    } catch (error: any) {
      console.error('创建项目失败:', error)
      showToast('error', error.response?.data?.message || t('notification.projectCreateFailedRetry', { defaultValue: 'Failed to create project, please try again later' }))
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setProjectName('')
    setProjectDescription('')
    onClose()
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                {/* 标题栏 */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    {t('project.newProject')}
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* 内容 */}
                <form onSubmit={handleSubmit} className="px-6 py-4">
                  <div className="space-y-4">
                    {/* 项目名称 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('project.projectName')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={t('project.projectNamePlaceholder', { defaultValue: 'e.g., ESP32 Debug Project' })}
                        disabled={isLoading}
                      />
                    </div>

                    {/* 项目描述 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('project.projectDescription')} ({t('share.optional', { defaultValue: 'Optional' })})
                      </label>
                      <textarea
                        value={projectDescription}
                        onChange={(e) => setProjectDescription(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder={t('project.projectDescPlaceholder', { defaultValue: 'Briefly describe the project purpose and goals...' })}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </form>

                {/* 底部按钮 */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                  <button
                    onClick={handleClose}
                    className="btn-secondary px-4 py-2 text-sm"
                    disabled={isLoading}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="btn-primary px-4 py-2 text-sm"
                    disabled={isLoading}
                  >
                    {isLoading ? t('project.creating', { defaultValue: 'Creating...' }) : t('project.createProject')}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

