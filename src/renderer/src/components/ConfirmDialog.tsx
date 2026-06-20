import { X } from 'lucide-react'
import Button from './ui/Button'

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

  const ringColors = {
    default: 'border-brand-500/20',
    warning: 'border-amber-500/20',
    success: 'border-success-border',
    danger: 'border-danger-border'
  }

  const buttonVariant = variant === 'danger' ? 'danger' : 'primary'

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
            <Button variant="ghost" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          )}
          <Button variant={buttonVariant} onClick={onPrimary}>
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
