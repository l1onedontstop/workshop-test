import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { extractJSON } from '../services/parseAIResponse'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileText,
  TrendingUp,
  Brain,
  Target,
  BarChart3,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Zap,
  Heart,
  Layout,
  Mic,
  CheckCircle2,
  Play,
  ThumbsUp,
  MessageCircle,
  Share2,
  Eye,
  Link2,
  ExternalLink,
  PenLine
} from 'lucide-react'

interface PredictionFile {
  name: string
  path: string
}

interface Prediction {
  scriptFile: string
  topic: string
  scriptContent: string
  scores: Record<string, number>
  total: number
  overall: string
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  predictedAt: string
  status: string
  publishedAt: string | null
  publishUrl: string | null
  actualData: ActualData | null
}

interface ActualData {
  plays: number
  likes: number
  comments: number
  shares: number
  completionRate?: number
  videoUrl?: string
  note?: string
}

interface RetroResult {
  interactionRates: {
    likeRate: number
    commentRate: number
    shareRate: number
    completionRate: number
  }
  deviationAnalysis: Array<{
    dimension: string
    predictedScore: number
    impliedByData: number
    deviation: number
    explanation: string
  }>
  overallAssessment: string
  keyLearnings: string[]
}

interface EvolutionSuggestion {
  shouldEvolve: boolean
  version: string
  weightChanges: Array<{
    dimension: string
    oldWeight: number
    newWeight: number
    reason: string
    evidenceCount: number
  }>
  newWeights: Record<string, number>
  rationale: string
  warnings: string[]
}

const DIMENSION_LABELS: Record<string, string> = {
  hook: '开篇钩子',
  rhythm: '叙事节奏',
  sharpness: '观点锐度',
  utility: '实用密度',
  emotion: '情绪共鸣',
  structure: '结构完整',
  expression: '表达效果'
}

const DIMENSION_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  hook: Target,
  rhythm: Zap,
  sharpness: Lightbulb,
  utility: CheckCircle2,
  emotion: Heart,
  structure: Layout,
  expression: Mic
}

function getDeviationColor(dev: number): string {
  if (dev >= 1.5) return 'text-success-text'
  if (dev >= 0.5) return 'text-success-text/70'
  if (dev <= -1.5) return 'text-danger-text'
  if (dev <= -0.5) return 'text-warning-text'
  return 'text-white/40'
}

function parseRetroResult(raw: string): RetroResult | null {
  return extractJSON<RetroResult>(raw, 'interactionRates')
}

function parseEvolutionResult(raw: string): EvolutionSuggestion | null {
  return extractJSON<EvolutionSuggestion>(raw, 'shouldEvolve')
}

