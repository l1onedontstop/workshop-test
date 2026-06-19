import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    // Report to main process error handler if available
    try {
      window.api?.reportError?.({ type: 'ui_crash', error: error.message, stack: info.componentStack })
    } catch { /* ignore */ }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="h-screen flex items-center justify-center bg-[#0f0f13]">
          <div className="text-center max-w-md px-6">
            <div className="p-3 rounded-full bg-red-500/10 inline-block mb-4">
              <AlertTriangle size={28} className="text-red-400" />
            </div>
            <h2 className="text-white font-semibold text-lg mb-2">页面出现异常</h2>
            <p className="text-white/40 text-sm mb-2">
              应用遇到了一个意外错误。你可以尝试刷新页面恢复。
            </p>
            {this.state.error && (
              <p className="text-white/20 text-xs mb-6 font-mono truncate">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/70 text-sm transition-colors"
            >
              <RefreshCw size={14} />
              重试
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
