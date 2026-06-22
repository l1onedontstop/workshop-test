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
    default: 'border-brand-200',
    warning: 'border-warning-border',
    success: 'border-success-border',
    danger: 'border-danger-border'
  }

  const buttonVariant = variant === 'danger' ? 'danger' : 'primary'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className={`relative bg-app-elevated border ${ringColors[variant]} rounded-2xl w-full max-w-md mx-4 p-6 shadow-lg animate-slide-up`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-black/[0.04] text-ink-tertiary hover:text-ink-primary transition-colors"
        >
          <X size={16} />
        </button>

        {/* Content */}
        <h3 className="text-lg font-semibold text-ink-primary mb-2">{title}</h3>
        <p className="text-sm text-ink-secondary mb-6 leading-relaxed">{message}</p>

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