export default function RetroPage({ onBack }: { onBack: () => void }) {
  const activeProject = useAppStore((s) => s.activeProject)
  const refreshActiveProject = useAppStore((s) => s.refreshActiveProject)

  const [predictions, setPredictions] = useState<PredictionFile[]>([])
  const [selectedPred, setSelectedPred] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retroResult, setRetroResult] = useState<RetroResult | null>(null)
  const [retroHistory, setRetroHistory] = useState<
    Array<{ prediction: Prediction; result: RetroResult }>
  >([])

  // Evolution state
  const [evolving, setEvolving] = useState(false)
  const [evolution, setEvolution] = useState<EvolutionSuggestion | null>(null)
  const [evolutionApplied, setEvolutionApplied] = useState(false)

  // Actual data form
  const [actualData, setActualData] = useState<ActualData>({
    plays: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    completionRate: undefined,
    videoUrl: '',
    note: ''
  })

  // Load predictions list
  useEffect(() => {
    if (!activeProject) return
    window.api.listPredictions(activeProject.path).then((list) => {
      setPredictions(list as unknown as PredictionFile[])
    }).catch(() => {})
  }, [activeProject])

  // Load selected prediction
  const handleSelectPrediction = useCallback(async (entry: PredictionFile) => {
    setError('')
    setRetroResult(null)
    setActualData({ plays: 0, likes: 0, comments: 0, shares: 0, completionRate: undefined, note: '' })
    try {
      const raw = await window.api.readFile(entry.path)
      const pred = JSON.parse(raw as string) as Prediction
      setSelectedPred(pred)
      // Pre-fill if already has actual data
      if (pred.actualData) {
        setActualData(pred.actualData)
        setRetroResult(null) // User may re-analyze
      }
    } catch {
      setError('无法读取预测文件')
    }
  }, [])

  // Analyze retro data
  const handleAnalyze = useCallback(async () => {
    if (!selectedPred || !activeProject) return
    if (actualData.plays <= 0) {
      setError('请先输入播放量')
      return
    }

    setLoading(true)
    setError('')
    setRetroResult(null)

    try {
      const raw = await window.api.analyzeRetro({
        script: selectedPred.scriptContent,
        predictedScores: selectedPred.scores,
        predictedTotal: selectedPred.total,
        actualData
      })
      const parsed = parseRetroResult(raw as string)
      if (!parsed) {
        setError('AI 分析结果格式异常，请重试')
      } else {
        setRetroResult(parsed)
        setRetroHistory((prev) => [...prev, { prediction: selectedPred, result: parsed }])

        // Update prediction file with actual data + retro result
        const predPath = `${activeProject.path}/predictions/${selectedPred.scriptFile.replace('.md', '.json')}`
        const updated = {
          ...selectedPred,
          actualData,
          status: 'retro_completed',
          retroCompletedAt: new Date().toISOString(),
          retroResult: parsed
        }
        await window.api.writeFile(predPath, JSON.stringify(updated, null, 2))

        // Log activity
        await window.api.logActivity(activeProject.path, {
          type: 'retro_completed',
          timestamp: new Date().toISOString(),
          label: `复盘完成：${selectedPred.topic}`,
          detail: `播放${actualData.plays} · ${parsed.overallAssessment.slice(0, 50)}...`,
          scriptFile: selectedPred.scriptFile,
          navTarget: 'retro'
        })

        // Update buffer count
        await window.api.updateProjectState(activeProject.path, {
          bufferCount: Math.max(0, (activeProject.state.bufferCount || 1) - 1)
        })

        await refreshActiveProject()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败')
    } finally {
      setLoading(false)
    }
  }, [selectedPred, actualData, activeProject, refreshActiveProject])

  // Evolve rubric
  const handleEvolveRubric = useCallback(async () => {
    if (!activeProject || retroHistory.length === 0) return
    setEvolving(true)
    setEvolution(null)

    try {
      const currentRubric = await window.api.readRubric(activeProject.path)
      const raw = await window.api.suggestRubricEvolution({
        currentRubric,
        retroResults: retroHistory.map((h) => ({
          deviationAnalysis: h.result.deviationAnalysis,
          keyLearnings: h.result.keyLearnings
        }))
      })
      const parsed = parseEvolutionResult(raw as string)
      if (parsed && parsed.shouldEvolve) {
        setEvolution(parsed)

        // Apply to rubric file
        await window.api.evolveRubric(activeProject.path, parsed)
        setEvolutionApplied(true)

        // Log activity
        await window.api.logActivity(activeProject.path, {
          type: 'rubric_evolved',
          timestamp: new Date().toISOString(),
          label: `评分规则进化至 ${parsed.version}`,
          detail: parsed.rationale.slice(0, 80),
          navTarget: 'retro'
        })
        await refreshActiveProject()
      } else if (parsed) {
        setEvolution(parsed) // Show "no change needed"
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '进化失败')
    } finally {
      setEvolving(false)
    }
  }, [activeProject, retroHistory, refreshActiveProject])

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
        <h1 className="text-lg font-semibold text-white">数据复盘</h1>
        <span className="text-xs text-white/20">预测 vs 实际 · 持续进化</span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Prediction list */}
        <div className="w-72 border-r border-white/5 p-4 overflow-y-auto shrink-0">
          <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
            预测记录
          </h3>
          {predictions.length === 0 ? (
            <div className="text-center py-8">
              <FileText size={24} className="text-white/10 mx-auto mb-2" />
              <p className="text-white/25 text-xs">还没有预测记录</p>
              <p className="text-white/15 text-xs mt-1">先去创作工作台保存脚本</p>
            </div>
          ) : (
            <div className="space-y-1">
              {predictions.map((p) => (
                <button
                  key={p.name}
                  onClick={() => handleSelectPrediction(p)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors ${
                    selectedPred?.scriptFile === p.name.replace('.json', '.md')
                      ? 'bg-orange-500/15 text-orange-300 border border-warning-border'
                      : 'text-white/50 hover:bg-white/[0.03] hover:text-white/70 border border-transparent'
                  }`}
                >
                  <div className="truncate font-medium">{p.name}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Retro workspace */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedPred ? (
            <div className="flex flex-col items-center justify-center h-full text-white/20">
              <BarChart3 size={40} className="mb-3 opacity-30" />
              <p className="text-sm">从左侧选择一个预测记录</p>
              <p className="text-xs mt-1 opacity-60">输入实际数据开始复盘分析</p>
            </div>
          ) : (
            <div className="max-w-2xl space-y-6">
              {/* Prediction summary */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <h3 className="text-sm font-medium text-white/70 mb-2">
                  📋 {selectedPred.topic}
                </h3>
                <div className="flex items-center gap-4 text-xs text-white/40">
                  <span>预测分数：{selectedPred.total.toFixed(1)}/10</span>
                  <span>
                    预测时间：{new Date(selectedPred.predictedAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                {selectedPred.actualData?.videoUrl && (
                  <button
                    onClick={() => window.open(selectedPred.actualData!.videoUrl!, '_blank')}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    <ExternalLink size={11} />
                    查看原视频
                  </button>
                )}
                {selectedPred.actualData?.note && (
                  <p className="mt-2 text-xs text-white/30 leading-relaxed italic border-t border-white/[0.04] pt-2">
                    📝 {selectedPred.actualData.note}
                  </p>
                )}
              </div>

              {/* Actual data input */}
              <section>
                <h3 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                  <Play size={14} className="text-warning-text" />
                  输入实际数据
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider flex items-center gap-1 mb-1">
                      <Eye size={10} /> 播放量
                    </label>
                    <input
                      type="number"
                      value={actualData.plays || ''}
                      onChange={(e) =>
                        setActualData((d) => ({ ...d, plays: parseInt(e.target.value) || 0 }))
                      }
                      placeholder="0"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-orange-500/30"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider flex items-center gap-1 mb-1">
                      <ThumbsUp size={10} /> 点赞
                    </label>
                    <input
                      type="number"
                      value={actualData.likes || ''}
                      onChange={(e) =>
                        setActualData((d) => ({ ...d, likes: parseInt(e.target.value) || 0 }))
                      }
                      placeholder="0"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-orange-500/30"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider flex items-center gap-1 mb-1">
                      <MessageCircle size={10} /> 评论
                    </label>
                    <input
                      type="number"
                      value={actualData.comments || ''}
                      onChange={(e) =>
                        setActualData((d) => ({ ...d, comments: parseInt(e.target.value) || 0 }))
                      }
                      placeholder="0"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-orange-500/30"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider flex items-center gap-1 mb-1">
                      <Share2 size={10} /> 分享
                    </label>
                    <input
                      type="number"
                      value={actualData.shares || ''}
                      onChange={(e) =>
                        setActualData((d) => ({ ...d, shares: parseInt(e.target.value) || 0 }))
                      }
                      placeholder="0"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-orange-500/30"
                    />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">
                      完播率 (%)
                    </label>
                    <input
                      type="number"
                      value={
                        actualData.completionRate != null
                          ? (actualData.completionRate * 100).toFixed(1)
                          : ''
                      }
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        setActualData((d) => ({
                          ...d,
                          completionRate: isNaN(v) ? undefined : v / 100
                        }))
                      }}
                      placeholder="如 45.2"
                      step="0.1"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-orange-500/30"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-[10px] text-white/30 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Link2 size={10} /> 视频链接
                  </label>
                  <input
                    type="url"
                    value={actualData.videoUrl || ''}
                    onChange={(e) =>
                      setActualData((d) => ({ ...d, videoUrl: e.target.value }))
                    }
                    placeholder="https://v.douyin.com/... 或 https://www.bilibili.com/video/..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-orange-500/30"
                  />
                </div>
                <div className="mt-3">
                  <label className="text-[10px] text-white/30 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <PenLine size={10} /> 备注
                  </label>
                  <textarea
                    value={actualData.note || ''}
                    onChange={(e) =>
                      setActualData((d) => ({ ...d, note: e.target.value }))
                    }
                    placeholder="记录发布时的特殊情况、限流、爆款原因等..."
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-orange-500/30 resize-none"
                  />
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={loading || actualData.plays <= 0}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-30 text-white text-sm font-medium transition-all flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <TrendingUp size={16} />
                  )}
                  开始复盘分析
                </button>
              </section>

              {error && (
                <div className="flex items-center gap-2 text-danger-text text-sm">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              {/* Retro result */}
              {retroResult && (
                <div className="space-y-4 border-t border-white/[0.04] pt-6">
                  <h3 className="text-sm font-medium text-white/60 flex items-center gap-2">
                    <TrendingUp size={14} className="text-success-text" />
                    复盘分析结果
                  </h3>

                  {/* Interaction rates */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: '点赞率', value: retroResult.interactionRates.likeRate, format: '%' },
                      { label: '评论率', value: retroResult.interactionRates.commentRate, format: '%' },
                      { label: '分享率', value: retroResult.interactionRates.shareRate, format: '%' },
                      { label: '完播率', value: retroResult.interactionRates.completionRate, format: '%' }
                    ].map((m) => (
                      <div
                        key={m.label}
                        className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center"
                      >
                        <p className="text-[10px] text-white/30">{m.label}</p>
                        <p className="text-lg font-bold text-white/80">
                          {(m.value * 100).toFixed(1)}%
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Deviation analysis */}
                  <div>
                    <h4 className="text-xs font-medium text-white/40 mb-2">
                      维度偏差分析
                    </h4>
                    <div className="space-y-2">
                      {retroResult.deviationAnalysis.map((d, i) => {
                        const IconComp = DIMENSION_ICONS[d.dimension] || Target
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                          >
                            <IconComp size={14} className="text-white/30 shrink-0" />
                            <span className="text-xs text-white/50 w-16 shrink-0">
                              {DIMENSION_LABELS[d.dimension] || d.dimension}
                            </span>
                            <div className="flex items-center gap-1.5 flex-1">
                              <span className="text-xs text-white/30">
                                {d.predictedScore}/10
                              </span>
                              <span className="text-white/15">→</span>
                              <span className={`text-xs font-medium ${getDeviationColor(d.deviation)}`}>
                                {d.impliedByData}/10
                              </span>
                              <span
                                className={`text-[10px] ml-2 ${d.deviation >= 0 ? 'text-success-text/60' : 'text-danger-text/60'}`}
                              >
                                {d.deviation >= 0 ? '↑低估' : '↓高估'} {Math.abs(d.deviation)}
                                分
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Overall assessment */}
                  <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-sm text-white/60 leading-relaxed">
                      {retroResult.overallAssessment}
                    </p>
                  </div>

                  {/* Key learnings */}
                  {retroResult.keyLearnings.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-success-text/80 mb-1.5">
                        💡 关键收获
                      </h4>
                      <ul className="space-y-1">
                        {retroResult.keyLearnings.map((l, i) => (
                          <li key={i} className="text-xs text-white/40 flex gap-1.5">
                            <span className="text-green-500/50 shrink-0">•</span>
                            {l}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Rubric Evolution */}
              {retroHistory.length >= 1 && (
                <div className="border-t border-white/[0.04] pt-6">
                  <h3 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                    <Brain size={14} className="text-brand-400" />
                    Rubric 进化
                    <span className="text-[10px] text-white/20 ml-1">
                      （基于 {retroHistory.length} 条复盘数据）
                    </span>
                  </h3>

                  {!evolution ? (
                    <button
                      onClick={handleEvolveRubric}
                      disabled={evolving}
                      className="px-5 py-2.5 rounded-xl bg-brand-600/20 border border-brand-500/20 hover:bg-brand-600/30 disabled:opacity-30 text-white text-sm font-medium transition-all flex items-center gap-2"
                    >
                      {evolving ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Brain size={16} />
                      )}
                      AI 分析并建议权重调整
                    </button>
                  ) : evolution.shouldEvolve ? (
                    <div className="space-y-4 p-4 rounded-xl bg-brand-500/5 border border-brand-500/10">
                      <div className="flex items-center gap-2">
                        <Brain size={14} className="text-brand-400" />
                        <span className="text-sm font-medium text-brand-300">
                          已进化至 {evolution.version}
                        </span>
                        {evolutionApplied && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-success-surface text-success-text">
                            已应用
                          </span>
                        )}
                      </div>

                      {/* Weight changes */}
                      <div className="space-y-2">
                        {evolution.weightChanges.map((wc, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02]"
                          >
                            <span className="text-xs text-white/50 w-16">
                              {DIMENSION_LABELS[wc.dimension] || wc.dimension}
                            </span>
                            <span className="text-xs text-white/30">
                              {(wc.oldWeight * 100).toFixed(0)}%
                            </span>
                            <span className="text-brand-400">→</span>
                            <span className="text-xs text-brand-300 font-medium">
                              {(wc.newWeight * 100).toFixed(0)}%
                            </span>
                            <span className="text-[10px] text-white/20 ml-auto">
                              基于 {wc.evidenceCount} 条数据
                            </span>
                          </div>
                        ))}
                      </div>

                      <p className="text-xs text-white/40 leading-relaxed">
                        {evolution.rationale}
                      </p>

                      {evolution.warnings.length > 0 && (
                        <div className="p-3 rounded-lg bg-warning-surface border border-warning-border">
                          {evolution.warnings.map((w, i) => (
                            <p key={i} className="text-xs text-warning-text/60 flex gap-1.5">
                              <span>⚠️</span>
                              {w}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-sm text-white/40">
                        当前数据不足以建议权重调整。继续积累复盘数据，当偏差模式足够明显时，AI 会建议进化方向。
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
