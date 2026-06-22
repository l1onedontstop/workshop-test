import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, className = '', id, ...props }, ref) => {
    const inputId = id || label?.replace(/\s+/g, '-').toLowerCase()
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-ink-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-ink-primary placeholder:text-ink-disabled transition-all duration-150 hover:border-rule-strong focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-500/25 disabled:bg-black/[0.02] disabled:text-ink-disabled disabled:cursor-not-allowed disabled:hover:border-rule ${
            error ? 'border-danger-border' : 'border-rule'
          } ${className}`}
          {...props}
        />
        {(helperText || error) && (
          <p className={`text-xs ${error ? 'text-danger-text' : 'text-ink-tertiary'}`}>
            {error || helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// ── TextArea ──────────────────────────────────────────

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helperText?: string
  error?: string
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, helperText, error, className = '', id, ...props }, ref) => {
    const inputId = id || label?.replace(/\s+/g, '-').toLowerCase()
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-ink-secondary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-ink-primary placeholder:text-ink-disabled resize-y transition-all duration-150 hover:border-rule-strong focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-500/25 disabled:bg-black/[0.02] disabled:text-ink-disabled disabled:cursor-not-allowed disabled:hover:border-rule ${
            error ? 'border-danger-border' : 'border-rule'
          } ${className}`}
          {...props}
        />
        {(helperText || error) && (
          <p className={`text-xs ${error ? 'text-danger-text' : 'text-ink-tertiary'}`}>
            {error || helperText}
          </p>
        )}
      </div>
    )
  }
)

TextArea.displayName = 'TextArea'

export { Input, TextArea }
export default Input
