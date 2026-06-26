import { useAppStore } from '../stores/appStore'
import {
  PenLine,
  Lightbulb,
  Send,
  BarChart3,
  Sparkles,
  ArrowRight,
  Save,
  FileText,
  TrendingUp,
  Brain,
  Clock,
  Layout,
  Trash2,
  Zap,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Play
} from 'lucide-react'
import { useMemo, useState, useCallback, useEffect } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

interface ProjectPageProps {
  onNewScript?: () => void
  onTopicInspiration?: () => void
  onPublish?: () => void
  onRetro?: () => void
  onPlans?: () => void
  onNewProject?: () => void
  onNavigateToPlan?: (planId: string) => void
  onNavigateToScript?: (scriptFile?: string) => void
  onNavigateToRetro?: () => void
  onNavigateToBlueprint?: () => void
}

interface CoachSuggestion {
  title: string
  message: string
  actionLabel: string
  action: (() => void) | undefined
  variant: 'primary' | 'secondary' | 'warning'
}

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  script_saved: Save,
  script_published: Send,
  retro_completed: TrendingUp,
  rubric_evolved: Brain,
  plan_created: Layout,
  plan_completed: Layout
}

const ACTIVITY_COLORS: Record<string, string> = {
  script_saved: 'text-info-text',
  script_published: 'text-success-text',
  retro_completed: 'text-warning-text',
  rubric_evolved: 'text-brand-600',
  plan_created: 'text-info-text',
  plan_completed: 'text-info-text'
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return '刚刚'
    if (diffMin < 60) return `${diffMin} 分钟前`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr} 小时前`
    const diffDay = Math.floor(diffHr / 24)
    if (diffDay < 7) return `${diffDay} 天前`
    return d.toLocaleDateString('zh-CN')
  } catch { return '' }
}

function getCoachSuggestion(
  totalPredicted: number,
  totalPublished: number,
  activities: Array<{ type: string; timestamp: string }>,
  callbacks: { onNewScript?: () => void; onPublish?: () => void; onRetro?: () => void; onTopicInspiration?: () => void },
  bufferColor?: string | null
): CoachSuggestion {
  const pending = totalPredicted - totalPublished

  // Buffer-based suggestions take priority
  if (bufferColor === 'red') {
    return { title: '库存告急', message: '缓冲区已空——今天必须拍摄新内容，否则发布节奏会断档。', actionLabel: '去写脚本', action: callbacks.onNewScript, variant: 'warning' }
  }
  if (bufferColor === 'orange') {
    return { title: '库存偏低', message: '缓冲区即将耗尽，建议优先安排拍摄，保持内容持续输出。', actionLabel: '去拍摄', action: callbacks.onNewScript, variant: 'warning' }
  }
  if (bufferColor === 'blue') {
    return { title: '库存积压', message: '缓冲区过满——先发布已有库存，暂停拍新内容，避免内容积压贬值。', actionLabel: '去发布', action: callbacks.onPublish, variant: 'primary' }
  }

  if (totalPredicted === 0) {
    return { title: '万事开头难', message: '你还没有写过脚本。内容和选题想再多，不如先写出第一条——拍出来才是真正的开始。', actionLabel: '写第一条脚本', action: callbacks.onNewScript, variant: 'primary' }
  }
  if (pending > 0) {
    return { title: '别让好内容烂在仓库里', message: `你有 ${pending} 条已完成但未发布的脚本。内容在文件夹里不会产生任何播放量，挑一条最好的先发出去。`, actionLabel: '去发布', action: callbacks.onPublish, variant: 'primary' }
  }
  const retroCount = activities.filter((a) => a.type === 'retro_completed').length
  if (totalPublished > 0 && retroCount === 0) {
    return { title: '发完不看数据等于白干', message: `你已经发布了 ${totalPublished} 条视频，但还没做过复盘。每条数据都是免费的观众调研——花 5 分钟看一看，下次写得更好。`, actionLabel: '去复盘', action: callbacks.onRetro, variant: 'warning' }
  }
  const lastRubricEvolved = activities.find((a) => a.type === 'rubric_evolved')
  if (retroCount >= 3 && !lastRubricEvolved) {
    return { title: '是时候进化评分规则了', message: `你已经完成了 ${retroCount} 次复盘，数据足够让 AI 帮你重新校准评分维度权重。`, actionLabel: '进化 Rubric', action: callbacks.onRetro, variant: 'warning' }
  }
  const lastActivity = activities[0]
  if (lastActivity?.type === 'retro_completed') {
    return { title: '用新脚本验证复盘收获', message: '刚复盘完，趁热打铁——把复盘中学到的洞察用在下一篇脚本里。', actionLabel: '写新脚本', action: callbacks.onNewScript, variant: 'secondary' }
  }
  return { title: '保持内容新鲜度', message: '选题是内容的第一生产力。让 AI 帮你根据受众画像和过往数据，挖掘下一批有爆款潜力的选题。', actionLabel: '选题灵感', action: callbacks.onTopicInspiration, variant: 'secondary' }
}

const VARIANT_STYLES: Record<CoachSuggestion['variant'], { gradient: string; border: string; badge: string; button: string }> = {
  primary: { gradient: 'from-brand-50 to-brand-50', border: 'border-brand-200', badge: 'bg-brand-100 text-brand-600', button: 'bg-brand-600 hover:bg-brand-500' },
  secondary: { gradient: 'from-black/[0.03] to-black/[0.01]', border: 'border-rule', badge: 'bg-black/[0.04] text-ink-tertiary', button: 'bg-black/[0.06] hover:bg-black/[0.10] text-ink-secondary' },
  warning: { gradient: 'from-warning-surface to-warning-surface', border: 'border-warning-border', badge: 'bg-warning-surface text-warning-text', button: 'bg-warning hover:bg-warning' }
}

export default function ProjectPage({ onNewScript, onTopicInspiration, onPublish, onRetro, onPlans, onNewProject, onNavigateToPlan, onNavigateToScript, onNavigateToRetro, onNavigateToBlueprint }: ProjectPageProps) {
  const activeProject = useAppStore((s) => s.activeProject)
  const refreshActiveProject = useAppStore((s) => s.refreshActiveProject)
  const { loadProjects, setActiveProject } = useAppStore()

  if (!activeProject) {
    return (
      <div className="flex items-center justify-center h-full text-ink-tertiary">
        <p>请先创建项目</p>
      </div>
    )
  }

  const activities = activeProject.state.activities || []
  const [activityPage, setActivityPage] = useState(0)
  const ACTIVITY_PAGE_SIZE = 10
  const totalPages = Math.max(1, Math.ceil(activities.length / ACTIVITY_PAGE_SIZE))
  const pagedActivities = activities.slice(activityPage * ACTIVITY_PAGE_SIZE, (activityPage + 1) * ACTIVITY_PAGE_SIZE)

  const [confirmDialog, setConfirmDialog] = useState<{ type: 'shoot' | 'publish' | 'reset' | 'delete'; title: string; message: string } | null>(null)
  const [resetLoading, setResetLoading] = useState(false)

  const handleResetAll = async () => {
    if (!activeProject) return
    setResetLoading(true)
    try { await window.api.resetProject(activeProject.path); await refreshActiveProject(); setConfirmDialog(null) }
    catch (err) { console.error('Reset failed:', err) }
    finally { setResetLoading(false) }
  }

  const handleDeleteProject = async () => {
    if (!activeProject) return
    setResetLoading(true)
    try { await window.api.deleteProject(activeProject.path); await loadProjects(true); setConfirmDialog(null) }
    catch (err) { console.error('Delete failed:', err) }
    finally { setResetLoading(false) }
  }

  const [scriptsList, setScriptsList] = useState<Array<{ name: string; path: string }>>([])
  const [scriptsLoading, setScriptsLoading] = useState(false)

  // Calendar state
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week')
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [bufferState, setBufferState] = useState<{ count: number; color: string; bufferDays: number; message: string } | null>(null)
  // Track which dates have published vs predicted-only content
  const [publishedDates, setPublishedDates] = useState<Set<string>>(new Set())
  const [predictedDates, setPredictedDates] = useState<Set<string>>(new Set())

  // Load cadence buffer state on mount / project change
  useEffect(() => {
    if (!activeProject) return
    window.api.cadenceBuffer(activeProject.path).then((data: any) => setBufferState(data)).catch(() => {})
  }, [activeProject])

  // Load prediction dates for calendar marking
  useEffect(() => {
    if (!activeProject) return
    const loadDates = async () => {
      try {
        const preds = await window.api.listPredictions(activeProject.path) as Array<{ name: string; path: string }>
        const pubSet = new Set<string>()
        const predSet = new Set<string>()
        for (const p of preds) {
          try {
            const raw = await window.api.readFile(p.path) as string
            const data = JSON.parse(raw)
            // Extract date from predictedAt or scriptFile name (YYYY-MM-DD_xxx)
            const dateStr = data.predictedAt
              ? new Date(data.predictedAt).toISOString().slice(0, 10)
              : data.scriptFile?.slice(0, 10) || ''
            if (dateStr) {
              if (data.status === 'retro_completed' || data.publishedAt) {
                pubSet.add(dateStr)
              } else {
                predSet.add(dateStr)
              }
            }
          } catch { /* skip unreadable */ }
        }
        setPublishedDates(pubSet)
        setPredictedDates(predSet)
      } catch { /* no predictions */ }
    }
    loadDates()
  }, [activeProject])

  const handleManageScripts = useCallback(async () => {
    if (!activeProject) return
    setScriptsLoading(true)
    try { setScriptsList(await window.api.listScripts(activeProject.path)) }
    catch (err) { console.error('Failed to list scripts:', err) }
    finally { setScriptsLoading(false) }
  }, [activeProject])

  const coachSuggestion = useMemo(
    () => getCoachSuggestion(activeProject.state.totalPredicted || 0, activeProject.state.totalPublished || 0, activities, { onNewScript, onPublish, onRetro, onTopicInspiration }, bufferState?.color),
    [activeProject.state.totalPredicted, activeProject.state.totalPublished, activities.length, bufferState?.color]
  )

  const styles = VARIANT_STYLES[coachSuggestion.variant]

  const quickActions = [
    { icon: Sparkles, label: 'IP 蓝图', desc: '定位、策略与行动计划', color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-200', action: onNavigateToBlueprint },
    { icon: PenLine, label: '写脚本', desc: 'AI写作 + 即时打分', color: 'text-info-text', bg: 'bg-info-surface', border: 'border-info-border', action: onNewScript },
    { icon: FileText, label: '管脚本', desc: `查看/编辑/删除${scriptsList.length > 0 ? ` · ${scriptsList.length}条` : ''}`, color: 'text-warning-text', bg: 'bg-warning-surface', border: 'border-warning-border', action: handleManageScripts },
    { icon: Lightbulb, label: '选题', desc: 'AI推荐爆款选题', color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-200', action: onTopicInspiration },
    { icon: Send, label: '发布', desc: '标题+简介+话题', color: 'text-success-text', bg: 'bg-success-surface', border: 'border-success-border', action: onPublish },
    { icon: BarChart3, label: '复盘', desc: '数据驱动进化', color: 'text-warning-text', bg: 'bg-warning-surface', border: 'border-warning-border', action: onRetro },
    { icon: Layout, label: '方案', desc: '系统化内容计划', color: 'text-info-text', bg: 'bg-info-surface', border: 'border-info-border', action: onPlans }
  ]

  // Pipeline stats
  const predicted = activeProject.state.totalPredicted || 0
  const published = activeProject.state.totalPublished || 0
  const buffer = activeProject.state.bufferCount || (predicted - published)

  return (
    <div className="px-8 py-6 max-w-5xl mx-auto h-full overflow-y-auto">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-xl font-semibold text-ink-primary mb-1">{activeProject.name}</h1>
        <p className="text-sm text-ink-tertiary">
          已发布 {published} 条 · 预测中 {predicted} 条 · 待复盘 {published} 条
        </p>
      </header>

      {/* AI Coach */}
      <div className={`bg-gradient-to-r ${styles.gradient} border ${styles.border} rounded-2xl p-5 mb-8 shadow-sm`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${styles.badge}`}><Sparkles size={18} /></div>
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">AI教练 · {coachSuggestion.title}</h2>
            <p className="text-xs text-ink-tertiary mt-0.5">{coachSuggestion.message}</p>
          </div>
        </div>
        {coachSuggestion.action && (
          <Button
            variant={coachSuggestion.variant === 'secondary' ? 'secondary' : 'primary'}
            onClick={coachSuggestion.action}
            icon={<ArrowRight size={15} />}
          >
            {coachSuggestion.actionLabel}
          </Button>
        )}
      </div>

      {/* Quick actions — 4-col grid */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {quickActions.slice(0, 4).map((a) => {
          const Icon = a.icon
          return (
            <Card key={a.label} level="subtle" interactive={!!a.action} onClick={a.action} className={`flex flex-col items-center gap-3 p-4 text-center h-full ${a.action ? 'hover:scale-[1.02]' : ''} ${!a.action ? 'opacity-40 cursor-not-allowed' : ''}`}>
              <div className={`p-2.5 rounded-lg ${a.bg}`}><Icon size={22} className={a.color} /></div>
              <div>
                <div className="text-sm font-medium text-ink-primary">{a.label}</div>
                <div className="text-[11px] text-ink-tertiary mt-0.5">{a.desc}</div>
              </div>
            </Card>
          )
        })}
      </div>
      <div className="grid grid-cols-3 gap-3 mb-8">
        {quickActions.slice(4).map((a) => {
          const Icon = a.icon
          return (
            <Card key={a.label} level="subtle" interactive={!!a.action} onClick={a.action} className={`flex flex-col items-center gap-3 p-4 text-center h-full ${a.action ? 'hover:scale-[1.02]' : ''} ${!a.action ? 'opacity-40 cursor-not-allowed' : ''}`}>
              <div className={`p-2.5 rounded-lg ${a.bg}`}><Icon size={22} className={a.color} /></div>
              <div>
                <div className="text-sm font-medium text-ink-primary">{a.label}</div>
                <div className="text-[11px] text-ink-tertiary mt-0.5">{a.desc}</div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* ── One-Click Workflow: Fast Track ── */}
      <Card level="subtle" className="mb-8 p-5 bg-gradient-to-r from-brand-50/50 to-info-surface/50 border-brand-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-brand-100">
            <Zap size={18} className="text-brand-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-primary">快速创作 · 一键成片</h3>
            <p className="text-xs text-ink-tertiary">从选题到发布，3 步串联 — 省去页面跳转</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {[
            { step: 1, label: 'AI选题', desc: '智能推荐爆款选题', action: onTopicInspiration, color: 'bg-brand-100 text-brand-600 border-brand-200' },
            { step: 2, label: '写脚本', desc: '一键生成+评分', action: onNewScript, color: 'bg-info-surface text-info-text border-info-border' },
            { step: 3, label: '发布包', desc: '标题·简介·话题标签', action: onPublish, color: 'bg-success-surface text-success-text border-success-border' }
          ].map((s, i, arr) => (
            <div key={s.step} className="flex items-center gap-3 flex-1">
              <button
                onClick={s.action}
                className={`flex-1 flex items-center gap-3 p-3 rounded-xl border ${s.color} hover:scale-[1.02] transition-transform text-left`}
              >
                <span className="w-6 h-6 rounded-full bg-white/60 flex items-center justify-center text-xs font-bold">{s.step}</span>
                <div>
                  <div className="text-xs font-medium">{s.label}</div>
                  <div className="text-[10px] opacity-60">{s.desc}</div>
                </div>
                <Play size={14} className="ml-auto opacity-40" />
              </button>
              {i < arr.length - 1 && <ChevronRight size={14} className="text-ink-disabled shrink-0" />}
            </div>
          ))}
        </div>
      </Card>

      {/* ── Content Calendar ── */}
      <Card level="subtle" className="mb-8 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} className="text-brand-600" />
          <h3 className="text-sm font-medium text-ink-tertiary">内容日历</h3>
          {/* Navigation */}
          <div className="flex items-center gap-0.5 ml-2">
            <button
              onClick={() => {
                const d = new Date(calendarDate)
                if (calendarView === 'week') d.setDate(d.getDate() - 7)
                else d.setMonth(d.getMonth() - 1)
                setCalendarDate(d)
                setSelectedDay(null)
              }}
              className="p-1 rounded hover:bg-black/[0.04] transition-colors"
            >
              <ChevronLeft size={14} className="text-ink-disabled" />
            </button>
            <span className="text-xs text-ink-primary font-medium min-w-[80px] text-center">
              {calendarView === 'week'
                ? (() => {
                    const ws = new Date(calendarDate)
                    ws.setDate(ws.getDate() - ws.getDay() + 1)
                    const we = new Date(ws); we.setDate(ws.getDate() + 6)
                    return `${ws.getMonth() + 1}/${ws.getDate()} - ${we.getMonth() + 1}/${we.getDate()}`
                  })()
                : `${calendarDate.getFullYear()}年${calendarDate.getMonth() + 1}月`
              }
            </span>
            <button
              onClick={() => {
                const d = new Date(calendarDate)
                if (calendarView === 'week') d.setDate(d.getDate() + 7)
                else d.setMonth(d.getMonth() + 1)
                setCalendarDate(d)
                setSelectedDay(null)
              }}
              className="p-1 rounded hover:bg-black/[0.04] transition-colors"
            >
              <ChevronRight size={14} className="text-ink-disabled" />
            </button>
          </div>
          {/* Today button */}
          <button
            onClick={() => { setCalendarDate(new Date()); setSelectedDay(null) }}
            className="text-[10px] text-brand-600 hover:text-brand-500 font-medium px-2 py-0.5 rounded border border-brand-200 hover:bg-brand-50 transition-colors"
          >
            今天
          </button>
          {/* View toggle */}
          <div className="flex items-center gap-0 ml-auto bg-black/[0.04] rounded-lg p-0.5">
            {(['week', 'month'] as const).map(v => (
              <button
                key={v}
                onClick={() => { setCalendarView(v); setSelectedDay(null) }}
                className={`text-[10px] px-3 py-1 rounded-md transition-colors ${
                  calendarView === v
                    ? 'bg-white shadow-sm text-ink-primary font-medium'
                    : 'text-ink-disabled hover:text-ink-tertiary'
                }`}
              >
                {v === 'week' ? '周' : '月'}
              </button>
            ))}
          </div>
        </div>

        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-1">
          {['一', '二', '三', '四', '五', '六', '日'].map((d, i) => (
            <div key={d} className={`text-center text-[10px] font-medium py-1 ${i >= 5 ? 'text-ink-disabled/50' : 'text-ink-disabled'}`}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {(() => {
            const today = new Date()
            const todayStr = today.toDateString()
            const cells: Array<{ date: Date; inMonth: boolean }> = []

            if (calendarView === 'week') {
              // Week view
              const weekStart = new Date(calendarDate)
              weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
              for (let i = 0; i < 7; i++) {
                const d = new Date(weekStart)
                d.setDate(weekStart.getDate() + i)
                cells.push({ date: d, inMonth: true })
              }
            } else {
              // Month view
              const monthFirst = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1)
              const startDay = monthFirst.getDay() || 7 // Monday=1 ... Sunday=7
              // Fill leading days from prev month
              for (let i = 1; i < startDay; i++) {
                const d = new Date(monthFirst)
                d.setDate(d.getDate() - (startDay - i))
                cells.push({ date: d, inMonth: false })
              }
              // Fill current month days
              const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate()
              for (let i = 1; i <= daysInMonth; i++) {
                cells.push({ date: new Date(calendarDate.getFullYear(), calendarDate.getMonth(), i), inMonth: true })
              }
              // Fill trailing days to complete last week
              const remaining = 7 - (cells.length % 7)
              if (remaining < 7) {
                const lastDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0)
                for (let i = 1; i <= remaining; i++) {
                  const d = new Date(lastDay)
                  d.setDate(lastDay.getDate() + i)
                  cells.push({ date: d, inMonth: false })
                }
              }
            }

            return cells.map((cell, i) => {
              const dateStr = cell.date.toISOString().slice(0, 10)
              const isToday = dateStr === todayStr
              const isSelected = selectedDay?.toISOString().slice(0, 10) === dateStr
              const isPublished = publishedDates.has(dateStr)
              const isPredicted = predictedDates.has(dateStr)
              const hasContent = isPublished || isPredicted
              const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6
              const isFuture = cell.date > today

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(isSelected ? null : cell.date)}
                  className={`text-center py-1.5 rounded-lg text-xs transition-colors relative ${
                    !cell.inMonth
                      ? 'text-ink-disabled/30 cursor-default'
                      : isToday
                      ? 'bg-brand-600 text-white font-semibold hover:bg-brand-500'
                      : isSelected
                      ? 'bg-brand-100 text-brand-600 font-medium ring-1 ring-brand-300'
                      : isFuture
                      ? 'text-ink-disabled/50 cursor-default'
                      : isPublished
                      ? 'bg-success-surface/60 border border-success-border/30 text-success-text hover:bg-success-surface'
                      : isPredicted
                      ? 'bg-warning-surface/40 border border-warning-border/20 text-warning-text hover:bg-warning-surface/60'
                      : 'text-ink-secondary hover:bg-black/[0.04]'
                  }`}
                  style={calendarView === 'month' ? { minHeight: 32 } : {}}
                  disabled={!cell.inMonth || isFuture}
                >
                  <span>{cell.date.getDate()}</span>
                  {isPublished && (
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-success-text" />
                  )}
                  {isPredicted && !isPublished && (
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-ink-disabled/40 ring-1 ring-ink-disabled/20" />
                  )}
                  {isWeekend && cell.inMonth && !isToday && !isFuture && !hasContent && (
                    <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-ink-disabled/30" />
                  )}
                </button>
              )
            })
          })()}
        </div>

        {/* Selected day info */}
        {selectedDay && (
          <div className="mt-3 pt-3 border-t border-rule-subtle flex items-center justify-between">
            <span className="text-xs text-ink-secondary">
              📅 {selectedDay.getFullYear()}/{selectedDay.getMonth() + 1}/{selectedDay.getDate()}
              {selectedDay.toDateString() === new Date().toDateString() ? ' · 今天' : ''}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onNewScript?.()}>
                + 写脚本
              </Button>
            </div>
          </div>
        )}

        {/* Legend */}
        {(publishedDates.size > 0 || predictedDates.size > 0) && (
          <div className="mt-2 pt-2 border-t border-rule-subtle flex items-center gap-4 text-[10px] text-ink-disabled">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success-text" /> 已发布
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-ink-disabled/40 ring-1 ring-ink-disabled/20" /> 已预测未发布
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-ink-disabled/30" /> 周末
            </span>
          </div>
        )}
        {predicted === 0 && (
          <p className="text-center text-xs text-ink-disabled py-4">
            暂无排期内容 — 写完脚本并发布后，日历会自动标记
          </p>
        )}
      </Card>

      {/* Pipeline bar — compact with cadence buffer indicator */}
      {predicted > 0 && (
        <Card level="subtle" className="mb-8 p-4">
          {/* Buffer status indicator */}
          {bufferState && (
            <div className={`mb-3 px-3 py-2 rounded-lg flex items-center gap-3 ${
              bufferState.color === 'red' ? 'bg-danger-text/10 border border-danger-text/20' :
              bufferState.color === 'orange' ? 'bg-warning-surface border border-warning-border' :
              bufferState.color === 'green' ? 'bg-success-surface border border-success-border/30' :
              bufferState.color === 'blue' ? 'bg-info-surface border border-info-border' :
              'bg-black/[0.02] border border-rule-subtle'
            }`}>
              <span className={`w-3 h-3 rounded-full shrink-0 ${
                bufferState.color === 'red' ? 'bg-danger-text' :
                bufferState.color === 'orange' ? 'bg-warning' :
                bufferState.color === 'green' ? 'bg-success-text' :
                bufferState.color === 'blue' ? 'bg-info-text' :
                'bg-ink-disabled'
              }`} />
              <span className={`text-sm font-medium ${
                bufferState.color === 'red' ? 'text-danger-text' :
                bufferState.color === 'orange' ? 'text-warning-text' :
                bufferState.color === 'green' ? 'text-success-text' :
                bufferState.color === 'blue' ? 'text-info-text' :
                'text-ink-tertiary'
              }`}>
                {bufferState.color === 'red' ? '红色预警' :
                 bufferState.color === 'orange' ? '橙色预警' :
                 bufferState.color === 'green' ? '绿色健康' :
                 bufferState.color === 'blue' ? '蓝色积压' : '未知'}
                {' · '}缓冲 {bufferState.bufferDays} 天
              </span>
              <span className="text-xs text-ink-tertiary ml-auto">{bufferState.message}</span>
            </div>
          )}
          {/* Pipeline stats */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-ink-tertiary font-medium">管道</span>
            {[
              { label: '脚本', n: predicted },
              { label: '待拍', n: bufferState?.count ?? buffer },
              { label: '已发', n: published },
              { label: '待复盘', n: published }
            ].map((s, i, arr) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className={`font-mono font-semibold ${s.n > 0 ? 'text-ink-tertiary' : 'text-ink-disabled'}`}>{s.n}</span>
                <span className={s.n > 0 ? 'text-ink-tertiary' : 'text-ink-disabled'}>{s.label}</span>
                {i < arr.length - 1 && <span className="text-ink-disabled mx-0.5">·</span>}
              </span>
            ))}
            {!bufferState && buffer === 0 && (
              <span className="ml-auto text-[11px] text-danger-text/70 font-medium">库存告急</span>
            )}
          </div>
        </Card>
      )}

      {/* Script list (manage) */}
      {scriptsList.length > 0 && (
        <Card level="subtle" className="mb-8 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-ink-tertiary">已有脚本 · {scriptsList.length} 条</h3>
            <button onClick={() => setScriptsList([])} className="text-xs text-ink-disabled hover:text-ink-tertiary">收起</button>
          </div>
          <div className="space-y-1 mb-3">
            {scriptsList.slice(0, 10).map((s) => (
              <Button key={s.name} variant="ghost" onClick={() => onNavigateToScript?.(s.name)} className="w-full justify-between">
                <span className="text-sm text-ink-secondary truncate">{s.name.replace('.md', '')}</span>
                <ArrowRight size={14} className="text-ink-disabled shrink-0" />
              </Button>
            ))}
          </div>
        </Card>
      )}
      {scriptsLoading && (
        <div className="mb-8 text-center">
          <p className="text-sm text-ink-disabled">加载中...</p>
        </div>
      )}

      {/* Pipeline actions */}
      {predicted > 0 && (
        <Card level="subtle" className="mb-8 p-4">
          <h3 className="text-sm font-medium text-ink-tertiary mb-3">管道推进</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="secondary" onClick={() => setConfirmDialog({ type: 'shoot', title: '确认拍摄状态', message: '这条脚本已经写好了 —— 你拍了吗？拍完告诉 AI，它会帮你生成发布资料包。' })}>
              确认拍摄
            </Button>
            <span className="text-ink-disabled text-xs">→</span>
            <Button variant="secondary" onClick={() => setConfirmDialog({ type: 'publish', title: '确认发布状态', message: '视频已经发布了吗？发布后记得登记链接，T+3 天后 AI 会提醒你复盘数据。' })}>
              确认发布
            </Button>
          </div>
        </Card>
      )}

      {/* Activity timeline */}
      <div className="mt-10 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-ink-tertiary">
            最近活动{activities.length > 0 && <span className="text-ink-disabled ml-1">· {activities.length} 条</span>}
          </h3>
        </div>
        {activities.length > 0 ? (
          <>
            <div className="space-y-0">
              {pagedActivities.map((entry, i) => {
                const IconComp = ACTIVITY_ICONS[entry.type] || Clock
                const iconColor = ACTIVITY_COLORS[entry.type] || 'text-ink-disabled'
                const clickable = entry.navTarget || (entry.type === 'script_saved' && entry.scriptFile) || entry.planId
                const handleClick = () => {
                  if (entry.navTarget === 'plan-editor' && entry.planId) onNavigateToPlan?.(entry.planId)
                  else if (entry.navTarget === 'script-editor' || (entry.type === 'script_saved' && entry.scriptFile)) onNavigateToScript?.(entry.scriptFile)
                  else if (entry.navTarget === 'retro') onNavigateToRetro?.()
                  else if (entry.navTarget === 'publish' || entry.type === 'script_published') onPublish?.()
                  else if (entry.type === 'plan_created' || entry.type === 'plan_completed') onNavigateToPlan?.(entry.planId || '')
                }
                const content = (
                  <div className="flex items-start gap-3 py-2.5 border-b border-rule-subtle last:border-0">
                    <div className="p-1.5 rounded-md bg-black/[0.03] shrink-0 mt-0.5"><IconComp size={14} className={iconColor} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink-secondary truncate">{entry.label}</p>
                      {entry.detail && <p className="text-xs text-ink-disabled mt-0.5">{entry.detail}</p>}
                    </div>
                    <span className="text-xs text-ink-disabled shrink-0 mt-1">{formatTime(entry.timestamp)}</span>
                  </div>
                )
                return clickable ? <button key={i} onClick={handleClick} className="w-full text-left hover:bg-black/[0.02] transition-colors">{content}</button> : <div key={i}>{content}</div>
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-4">
                <Button variant="ghost" size="sm" onClick={() => setActivityPage((p) => Math.max(0, p - 1))} disabled={activityPage === 0}>
                  上一页
                </Button>
                <span className="text-xs text-ink-disabled">{activityPage + 1} / {totalPages}</span>
                <Button variant="ghost" size="sm" onClick={() => setActivityPage((p) => Math.min(totalPages - 1, p + 1))} disabled={activityPage >= totalPages - 1}>
                  下一页
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card level="subtle" className="text-center py-12">
            <p className="text-ink-disabled text-sm">还没有任何活动记录</p>
            <p className="text-ink-disabled text-xs mt-1">保存第一条脚本后，这里会显示你的创作时间线</p>
          </Card>
        )}

        {/* Danger zone */}
        <div className="mt-6 pt-4 border-t border-rule-subtle space-y-2">
          {(predicted > 0 || activities.length > 0) && (
            <Button variant="danger" onClick={() => setConfirmDialog({ type: 'reset', title: '清空项目数据', message: `确定要清空「${activeProject.name}」的所有数据吗？\n\n这将删除：\n· 所有已保存的脚本\n· 所有预测记录和报告\n· 所有活动历史\n\n此操作不可撤销。` })} icon={<Trash2 size={13} />} className="w-full">
              清空所有脚本和记录
            </Button>
          )}
          <Button variant="danger" onClick={() => setConfirmDialog({ type: 'delete', title: '删除项目', message: `确定要删除「${activeProject.name}」吗？\n\n这将永久删除：\n· 所有脚本、预测、报告\n· 评分规则进化记录\n· 对标分析数据\n· 整个项目目录\n\n此操作不可撤销！` })} icon={<Trash2 size={13} />} className="w-full">
            删除整个项目
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={confirmDialog !== null}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        primaryLabel={
          confirmDialog?.type === 'shoot' ? '已拍摄，生成发布资料包' :
          confirmDialog?.type === 'publish' ? '已发布，去登记链接' :
          confirmDialog?.type === 'reset' ? (resetLoading ? '清空中...' : '确认清空') :
          confirmDialog?.type === 'delete' ? '确认删除' : '确认'
        }
        secondaryLabel={(confirmDialog?.type === 'reset' || confirmDialog?.type === 'delete') ? '取消' : '还没呢'}
        variant={confirmDialog?.type === 'shoot' ? 'warning' : (confirmDialog?.type === 'reset' || confirmDialog?.type === 'delete') ? 'danger' : 'success'}
        onPrimary={async () => {
          if (confirmDialog?.type === 'shoot') {
            const scripts = await window.api.listScripts(activeProject.path)
            const shootId = scripts.length > 0 ? (scripts[0] as any).name?.replace('.md', '') || `shoot_${Date.now()}` : `shoot_${Date.now()}`
            const scriptFilename = scripts.length > 0 ? (scripts[0] as any).name : ''
            await window.api.cadenceShoot(activeProject.path, shootId, scriptFilename)
            await window.api.cadenceBuffer(activeProject.path).then((data: any) => setBufferState(data)).catch(() => {})
            await refreshActiveProject(); onPublish?.()
          } else if (confirmDialog?.type === 'publish') {
            const scripts = await window.api.listScripts(activeProject.path)
            const publishId = scripts.length > 0 ? (scripts[0] as any).name?.replace('.md', '') || `publish_${Date.now()}` : `publish_${Date.now()}`
            await window.api.cadencePublish(activeProject.path, publishId, { url: '', platform: '' })
            await window.api.cadenceBuffer(activeProject.path).then((data: any) => setBufferState(data)).catch(() => {})
            await refreshActiveProject(); onRetro?.()
          } else if (confirmDialog?.type === 'reset') { handleResetAll(); return }
          else if (confirmDialog?.type === 'delete') { handleDeleteProject(); return }
          setConfirmDialog(null)
        }}
        onSecondary={() => setConfirmDialog(null)}
        onClose={() => setConfirmDialog(null)}
      />
    </div>
  )
}
