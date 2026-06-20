import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import {
  ArrowLeft,
  Flame,
  TrendingUp,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Sparkles,
  ArrowRight
} from 'lucide-react'

// ── Types ──

interface TrendSource {
  id: string
  name: string
  url: string
}

interface TrendItem {
  title: string
  source: string
  url: string
  heat: number
  category: string
}

interface TrendFetchResult {
  success: boolean
  source: string
  trends: TrendItem[]
  method: string
}

interface MatchItem {
  hotTitle: string
  relevance: 'high' | 'medium' | 'low'
  suggestedAngle: string
  reason: string
}

interface MatchResult {
  matches: MatchItem[]
  summary: string
}

// ── Source config ──

const SOURCE_LABELS: Record<string, string> = {
  douyin: '抖音热榜',
  weibo: '微博热搜',
  zhihu: '知乎热榜',
  tophub: 'TopHub'
}

const SOURCE_COLORS: Record<string, string> = {
  douyin: 'border-pink-500/30 text-pink-400 bg-pink-500/10',
  weibo: 'border-red-500/30 text-danger-text bg-danger-surface',
  zhihu: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
  tophub: 'border-success-border text-success-text bg-success-surface'
}

// ── Helpers ──

function heatColor(heat: number): string {
  if (heat >= 80) return 'bg-gradient-to-r from-red-500 to-orange-500'
  if (heat >= 50) return 'bg-gradient-to-r from-orange-500 to-yellow-500'
  return 'bg-gradient-to-r from-yellow-600 to-yellow-500'
}

function heatDisplay(heat: number): string {
  if (heat >= 10000) return `${(heat / 10000).toFixed(1)}万`
  return heat.toLocaleString()
}

function methodBadge(method: string): { color: string; label: string } {
  if (method.includes('API') || method.includes('realtime') || method === 'realtime') {
    return { color: 'border-success-border text-success-text bg-success-surface', label: method }
  }
  return { color: 'border-yellow-500/30 text-warning-text bg-warning-surface', label: method || 'AI模拟' }
}

function relevanceBadge(relevance: MatchItem['relevance']): { color: string; label: string } {
  switch (relevance) {
    case 'high':
      return { color: 'bg-success-surface text-success-text border-success-border', label: '高相关' }
    case 'medium':
      return { color: 'bg-yellow-500/20 text-warning-text border-yellow-500/30', label: '中相关' }
    case 'low':
      return { color: 'bg-white/5 text-white/30 border-white/10', label: '低相关' }
  }
}

// ── Component ──

