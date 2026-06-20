import { X } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  primaryLabel: string
  secondaryLabel?: string
  onPrimary: () => void
  onSecondary?: () => void
  onClose: () => void
  variant?: 'default' | 'warning' | 'success' | 'danger'
}

export default function ConfirmDialog({
  open,
  title,
  message,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  onClose,
  variant = 'default'
}: ConfirmDialogProps) {
  if (!open) return null

  const primaryStyles = {
    default: 'bg-brand-600 hover:bg-brand-500 text-white',
    warning: 'bg-amber-600 hover:bg-amber-500 text-white',
    success: 'bg-green-600 hover:bg-green-500 text-white',
    danger: 'bg-red-600 hover:bg-red-500 text-white'
  }

  const iconColors = {
    default: 'text-brand-400',
    warning: 'text-amber-400',
    success: 'text-success-text',
    danger: 'text-danger-text'
  }

  const ringColors = {
    default: 'border-brand-500/20',
    warning: 'border-amber-500/20',
    success: 'border-success-border',
    danger: 'border-danger-border'
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className={`relative bg-app-elevated border ${ringColors[variant]} rounded-2xl w-full max-w-md mx-4 p-6 shadow-lg animate-slide-up`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Content */}
        <h3 className="text-lg font-semibold text-white/90 mb-2">{title}</h3>
        <p className="text-sm text-white/50 mb-6 leading-relaxed">{message}</p>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          {secondaryLabel && onSecondary && (
            <button
              onClick={onSecondary}
              className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.06] text-white/55 hover:text-white/75 text-sm font-medium transition-all duration-150"
            >
              {secondaryLabel}
            </button>
          )}
          <button
            onClick={onPrimary}
            className={`px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-all duration-150 hover:shadow-md active:scale-[0.98] ${primaryStyles[variant]}`}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
