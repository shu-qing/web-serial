import { Transition } from '@headlessui/react'
import { Fragment } from 'react'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
  show: boolean
  type: ToastType
  message: string
  onClose: () => void
}

export default function Toast({ show, type, message, onClose }: ToastProps) {
  const icons = {
    success: CheckCircleIcon,
    error: ExclamationCircleIcon,
    info: InformationCircleIcon,
    warning: ExclamationCircleIcon,
  }

  const colors = {
    success: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200',
    error: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-200',
    info: 'bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    warning: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  }

  const Icon = icons[type]

  return (
    <Transition
      show={show}
      as={Fragment}
      enter="transform ease-out duration-300 transition"
      enterFrom="translate-y-2 opacity-0"
      enterTo="translate-y-0 opacity-100"
      leave="transition ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className={`${colors[type]} rounded-lg shadow-lg p-4 flex items-center gap-3 max-w-md`}>
        <Icon className="w-6 h-6 shrink-0" />
        <p className="text-sm font-medium flex-1">{message}</p>
        <button
          onClick={onClose}
          className="p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </Transition>
  )
}

