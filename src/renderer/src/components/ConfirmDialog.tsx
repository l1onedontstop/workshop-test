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
  variant?: 'default' | 'warning' | 'success'
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

  const variantStyles = {
    default: 'bg-brand-600 hover:bg-brand-500',
    warning: 'bg-yellow-600 hover:bg-yellow-500',
    success: 'bg-green-600 hover:bg-green-500'
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-[#1a1a24] border border-white/10 rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl animate-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Content */}
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-white/50 mb-6 leading-relaxed">{message}</p>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          {secondaryLabel && onSecondary && (
            <button
              onClick={onSecondary}
              className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/50 text-sm transition-colors"
            >
              {secondaryLabel}
            </button>
          )}
          <button
            onClick={onPrimary}
            className={`px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-colors ${variantStyles[variant]}`}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
