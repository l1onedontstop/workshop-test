import { useState } from 'react'
import { useAppStore } from '../stores/appStore'
import {
  Sparkles,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Target,
  PenLine,
  Layout,
  Lightbulb,
  ChevronLeft,
  Loader2
} from 'lucide-react'

const STEPS = [
  {
    title: '行业领域',
    description: '你做什么行业的？',
    options: ['制造业/实体', '互联网/科技', '服务业/咨询', '教育培训', '金融/投资', '电商/零售', '医疗/健康', '其他']
  },
  {
    title: '目标受众',
    description: '你最想影响谁？',
    options: ['同行老板', '潜在客户', '投资人', '求职者/年轻人', '行业从业者', '不确定']
  },
  {
    title: '内容经验',
    description: '你之前拍过视频吗？',
    options: ['零基础，没拍过', '偶尔发过，不成体系', '有在稳定更新', '做过号，有数据积累']
  },
  {
    title: '时间投入',
    description: '每周能投入多少时间？',
    options: ['2-3小时（试一试）', '5-8小时（认真做）', '10+小时（全力投入）']
  },
  {
    title: '对标账号',
    description: '有你欣赏的同行IP吗？（可选）',
    options: [] // Free text
  },
  {
    title: '内容形态',
    description: '你倾向于什么形式？',
    options: ['口播出镜（对着镜头讲）', '画外音+画面（不出镜）', '混合（出镜+素材）', '不确定，让AI推荐']
  }
]

interface WelcomePageProps {
  onCreated?: () => void
  onBack?: () => void
  onSkip?: () => void
  onNavigateToBenchmark?: () => void
  onNavigateToScript?: () => void
  onNavigateToPlan?: () => void
  onNavigateToTopics?: () => void
}

