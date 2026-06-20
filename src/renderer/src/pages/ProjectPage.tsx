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
  Trash2
} from 'lucide-react'
import { useMemo, useState, useCallback } from 'react'
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
  onNavigateToScript?: () => void
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
  rubric_evolved: 'text-brand-400',
  plan_created: 'text-cyan-400',
  plan_completed: 'text-cyan-400'
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
  callbacks: { onNewScript?: () => void; onPublish?: () => void; onRetro?: () => void; onTopicInspiration?: () => void }
): CoachSuggestion {
  const pending = totalPredicted - totalPublished

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
  primary: { gradient: 'from-brand-500/10 to-brand-500/10', border: 'border-brand-500/20', badge: 'bg-brand-500/20 text-brand-400', button: 'bg-brand-600 hover:bg-brand-500' },
  secondary: { gradient: 'from-white/[0.03] to-white/[0.01]', border: 'border-white/[0.06]', badge: 'bg-white/[0.06] text-white/50', button: 'bg-white/[0.08] hover:bg-white/[0.12] text-white/75' },
  warning: { gradient: 'from-orange-500/10 to-yellow-500/10', border: 'border-warning-border', badge: 'bg-orange-500/20 text-warning-text', button: 'bg-orange-600 hover:bg-orange-500' }
}

