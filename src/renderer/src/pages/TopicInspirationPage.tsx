import { useState, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { extractJSON } from '../services/parseAIResponse'
import {
  ArrowLeft,
  Lightbulb,
  Loader2,
  AlertCircle,
  Star,
  Target,
  Zap,
  TrendingUp,
  BookOpen,
  Shield,
  ArrowRight,
  RefreshCw
} from 'lucide-react'

interface TopicItem {
  title: string
  angle: string
  hook: string
  audienceResonance: string
  difficulty: number
  category: string
  reason: string
}

interface TopicResult {
  topics: TopicItem[]
  overallAdvice: string
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  '观点输出': Zap,
  '经验分享': BookOpen,
  '趋势解读': TrendingUp,
  '避坑指南': Shield
}

const CATEGORY_COLORS: Record<string, string> = {
  '观点输出': 'text-warning-text border-warning-border bg-warning-surface',
  '经验分享': 'text-blue-400 border-blue-500/20 bg-blue-500/5',
  '趋势解读': 'text-brand-400 border-brand-500/20 bg-brand-500/5',
  '避坑指南': 'text-danger-text border-danger-border bg-danger-surface'
}

function parseTopicResult(raw: string): TopicResult | null {
  const parsed = extractJSON<TopicResult>(raw, 'topics')
  if (!parsed || !Array.isArray(parsed.topics)) return null
  return parsed
}

export default function TopicInspirationPage({
  onBack,
  onWriteScript
}: {
  onBack: () => void
  onWriteScript: (topic: string) => void
}) {
  const activeProject = useAppStore((s) => s.activeProject)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<TopicResult | null>(null)
  const [useRetroData, setUseRetroData] = useState(true)

  const handleGenerate = useCallback(async () => {
    if (!activeProject) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      // Collect retro insights if available and enabled
      let retroInsights = ''
      if (useRetroData) {
        const predictions = await window.api.listPredictions(activeProject.path)
        const completedRetros: string[] = []

        if (Array.isArray(predictions) && predictions.length > 0) {
          for (const p of predictions.slice(0, 5)) {
            try {
              const raw = await window.api.readFile(p.path)
              const pred = JSON.parse(raw as string)
              if (pred.status === 'retro_completed' && pred.retroResult?.keyLearnings) {
                completedRetros.push(
                  `- 选题"${pred.topic}"复盘收获：${pred.retroResult.keyLearnings.slice(0, 3).join('；')}`
                )
              }
            } catch {
              // skip unreadable files
            }
          }
          if (completedRetros.length > 0) {
            retroInsights = completedRetros.join('\n')
          }
        }
      }

      const raw = await window.api.generateTopics({
        industry: activeProject.opts?.industry || '',
        audience: activeProject.opts?.targetAudience || '',
        experience: activeProject.opts?.contentExperience || '',
        identity: activeProject.opts?.identity || '',
        retroInsights: retroInsights || undefined
      })

      const parsed = parseTopicResult(raw as string)
      if (!parsed) {
        setError('AI 返回格式异常，请重试')
      } else {
        setResult(parsed)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '选题生成失败')
    } finally {
      setLoading(false)
    }
  }, [activeProject])

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
        <h1 className="text-lg font-semibold text-white">选题灵感</h1>
        <span className="text-xs text-white/20">AI 根据你的画像推荐爆款选题</span>
        <div className="flex-1" />
        <label className="flex items-center gap-2 text-xs text-white/30 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={useRetroData}
            onChange={(e) => setUseRetroData(e.target.checked)}
            className="rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500/30 cursor-pointer"
          />
          参考往期复盘数据
        </label>
        {result && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/70 text-sm transition-colors flex items-center gap-2"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            换一批
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        {!result && !loading ? (
          <div className="flex flex-col items-center justify-center h-full text-white/20">
            <Lightbulb size={48} className="mb-4 opacity-30" />
            <p className="text-sm mb-1">AI 根据你的行业和受众画像，生成选题建议</p>
            <p className="text-xs opacity-60 mb-6">
              {activeProject.opts?.industry
                ? `行业：${activeProject.opts.industry} · 受众：${activeProject.opts.targetAudience || '未设置'}`
                : '点击下方按钮开始'}
            </p>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-30 text-white text-sm font-medium transition-all flex items-center gap-2"
            >
              <Lightbulb size={16} />
              为我生成选题
            </button>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 size={32} className="animate-spin text-brand-400/50 mb-4" />
            <p className="text-white/40 text-sm">AI 正在分析你的受众画像...</p>
            <p className="text-white/20 text-xs mt-1">结合行业趋势和往期数据，生成选题建议</p>
          </div>
        ) : result ? (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Overall advice */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-brand-500/10 to-brand-500/10 border border-brand-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Target size={16} className="text-brand-400" />
                <h3 className="text-sm font-medium text-white/80">AI 综合建议</h3>
              </div>
              <p className="text-sm text-white/60 leading-relaxed">{result.overallAdvice}</p>
            </div>

            {/* Topic cards */}
            <div className="grid grid-cols-1 gap-3">
              {result.topics.map((topic, i) => {
                const CategoryIcon = CATEGORY_ICONS[topic.category] || Lightbulb
                const catStyle = CATEGORY_COLORS[topic.category] || 'text-white/30 border-white/10 bg-white/[0.02]'

                return (
                  <div
                    key={i}
                    className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-brand-500/20 transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Number + category */}
                      <div className="shrink-0 flex flex-col items-center gap-1.5">
                        <span className="text-lg font-bold text-white/15 font-mono">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full border ${catStyle} flex items-center gap-0.5`}
                        >
                          <CategoryIcon size={9} />
                          {topic.category}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-white/90 mb-2 group-hover:text-white transition-colors">
                          {topic.title}
                        </h3>

                        <div className="space-y-1.5 mb-3">
                          <p className="text-xs text-white/40 flex gap-2">
                            <span className="text-white/20 shrink-0">切入：</span>
                            {topic.angle}
                          </p>
                          <p className="text-xs text-white/40 flex gap-2">
                            <span className="text-white/20 shrink-0">钩子：</span>
                            <span className="text-brand-400/70 italic">"{topic.hook}"</span>
                          </p>
                          <p className="text-xs text-white/40 flex gap-2">
                            <span className="text-white/20 shrink-0">共鸣：</span>
                            {topic.audienceResonance}
                          </p>
                          <p className="text-xs text-white/30 flex gap-2">
                            <span className="text-white/20 shrink-0">理由：</span>
                            {topic.reason}
                          </p>
                        </div>

                        {/* Difficulty stars + action */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-white/20 mr-1">难度</span>
                            {Array.from({ length: 5 }).map((_, si) => (
                              <Star
                                key={si}
                                size={10}
                                className={
                                  si < topic.difficulty ? 'text-yellow-500/70' : 'text-white/[0.06]'
                                }
                                fill={si < topic.difficulty ? 'currentColor' : 'none'}
                              />
                            ))}
                          </div>

                          <button
                            onClick={() => onWriteScript(topic.title)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600/20 border border-brand-500/20 hover:bg-brand-600/30 text-brand-300 text-xs font-medium transition-colors"
                          >
                            用这个选题写脚本
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {error && (
          <div className="flex items-center gap-2 text-danger-text text-sm justify-center mt-4">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
