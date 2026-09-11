import { useEffect } from 'react'
import { useVault } from '../VaultContext'

export function ToastContainer() {
  const { toasts, removeToast } = useVault()

  useEffect(() => {
    const timers = toasts.map((toast) =>
      setTimeout(() => removeToast(toast.id), 3500)
    )
    return () => timers.forEach(clearTimeout)
  }, [toasts, removeToast])

  return (
    <div
      className="toast-container"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          role="alert"
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
