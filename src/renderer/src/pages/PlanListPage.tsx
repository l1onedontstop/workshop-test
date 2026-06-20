import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import {
  ArrowLeft,
  Plus,
  FileText,
  Trash2,
  Loader2,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronRight,
  Layout
} from 'lucide-react'

interface Plan {
  id: string
  name: string
  projectPath: string
  createdAt: string
  updatedAt: string
  scriptsGenerated: number
  scriptsTotal: number
  status: string
}

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  topics_selected: '选题已定',
  strategy_ready: '策略就绪',
  scripts_generated: '脚本完成',
  scheduled: '已排期',
  completed: '已完成'
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-white/30',
  topics_selected: 'text-blue-400',
  strategy_ready: 'text-brand-400',
  scripts_generated: 'text-success-text',
  scheduled: 'text-warning-text',
  completed: 'text-brand-400'
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('zh-CN')
  } catch {
    return ''
  }
}

export default function PlanListPage({
  onBack,
  onOpenPlan
}: {
  onBack: () => void
  onOpenPlan: (planId: string) => void
}) {
  const activeProject = useAppStore((s) => s.activeProject)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const loadPlans = useCallback(async () => {
    if (!activeProject) return
    try {
      const list = await window.api.listPlans(activeProject.path)
      setPlans(list as Plan[])
    } catch {
      // ignore
    }
  }, [activeProject])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  const handleCreate = async () => {
    if (!activeProject || !newPlanName.trim()) return
    setLoading(true)
    try {
      const result = await window.api.createPlan(activeProject.path, newPlanName.trim()) as { id?: string }
      setNewPlanName('')
      setShowCreate(false)
      await loadPlans()
      // Log activity with nav target
      if (result?.id) {
        await window.api.logActivity(activeProject.path, {
          type: 'plan_created',
          timestamp: new Date().toISOString(),
          label: `新建方案：${newPlanName.trim()}`,
          planId: result.id,
          navTarget: 'plan-editor'
        })
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (planId: string) => {
    if (!activeProject) return
    try {
      await window.api.deletePlan(activeProject.path, planId)
      setDeleteConfirm(null)
      await loadPlans()
    } catch {
      // ignore
    }
  }

  if (!activeProject) {
    return (
      <div className="flex items-center justify-center h-full text-white/30">
        <p>请先创建项目</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/5">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold text-white">IP 方案</h1>
        <span className="text-xs text-white/20">从一条脚本到一套内容计划</span>
        <div className="flex-1" />
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={15} />
          新建方案
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        {showCreate && (
          <div className="mb-6 p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <h3 className="text-sm font-medium text-white/70 mb-3">创建新方案</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="例如：Q3 AI工具测评系列、老板IP起步方案"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-brand-500/50"
                autoFocus
              />
              <button
                onClick={handleCreate}
                disabled={!newPlanName.trim() || loading}
                className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-30 text-white text-sm font-medium transition-colors flex items-center gap-2"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                创建
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/20">
            <Layout size={48} className="mb-4 opacity-30" />
            <p className="text-sm mb-1">还没有 IP 方案</p>
            <p className="text-xs opacity-60">创建你的第一个内容方案，从单条脚本升级为系统化内容计划</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 max-w-3xl">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-brand-500/20 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-medium text-white/80 truncate">
                        {plan.name}
                      </h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          STATUS_COLORS[plan.status] || 'text-white/30'
                        } border-white/10 bg-white/[0.02]`}
                      >
                        {STATUS_LABELS[plan.status] || plan.status}
                      </span>
                      {plan.status === 'completed' && (
                        <CheckCircle2 size={14} className="text-success-text shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-white/30">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {formatDate(plan.createdAt)}
                      </span>
                      {plan.scriptsTotal > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText size={10} />
                          {plan.scriptsGenerated}/{plan.scriptsTotal} 脚本
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {deleteConfirm === plan.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(plan.id)}
                          className="px-2.5 py-1 rounded text-[10px] bg-red-600/20 border border-red-500/30 text-danger-text hover:bg-red-600/30"
                        >
                          确认删除
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2.5 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-white/40 hover:bg-white/10"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setDeleteConfirm(plan.id)}
                          className="p-1.5 rounded text-white/15 hover:text-danger-text hover:bg-danger-surface transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          onClick={() => onOpenPlan(plan.id)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                            plan.status === 'completed'
                              ? 'bg-green-600/10 border-success-border hover:bg-green-600/20 text-success-text'
                              : 'bg-brand-600/20 border-brand-500/20 hover:bg-brand-600/30 text-brand-300'
                          }`}
                        >
                          {plan.status === 'completed' ? '查看方案' : '打开'}
                          <ChevronRight size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
