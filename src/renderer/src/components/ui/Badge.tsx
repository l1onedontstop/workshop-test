type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default:
    'bg-black/[0.04] text-ink-tertiary border-rule-subtle',
  success:
    'bg-success-surface text-success-text border-success-border',
  warning:
    'bg-warning-surface text-warning-text border-warning-border',
  danger:
    'bg-danger-surface text-danger-text border-danger-border',
  info:
    'bg-info-surface text-info-text border-info-border'
}

export default function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[12px] font-medium rounded-md border tracking-wide ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
