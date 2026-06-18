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
import { useMemo, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'

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
  script_saved: 'text-blue-400',
  script_published: 'text-green-400',
  retro_completed: 'text-orange-400',
  rubric_evolved: 'text-purple-400',
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
  } catch {
    return ''
  }
}

// ── AI Coach: dynamic suggestion engine ─────────────────

function getCoachSuggestion(
  totalPredicted: number,
  totalPublished: number,
  activities: Array<{ type: string; timestamp: string }>,
  callbacks: { onNewScript?: () => void; onPublish?: () => void; onRetro?: () => void; onTopicInspiration?: () => void }
): CoachSuggestion {
  const pending = totalPredicted - totalPublished

  // 1. Brand new — no scripts at all
  if (totalPredicted === 0) {
    return {
      title: '万事开头难',
      message: '你还没有写过脚本。内容和选题想再多，不如先写出第一条——拍出来才是真正的开始。',
      actionLabel: '写第一条脚本',
      action: callbacks.onNewScript,
      variant: 'primary'
    }
  }

  // 2. Has unpublished scripts sitting in the vault
  if (pending > 0) {
    return {
      title: '别让好内容烂在仓库里',
      message: `你有 ${pending} 条已完成但未发布的脚本。内容在文件夹里不会产生任何播放量，挑一条最好的先发出去。`,
      actionLabel: '去发布',
      action: callbacks.onPublish,
      variant: 'primary'
    }
  }

  // 3. Published everything but never done a retro
  const retroCount = activities.filter((a) => a.type === 'retro_completed').length
  if (totalPublished > 0 && retroCount === 0) {
    return {
      title: '发完不看数据等于白干',
      message: `你已经发布了 ${totalPublished} 条视频，但还没做过复盘。每条数据都是免费的观众调研——花 5 分钟看一看，下次写得更好。`,
      actionLabel: '去复盘',
      action: callbacks.onRetro,
      variant: 'warning'
    }
  }

  // 4. Has >= 3 retros but no rubric evolution yet
  const lastRubricEvolved = activities.find((a) => a.type === 'rubric_evolved')
  if (retroCount >= 3 && !lastRubricEvolved) {
    return {
      title: '是时候进化评分规则了',
      message: `你已经完成了 ${retroCount} 次复盘，数据足够让 AI 帮你重新校准 7 个评分维度的权重。评分越准，未来的脚本质量越高。`,
      actionLabel: '进化 Rubric',
      action: callbacks.onRetro,
      variant: 'warning'
    }
  }

  // 5. Just finished a retro — suggest writing to validate
  const lastActivity = activities[0]
  if (lastActivity?.type === 'retro_completed') {
    return {
      title: '用新脚本验证复盘收获',
      message: '刚复盘完，趁热打铁——把复盘中学到的洞察用在下一篇脚本里，看看分数能不能更高。',
      actionLabel: '写新脚本',
      action: callbacks.onNewScript,
      variant: 'secondary'
    }
  }

  // 6. Default: explore new topics
  return {
    title: '保持内容新鲜度',
    message: '选题是内容的第一生产力。让 AI 帮你根据受众画像和过往数据，挖掘下一批有爆款潜力的选题。',
    actionLabel: '选题灵感',
    action: callbacks.onTopicInspiration,
    variant: 'secondary'
  }
}

const VARIANT_STYLES: Record<CoachSuggestion['variant'], { gradient: string; border: string; badge: string; button: string }> = {
  primary: {
    gradient: 'from-brand-500/10 to-purple-500/10',
    border: 'border-brand-500/20',
    badge: 'bg-brand-500/20 text-brand-400',
    button: 'bg-brand-600 hover:bg-brand-500'
  },
  secondary: {
    gradient: 'from-white/5 to-white/[0.02]',
    border: 'border-white/10',
    badge: 'bg-white/10 text-white/50',
    button: 'bg-white/10 hover:bg-white/15 text-white/80'
  },
  warning: {
    gradient: 'from-orange-500/10 to-yellow-500/10',
    border: 'border-orange-500/20',
    badge: 'bg-orange-500/20 text-orange-400',
    button: 'bg-orange-600 hover:bg-orange-500'
  }
}

