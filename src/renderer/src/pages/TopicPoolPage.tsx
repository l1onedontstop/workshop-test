import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import {
  ArrowLeft, Lightbulb, Plus, Loader2, Search as SearchIcon,
  Filter, ChevronRight, CheckCircle2, XCircle, Archive,
  TrendingUp, PenLine, Sparkles, AlertCircle, Trash2,
  BookOpen, Zap, Shield, Calendar
} from 'lucide-react'

interface PoolTopic {
  id: string
  title: string
  angle: string
  hook: string
  audienceResonance: string
  difficulty: number
  category: string
  reason: string
  status: 'candidate' | 'used' | 'archived'
  createdAt: string
  usedIn?: string
  performance?: { plays: number; likes: number }
}

const CATEGORY_META: Record<string, { icon: typeof Lightbulb; color: string; label: string }> = {
  '观点输出': { icon: Zap, color: 'text-warning-text border-warning-border bg-warning-surface', label: '观点输出' },
  '经验分享': { icon: BookOpen, color: 'text-info-text border-info-border bg-info-surface', label: '经验分享' },
  '趋势解读': { icon: TrendingUp, color: 'text-brand-600 border-brand-200 bg-brand-50', label: '趋势解读' },
  '避坑指南': { icon: Shield, color: 'text-danger-text border-danger-border bg-danger-surface', label: '避坑指南' }
}

const STATUS_META: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  candidate: { label: '候选', icon: Lightbulb, className: 'text-warning-text' },
  used: { label: '已使用', icon: CheckCircle2, className: 'text-success-text' },
  archived: { label: '已弃用', icon: Archive, className: 'text-ink-disabled' }
}

