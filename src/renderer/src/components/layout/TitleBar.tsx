import { useEffect, useState } from 'react'
import { useAppStore } from '../../stores/appStore'

export default function TitleBar() {
  const [version, setVersion] = useState('')
  const activeProject = useAppStore((s) => s.activeProject)

  useEffect(() => {
    window.api.getVersion?.().then((v: string) => setVersion(v)).catch(() => {})
  }, [])

  return (
    <div className="drag-region fixed top-0 left-0 right-0 h-12 bg-app-titlebar/90 backdrop-blur-xl border-b border-rule-subtle z-50 flex items-center pl-[80px] pr-4">
      <div className="flex items-center gap-2">
        {activeProject ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            <span className="text-ink-secondary font-medium">{activeProject.name}</span>
          </div>
        ) : (
          <span className="text-sm text-ink-tertiary font-medium select-none">SparkForge</span>
        )}
        {version && (
          <span className="text-[12px] text-ink-disabled select-none">v{version}</span>
        )}
      </div>
    </div>
  )
}