export default function ProjectPage({ onNewScript, onTopicInspiration, onPublish, onRetro, onPlans, onNewProject, onNavigateToPlan, onNavigateToScript, onNavigateToRetro }: ProjectPageProps) {
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
  const pagedActivities = activities.slice(
    activityPage * ACTIVITY_PAGE_SIZE,
    (activityPage + 1) * ACTIVITY_PAGE_SIZE
  )

  // Pipeline confirmation flow
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'shoot' | 'publish' | 'reset' | 'delete'
    title: string
    message: string
  } | null>(null)
  const [resetLoading, setResetLoading] = useState(false)

  const handleConfirmShoot = () => {
    setConfirmDialog({
      type: 'shoot',
      title: '确认拍摄状态',
      message: `这条脚本已经写好了 —— 你拍了吗？\n\n拍完告诉 AI，它会帮你生成发布资料包（标题 + 话题 + 封面文案）。`
    })
  }

  const handleResetAll = async () => {
    if (!activeProject) return
    setResetLoading(true)
    try {
      await window.api.resetProject(activeProject.path)
      await refreshActiveProject()
      setConfirmDialog(null)
    } catch (err) {
      console.error('Reset failed:', err)
    } finally {
      setResetLoading(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!activeProject) return
    setResetLoading(true)
    try {
      await window.api.deleteProject(activeProject.path)
      await loadProjects(true)
      setConfirmDialog(null)
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setResetLoading(false)
    }
  }

  const handleConfirmPublish = () => {
    setConfirmDialog({
      type: 'publish',
      title: '确认发布状态',
      message: `视频已经发布了吗？\n\n发布后记得登记链接，T+3 天后 AI 会提醒你复盘数据。`
    })
  }

  const coachSuggestion = useMemo(
    () =>
      getCoachSuggestion(
        activeProject.state.totalPredicted || 0,
        activeProject.state.totalPublished || 0,
        activities,
        { onNewScript, onPublish, onRetro, onTopicInspiration }
      ),
    [activeProject.state.totalPredicted, activeProject.state.totalPublished, activities.length, onNewScript, onPublish, onRetro, onTopicInspiration]
  )

  const styles = VARIANT_STYLES[coachSuggestion.variant]

  const quickActions = [
    {
      icon: PenLine,
      label: '写新脚本',
      description: 'AI辅助写作 + 即时打分',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      action: onNewScript
    },
    {
      icon: FileText,
      label: '管理脚本',
      description: '查看、编辑、删除已有脚本',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      action: onNewScript
    },
    {
      icon: Lightbulb,
      label: '选题灵感',
      description: 'AI根据画像推荐爆款选题',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      action: onTopicInspiration
    },
    {
      icon: Send,
      label: '发布助手',
      description: '生成标题、简介、话题',
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      action: onPublish
    },
    {
      icon: BarChart3,
      label: '数据复盘',
      description: '查看表现，进化评分规则',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      action: onRetro
    },
    {
      icon: Layout,
      label: 'IP 方案',
      description: '从单条脚本升级为系统化内容计划',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      action: onPlans
    }
  ]

  return (
    <div className="p-8 max-w-5xl mx-auto h-full overflow-y-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-white mb-2">{activeProject.name}</h1>
        <p className="text-white/40 text-sm">
          已发布 {activeProject.state.totalPublished} 条 · 预测中 {activeProject.state.totalPredicted} 条
          · 待复盘 {activeProject.state.bufferCount} 条
        </p>
      </div>

      {/* Pipeline status bar */}
      {activeProject.state.totalPredicted > 0 && (() => {
        const predicted = activeProject.state.totalPredicted || 0
        const published = activeProject.state.totalPublished || 0
        const buffer = activeProject.state.bufferCount || (predicted - published)
        const pendingRetro = published // simplified: published but not yet retro'd

        const bufferColor = buffer >= 3 ? 'green' : buffer >= 1 ? 'yellow' : 'red'
        const bufferMsg = bufferColor === 'green'
          ? '内容储备充足，保持节奏'
          : bufferColor === 'yellow'
            ? '注意！库存偏低，建议尽快写新脚本'
            : '⚠️ 内容断档风险！库存已空，马上写一条'

        return (
          <div className="mb-6 space-y-3">
            {/* Pipeline steps */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-white/30">管道：</span>
              {[
                { label: `📝 脚本 ${predicted}`, active: predicted > 0 },
                { label: `🎬 待拍 ${buffer}`, active: buffer > 0 },
                { label: `🚀 已发 ${published}`, active: published > 0 },
                { label: `📊 待复盘 ${published}`, active: published > 0 }
              ].map((step, i, arr) => (
                <span key={i} className="flex items-center gap-2">
                  <span className={step.active ? 'text-white/60' : 'text-white/15'}>{step.label}</span>
                  {i < arr.length - 1 && <span className="text-white/10">→</span>}
                </span>
              ))}
            </div>

            {/* Buffer warning */}
            <div className={`px-4 py-2.5 rounded-xl text-sm flex items-center gap-3 ${
              bufferColor === 'green'
                ? 'bg-green-500/5 border border-green-500/10 text-green-400'
                : bufferColor === 'yellow'
                  ? 'bg-yellow-500/5 border border-yellow-500/10 text-yellow-400'
                  : 'bg-red-500/5 border border-red-500/10 text-red-400'
            }`}>
              <span>{
                bufferColor === 'green' ? '🟢' : bufferColor === 'yellow' ? '🟡' : '🔴'
              }</span>
              <span className="flex-1">{bufferMsg}</span>
              {bufferColor !== 'green' && (
                <button
                  onClick={onNewScript}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors"
                >
                  写一条
                </button>
              )}
            </div>
          </div>
        )
      })()}

      {/* AI Coach prompt — dynamic based on project state */}
      <div className={`bg-gradient-to-r ${styles.gradient} border ${styles.border} rounded-2xl p-6 mb-8`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${styles.badge}`}>
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="text-white font-semibold">AI教练 · {coachSuggestion.title}</h2>
            <p className="text-white/40 text-sm">{coachSuggestion.message}</p>
          </div>
        </div>
        <button
          onClick={coachSuggestion.action}
          className={`mt-3 flex items-center gap-2 px-4 py-2.5 ${styles.button} rounded-lg text-white text-sm font-medium transition-colors`}
        >
          {coachSuggestion.actionLabel}
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Quick actions grid */}
      <div className="grid grid-cols-3 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon
          const disabled = !action.action
          return (
            <button
              key={action.label}
              onClick={action.action}
              disabled={disabled}
              className={`flex items-start gap-4 p-5 rounded-xl border ${action.border} ${action.bg} transition-all text-left ${
                disabled ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-125 cursor-pointer'
              }`}
            >
              <div className={`p-2.5 rounded-lg ${action.bg}`}>
                <Icon size={22} className={action.color} />
              </div>
              <div>
                <h3 className="text-white font-medium text-sm mb-1">{action.label}</h3>
                <p className="text-white/40 text-xs">
                  {disabled ? '即将推出' : action.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Pipeline status */}
      {activeProject.state.totalPredicted > 0 && (
        <div className="mt-8 mb-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <h3 className="text-sm font-medium text-white/60 mb-3">管道推进</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleConfirmShoot}
              className="px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 text-yellow-400 text-sm transition-colors flex items-center gap-2"
            >
              🎬 确认拍摄
            </button>
            <span className="text-white/15 text-xs">→</span>
            <button
              onClick={handleConfirmPublish}
              className="px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 text-green-400 text-sm transition-colors flex items-center gap-2"
            >
              🚀 确认发布
            </button>
          </div>
          <p className="text-xs text-white/20 mt-2">
            拍完后告诉 AI → 自动生成发布资料包。发布后 T+3 天 → AI 提醒复盘。
          </p>
        </div>
      )}

      {/* Recent activity timeline */}
      <div className="mt-10">
        <h3 className="text-sm font-medium text-white/60 mb-4">
          最近活动
          {activities.length > 0 && (
            <span className="text-white/20 ml-1">· {activities.length} 条</span>
          )}
        </h3>
        {activities.length > 0 ? (
          <>
            <div className="space-y-0">
              {pagedActivities.map((entry, i) => {
                const IconComp = ACTIVITY_ICONS[entry.type] || Clock
                const iconColor = ACTIVITY_COLORS[entry.type] || 'text-white/30'
                const clickable = entry.navTarget || (entry.type === 'script_saved' && entry.scriptFile) || entry.planId

                const handleClick = () => {
                  if (entry.navTarget === 'plan-editor' && entry.planId) {
                    onNavigateToPlan?.(entry.planId)
                  } else if (entry.navTarget === 'script-editor') {
                    onNavigateToScript?.()
                  } else if (entry.navTarget === 'retro') {
                    onNavigateToRetro?.()
                  } else if (entry.navTarget === 'publish') {
                    onPublish?.()
                  } else if (entry.type === 'script_saved' && entry.scriptFile) {
                    onNavigateToScript?.()
                  } else if (entry.type === 'script_published') {
                    onPublish?.()
                  } else if (entry.type === 'plan_created' || entry.type === 'plan_completed') {
                    onNavigateToPlan?.(entry.planId || '')
                  }
                }

                return clickable ? (
                  <button
                    key={i}
                    onClick={handleClick}
                    className="flex items-start gap-3 py-2.5 border-b border-white/[0.03] last:border-0 w-full text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <div className="p-1.5 rounded-md bg-white/[0.03] shrink-0 mt-0.5">
                      <IconComp size={14} className={iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/70 truncate">{entry.label}</p>
                      {entry.detail && (
                        <p className="text-xs text-white/30 mt-0.5">{entry.detail}</p>
                      )}
                    </div>
                    <span className="text-xs text-white/20 shrink-0 mt-1">
                      {formatTime(entry.timestamp)}
                    </span>
                  </button>
                ) : (
                  <div key={i} className="flex items-start gap-3 py-2.5 border-b border-white/[0.03] last:border-0">
                    <div className="p-1.5 rounded-md bg-white/[0.03] shrink-0 mt-0.5">
                      <IconComp size={14} className={iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/70 truncate">{entry.label}</p>
                      {entry.detail && (
                        <p className="text-xs text-white/30 mt-0.5">{entry.detail}</p>
                      )}
                    </div>
                    <span className="text-xs text-white/20 shrink-0 mt-1">
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>
                )
              })}
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-4">
                <button
                  onClick={() => setActivityPage((p) => Math.max(0, p - 1))}
                  disabled={activityPage === 0}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 disabled:opacity-20 text-xs transition-colors"
                >
                  上一页
                </button>
                <span className="text-xs text-white/30">{activityPage + 1} / {totalPages}</span>
                <button
                  onClick={() => setActivityPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={activityPage >= totalPages - 1}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 disabled:opacity-20 text-xs transition-colors"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-white/[0.02] border border-white/[0.04] rounded-xl">
            <p className="text-white/25 text-sm">还没有任何活动记录</p>
            <p className="text-white/15 text-xs mt-1">保存第一条脚本后，这里会显示你的创作时间线</p>
          </div>
        )}

        {/* Reset button */}
        {(activeProject.state.totalPredicted > 0 || activities.length > 0) && (
          <div className="mt-6 pt-4 border-t border-white/[0.04]">
            <button
              onClick={() => setConfirmDialog({
                type: 'reset',
                title: '清空项目数据',
                message: `确定要清空「${activeProject.name}」的所有数据吗？\n\n这将删除：\n· 所有已保存的脚本\n· 所有预测记录和报告\n· 所有活动历史\n\n此操作不可撤销。`
              })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 text-red-400/70 hover:text-red-400 text-xs transition-colors"
            >
              <Trash2 size={13} />
              清空所有脚本和记录
            </button>

            {/* Delete project button */}
            <button
              onClick={() => setConfirmDialog({
                type: 'delete',
                title: '删除项目',
                message: `确定要删除「${activeProject.name}」吗？\n\n这将永久删除：\n· 所有脚本、预测、报告\n· 评分规则进化记录\n· 对标分析数据\n· 整个项目目录\n\n此操作不可撤销！`
              })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 text-red-500/80 hover:text-red-400 text-xs transition-colors mt-2 w-full"
            >
              <Trash2 size={13} />
              删除整个项目
            </button>
          </div>
        )}
      </div>

      {/* Pipeline confirmation dialogs */}
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
        onPrimary={() => {
          if (confirmDialog?.type === 'shoot') {
            onPublish?.()
          } else if (confirmDialog?.type === 'publish') {
            onRetro?.()
          } else if (confirmDialog?.type === 'reset') {
            handleResetAll()
            return
          } else if (confirmDialog?.type === 'delete') {
            handleDeleteProject()
            return
          }
          setConfirmDialog(null)
        }}
        onSecondary={() => setConfirmDialog(null)}
        onClose={() => setConfirmDialog(null)}
      />
    </div>
  )
}
