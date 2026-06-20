import { useState, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'
import {
  ArrowLeft, Users, Loader2, Sparkles, AlertCircle,
  CheckCircle2, Target, Lightbulb, TrendingUp, Shield,
  BarChart3, ChevronRight, Trash2
} from 'lucide-react'

interface PersonaData {
  builtAt: string
  sampleCount: number
  coreAudience: {
    age: string
    occupation: string
    interests: string[]
    painPoints: string[]
    whyFollow: string
  }
  secondaryAudience: {
    age: string
    occupation: string
    interests: string[]
    whyFollow: string
  }
  contentAdvice: {
    whatWorks: string[]
    whatAvoid: string[]
    toneAdvice: string
  }
  growthOpportunities: string[]
  summary: string
}

export default function PersonaPage({ onBack }: { onBack: () => void }) {
  const activeProject = useAppStore((s) => s.activeProject)
  const [persona, setPersona] = useState<PersonaData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!activeProject) return
    window.api.personaGet(activeProject.path).then((data) => {
      if (data) setPersona(data as PersonaData)
    })
  }, [activeProject])

  const handleClear = async () => {
    if (!activeProject) return
    await window.api.personaClear(activeProject.path)
    setPersona(null)
    setError('')
  }

  const handleBuild = async () => {
    if (!activeProject) return
    setLoading(true)
    setError('')
    try {
      const result = (await window.api.personaBuild(activeProject.path)) as {
        success: boolean; persona?: PersonaData; error?: string
      }
      if (result.success && result.persona) {
        setPersona(result.persona)
      } else {
        setError(result.error || '构建失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '构建失败')
    } finally {
      setLoading(false)
    }
  }

  if (!activeProject) {
    return <div className="flex items-center justify-center h-full text-white/30">请先创建项目</div>
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6 border-b border-white/5">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-white">受众画像</h2>
            <p className="text-xs text-white/30">
              {persona
                ? `基于 ${persona.sampleCount} 条复盘数据构建 · ${new Date(persona.builtAt).toLocaleDateString('zh-CN')} 更新`
                : '从复盘数据中了解你的观众'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
        <button
          onClick={handleBuild}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-30 text-white text-sm font-medium transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {persona ? '更新画像' : '构建画像'}
        </button>
        {persona && (
          <button
            onClick={handleClear}
            className="px-3 py-2 rounded-lg bg-danger-surface border border-danger-border hover:bg-danger-surface text-danger-text/70 hover:text-danger-text text-sm transition-colors flex items-center gap-1.5"
          >
            <Trash2 size={14} />
            清除
          </button>
        )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {error && (
            <div className="mb-6 flex items-center gap-2 text-danger-text text-sm bg-danger-surface border border-danger-border rounded-lg px-4 py-2.5">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {!persona && !loading && (
            <div className="text-center py-20">
              <Users size={48} className="text-white/10 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white/40 mb-2">还没有受众画像</h3>
              <p className="text-sm text-white/20 mb-6 max-w-md mx-auto">
                发布并复盘几条视频后，AI 可以根据播放数据和观众反馈，帮你构建详细的受众画像
              </p>
              <button
                onClick={handleBuild}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors inline-flex items-center gap-2"
              >
                <Sparkles size={16} /> AI 构建画像
              </button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-brand-400" />
              <span className="ml-3 text-white/40">AI 正在分析观众数据...</span>
            </div>
          )}

          {persona && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="p-5 rounded-xl bg-brand-500/5 border border-brand-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={16} className="text-brand-400" />
                  <h3 className="text-white font-medium">你的观众是谁</h3>
                </div>
                <p className="text-white/60 text-sm">{persona.summary}</p>
              </div>

              {/* Core & Secondary */}
              <div className="grid grid-cols-2 gap-4">
                <AudienceCard
                  title="核心受众"
                  icon={<Users size={16} className="text-blue-400" />}
                  data={persona.coreAudience}
                />
                <AudienceCard
                  title="次要受众"
                  icon={<Users size={16} className="text-brand-400" />}
                  data={persona.secondaryAudience}
                />
              </div>

              {/* Content advice */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <h4 className="text-xs text-white/40 mb-3 flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-success-text" /> 什么内容有效
                  </h4>
                  <ul className="space-y-2">
                    {(persona.contentAdvice?.whatWorks || []).map((w, i) => (
                      <li key={i} className="text-xs text-white/50 flex items-start gap-1.5">
                        <span className="text-success-text mt-0.5">•</span> {w}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <h4 className="text-xs text-white/40 mb-3 flex items-center gap-1.5">
                    <Shield size={12} className="text-danger-text" /> 要避免什么
                  </h4>
                  <ul className="space-y-2">
                    {(persona.contentAdvice?.whatAvoid || []).map((w, i) => (
                      <li key={i} className="text-xs text-white/50 flex items-start gap-1.5">
                        <span className="text-danger-text mt-0.5">•</span> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Tone advice */}
              {persona.contentAdvice?.toneAdvice && (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <h4 className="text-xs text-white/40 mb-2 flex items-center gap-1.5">
                    <Lightbulb size={12} className="text-warning-text" /> 风格建议
                  </h4>
                  <p className="text-sm text-white/60">{persona.contentAdvice.toneAdvice}</p>
                </div>
              )}

              {/* Growth */}
              {persona.growthOpportunities?.length > 0 && (
                <div className="p-4 rounded-xl bg-success-surface border border-success-border">
                  <h4 className="text-xs text-success-text/70 mb-3 flex items-center gap-1.5">
                    <TrendingUp size={12} /> 增长机会
                  </h4>
                  <div className="space-y-2">
                    {persona.growthOpportunities.map((o, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-white/50">
                        <ChevronRight size={14} className="text-success-text mt-0.5 shrink-0" />
                        {o}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AudienceCard({
  title,
  icon,
  data
}: {
  title: string
  icon: React.ReactNode
  data: { age?: string; occupation?: string; interests?: string[]; painPoints?: string[]; whyFollow?: string }
}) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
      <h4 className="text-xs text-white/40 mb-3 flex items-center gap-1.5">
        {icon} {title}
      </h4>
      <div className="space-y-3">
        {data.age && (
          <div>
            <p className="text-[10px] text-white/20">年龄段</p>
            <p className="text-sm text-white/60">{data.age}</p>
          </div>
        )}
        {data.occupation && (
          <div>
            <p className="text-[10px] text-white/20">典型职业</p>
            <p className="text-sm text-white/60">{data.occupation}</p>
          </div>
        )}
        {data.interests?.length > 0 && (
          <div>
            <p className="text-[10px] text-white/20 mb-1">兴趣</p>
            <div className="flex flex-wrap gap-1">
              {data.interests.map((s, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.04] border border-white/[0.06] text-white/40">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
        {data.painPoints?.length > 0 && (
          <div>
            <p className="text-[10px] text-white/20 mb-1">痛点</p>
            <div className="flex flex-wrap gap-1">
              {data.painPoints.map((s, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-danger-surface border border-danger-border text-danger-text/70">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
        {data.whyFollow && (
          <div>
            <p className="text-[10px] text-white/20">关注原因</p>
            <p className="text-xs text-white/50">{data.whyFollow}</p>
          </div>
        )}
      </div>
    </div>
  )
}
