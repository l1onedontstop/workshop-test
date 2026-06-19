import { useEffect, useState } from 'react'
import { useAppStore } from '../stores/appStore'
import {
  Sparkles, Target, Map, User, BarChart3, AlertTriangle,
  ArrowRight, Loader2, Play, Calendar, Lightbulb, CheckCircle2,
  ChevronLeft, Save
} from 'lucide-react'

interface BlueprintData {
  positioning?: {
    tagline: string
    uniqueAngle: string
    whyYou: string
  }
  contentStrategy?: {
    pillars: Array<{ name: string; ratio: number; description: string; example: string }>
    publishCadence: string
    contentMix: string
  }
  firstVideo?: {
    topic: string
    angle: string
    hook: string
    why: string
    difficulty: number
    expectedPerformance: string
  }
  roadmap?: {
    week1: string
    week2: string
    month1: string
    month3: string
  }
  persona?: {
    voice: string
    visualStyle: string
    dressCode: string
    background: string
  }
  metrics?: {
    northStar: string
    vanityMetrics: string[]
    reviewCycle: string
  }
  risks?: string[]
  nextActions?: Array<{ action: string; priority: string; link: string }>
}

interface BlueprintPageProps {
  answers?: Record<string, string>
  onBack: () => void
  onNavigate?: (page: string) => void
}