export default function ProjectPage({ onNewScript, onTopicInspiration, onPublish, onRetro, onPlans, onNewProject, onNavigateToPlan, onNavigateToScript, onNavigateToRetro, onNavigateToBlueprint }: ProjectPageProps) {
  const activeProject = useAppStore((s) => s.activeProject)
  const refreshActiveProject = useAppStore((s) => s.refreshActiveProject)
  const { loadProjects, setActiveProject } = useAppStore()

  if (!activeProject) {
    return (
      <div className="flex items-center justify-center h-full text-white/30">
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

  const handleManageScripts = useCallback(async () => {
    if (!activeProject) return
    setScriptsLoading(true)
    try { setScriptsList(await window.api.listScripts(activeProject.path)) }
    catch (err) { console.error('Failed to list scripts:', err) }
    finally { setScriptsLoading(false) }
  }, [activeProject])

  const coachSuggestion = useMemo(
    () => getCoachSuggestion(activeProject.state.totalPredicted || 0, activeProject.state.totalPublished || 0, activities, { onNewScript, onPublish, onRetro, onTopicInspiration }),
    [activeProject.state.totalPredicted, activeProject.state.totalPublished, activities.length]
  )

  const styles = VARIANT_STYLES[coachSuggestion.variant]

  const quickActions = [
    { icon: Sparkles, label: 'IP 蓝图', desc: '定位、策略与行动计划', color: 'text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/20', action: onNavigateToBlueprint },
    { icon: PenLine, label: '写脚本', desc: 'AI写作 + 即时打分', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', action: onNewScript },
    { icon: FileText, label: '管脚本', desc: `查看/编辑/删除${scriptsList.length > 0 ? ` · ${scriptsList.length}条` : ''}`, color: 'text-warning-text', bg: 'bg-warning-surface', border: 'border-warning-border', action: handleManageScripts },
    { icon: Lightbulb, label: '选题', desc: 'AI推荐爆款选题', color: 'text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/20', action: onTopicInspiration },
    { icon: Send, label: '发布', desc: '标题+简介+话题', color: 'text-success-text', bg: 'bg-success-surface', border: 'border-success-border', action: onPublish },
    { icon: BarChart3, label: '复盘', desc: '数据驱动进化', color: 'text-warning-text', bg: 'bg-warning-surface', border: 'border-warning-border', action: onRetro },
    { icon: Layout, label: '方案', desc: '系统化内容计划', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', action: onPlans }
  ]

  // Pipeline stats
  const predicted = activeProject.state.totalPredicted || 0
  const published = activeProject.state.totalPublished || 0
  const buffer = activeProject.state.bufferCount || (predicted - published)

  return (
    <div className="px-8 py-6 max-w-5xl mx-auto h-full overflow-y-auto">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-xl font-semibold text-white/90 mb-1">{activeProject.name}</h1>
        <p className="text-sm text-white/45">
          已发布 {published} 条 · 预测中 {predicted} 条 · 待复盘 {published} 条
        </p>
      </header>

      {/* AI Coach */}
      <div className={`bg-gradient-to-r ${styles.gradient} border ${styles.border} rounded-2xl p-5 mb-8 shadow-sm`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${styles.badge}`}><Sparkles size={18} /></div>
          <div>
            <h2 className="text-sm font-semibold text-white/85">AI教练 · {coachSuggestion.title}</h2>
            <p className="text-xs text-white/40 mt-0.5">{coachSuggestion.message}</p>
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
            <Card key={a.label} level="subtle" interactive={!!a.action} onClick={a.action} className={`flex flex-col items-center gap-3 p-4 text-center ${!a.action ? 'opacity-40 cursor-not-allowed' : ''}`}>
              <div className={`p-2.5 rounded-lg ${a.bg}`}><Icon size={22} className={a.color} /></div>
              <div>
                <div className="text-sm font-medium text-white/80">{a.label}</div>
                <div className="text-[11px] text-white/35 mt-0.5">{a.desc}</div>
              </div>
            </Card>
          )
        })}
      </div>
      <div className="grid grid-cols-3 gap-3 mb-8">
        {quickActions.slice(4).map((a) => {
          const Icon = a.icon
          return (
            <Card key={a.label} level="subtle" interactive={!!a.action} onClick={a.action} className={`flex flex-col items-center gap-3 p-4 text-center ${!a.action ? 'opacity-40 cursor-not-allowed' : ''}`}>
              <div className={`p-2.5 rounded-lg ${a.bg}`}><Icon size={22} className={a.color} /></div>
              <div>
                <div className="text-sm font-medium text-white/80">{a.label}</div>
                <div className="text-[11px] text-white/35 mt-0.5">{a.desc}</div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Pipeline bar — compact */}
      {predicted > 0 && (
        <div className="mb-8 p-4 rounded-xl bg-app-surface border border-white/[0.04]">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-white/30 font-medium">管道</span>
            {[
              { label: '脚本', n: predicted },
              { label: '待拍', n: buffer },
              { label: '已发', n: published },
              { label: '待复盘', n: published }
            ].map((s, i, arr) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className={`font-mono font-semibold ${s.n > 0 ? 'text-white/60' : 'text-white/15'}`}>{s.n}</span>
                <span className={s.n > 0 ? 'text-white/35' : 'text-white/12'}>{s.label}</span>
                {i < arr.length - 1 && <span className="text-white/[0.08] mx-0.5">·</span>}
              </span>
            ))}
            {buffer === 0 && (
              <span className="ml-auto text-[11px] text-danger-text/70 font-medium">库存告急</span>
            )}
          </div>
        </div>
      )}

      {/* Script list (manage) */}
      {scriptsList.length > 0 && (
        <div className="mb-8 p-5 rounded-xl bg-app-surface border border-white/[0.04]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white/55">已有脚本 · {scriptsList.length} 条</h3>
            <button onClick={() => setScriptsList([])} className="text-xs text-white/25 hover:text-white/45">收起</button>
          </div>
          <div className="space-y-1 mb-3">
            {scriptsList.slice(0, 10).map((s) => (
              <button key={s.name} onClick={() => onNavigateToScript?.()} className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors text-left">
                <span className="text-sm text-white/65 truncate">{s.name.replace('.md', '')}</span>
                <ArrowRight size={14} className="text-white/15 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
      {scriptsLoading && (
        <div className="mb-8 p-5 rounded-xl bg-app-surface border border-white/[0.04] text-center">
          <p className="text-sm text-white/25">加载脚本列表中...</p>
        </div>
      )}

      {/* Pipeline actions */}
      {predicted > 0 && (
        <div className="mb-8 p-4 rounded-xl bg-app-surface border border-white/[0.04]">
          <h3 className="text-sm font-medium text-white/50 mb-3">管道推进</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="secondary" onClick={() => setConfirmDialog({ type: 'shoot', title: '确认拍摄状态', message: '这条脚本已经写好了 —— 你拍了吗？拍完告诉 AI，它会帮你生成发布资料包。' })}>
              确认拍摄
            </Button>
            <span className="text-white/10 text-xs">→</span>
            <Button variant="secondary" onClick={() => setConfirmDialog({ type: 'publish', title: '确认发布状态', message: '视频已经发布了吗？发布后记得登记链接，T+3 天后 AI 会提醒你复盘数据。' })}>
              确认发布
            </Button>
          </div>
        </div>
      )}

      {/* Activity timeline */}
      <div className="mt-10 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white/50">
            最近活动{activities.length > 0 && <span className="text-white/18 ml-1">· {activities.length} 条</span>}
          </h3>
        </div>
        {activities.length > 0 ? (
          <>
            <div className="space-y-0">
              {pagedActivities.map((entry, i) => {
                const IconComp = ACTIVITY_ICONS[entry.type] || Clock
                const iconColor = ACTIVITY_COLORS[entry.type] || 'text-white/25'
                const clickable = entry.navTarget || (entry.type === 'script_saved' && entry.scriptFile) || entry.planId
                const handleClick = () => {
                  if (entry.navTarget === 'plan-editor' && entry.planId) onNavigateToPlan?.(entry.planId)
                  else if (entry.navTarget === 'script-editor' || (entry.type === 'script_saved' && entry.scriptFile)) onNavigateToScript?.()
                  else if (entry.navTarget === 'retro') onNavigateToRetro?.()
                  else if (entry.navTarget === 'publish' || entry.type === 'script_published') onPublish?.()
                  else if (entry.type === 'plan_created' || entry.type === 'plan_completed') onNavigateToPlan?.(entry.planId || '')
                }
                const content = (
                  <div className="flex items-start gap-3 py-2.5 border-b border-white/[0.03] last:border-0">
                    <div className="p-1.5 rounded-md bg-white/[0.03] shrink-0 mt-0.5"><IconComp size={14} className={iconColor} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/65 truncate">{entry.label}</p>
                      {entry.detail && <p className="text-xs text-white/25 mt-0.5">{entry.detail}</p>}
                    </div>
                    <span className="text-xs text-white/18 shrink-0 mt-1">{formatTime(entry.timestamp)}</span>
                  </div>
                )
                return clickable ? <button key={i} onClick={handleClick} className="w-full text-left hover:bg-white/[0.02] transition-colors">{content}</button> : <div key={i}>{content}</div>
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-4">
                <button onClick={() => setActivityPage((p) => Math.max(0, p - 1))} disabled={activityPage === 0}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/45 disabled:opacity-20 text-xs transition-colors">上一页</button>
                <span className="text-xs text-white/25">{activityPage + 1} / {totalPages}</span>
                <button onClick={() => setActivityPage((p) => Math.min(totalPages - 1, p + 1))} disabled={activityPage >= totalPages - 1}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/45 disabled:opacity-20 text-xs transition-colors">下一页</button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-app-surface border border-white/[0.04] rounded-xl">
            <p className="text-white/25 text-sm">还没有任何活动记录</p>
            <p className="text-white/15 text-xs mt-1">保存第一条脚本后，这里会显示你的创作时间线</p>
          </div>
        )}

        {/* Danger zone */}
        <div className="mt-6 pt-4 border-t border-white/[0.04] space-y-2">
          {(predicted > 0 || activities.length > 0) && (
            <button onClick={() => setConfirmDialog({ type: 'reset', title: '清空项目数据', message: `确定要清空「${activeProject.name}」的所有数据吗？\n\n这将删除：\n· 所有已保存的脚本\n· 所有预测记录和报告\n· 所有活动历史\n\n此操作不可撤销。` })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-danger-surface border border-danger-border hover:bg-red-600/15 text-danger-text/60 hover:text-danger-text text-xs transition-colors w-full">
              <Trash2 size={13} />清空所有脚本和记录
            </button>
          )}
          <button onClick={() => setConfirmDialog({ type: 'delete', title: '删除项目', message: `确定要删除「${activeProject.name}」吗？\n\n这将永久删除：\n· 所有脚本、预测、报告\n· 评分规则进化记录\n· 对标分析数据\n· 整个项目目录\n\n此操作不可撤销！` })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-danger-surface border border-danger-border hover:bg-red-600/20 text-danger-text/70 hover:text-danger-text text-xs transition-colors w-full">
            <Trash2 size={13} />删除整个项目
          </button>
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
            await window.api.logActivity(activeProject.path, { type: 'script_published', timestamp: new Date().toISOString(), label: '确认拍摄', detail: '管线标记为已拍摄' })
            await refreshActiveProject(); onPublish?.()
          } else if (confirmDialog?.type === 'publish') {
            await window.api.logActivity(activeProject.path, { type: 'script_published', timestamp: new Date().toISOString(), label: '确认发布', detail: '管线标记为已发布' })
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
