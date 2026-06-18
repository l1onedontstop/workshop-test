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
  MessageSquare
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
  onNewProject?: () => void
}

const navItems = [
  { id: 'project', label: '工作台', icon: Home },
  { id: 'dashboard', label: '看板', icon: BarChart3 },
  { id: 'topic-pool', label: '选题池', icon: Lightbulb },
  { id: 'benchmark', label: '对标', icon: Target },
  { id: 'persona', label: '受众', icon: Users },
  { id: 'plan-list', label: '方案', icon: Layout },
  { id: 'settings', label: '设置', icon: Settings }
] as const

export default function Sidebar({ currentPage, onNavigate, onNewProject }: SidebarProps) {
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  return (
    <aside
      className={`no-drag flex flex-col border-r border-white/5 bg-[#0f0f13] transition-all duration-200 ${
        sidebarCollapsed ? 'w-16' : 'w-52'
      }`}
    >
      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="p-3 mx-2 mt-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors flex items-center justify-center"
      >
        <ChevronLeft
          size={18}
          className={`transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-600/15 text-brand-400'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              <Icon size={18} />
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
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors border border-dashed border-white/[0.06]"
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
            className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
            title="新建项目"
          >
            <Plus size={16} />
          </button>
        </div>
      )}

      {/* Active project indicator */}
      {!sidebarCollapsed && (
        <div className="px-3 py-3 border-t border-white/5">
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

  return (
    <div className="relative">
      <button
        onClick={() => setShowSwitcher(!showSwitcher)}
        className="w-full text-left text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        <div className="truncate">{activeProject.name}</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500/70" />
          {activeProject.state.phase === 'onboarding' ? '初始化中' : '进行中'}
          <span className="text-white/15 ml-auto">▾</span>
        </div>
      </button>

      {showSwitcher && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowSwitcher(false)} />
          <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-white/5 text-[10px] text-white/25">切换项目</div>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => { setActiveProject(p.id); setShowSwitcher(false) }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  p.id === activeProject.id
                    ? 'bg-brand-500/10 text-brand-300'
                    : 'text-white/50 hover:bg-white/[0.04] hover:text-white/70'
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
