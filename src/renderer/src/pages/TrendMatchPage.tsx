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
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'

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
  douyin: 'border-brand-200 text-brand-600 bg-brand-50',
  weibo: 'border-red-500/30 text-danger-text bg-danger-surface',
  zhihu: 'border-info-border text-info-text bg-info-surface',
  tophub: 'border-success-border text-success-text bg-success-surface'
}

// ── Helpers ──

function heatColor(heat: number): string {
  if (heat >= 80) return 'bg-gradient-to-r from-danger to-warning'
  if (heat >= 50) return 'bg-gradient-to-r from-warning to-warning'
  return 'bg-gradient-to-r from-yellow-600 to-warning'
}

function heatDisplay(heat: number): string {
  if (heat >= 10000) return `${(heat / 10000).toFixed(1)}万`
  return heat.toLocaleString()
}

function methodBadge(method: string): { color: string; label: string } {
  if (method.includes('API') || method.includes('realtime') || method === 'realtime') {
    return { color: 'border-success-border text-success-text bg-success-surface', label: method }
  }
  return { color: 'border-warning-border text-warning-text bg-warning-surface', label: method || 'AI模拟' }
}

function relevanceBadge(relevance: MatchItem['relevance']): { color: string; label: string } {
  switch (relevance) {
    case 'high':
      return { color: 'bg-success-surface text-success-text border-success-border', label: '高相关' }
    case 'medium':
      return { color: 'bg-warning-surface text-warning-text border-warning-border', label: '中相关' }
    case 'low':
      return { color: 'bg-black/[0.04] text-ink-tertiary border-rule', label: '低相关' }
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
      <div className="flex items-center justify-center h-full text-ink-tertiary">
        <p>请先创建项目</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-rule-subtle">
        <Button variant="ghost" onClick={onBack} icon={<ArrowLeft size={16} />} />
        <h1 className="text-lg font-semibold text-white">热点趋势</h1>
        <span className="text-xs text-ink-disabled">实时热点 · AI 匹配你的选题</span>
        <div className="flex-1" />
      </div>

      {/* ── Source tabs ── */}
      <div className="px-6 py-3 border-b border-rule-subtle">
        {sourcesLoading ? (
          <div className="flex items-center gap-2 text-ink-disabled text-sm">
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
                      ? `${colorStyle} ring-1 ring-black/[0.10]`
                      : 'border-rule text-ink-tertiary hover:text-ink-secondary hover:border-rule bg-black/[0.01]'
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
              <Loader2 size={32} className="animate-spin text-brand-600/50 mb-4" />
              <p className="text-ink-tertiary text-sm">
                正在获取 {SOURCE_LABELS[selectedSource] || selectedSource} 热点...
              </p>
              <p className="text-ink-disabled text-xs mt-1">拉取实时榜单数据</p>
            </div>
          )}

          {/* ── Error ── */}
          {fetchError && !fetchLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <AlertTriangle size={32} className="text-danger-text/60" />
              <p className="text-danger-text text-sm">{fetchError}</p>
              <Button variant="ghost" onClick={() => fetchTrends(selectedSource)}>
                重试
              </Button>
            </div>
          )}

          {/* ── Empty ── */}
          {!fetchLoading && !fetchError && fetchResult && fetchResult.trends.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-ink-disabled">
              <Flame size={48} className="mb-4 opacity-30" />
              <p className="text-sm">暂无热点数据</p>
            </div>
          )}

          {/* ── Trend list ── */}
          {!fetchLoading && !fetchError && fetchResult && fetchResult.trends.length > 0 && (
            <>
              {/* Method badge */}
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-ink-secondary">
                  {SOURCE_LABELS[fetchResult.source] || fetchResult.source} · {fetchResult.trends.length} 条热点
                </h2>
                <Badge variant={fetchResult.method?.includes('API') || fetchResult.method === 'realtime' ? 'success' : 'warning'}>
                  {fetchResult.method || 'AI模拟'}
                </Badge>
              </div>

              {/* Trends */}
              <div className="space-y-1.5">
                {fetchResult.trends.map((trend, i) => (
                  <a
                    key={i}
                    href={trend.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-black/[0.02] border border-rule-subtle hover:bg-black/[0.04] hover:border-rule transition-all group"
                  >
                    <span className="shrink-0 w-7 text-xs font-mono text-ink-disabled text-center">
                      {String(i + 1).padStart(2, '0')}
                    </span>

                    <span className="flex-1 min-w-0 text-sm text-ink-primary group-hover:text-ink-primary truncate transition-colors">
                      {trend.title}
                    </span>

                    {trend.category && (
                      <Badge className="!text-[10px] !px-1.5 !py-0.5">{trend.category}</Badge>
                    )}

                    <span
                      className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full text-white font-medium ${heatColor(trend.heat)}`}
                    >
                      {heatDisplay(trend.heat)}
                    </span>

                    <span className="shrink-0 text-[10px] text-ink-disabled">
                      {SOURCE_LABELS[trend.source] || trend.source}
                    </span>

                    <ExternalLink
                      size={12}
                      className="shrink-0 text-ink-disabled group-hover:text-ink-tertiary transition-colors"
                    />
                  </a>
                ))}
              </div>
            </>
          )}

          {/* ── Match loading ── */}
          {matchLoading && fetchResult && fetchResult.trends.length > 0 && (
            <div className="flex items-center gap-3 justify-center py-8">
              <Loader2 size={18} className="animate-spin text-brand-600/50" />
              <span className="text-ink-tertiary text-sm">AI 正在匹配适合你的热点...</span>
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
                <Sparkles size={16} className="text-brand-600" />
                <h2 className="text-sm font-medium text-ink-secondary">为你匹配的热点</h2>
              </div>

              {matchResult.summary && (
                <Card level="elevated" className="!border-brand-200 !bg-brand-50 p-4">
                  <p className="text-sm text-ink-secondary leading-relaxed">{matchResult.summary}</p>
                </Card>
              )}

              <div className="grid grid-cols-1 gap-3">
                {matchResult.matches.map((match, i) => {
                  const badge = relevanceBadge(match.relevance)
                  return (
                    <Card
                      key={i}
                      level="subtle"
                      interactive
                      className="p-5 group"
                    >
                      <div className="flex items-start gap-4">
                        <span className="shrink-0 w-7 text-sm font-bold text-ink-disabled font-mono">
                          {String(i + 1).padStart(2, '0')}
                        </span>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-ink-primary group-hover:text-ink-primary transition-colors">
                              {match.hotTitle}
                            </h3>
                            <span
                              className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${badge.color}`}
                            >
                              {badge.label}
                            </span>
                          </div>

                          <p className="text-xs text-ink-tertiary flex gap-2">
                            <span className="text-ink-disabled shrink-0">切入角度：</span>
                            <span className="text-brand-500/80">{match.suggestedAngle}</span>
                          </p>

                          <p className="text-xs text-ink-disabled flex gap-2">
                            <span className="text-ink-disabled shrink-0">推荐理由：</span>
                            {match.reason}
                          </p>

                          {onWriteScript && (
                            <div className="pt-1">
                              <Button
                                variant="primary"
                                size="sm"
                                icon={<ArrowRight size={12} />}
                                onClick={() => onWriteScript(match.suggestedAngle)}
                              >
                                写脚本
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── No matches ── */}
          {!matchLoading && !matchError && matchResult && matchResult.matches.length === 0 && fetchResult && fetchResult.trends.length > 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-ink-disabled">
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
