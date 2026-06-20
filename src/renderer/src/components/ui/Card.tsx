import { forwardRef } from 'react'

type Level = 'subtle' | 'default' | 'elevated'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: Level
  interactive?: boolean
}

const levelClasses: Record<Level, string> = {
  subtle:
    'bg-white/[0.02] border border-white/[0.04] rounded-xl',
  default:
    'bg-white/[0.03] border border-white/[0.06] rounded-2xl',
  elevated:
    'bg-app-elevated border border-white/[0.08] rounded-2xl shadow-sm'
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ level = 'default', interactive = false, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${levelClasses[level]} ${interactive ? 'cursor-pointer hover:bg-white/[0.05] hover:border-white/[0.10] hover:shadow-glow active:scale-[0.99] transition-all duration-150' : ''} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'
export default Card
