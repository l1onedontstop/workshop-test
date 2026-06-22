import { forwardRef } from 'react'

type Level = 'subtle' | 'default' | 'elevated' | 'brand'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: Level
  interactive?: boolean
}

const levelClasses: Record<Level, string> = {
  subtle:
    'bg-app-surface border border-rule-subtle rounded-xl',
  default:
    'bg-app-surface border border-rule rounded-2xl shadow-sm',
  elevated:
    'bg-app-elevated border border-rule-strong rounded-2xl shadow-md',
  brand:
    'bg-brand-50 border border-brand-200 rounded-2xl shadow-sm border-l-[3px] border-l-brand-500'
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ level = 'default', interactive = false, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${levelClasses[level]} ${interactive ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-brand-300 active:scale-[0.99] transition-all duration-150' : ''} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'
export default Card
