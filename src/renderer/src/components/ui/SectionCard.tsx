interface SectionCardProps {
  icon: React.ReactNode
  title: string
  color: 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'yellow' | 'cyan'
  fullWidth?: boolean
  children: React.ReactNode
}

const COLOR_MAP: Record<string, string> = {
  purple: 'border-brand-200 bg-brand-50',
  blue: 'border-info-border bg-info-surface',
  green: 'border-success-border bg-success-surface',
  orange: 'border-warning-border bg-warning-surface',
  red: 'border-danger-border bg-danger-surface',
  yellow: 'border-warning-border bg-warning-surface',
  cyan: 'border-info-border bg-info-surface'
}

const TEXT_COLOR_MAP: Record<string, string> = {
  purple: 'text-brand-600',
  blue: 'text-info-text',
  green: 'text-success-text',
  orange: 'text-warning-text',
  red: 'text-danger-text',
  yellow: 'text-warning-text',
  cyan: 'text-info-text'
}

export default function SectionCard({
  icon,
  title,
  color,
  fullWidth,
  children
}: SectionCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${COLOR_MAP[color]} ${fullWidth ? 'col-span-2' : ''}`}>
      <div className={`flex items-center gap-2 mb-2 ${TEXT_COLOR_MAP[color]}`}>
        {icon}
        <span className="text-xs font-medium">{title}</span>
      </div>
      {children}
    </div>
  )
}
