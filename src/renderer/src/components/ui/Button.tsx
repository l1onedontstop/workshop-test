import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-ink-inverse shadow-sm ' +
    'hover:bg-brand-700 hover:shadow-md ' +
    'active:scale-[0.98] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg ' +
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-brand-600 disabled:hover:shadow-sm disabled:active:scale-100',

  secondary:
    'bg-transparent text-ink-secondary border border-rule ' +
    'hover:bg-black/[0.03] hover:text-ink-primary hover:border-rule-strong ' +
    'active:scale-[0.98] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg ' +
    'disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-ink-secondary disabled:hover:border-rule disabled:active:scale-100',

  ghost:
    'text-ink-tertiary ' +
    'hover:bg-black/[0.04] hover:text-ink-primary ' +
    'active:scale-[0.98] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rule focus-visible:ring-offset-1 focus-visible:ring-offset-app-bg ' +
    'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-ink-tertiary disabled:active:scale-100',

  danger:
    'bg-danger-surface text-danger-text border border-danger-border ' +
    'hover:bg-danger-text/10 hover:border-danger-text/30 hover:text-danger-text ' +
    'active:scale-[0.98] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg ' +
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-danger-surface disabled:hover:border-danger-border disabled:active:scale-100'
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-6 py-2.5 text-base rounded-lg gap-2'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-medium transition-all duration-150 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 size={size === 'sm' ? 12 : 14} className="animate-spin shrink-0" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
