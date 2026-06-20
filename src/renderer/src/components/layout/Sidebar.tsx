import { useState } from 'react'
import {
  Home,
  Layout,
  Settings,
  Target,
  Users,
  Lightbulb,
  ChevronLeft,
  Plus,
  BarChart3,
  Sparkles,
  Flame
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
  onNewProject?: () => void
}

const navItems = [
  { id: 'project', label: '工作台', icon: Home },
  { id: 'blueprint', label: 'IP蓝图', icon: Sparkles },
  { id: 'dashboard', label: '看板', icon: BarChart3 },
  { id: 'topic-pool', label: '选题池', icon: Lightbulb },
  { id: 'trend-match', label: '热点匹配', icon: Flame },
  { id: 'benchmark', label: '对标', icon: Target },
  { id: 'persona', label: '受众', icon: Users },
  { id: 'plan-list', label: '方案', icon: Layout },
  { id: 'settings', label: '设置', icon: Settings }
] as const

export default function Sidebar({ currentPage, onNavigate, onNewProject }: SidebarProps) {
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  return (
    <aside
      className={`no-drag flex flex-col border-r border-white/[0.04] bg-app-bg transition-all duration-250 ${
        sidebarCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Brand / collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="mx-2 mt-2 p-3 rounded-xl hover:bg-white/[0.05] text-white/30 hover:text-white/60 transition-colors flex items-center gap-2.5"
      >
        <ChevronLeft
          size={18}
          className={`shrink-0 transition-transform duration-250 ${sidebarCollapsed ? 'rotate-180' : ''}`}
        />
        {!sidebarCollapsed && (
          <span className="text-sm font-semibold text-white/70 tracking-tight select-none">SparkForge</span>
        )}
      </button>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative ${
                isActive
                  ? 'bg-brand-500/8 text-brand-400 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-5 before:bg-brand-500 before:rounded-full'
                  : 'text-white/45 hover:text-white/70 hover:bg-white/[0.04] hover:translate-x-[2px]'
              }`}
            >
              <Icon size={18} className="shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* New project button */}
      {onNewProject && !sidebarCollapsed && (
        <div className="px-3 pb-3">
          <button
            onClick={onNewProject}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/35 hover:text-white/60 hover:bg-white/[0.04] transition-colors font-medium"
          >
            <Plus size={14} />
            新建项目
          </button>
        </div>
      )}
      {onNewProject && sidebarCollapsed && (
        <div className="px-2 pb-3 flex justify-center">
          <button
            onClick={onNewProject}
            className="p-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
            title="新建项目"
          >
            <Plus size={16} />
          </button>
        </div>
      )}

      {/* Active project indicator */}
      {!sidebarCollapsed && (
        <div className="px-3 py-3 border-t border-white/[0.04]">
          <ProjectBadge />
        </div>
      )}
    </aside>
  )
}

function ProjectBadge() {
  const activeProject = useAppStore((s) => s.activeProject)
  const projects = useAppStore((s) => s.projects)
  const setActiveProject = useAppStore((s) => s.setActiveProject)
  const [showSwitcher, setShowSwitcher] = useState(false)

  if (!activeProject) return null

  const initial = activeProject.name.charAt(0)

  return (
    <div className="relative">
      <button
        onClick={() => setShowSwitcher(!showSwitcher)}
        className="w-full text-left rounded-xl p-2 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-500/15 border border-brand-500/20 flex items-center justify-center text-brand-400 text-xs font-semibold shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-white/60 truncate">{activeProject.name}</div>
            <div className="text-[10px] text-white/25 mt-0.5">
              {activeProject.state.phase === 'onboarding' ? '初始化中' : '进行中'}
            </div>
          </div>
          <span className="text-white/15 shrink-0">▾</span>
        </div>
      </button>

      {showSwitcher && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowSwitcher(false)} />
          <div className="absolute bottom-full left-0 mb-2 w-48 bg-app-elevated border border-white/[0.08] rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-white/[0.04]">
              <span className="text-[10px] font-medium text-white/25">切换项目</span>
            </div>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => { setActiveProject(p.id); setShowSwitcher(false) }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  p.id === activeProject.id
                    ? 'bg-brand-500/8 text-brand-400'
                    : 'text-white/45 hover:bg-white/[0.04] hover:text-white/70'
                }`}
              >
                <div className="truncate">{p.name}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
