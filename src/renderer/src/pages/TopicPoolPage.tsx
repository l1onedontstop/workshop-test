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
  '观点输出': { icon: Zap, color: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5', label: '观点输出' },
  '经验分享': { icon: BookOpen, color: 'text-blue-400 border-blue-500/20 bg-blue-500/5', label: '经验分享' },
  '趋势解读': { icon: TrendingUp, color: 'text-purple-400 border-purple-500/20 bg-purple-500/5', label: '趋势解读' },
  '避坑指南': { icon: Shield, color: 'text-red-400 border-red-500/20 bg-red-500/5', label: '避坑指南' }
}

const STATUS_META: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  candidate: { label: '候选', icon: Lightbulb, className: 'text-yellow-400' },
  used: { label: '已使用', icon: CheckCircle2, className: 'text-green-400' },
  archived: { label: '已弃用', icon: Archive, className: 'text-white/20' }
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
    return <div className="flex items-center justify-center h-full text-white/30">请先创建项目</div>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/5">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-white">选题池</h2>
            <p className="text-xs text-white/30">管理你的选题储备，让内容不断档</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRecommend}
            disabled={loading || stats.candidate === 0}
            className="px-4 py-2 rounded-lg bg-purple-600/20 border border-purple-500/20 hover:bg-purple-600/30 text-purple-300 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-30"
          >
            <Sparkles size={14} /> AI 推荐排序
          </button>
          <button
            onClick={handleAddTopic}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-30 text-white text-sm font-medium transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            AI 生成选题
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 px-6 py-3 border-b border-white/[0.03] bg-white/[0.01]">
        {(['total', 'candidate', 'used', 'archived'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s === 'total' ? '' : s)}
            className={`text-xs flex items-center gap-1.5 transition-colors ${
              (s === 'total' && !filterStatus) || s === filterStatus
                ? 'text-white/80'
                : 'text-white/25 hover:text-white/50'
            }`}
          >
            <span className="text-white/40">
              {s === 'total' ? '总计' : s === 'candidate' ? '候选' : s === 'used' ? '已用' : '弃用'}
            </span>
            <span className="font-mono text-white/60">{stats[s]}</span>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 px-6 py-2.5 border-b border-white/[0.03]">
        <div className="relative flex-1 max-w-xs">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/15" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索选题..."
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/12 focus:outline-none focus:border-brand-500/20"
          />
        </div>
        <Filter size={12} className="text-white/20" />
        {Object.keys(CATEGORY_META).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)}
            className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
              filterCategory === cat
                ? 'bg-white/[0.06] border-white/10 text-white/70'
                : 'bg-white/[0.01] border-white/[0.03] text-white/25 hover:text-white/40'
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
              <Lightbulb size={40} className="text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/25 mb-4">
                {topics.length === 0 ? '选题池还是空的' : '没有匹配的选题'}
              </p>
              {topics.length === 0 && (
                <button
                  onClick={handleAddTopic}
                  className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm inline-flex items-center gap-2"
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
                        ? 'bg-white/[0.04] border-brand-500/20'
                        : 'bg-white/[0.01] border-white/[0.03] hover:border-white/[0.08]'
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
                          <span className="text-[10px] text-white/20">
                            {'⭐'.repeat(Math.min(5, t.difficulty))}
                          </span>
                        </div>
                        <h3 className="text-sm text-white/80 font-medium truncate">{t.title}</h3>
                        <p className="text-xs text-white/30 mt-1 truncate">{t.angle}</p>
                      </div>
                      <ChevronRight
                        size={14}
                        className={`text-white/15 transition-transform shrink-0 mt-1 ${selected?.id === t.id ? 'rotate-90' : ''}`}
                      />
                    </div>

                    {/* Expanded detail */}
                    {selected?.id === t.id && (
                      <div className="mt-4 pt-4 border-t border-white/[0.04] space-y-3">
                        {t.hook && (
                          <div>
                            <p className="text-[10px] text-white/25 mb-0.5">钩子</p>
                            <p className="text-xs text-white/50">{t.hook}</p>
                          </div>
                        )}
                        {t.audienceResonance && (
                          <div>
                            <p className="text-[10px] text-white/25 mb-0.5">受众共鸣</p>
                            <p className="text-xs text-white/50">{t.audienceResonance}</p>
                          </div>
                        )}
                        {t.reason && (
                          <div>
                            <p className="text-[10px] text-white/25 mb-0.5">选题理由</p>
                            <p className="text-xs text-white/50">{t.reason}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-2">
                          {t.status === 'candidate' && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); onWriteScript?.(t.title) }}
                                className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs transition-colors flex items-center gap-1.5"
                              >
                                <PenLine size={10} /> 写脚本
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(t.id, 'used') }}
                                className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 text-green-400 text-xs transition-colors flex items-center gap-1.5"
                              >
                                <CheckCircle2 size={10} /> 标记已用
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(t.id, 'archived') }}
                                className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/30 text-xs transition-colors flex items-center gap-1.5"
                              >
                                <Archive size={10} /> 弃用
                              </button>
                            </>
                          )}
                          {t.status === 'archived' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(t.id, 'candidate') }}
                              className="px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 text-yellow-400 text-xs transition-colors flex items-center gap-1.5"
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
          <div className="w-72 border-l border-white/5 p-4 overflow-y-auto shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white/60 flex items-center gap-1.5">
                <Sparkles size={12} className="text-purple-400" /> AI 推荐
              </h3>
              <button
                onClick={() => setRecommendations(null)}
                className="text-white/15 hover:text-white/30"
              >
                <XCircle size={14} />
              </button>
            </div>
            <p className="text-xs text-white/30 mb-4">{recStrategy}</p>
            <div className="space-y-2">
              {recommendations.map((r, i) => (
                <div key={i} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      r.strategy === 'stable'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-purple-500/10 text-purple-400'
                    }`}>
                      {r.strategy === 'stable' ? '稳妥' : '实验'}
                    </span>
                  </div>
                  <p className="text-xs text-white/70">{r.title}</p>
                  <p className="text-[10px] text-white/30 mt-1">{r.reason}</p>
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
