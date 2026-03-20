import { useUIStore } from '@/stores/useUIStore'
import Toast from './Toast'

export default function ToastContainer() {
  const { toasts, hideToast } = useUIStore()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          show={true}
          type={toast.type}
          message={toast.message}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </div>
  )
}