export default function BlueprintPage({ answers, onBack, onNavigate }: BlueprintPageProps) {
  const [blueprint, setBlueprint] = useState<BlueprintData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { activeProject } = useAppStore()

  useEffect(() => {
    if (answers) {
      generateBlueprint(answers)
    } else if (activeProject) {
      loadExistingBlueprint()
    }
  }, [])

  async function generateBlueprint(a: Record<string, string>) {
    setLoading(true)
    setError('')
    try {
      const result = await window.api.ipStrategyGenerate(a)
      const data = result as BlueprintData & { success?: boolean; error?: string }
      if (data && (data.success !== false)) {
        setBlueprint(data)
        // Auto-save after successful generation
        if (activeProject) {
          try { await window.api.ipStrategySave(activeProject.path, data) } catch {}
        }
      } else {
        setError((data as any)?.error || '生成蓝图失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成蓝图失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  async function loadExistingBlueprint() {
    if (!activeProject) return
    setLoading(true)
    try {
      const result = await window.api.ipStrategyGet(activeProject.path)
      const data = result as BlueprintData
      if (data?.positioning) {
        setBlueprint(data)
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!activeProject || !blueprint) return
    setSaving(true)
    try {
      await window.api.ipStrategySave(activeProject.path, blueprint)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {} finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-brand-400 mx-auto mb-4" />
          <p className="text-white/60 text-sm">AI 正在为你生成 IP 打造蓝图...</p>
          <p className="text-white/25 text-xs mt-2">分析定位 → 内容策略 → 行动计划</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertTriangle size={40} className="text-red-400/60 mx-auto mb-4" />
          <p className="text-white/60 text-sm mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={onBack} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm">
              <ChevronLeft size={14} className="inline mr-1" />返回
            </button>
            {answers && (
              <button onClick={() => generateBlueprint(answers)} className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm">
                重试
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!blueprint) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Sparkles size={40} className="text-white/15 mx-auto mb-3" />
          <p className="text-white/40 text-sm">暂无 IP 蓝图</p>
          <button onClick={onBack} className="mt-3 text-sm text-brand-400 hover:text-brand-300">返回工作台</button>
        </div>
      </div>
    )
  }

  const { positioning, contentStrategy, firstVideo, roadmap, persona, metrics, risks, nextActions } = blueprint

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0f0f13]/95 backdrop-blur-sm border-b border-white/[0.06] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/60">
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-brand-400" />
                你的 IP 打造蓝图
              </h1>
              {positioning?.tagline && (
                <p className="text-xs text-white/40 mt-0.5">{positioning.tagline}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !activeProject}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/20 text-brand-300 text-sm disabled:opacity-40 transition-colors"
          >
            {saved ? <CheckCircle2 size={16} className="text-green-400" /> : <Save size={16} />}
            {saved ? '已保存' : '保存蓝图'}
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 max-w-4xl mx-auto w-full">
        {/* 1. 定位 */}
        {positioning && (
          <Section icon={<Target size={18} />} title="核心定位" color="text-brand-400">
            <div className="grid grid-cols-1 gap-4">
              <InfoBlock label="一句话定位" value={positioning.tagline} highlight />
              <InfoBlock label="差异化角度" value={positioning.uniqueAngle} />
              <InfoBlock label="为什么是你" value={positioning.whyYou} />
            </div>
          </Section>
        )}

        {/* 2. 内容策略 */}
        {contentStrategy && (
          <Section icon={<BarChart3 size={18} />} title="内容策略" color="text-green-400">
            <div className="space-y-3">
              <div className="flex gap-2 text-xs text-white/40 mb-2">
                <span>发布频率：{contentStrategy.publishCadence}</span>
                <span className="text-white/20">|</span>
                <span>配比：{contentStrategy.contentMix}</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {contentStrategy.pillars.map((pillar, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{pillar.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400">
                        {pillar.ratio}%
                      </span>
                    </div>
                    <p className="text-xs text-white/40 mb-1">{pillar.description}</p>
                    <p className="text-xs text-white/25 italic">示例：{pillar.example}</p>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* 3. 第一条视频 */}
        {firstVideo && (
          <Section icon={<Play size={18} />} title="第一条视频" color="text-purple-400" highlight>
            <div className="space-y-3">
              <InfoBlock label="选题" value={firstVideo.topic} />
              <InfoBlock label="切入角度" value={firstVideo.angle} />
              <div className="bg-brand-500/5 border border-brand-500/10 rounded-xl p-4">
                <p className="text-xs text-white/30 mb-1">建议开场钩子</p>
                <p className="text-sm text-white/80 leading-relaxed">「{firstVideo.hook}」</p>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="text-white/40">
                  难度：{Array.from({ length: 3 }).map((_, i) => (
                    <span key={i} className={i < firstVideo.difficulty ? 'text-yellow-400' : 'text-white/15'}>★</span>
                  ))}
                </span>
                <span className="text-white/30">预期：{firstVideo.expectedPerformance}</span>
              </div>
              <p className="text-xs text-white/25">{firstVideo.why}</p>
            </div>
          </Section>
        )}

        {/* 4. 路线图 */}
        {roadmap && (
          <Section icon={<Map size={18} />} title="执行路线图" color="text-cyan-400">
            <div className="space-y-3">
              {[
                { label: '第一周', value: roadmap.week1, icon: <Calendar size={14} /> },
                { label: '第二周', value: roadmap.week2, icon: <Calendar size={14} /> },
                { label: '第一个月', value: roadmap.month1, icon: <Target size={14} /> },
                { label: '三个月', value: roadmap.month3, icon: <Sparkles size={14} /> }
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
                  <div className="text-white/20 mt-0.5">{step.icon}</div>
                  <div>
                    <p className="text-xs text-white/30 mb-1">{step.label}</p>
                    <p className="text-sm text-white/70">{step.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 5. 人设 */}
        {persona && (
          <Section icon={<User size={18} />} title="人设与视觉" color="text-pink-400">
            <div className="grid grid-cols-2 gap-3">
              <InfoBlock label="语言风格" value={persona.voice} />
              <InfoBlock label="视觉风格" value={persona.visualStyle} />
              <InfoBlock label="着装建议" value={persona.dressCode} />
              <InfoBlock label="拍摄背景" value={persona.background} />
            </div>
          </Section>
        )}

        {/* 6. 指标 */}
        {metrics && (
          <Section icon={<BarChart3 size={18} />} title="关键指标" color="text-yellow-400">
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4">
                <p className="text-xs text-white/30 mb-1">北极星指标</p>
                <p className="text-lg font-bold text-white">{metrics.northStar}</p>
              </div>
              <div className="flex gap-3">
                {metrics.vanityMetrics.map((m, i) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-white/50">{m}</span>
                ))}
              </div>
              <p className="text-xs text-white/30">复盘周期：{metrics.reviewCycle}</p>
            </div>
          </Section>
        )}

        {/* 7. 风险 */}
        {risks && risks.length > 0 && (
          <Section icon={<AlertTriangle size={18} />} title="注意事项" color="text-orange-400">
            <div className="space-y-2">
              {risks.map((risk, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-white/50">
                  <AlertTriangle size={14} className="text-orange-400/50 mt-0.5 shrink-0" />
                  {risk}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 8. 下一步行动 */}
        {nextActions && nextActions.length > 0 && (
          <Section icon={<Lightbulb size={18} />} title="下一步行动" color="text-green-400">
            <div className="space-y-2">
              {nextActions.map((item, i) => {
                const handleClick = () => {
                  if (!onNavigate || !item.link) return
                  const linkMap: Record<string, string> = {
                    'script-editor': 'script-editor',
                    'benchmark': 'benchmark',
                    'topic-inspiration': 'topic-inspiration',
                    'plan-list': 'plan-list'
                  }
                  const target = linkMap[item.link]
                  if (target) onNavigate(target)
                }
                return (
                  <button
                    key={i}
                    onClick={handleClick}
                    className={`w-full text-left flex items-center gap-3 rounded-xl p-4 border transition-colors hover:brightness-110 ${
                      item.priority === 'high'
                        ? 'bg-green-500/5 border-green-500/10'
                        : 'bg-white/[0.02] border-white/[0.04]'
                    }`}
                  >
                    <ArrowRight size={16} className={item.priority === 'high' ? 'text-green-400' : 'text-white/30'} />
                    <div className="flex-1">
                      <p className="text-sm text-white/80">{item.action}</p>
                      <p className="text-xs text-white/25 mt-0.5">
                        点击前往：{item.link}
                        {item.priority === 'high' && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 text-[10px]">优先</span>
                        )}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </Section>
        )}

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>
    </div>
  )
}

// ── Helpers ──

function Section({
  icon, title, color, highlight, children
}: {
  icon: React.ReactNode
  title: string
  color: string
  highlight?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-2xl border p-5 ${highlight ? 'border-brand-500/15 bg-brand-500/[0.02]' : 'border-white/[0.06] bg-white/[0.01]'}`}>
      <div className={`flex items-center gap-2 mb-4 ${color}`}>
        {icon}
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function InfoBlock({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-white/25 mb-1">{label}</p>
      <p className={`text-sm leading-relaxed ${highlight ? 'text-white font-semibold text-base' : 'text-white/70'}`}>
        {value}
      </p>
    </div>
  )
}