export default function WelcomePage({
  onCreated,
  onBack,
  onSkip,
  onNavigateToBenchmark,
  onNavigateToScript,
  onNavigateToPlan,
  onNavigateToTopics
}: WelcomePageProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [freeText, setFreeText] = useState('')
  const [otherInput, setOtherInput] = useState('')
  const [showOtherInput, setShowOtherInput] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [created, setCreated] = useState(false)
  const [error, setError] = useState('')
  const { loadProjects } = useAppStore()

  const step = STEPS[currentStep]
  const isLast = currentStep === STEPS.length - 1
  const isFreeTextStep = step.options.length === 0

  const handleFreeTextNext = () => {
    const updatedAnswers = { ...answers, [currentStep]: freeText }
    setAnswers(updatedAnswers)
    if (isLast) {
      setShowNameInput(true)
    } else {
      setCurrentStep((prev) => prev + 1)
      setFreeText('')
      setError('')
    }
  }

  const handleSelect = (option: string) => {
    if (option === '其他') {
      setShowOtherInput(true)
      return
    }
    advanceWithAnswer(option)
  }

  const handleOtherSubmit = () => {
    const val = otherInput.trim() || '其他'
    setShowOtherInput(false)
    setOtherInput('')
    advanceWithAnswer(val)
  }

  const advanceWithAnswer = (option: string) => {
    const updatedAnswers = { ...answers, [currentStep]: option }
    setAnswers(updatedAnswers)
    if (isLast) {
      setShowNameInput(true)
    } else {
      setCurrentStep((prev) => prev + 1)
      setFreeText('')
      setError('')
    }
  }

  const handleCreateProject = async () => {
    const a = answers
    setIsCreating(true)
    setError('')
    try {
      const dateStr = new Date()
        .toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
        .replace(/\//g, '-')
      const name = projectName.trim() || `项目_${dateStr}`

      const industry = a[0] || ''
      const experience = a[2] || ''
      const identity = [industry, experience].filter(Boolean).join(' | ') || '新手创作者'

      await window.api.createProject(name, {
        industry,
        targetAudience: a[1] || '',
        contentExperience: experience,
        weeklyTime: a[3] || '',
        benchmark: a[4] || '',
        contentType: a[5] || '',
        identity
      })
      // forceActiveLast=true ensures new project becomes active
      await loadProjects(true)
      setIsCreating(false)
      setCreated(true)
      onCreated?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '创建项目失败，请重试'
      setError(msg)
      setIsCreating(false)
    }
  }

  // ── Post-creation guide ──
  if (created) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-lg text-center">
          <div className="mb-8">
            <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">项目创建成功！</h1>
            <p className="text-white/40 text-sm">
              你的 IP 打造之旅正式开始。建议按以下顺序推进：
            </p>
          </div>

          <div className="space-y-3 mb-8">
            <button
              onClick={onNavigateToBenchmark}
              className="w-full text-left p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-brand-500/30 hover:bg-brand-500/[0.03] transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-yellow-500/10 shrink-0">
                  <Target size={22} className="text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1 group-hover:text-brand-300 transition-colors">
                    🎯 导入对标账号
                  </h3>
                  <p className="text-white/35 text-sm">
                    让 AI 分析你欣赏的账号，提取内容 pattern，作为后续打分的参照系
                  </p>
                </div>
                <ArrowRight size={16} className="text-white/15 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </div>
            </button>

            <button
              onClick={onNavigateToScript}
              className="w-full text-left p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-brand-500/30 hover:bg-brand-500/[0.03] transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-blue-500/10 shrink-0">
                  <PenLine size={22} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1 group-hover:text-brand-300 transition-colors">
                    ✍️ 写第一条脚本
                  </h3>
                  <p className="text-white/35 text-sm">
                    万事开头难——AI 帮你写出第一条脚本，拍出来才是真正的开始
                  </p>
                </div>
                <ArrowRight size={16} className="text-white/15 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </div>
            </button>

            <button
              onClick={onNavigateToPlan}
              className="w-full text-left p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-brand-500/30 hover:bg-brand-500/[0.03] transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-purple-500/10 shrink-0">
                  <Layout size={22} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1 group-hover:text-brand-300 transition-colors">
                    📋 创建 IP 方案
                  </h3>
                  <p className="text-white/35 text-sm">
                    系统化规划你的人设、选题、策略和排期——5 步生成完整内容方案
                  </p>
                </div>
                <ArrowRight size={16} className="text-white/15 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </div>
            </button>

            <button
              onClick={onNavigateToTopics}
              className="w-full text-left p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-brand-500/30 hover:bg-brand-500/[0.03] transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-green-500/10 shrink-0">
                  <Lightbulb size={22} className="text-green-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1 group-hover:text-brand-300 transition-colors">
                    🔍 选题灵感
                  </h3>
                  <p className="text-white/35 text-sm">
                    让 AI 根据你的行业和受众，挖掘第一批有爆款潜力的选题
                  </p>
                </div>
                <ArrowRight size={16} className="text-white/15 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </div>
            </button>
          </div>

          <button
            onClick={onSkip || (() => setCreated(false))}
            className="text-sm text-white/25 hover:text-white/40 transition-colors"
          >
            跳过引导，进入工作台
          </button>
        </div>
      </div>
    )
  }

  // ── Project name input screen ──
  if (showNameInput) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <Sparkles size={32} className="text-brand-400/50 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">给你的项目起个名字</h1>
            <p className="text-white/40 text-sm">
              例如：老杨的AI成神之路、XX行业观察笔记
            </p>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-4">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateProject()
              }}
              placeholder="输入项目名称（留空则自动生成）"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-brand-500/30"
              autoFocus
            />

            <button
              onClick={handleCreateProject}
              disabled={isCreating}
              className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  创建项目
                </>
              )}
            </button>

            <button
              onClick={() => setShowNameInput(false)}
              className="w-full py-2 text-sm text-white/25 hover:text-white/40 transition-colors"
            >
              返回修改回答
            </button>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-400 text-sm bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-2.5">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Question flow ──
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top-left back button */}
      {onBack && (
        <div className="p-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/50 transition-colors text-sm"
          >
            <ChevronLeft size={16} />
            返回工作台
          </button>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4">
            <Sparkles size={14} className="text-brand-400" />
            <span className="text-xs text-brand-400 font-medium">AI 教练</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">打造你的个人IP</h1>
          <p className="text-white/40 text-sm">
            回答几个问题，AI教练为你定制专属方案
          </p>

          {/* Step indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i < currentStep
                    ? 'bg-green-500'
                    : i === currentStep
                      ? 'bg-brand-500 scale-125'
                      : 'bg-white/15'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Question card */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8">
          <p className="text-xs text-white/30 mb-1">
            问题 {currentStep + 1} / {STEPS.length}
          </p>
          <h2 className="text-lg font-semibold text-white mb-2">
            {step.description}
          </h2>

          {showOtherInput ? (
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={otherInput}
                onChange={(e) => setOtherInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleOtherSubmit() }}
                placeholder="请输入..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={handleOtherSubmit}
                  className="flex-1 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
                >
                  确认
                </button>
                <button
                  onClick={() => setShowOtherInput(false)}
                  className="px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          ) : isFreeTextStep ? (
            <div className="mt-4 space-y-3">
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleFreeTextNext()
                  }
                }}
                placeholder="输入对标账号的名称或链接，也可以跳过..."
                className="w-full h-24 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-brand-500/50"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleFreeTextNext}
                  className="flex-1 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  继续
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={handleFreeTextNext}
                  className="px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-colors"
                >
                  跳过
                </button>
              </div>
              <p className="text-white/15 text-xs text-center">Cmd+Enter 快捷提交</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {step.options.map((option) => {
                const isSelected = answers[currentStep] === option
                return (
                  <button
                    key={option}
                    onClick={() => handleSelect(option)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all text-sm ${
                      isSelected
                        ? 'border-brand-500/50 bg-brand-500/10 text-brand-300'
                        : 'border-white/[0.06] bg-white/[0.02] text-white/60 hover:border-white/15 hover:text-white/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option}</span>
                      {isSelected && <CheckCircle size={16} className="text-brand-400" />}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-400 text-sm bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-2.5">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>

        {/* Back button — previous question or exit */}
        {!isCreating && (
          <div className="mt-4 flex items-center justify-center gap-4">
            {currentStep > 0 && (
              <button
                onClick={() => {
                  setCurrentStep((prev) => prev - 1)
                  setError('')
                }}
                className="text-sm text-white/30 hover:text-white/50 transition-colors"
              >
                <ChevronLeft size={14} className="inline mr-1" />
                返回上一题
              </button>
            )}
            {onBack && currentStep === 0 && (
              <button
                onClick={onBack}
                className="text-sm text-white/30 hover:text-white/50 transition-colors"
              >
                <ChevronLeft size={14} className="inline mr-1" />
                返回工作台
              </button>
            )}
          </div>
        )}

        {isCreating && (
          <div className="mt-4 text-center text-sm text-white/40">
            正在创建你的专属项目...
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
