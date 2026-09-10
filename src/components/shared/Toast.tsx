import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
}

interface ToastProps {
  toasts: ToastMessage[]
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setVisible(true), 10)
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onRemove(toast.id), 300)
    }, 3500)
    return () => clearTimeout(timer)
  }, [toast.id, onRemove])

  const icons = { success: CheckCircle, error: XCircle, info: Info }
  const colors = { success: '#10B981', error: '#EF4444', info: '#3B82F6' }
  const Icon = icons[toast.type]

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl transition-all duration-300"
      style={{
        background: '#1E2130',
        border: `1px solid ${colors[toast.type]}40`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        minWidth: 280,
      }}
    >
      <Icon style={{ color: colors[toast.type], width: 18, height: 18, flexShrink: 0 }} />
      <span className="text-sm text-white flex-1">{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} style={{ color: '#6B7280' }}>
        <X style={{ width: 14, height: 14 }} />
      </button>
    </div>
  )
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  )
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return { toasts, addToast, removeToast }
}
