import { ChevronLeft } from 'lucide-react'

interface BackButtonProps {
  onClick: () => void
  label?: string
}

export default function BackButton({ onClick, label = '返回' }: BackButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 -ml-2 rounded-lg hover:bg-white/[0.05] text-white/30 hover:text-white/50 transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-app-bg"
    >
      <ChevronLeft size={16} />
      {label}
    </button>
  )
}