export default function TopicPoolPage({
  onBack,
  onWriteScript
}: {
  onBack: () => void
  onWriteScript?: (topic: string) => void
}) {
  const activeProject = useAppStore((s) => s.activeProject)
  const [topics, setTopics] = useState<PoolTopic[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('candidate')
  const [selected, setSelected] = useState<PoolTopic | null>(null)
  const [recommendations, setRecommendations] = useState<Array<{
    index: number; title: string; reason: string; strategy: string
  }> | null>(null)
  const [recStrategy, setRecStrategy] = useState('')

  const loadTopics = useCallback(async () => {
    if (!activeProject) return
    const data = (await window.api.poolList(activeProject.path)) as { topics: PoolTopic[] }
    setTopics(data.topics || [])
  }, [activeProject])

  useEffect(() => { loadTopics() }, [loadTopics])

  const handleAddTopic = async () => {
    if (!activeProject) return
    setLoading(true)
    try {
      // Use AI to generate a batch of topics
      const raw = await window.api.generateTopics({
        industry: activeProject.opts?.industry || '',
        audience: activeProject.opts?.targetAudience || '',
        experience: activeProject.opts?.contentExperience || '',
        identity: activeProject.opts?.identity || ''
      })
      const parsed = parseAsJSON(raw as string)
      if (parsed?.topics && Array.isArray(parsed.topics)) {
        await window.api.poolAdd(activeProject.path, parsed.topics)
        await loadTopics()
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  const handleStatusChange = async (topicId: string, status: 'candidate' | 'used' | 'archived') => {
    if (!activeProject) return
    await window.api.poolUpdate(activeProject.path, topicId, { status })
    await loadTopics()
    setSelected(null)
  }

  const handleRecommend = async () => {
    if (!activeProject) return
    setLoading(true)
    try {
      const result = (await window.api.poolRecommend(activeProject.path, {
        bufferStatus: 'yellow',
        count: 5
      })) as { recommendations: Array<{ index: number; title: string; reason: string; strategy: string }>; strategy: string }
      setRecommendations(result.recommendations || [])
      setRecStrategy(result.strategy || '')
    } catch { /* ignore */ }
    setLoading(false)
  }

  const filtered = topics
    .filter((t) => (filterStatus ? t.status === filterStatus : true))
    .filter((t) => (filterCategory ? t.category === filterCategory : true))
    .filter((t) => (search ? t.title.includes(search) || t.angle.includes(search) : true))

  const stats = {
    total: topics.length,
    candidate: topics.filter((t) => t.status === 'candidate').length,
    used: topics.filter((t) => t.status === 'used').length,
    archived: topics.filter((t) => t.status === 'archived').length
  }

  if (!activeProject) {
    return <div className="flex items-center justify-center h-full text-ink-tertiary">请先创建项目</div>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-rule-subtle">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-black/[0.03] text-ink-tertiary">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-white">选题池</h2>
            <p className="text-xs text-ink-tertiary">管理你的选题储备，让内容不断档</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRecommend}
            disabled={loading || stats.candidate === 0}
            className="px-4 py-2 rounded-lg bg-brand-100 border border-brand-200 hover:bg-brand-200 text-brand-500 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-30"
          >
            <Sparkles size={14} /> AI 推荐排序
          </button>
          <button
            onClick={handleAddTopic}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-30 text-white text-sm font-medium transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            AI 生成选题
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 px-6 py-3 border-b border-rule-subtle bg-black/[0.02]">
        {(['total', 'candidate', 'used', 'archived'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s === 'total' ? '' : s)}
            className={`text-xs flex items-center gap-1.5 transition-colors ${
              (s === 'total' && !filterStatus) || s === filterStatus
                ? 'text-ink-primary'
                : 'text-ink-disabled hover:text-ink-secondary'
            }`}
          >
            <span className="text-ink-tertiary">
              {s === 'total' ? '总计' : s === 'candidate' ? '候选' : s === 'used' ? '已用' : '弃用'}
            </span>
            <span className="font-mono text-ink-secondary">{stats[s]}</span>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 px-6 py-2.5 border-b border-rule-subtle">
        <div className="relative flex-1 max-w-xs">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-disabled" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索选题..."
            className="w-full bg-black/[0.03] border border-rule rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-ink-disabled focus:outline-none focus:border-brand-200"
          />
        </div>
        <Filter size={12} className="text-ink-disabled" />
        {Object.keys(CATEGORY_META).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)}
            className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
              filterCategory === cat
                ? 'bg-black/[0.06] border-rule text-ink-secondary'
                : 'bg-black/[0.02] border-rule-subtle text-ink-disabled hover:text-ink-tertiary'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Topic list */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Lightbulb size={40} className="text-ink-disabled mx-auto mb-3" />
              <p className="text-sm text-ink-disabled mb-4">
                {topics.length === 0 ? '选题池还是空的' : '没有匹配的选题'}
              </p>
              {topics.length === 0 && (
                <button
                  onClick={handleAddTopic}
                  className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm inline-flex items-center gap-2"
                >
                  <Plus size={14} /> AI 生成第一批选题
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-w-2xl">
              {filtered.map((t) => {
                const catMeta = CATEGORY_META[t.category]
                const IconComp = catMeta?.icon || Lightbulb
                const statusMeta = STATUS_META[t.status]
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelected(selected?.id === t.id ? null : t)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selected?.id === t.id
                        ? 'bg-black/[0.04] border-brand-200'
                        : 'bg-black/[0.02] border-rule-subtle hover:border-rule'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          {catMeta && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${catMeta.color}`}>
                              {catMeta.label}
                            </span>
                          )}
                          <span className={`text-[10px] flex items-center gap-1 ${statusMeta.className}`}>
                            <statusMeta.icon size={10} />
                            {statusMeta.label}
                          </span>
                          <span className="text-[10px] text-ink-disabled">
                            {'⭐'.repeat(Math.min(5, t.difficulty))}
                          </span>
                        </div>
                        <h3 className="text-sm text-ink-primary font-medium truncate">{t.title}</h3>
                        <p className="text-xs text-ink-tertiary mt-1 truncate">{t.angle}</p>
                      </div>
                      <ChevronRight
                        size={14}
                        className={`text-ink-disabled transition-transform shrink-0 mt-1 ${selected?.id === t.id ? 'rotate-90' : ''}`}
                      />
                    </div>

                    {/* Expanded detail */}
                    {selected?.id === t.id && (
                      <div className="mt-4 pt-4 border-t border-rule-subtle space-y-3">
                        {t.hook && (
                          <div>
                            <p className="text-[10px] text-ink-disabled mb-0.5">钩子</p>
                            <p className="text-xs text-ink-tertiary">{t.hook}</p>
                          </div>
                        )}
                        {t.audienceResonance && (
                          <div>
                            <p className="text-[10px] text-ink-disabled mb-0.5">受众共鸣</p>
                            <p className="text-xs text-ink-tertiary">{t.audienceResonance}</p>
                          </div>
                        )}
                        {t.reason && (
                          <div>
                            <p className="text-[10px] text-ink-disabled mb-0.5">选题理由</p>
                            <p className="text-xs text-ink-tertiary">{t.reason}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-2">
                          {t.status === 'candidate' && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); onWriteScript?.(t.title) }}
                                className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs transition-colors flex items-center gap-1.5"
                              >
                                <PenLine size={10} /> 写脚本
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(t.id, 'used') }}
                                className="px-3 py-1.5 rounded-lg bg-success-surface border border-success-border hover:bg-success-surface text-success-text text-xs transition-colors flex items-center gap-1.5"
                              >
                                <CheckCircle2 size={10} /> 标记已用
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(t.id, 'archived') }}
                                className="px-3 py-1.5 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] text-ink-tertiary text-xs transition-colors flex items-center gap-1.5"
                              >
                                <Archive size={10} /> 弃用
                              </button>
                            </>
                          )}
                          {t.status === 'archived' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(t.id, 'candidate') }}
                              className="px-3 py-1.5 rounded-lg bg-warning-surface border border-warning-border hover:bg-warning-surface text-warning-text text-xs transition-colors flex items-center gap-1.5"
                            >
                              恢复为候选
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Recommendation panel */}
        {recommendations && recommendations.length > 0 && (
          <div className="w-72 border-l border-rule-subtle p-4 overflow-y-auto shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-ink-secondary flex items-center gap-1.5">
                <Sparkles size={12} className="text-brand-600" /> AI 推荐
              </h3>
              <button
                onClick={() => setRecommendations(null)}
                className="text-ink-disabled hover:text-ink-tertiary"
              >
                <XCircle size={14} />
              </button>
            </div>
            <p className="text-xs text-ink-tertiary mb-4">{recStrategy}</p>
            <div className="space-y-2">
              {recommendations.map((r, i) => (
                <div key={i} className="p-3 rounded-lg bg-black/[0.02] border border-rule-subtle">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      r.strategy === 'stable'
                        ? 'bg-info-surface text-info-text'
                        : 'bg-brand-50 text-brand-600'
                    }`}>
                      {r.strategy === 'stable' ? '稳妥' : '实验'}
                    </span>
                  </div>
                  <p className="text-xs text-ink-secondary">{r.title}</p>
                  <p className="text-[10px] text-ink-tertiary mt-1">{r.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function parseAsJSON(raw: string): Record<string, unknown> | null {
  try {
    const trimmed = raw.trim()
    if (trimmed.startsWith('{')) return JSON.parse(trimmed)
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) return JSON.parse(match[1].trim())
    const objMatch = trimmed.match(/\{[\s\S]*\}/)
    if (objMatch) return JSON.parse(objMatch[0])
  } catch { /* fall through */ }
  return null
}
