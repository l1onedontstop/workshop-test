import { useState } from 'react'
import { useAppStore } from '../stores/appStore'
import {
  Sparkles,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  Loader2
} from 'lucide-react'
import Button from '../components/ui/Button'
import BackButton from '../components/ui/BackButton'
import Card from '../components/ui/Card'

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
  onCreated?: (projectId?: string) => void
  onBack?: () => void
  onSkip?: () => void
  onNavigateToBenchmark?: () => void
  onNavigateToScript?: () => void
  onNavigateToPlan?: () => void
  onNavigateToTopics?: () => void
  onNavigateToBlueprint?: (answers: Record<string, string>) => void
}

export default function WelcomePage({
  onCreated,
  onBack,
  onSkip,
  onNavigateToBlueprint
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

  // ── Post-creation — upgraded success state ──
  if (created) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-lg text-center animate-fade-in">
          {/* Animated success icon */}
          <div className="relative mx-auto mb-8 w-20 h-20 motion-safe:animate-pulse">
            <div className="absolute inset-0 rounded-full bg-success-surface motion-safe:animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-success-surface border border-success-border flex items-center justify-center">
              <CheckCircle size={36} className="text-success-text" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-ink-primary mb-2">项目创建成功！</h1>
          <p className="text-ink-tertiary text-sm mb-3">
            你的 IP 打造之路正式启动
          </p>
          <p className="text-ink-tertiary text-sm mb-8 max-w-sm mx-auto leading-relaxed">
            AI 正在分析你的回答，为你生成专属的 IP 打造蓝图——包含定位、内容策略、第一条视频计划
          </p>

          <div className="flex gap-3 justify-center">
            <Button
              variant="primary"
              size="lg"
              icon={<Sparkles size={16} />}
              onClick={async () => {
                const industry = answers[0] || ''
                const experience = answers[2] || ''
                onNavigateToBlueprint?.({
                  industry,
                  audience: answers[1] || '',
                  experience,
                  time: answers[3] || '',
                  benchmark: answers[4] || '',
                  contentType: answers[5] || '',
                  identity: [industry, experience].filter(Boolean).join(' | ') || '新手创作者'
                })
              }}
            >
              生成我的 IP 蓝图
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={onSkip || (() => { onBack?.() || setCreated(false) })}
            >
              进入工作台
            </Button>
          </div>
          <p className="text-xs text-ink-disabled mt-4">推荐先生成蓝图，AI 将根据你的回答定制完整方案</p>
        </div>
      </div>
    )
  }

  // ── Project name input screen ──
  if (showNameInput) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-lg animate-fade-in">
          <div className="text-center mb-8">
            <Sparkles size={32} className="text-brand-600/50 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-ink-primary mb-2">给你的项目起个名字</h1>
            <p className="text-ink-tertiary text-sm">
              例如：老杨的AI成神之路、XX行业观察笔记
            </p>
          </div>

          <Card level="default" className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink-tertiary">项目名称</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateProject()
                }}
                placeholder="输入项目名称（留空则自动生成）"
                className="w-full bg-black/[0.04] border border-rule rounded-lg px-3.5 py-2.5 text-sm text-ink-primary placeholder:text-ink-disabled transition-all duration-150 hover:border-rule-strong focus:outline-none focus:border-brand-200 focus:bg-black/[0.04] focus:ring-1 focus:ring-brand-200"
                autoFocus
              />
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={handleCreateProject}
              disabled={isCreating}
              loading={isCreating}
              icon={isCreating ? undefined : <CheckCircle size={16} />}
            >
              {isCreating ? '创建中...' : '创建项目'}
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowNameInput(false)}
            >
              返回修改回答
            </Button>
          </Card>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-danger-text text-sm bg-danger-surface border border-danger-border rounded-lg px-4 py-2.5">
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
          <BackButton onClick={onBack} label="返回工作台" />
        </div>
      )}

      <div className="flex-1 flex items-start justify-center px-4 pt-4 pb-16 overflow-y-auto">
      <div className="w-full max-w-lg">
        {/* Brand hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-600 mb-5 shadow-glow">
            <Sparkles size={28} className="text-ink-primary" />
          </div>
          <h1 className="text-2xl font-bold text-ink-primary mb-2">打造你的个人IP</h1>
          <p className="text-ink-tertiary text-sm">
            回答几个问题，AI教练为你定制专属方案
          </p>

          {/* Progress indicator — upgraded */}
          <div className="flex items-center justify-center gap-1 mt-8">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    i < currentStep
                      ? 'bg-success'
                      : i === currentStep
                        ? 'bg-brand-500 ring-4 ring-brand-200'
                        : 'bg-black/[0.08]'
                  }`} />
                  {i === currentStep && (
                    <span className="text-xs text-brand-600 font-medium hidden sm:inline">{s.title}</span>
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-5 h-px transition-colors duration-300 mx-1 ${
                    i < currentStep ? 'bg-success-surface0' : 'bg-black/[0.06]'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Question card */}
        <Card level="default" className="p-8 animate-fade-in">
          <p className="text-xs text-ink-tertiary mb-1">
            问题 {currentStep + 1} / {STEPS.length}
          </p>
          <h2 className="text-lg font-semibold text-ink-primary mb-2">
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
                className="w-full bg-black/[0.04] border border-rule rounded-lg px-3.5 py-2.5 text-sm text-ink-primary placeholder:text-ink-disabled transition-all duration-150 focus:outline-none focus:border-brand-200 focus:bg-black/[0.04] focus:ring-1 focus:ring-brand-200"
                autoFocus
              />
              <div className="flex gap-3">
                <Button variant="primary" className="flex-1" onClick={handleOtherSubmit}>
                  确认
                </Button>
                <Button variant="ghost" onClick={() => setShowOtherInput(false)}>
                  取消
                </Button>
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
                className="w-full h-24 bg-black/[0.04] border border-rule rounded-lg px-3.5 py-2.5 text-sm text-ink-primary placeholder:text-ink-disabled resize-none transition-all duration-150 focus:outline-none focus:border-brand-200 focus:bg-black/[0.04] focus:ring-1 focus:ring-brand-200"
              />
              <div className="flex gap-3">
                <Button variant="primary" className="flex-1" onClick={handleFreeTextNext} icon={<ArrowRight size={16} />}>
                  继续
                </Button>
                <Button variant="ghost" onClick={handleFreeTextNext}>
                  跳过
                </Button>
              </div>
              <p className="text-ink-disabled text-xs text-center">Cmd+Enter 快捷提交</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {step.options.map((option) => {
                const isSelected = answers[currentStep] === option
                return (
                  <button
                    key={option}
                    onClick={() => handleSelect(option)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-150 text-sm active:scale-[0.99] ${
                      isSelected
                        ? 'border-brand-200 bg-brand-50 text-brand-500 shadow-glow'
                        : 'border-rule bg-black/[0.02] text-ink-tertiary hover:border-rule-strong hover:text-ink-secondary hover:bg-black/[0.04] hover:translate-x-[2px]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option}</span>
                      {isSelected && <CheckCircle size={16} className="text-brand-600 shrink-0" />}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
          {error && (
            <div className="mt-4 flex items-center gap-2 text-danger-text text-sm bg-danger-surface border border-danger-border rounded-lg px-4 py-2.5">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </Card>

        {/* Back button */}
        {!isCreating && (
          <div className="mt-4 flex items-center justify-center gap-4">
            {currentStep > 0 && (
              <button
                onClick={() => {
                  setCurrentStep((prev) => prev - 1)
                  setError('')
                }}
                className="text-sm text-ink-tertiary hover:text-ink-tertiary transition-colors"
              >
                <ChevronLeft size={14} className="inline mr-1" />
                返回上一题
              </button>
            )}
            {onBack && currentStep === 0 && (
              <button
                onClick={onBack}
                className="text-sm text-ink-tertiary hover:text-ink-tertiary transition-colors"
              >
                <ChevronLeft size={14} className="inline mr-1" />
                返回工作台
              </button>
            )}
          </div>
        )}

        {isCreating && (
          <div className="mt-4 text-center text-sm text-ink-tertiary">
            正在创建你的专属项目...
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