export default function TrendMatchPage({
  onBack,
  onWriteScript
}: {
  onBack: () => void
  onWriteScript?: (topic: string) => void
}) {
  const activeProject = useAppStore((s) => s.activeProject)

  // Sources
  const [sources, setSources] = useState<TrendSource[]>([])
  const [sourcesLoading, setSourcesLoading] = useState(true)
  const [selectedSource, setSelectedSource] = useState('douyin')

  // Fetch
  const [fetchLoading, setFetchLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [fetchResult, setFetchResult] = useState<TrendFetchResult | null>(null)

  // Match
  const [matchLoading, setMatchLoading] = useState(false)
  const [matchError, setMatchError] = useState('')
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)

  // ── Load sources on mount ──
  useEffect(() => {
    (async () => {
      try {
        setSourcesLoading(true)
        const raw = await window.api.trendSources()
        const list = (raw as unknown[]) as TrendSource[]
        setSources(list || [])
        if (list?.length > 0) setSelectedSource(list[0].id)
      } catch {
        setSources([])
      } finally {
        setSourcesLoading(false)
      }
    })()
  }, [])

  // ── Fetch trends ──
  const fetchTrends = useCallback(async (sourceId: string) => {
    setFetchLoading(true)
    setFetchError('')
    setFetchResult(null)
    setMatchResult(null)
    setMatchError('')

    try {
      const raw = await window.api.trendFetch(sourceId)
      const result = raw as unknown as TrendFetchResult
      if (!result?.success) {
        setFetchError('获取热点失败，请稍后重试')
        return
      }
      setFetchResult(result)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : '获取热点失败')
    } finally {
      setFetchLoading(false)
    }
  }, [])

  // Auto-fetch when source changes
  useEffect(() => {
    if (selectedSource) fetchTrends(selectedSource)
  }, [selectedSource, fetchTrends])

  // ── Auto-match when trends load ──
  useEffect(() => {
    if (!fetchResult?.trends?.length || !activeProject) return

    const doMatch = async () => {
      setMatchLoading(true)
      setMatchError('')
      setMatchResult(null)

      try {
        const raw = await window.api.trendMatch(
          activeProject.path,
          fetchResult.trends as unknown[],
          {
            industry: (activeProject.opts?.industry as string) || '',
            identity: (activeProject.opts?.identity as string) || '',
            audience: (activeProject.opts?.targetAudience as string) || ''
          }
        )
        const result = raw as unknown as MatchResult
        setMatchResult(result)
      } catch (err) {
        setMatchError(err instanceof Error ? err.message : '匹配分析失败')
      } finally {
        setMatchLoading(false)
      }
    }

    doMatch()
  }, [fetchResult, activeProject])

  // ── No project guard ──
  if (!activeProject) {
    return (
      <div className="flex items-center justify-center h-full text-white/30">
        <p>请先创建项目</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/5">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold text-white">热点趋势</h1>
        <span className="text-xs text-white/20">实时热点 · AI 匹配你的选题</span>
        <div className="flex-1" />
      </div>

      {/* ── Source tabs ── */}
      <div className="px-6 py-3 border-b border-white/[0.03]">
        {sourcesLoading ? (
          <div className="flex items-center gap-2 text-white/20 text-sm">
            <Loader2 size={14} className="animate-spin" />
            加载数据源...
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {sources.map((src) => {
              const active = selectedSource === src.id
              const colorStyle = SOURCE_COLORS[src.id] || SOURCE_COLORS.tophub
              return (
                <button
                  key={src.id}
                  onClick={() => setSelectedSource(src.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    active
                      ? `${colorStyle} ring-1 ring-white/10`
                      : 'border-white/[0.06] text-white/30 hover:text-white/50 hover:border-white/10 bg-white/[0.01]'
                  }`}
                >
                  <Flame size={11} className="inline mr-1.5" />
                  {SOURCE_LABELS[src.id] || src.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* ── Loading ── */}
          {fetchLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-brand-400/50 mb-4" />
              <p className="text-white/40 text-sm">
                正在获取 {SOURCE_LABELS[selectedSource] || selectedSource} 热点...
              </p>
              <p className="text-white/20 text-xs mt-1">拉取实时榜单数据</p>
            </div>
          )}

          {/* ── Error ── */}
          {fetchError && !fetchLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <AlertTriangle size={32} className="text-danger-text/60" />
              <p className="text-danger-text text-sm">{fetchError}</p>
              <button
                onClick={() => fetchTrends(selectedSource)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/70 text-sm transition-colors"
              >
                重试
              </button>
            </div>
          )}

          {/* ── Empty ── */}
          {!fetchLoading && !fetchError && fetchResult && fetchResult.trends.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-white/20">
              <Flame size={48} className="mb-4 opacity-30" />
              <p className="text-sm">暂无热点数据</p>
            </div>
          )}

          {/* ── Trend list ── */}
          {!fetchLoading && !fetchError && fetchResult && fetchResult.trends.length > 0 && (
            <>
              {/* Method badge */}
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-white/60">
                  {SOURCE_LABELS[fetchResult.source] || fetchResult.source} · {fetchResult.trends.length} 条热点
                </h2>
                {(() => {
                  const mb = methodBadge(fetchResult.method)
                  return (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${mb.color}`}
                    >
                      {mb.label}
                    </span>
                  )
                })()}
              </div>

              {/* Trends */}
              <div className="space-y-1.5">
                {fetchResult.trends.map((trend, i) => (
                  <a
                    key={i}
                    href={trend.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.04] hover:border-white/[0.06] transition-all group"
                  >
                    <span className="shrink-0 w-7 text-xs font-mono text-white/15 text-center">
                      {String(i + 1).padStart(2, '0')}
                    </span>

                    <span className="flex-1 min-w-0 text-sm text-white/80 group-hover:text-white/90 truncate transition-colors">
                      {trend.title}
                    </span>

                    {trend.category && (
                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-white/[0.06] text-white/25 bg-white/[0.02]">
                        {trend.category}
                      </span>
                    )}

                    <span
                      className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full text-white font-medium ${heatColor(trend.heat)}`}
                    >
                      {heatDisplay(trend.heat)}
                    </span>

                    <span className="shrink-0 text-[10px] text-white/15">
                      {SOURCE_LABELS[trend.source] || trend.source}
                    </span>

                    <ExternalLink
                      size={12}
                      className="shrink-0 text-white/10 group-hover:text-white/30 transition-colors"
                    />
                  </a>
                ))}
              </div>
            </>
          )}

          {/* ── Match loading ── */}
          {matchLoading && fetchResult && fetchResult.trends.length > 0 && (
            <div className="flex items-center gap-3 justify-center py-8">
              <Loader2 size={18} className="animate-spin text-brand-400/50" />
              <span className="text-white/30 text-sm">AI 正在匹配适合你的热点...</span>
            </div>
          )}

          {/* ── Match error ── */}
          {matchError && !matchLoading && (
            <div className="flex items-center gap-2 justify-center py-4 text-danger-text/60 text-sm">
              <AlertTriangle size={14} />
              {matchError}
            </div>
          )}

          {/* ── Match results ── */}
          {!matchLoading && matchResult && matchResult.matches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-brand-400" />
                <h2 className="text-sm font-medium text-white/70">为你匹配的热点</h2>
              </div>

              {matchResult.summary && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-brand-500/10 to-brand-500/10 border border-brand-500/20">
                  <p className="text-sm text-white/50 leading-relaxed">{matchResult.summary}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                {matchResult.matches.map((match, i) => {
                  const badge = relevanceBadge(match.relevance)
                  return (
                    <div
                      key={i}
                      className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-brand-500/20 transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        <span className="shrink-0 w-7 text-sm font-bold text-white/12 font-mono">
                          {String(i + 1).padStart(2, '0')}
                        </span>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-white/85 group-hover:text-white transition-colors">
                              {match.hotTitle}
                            </h3>
                            <span
                              className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${badge.color}`}
                            >
                              {badge.label}
                            </span>
                          </div>

                          <p className="text-xs text-white/40 flex gap-2">
                            <span className="text-white/15 shrink-0">切入角度：</span>
                            <span className="text-brand-300/80">{match.suggestedAngle}</span>
                          </p>

                          <p className="text-xs text-white/25 flex gap-2">
                            <span className="text-white/12 shrink-0">推荐理由：</span>
                            {match.reason}
                          </p>

                          {onWriteScript && (
                            <div className="pt-1">
                              <button
                                onClick={() => onWriteScript(match.suggestedAngle)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600/20 border border-brand-500/20 hover:bg-brand-600/30 text-brand-300 text-xs font-medium transition-colors"
                              >
                                写脚本
                                <ArrowRight size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── No matches ── */}
          {!matchLoading && !matchError && matchResult && matchResult.matches.length === 0 && fetchResult && fetchResult.trends.length > 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-white/20">
              <Sparkles size={32} className="mb-3 opacity-30" />
              <p className="text-sm">暂无匹配你账号的热点</p>
              <p className="text-xs mt-1 opacity-60">试试切换其他数据源</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
