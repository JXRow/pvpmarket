export default function ToastStack({ toasts }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div className={`toast-card ${toast.closing ? 'closing' : 'open'}`} key={toast.id}>
          {toast.content}
        </div>
      ))}
    </div>
  )
}
