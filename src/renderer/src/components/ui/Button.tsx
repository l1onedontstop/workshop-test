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
    'bg-brand-600 text-white shadow-sm ' +
    'hover:bg-brand-500 hover:shadow-md ' +
    'active:scale-[0.98] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg ' +
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-brand-600 disabled:active:scale-100',

  secondary:
    'bg-white/[0.06] text-white/70 border border-white/[0.06] ' +
    'hover:bg-white/[0.10] hover:text-white/85 hover:border-white/[0.10] ' +
    'active:scale-[0.98] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg ' +
    'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/[0.06] disabled:active:scale-100',

  ghost:
    'text-white/50 ' +
    'hover:bg-white/[0.06] hover:text-white/75 ' +
    'active:scale-[0.98] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-app-bg ' +
    'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:active:scale-100',

  danger:
    'bg-danger-surface text-danger-text border border-danger-border ' +
    'hover:bg-red-600/25 hover:text-danger-text hover:border-red-500/30 ' +
    'active:scale-[0.98] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg ' +
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-danger-surface disabled:active:scale-100'
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-base rounded-lg gap-2'
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
