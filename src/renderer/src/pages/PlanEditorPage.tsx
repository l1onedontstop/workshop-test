import { useState, useCallback, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'
import { parseFullScript, extractScript } from '../services/scriptParser'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Lightbulb,
  Brain,
  FileText,
  Calendar,
  Target,
  BookOpen,
  TrendingUp,
  Shield,
  Zap,
  Star,
  Plus,
  X,
  PenLine
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import type { ContentPlan, ContentStrategy, TopicEntry } from '../types/plan'
import { extractJSON } from '../services/parseAIResponse'

// ── Step definition ──────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5
const STEP_LABELS = ['人设补充', '选题组盘', '策略生成', '生成脚本', '排期定稿']

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  '观点输出': Zap,
  '经验分享': BookOpen,
  '趋势解读': TrendingUp,
  '避坑指南': Shield
}

const CATEGORY_COLORS: Record<string, string> = {
  '观点输出': 'text-warning-text border-warning-border bg-warning-surface',
  '经验分享': 'text-info-text border-info-border bg-info-surface',
  '趋势解读': 'text-brand-600 border-brand-200 bg-brand-50',
  '避坑指南': 'text-danger-text border-danger-border bg-danger-surface'
}

// ── Parsers ──────────────────────────────────────────────

function parseTopicResult(raw: string): { topics: TopicEntry[]; overallAdvice: string } | null {
  const parsed = extractJSON<{ topics: TopicEntry[]; overallAdvice: string }>(raw, 'topics')
  if (!parsed || !Array.isArray(parsed.topics)) return null
  return parsed
}

function parseStrategyResult(raw: string): ContentStrategy | null {
  return extractJSON<ContentStrategy>(raw, 'contentPillars')
}

// ── Helper: extract script from AI response (same logic as ScriptEditorPage) ──

function sanitizeFileName(name: string): string {
  return name
    .replace(/[\/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, 50)
}

export default function PlanEditorPage({
  onBack,
  planId,
  onNavigateToScript
}: {
  onBack: () => void
  planId: string
  onNavigateToScript?: (scriptFile?: string) => void
}) {
  const activeProject = useAppStore((s) => s.activeProject)

  // Plan state
  const [plan, setPlan] = useState<ContentPlan | null>(null)
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  // Step 1: Persona — multi-step questionnaire
  const PERSONA_QUESTIONS = [
    { key: 'industry', label: 'Q1', question: '你是做什么行业的？在这个领域的经验是什么？', placeholder: '例如：我在制造业做了12年，现在是供应链负责人...' },
    { key: 'project', label: 'Q2', question: '你正在做的项目/事情是什么？未来想做什么方向？', placeholder: '例如：正在推动工厂数字化转型，未来想做行业标准的制定者...' },
    { key: 'identity', label: 'Q3', question: '你的个人身份定位是什么？观众应该怎么认识你？', placeholder: '例如：一个懂技术又接地气的制造业老兵...' },
    { key: 'extra', label: 'Q4', question: '还有什么想补充的吗？', placeholder: '任何你觉得AI应该知道的背景信息...' }
  ]
  const [personaNotes, setPersonaNotes] = useState('')
  const [personaSubStep, setPersonaSubStep] = useState(0)
  const [personaAnswers, setPersonaAnswers] = useState<string[]>(['', '', '', ''])
  const [personaEditMode, setPersonaEditMode] = useState(false)
  const [aiTraits, setAiTraits] = useState<string[]>([])

  // Step 2: Topics
  const [topicCandidates, setTopicCandidates] = useState<TopicEntry[]>([])
  const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set())

  // Step 3: Strategy
  const [strategy, setStrategy] = useState<ContentStrategy | null>(null)

  // Step 4: Script generation
  const [scriptProgress, setScriptProgress] = useState({ current: 0, total: 0 })
  const [generatedScripts, setGeneratedScripts] = useState<
    Array<{ topicIndex: number; script: string; fileName: string }>
  >([])

  // Step 5: Schedule
  const [schedule, setSchedule] = useState<
    Array<{ date: string; topicIndex: number; topicTitle: string; scriptFile: string }>
  >([])

  // Load plan on mount
  useEffect(() => {
    if (!activeProject) return
    ;(async () => {
      try {
        const p = await window.api.getPlan(activeProject.path, planId)
        if (p) {
          const planData = p as ContentPlan
          setPlan(planData)
          setPersonaNotes(planData.persona?.rawNotes || '')
          setAiTraits(planData.persona?.aiTraits || [])
          // Restore questionnaire answers from rawNotes
          const raw = planData.persona?.rawNotes || ''
          const restored: string[] = ['', '', '', '']
          const labelStrs = ['行业：', '项目：', '身份：', '补充：']
          labelStrs.forEach((label, i) => {
            const idx = raw.indexOf(label)
            if (idx >= 0) {
              const startIdx = idx + label.length
              let endIdx = raw.length
              for (const nl of labelStrs) {
                const ni = raw.indexOf(nl, startIdx)
                if (ni >= 0 && ni < endIdx) endIdx = ni
              }
              restored[i] = raw.substring(startIdx, endIdx).trim()
            }
          })
          if (restored.some((a) => a)) {
            setPersonaAnswers(restored)
            setPersonaEditMode(true)
          }
          if (planData.selectedTopics?.length > 0) {
            setTopicCandidates(planData.selectedTopics)
            setSelectedTopics(new Set(planData.selectedTopics.map((_, i) => i)))
            setStep(2)
          }
          if (planData.strategy) {
            setStrategy(planData.strategy)
            setStep(3)
          }
          // Step 4: Script generation restoration
          if (
            planData.scriptsGenerated > 0 ||
            planData.status === 'scripts_generated' ||
            planData.status === 'scheduled' ||
            planData.status === 'completed'
          ) {
            const scripts: Array<{ topicIndex: number; script: string; fileName: string }> = []
            planData.selectedTopics.forEach((t, i) => {
              if (t.scriptFile) {
                scripts.push({ topicIndex: i, script: '', fileName: t.scriptFile })
              }
            })
            setGeneratedScripts(scripts)
            setScriptProgress({ current: scripts.length, total: planData.scriptsTotal || scripts.length })
            setStep(4)
          }
          // Step 5: Schedule restoration
          if (
            (planData.schedule && planData.schedule.length > 0) ||
            planData.status === 'scheduled' ||
            planData.status === 'completed'
          ) {
            if (planData.schedule) setSchedule(planData.schedule)
            setStep(5)
          }
        }
      } catch {
        // ignore
      }
    })()
  }, [activeProject, planId])

  const savePlan = useCallback(
    async (updates: Record<string, unknown>) => {
      if (!activeProject) return
      try {
        await window.api.updatePlan(activeProject.path, planId, updates)
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
      } catch (err) {
        setError(err instanceof Error ? err.message : '保存失败')
      }
    },
    [activeProject, planId]
  )

  // ── Step 1: Save persona ──
  const handleSavePersona = async () => {
    // Build structured notes from questionnaire answers
    const labelStrs = ['行业', '项目', '身份', '补充']
    const structuredNotes = labelStrs
      .map((label, i) => {
        const answer = personaAnswers[i]?.trim()
        return answer ? `${label}：${answer}` : ''
      })
      .filter(Boolean)
      .join('\n\n')

    const notes = structuredNotes || personaNotes.trim()
    if (!notes) return

    setLoading(true)
    setError('')
    try {
      // Simple AI trait extraction: use keyword heuristics
      const traits = notes
        .split(/[，,。\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 2 && s.length < 30)
        .slice(0, 8)
      setAiTraits(traits)
      setPersonaNotes(notes)

      await savePlan({
        persona: { rawNotes: notes, aiTraits: traits },
        status: 'draft'
      })
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Generate & select topics ──
  const handleGenerateTopics = async () => {
    if (!activeProject) return
    setLoading(true)
    setError('')
    const MAX_RETRIES = 2
    try {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const raw = await window.api.generateTopics({
          industry: activeProject.opts?.industry || '',
          audience: activeProject.opts?.targetAudience || '',
          experience: personaNotes || undefined
        })
        const parsed = parseTopicResult(raw as string)
        if (parsed) {
          setTopicCandidates(parsed.topics)
          return
        }
        if (attempt < MAX_RETRIES) {
          setError(`AI 返回格式异常，正在重试 (${attempt + 2}/${MAX_RETRIES + 1})...`)
          await new Promise((r) => setTimeout(r, 500))
        } else {
          setError('AI 返回格式异常，已重试 3 次仍无法解析。请尝试切换 AI 引擎或稍后重试。')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '选题生成失败')
    } finally {
      setLoading(false)
    }
  }

  const toggleTopic = (index: number) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleConfirmTopics = async () => {
    const selected = topicCandidates.filter((_, i) => selectedTopics.has(i))
    if (selected.length === 0) {
      setError('请至少选择一个选题')
      return
    }
    await savePlan({
      selectedTopics: selected,
      scriptsTotal: selected.length,
      status: 'topics_selected'
    })
    setStep(3)
  }

  // ── Step 3: Generate strategy ──
  const handleGenerateStrategy = async () => {
    if (!activeProject) return
    const selected = topicCandidates.filter((_, i) => selectedTopics.has(i))
    if (selected.length === 0) return
    setLoading(true)
    setError('')
    const MAX_RETRIES = 2
    try {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const raw = await window.api.generatePlanStrategy(
          {
            persona: personaNotes,
            topics: selected.map((t) => ({
              title: t.title,
              angle: t.angle,
              category: t.category
            })),
            industry: activeProject.opts?.industry as string,
            audience: activeProject.opts?.targetAudience as string
          },
          {}
        )
        const parsed = parseStrategyResult(raw as string)
        if (parsed) {
          setStrategy(parsed)
          await savePlan({ strategy: parsed, status: 'strategy_ready' })
          return
        }
        if (attempt < MAX_RETRIES) {
          setError(`AI 返回格式异常，正在重试 (${attempt + 2}/${MAX_RETRIES + 1})...`)
          await new Promise((r) => setTimeout(r, 500))
        } else {
          setError('AI 返回格式异常，已重试 3 次仍无法解析。请尝试切换 AI 引擎或稍后重试。')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '策略生成失败')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 4: Generate scripts ──
  const handleGenerateScripts = async () => {
    if (!activeProject) return
    const selected = topicCandidates.filter((_, i) => selectedTopics.has(i))
    if (selected.length === 0) return

    setLoading(true)
    setError('')
    setScriptProgress({ current: 0, total: selected.length })
    const results: Array<{ topicIndex: number; script: string; fileName: string }> = []

    for (let i = 0; i < selected.length; i++) {
      setScriptProgress({ current: i + 1, total: selected.length })
      try {
        const raw = await window.api.writeScript(selected[i].title, {
          industry: activeProject.opts?.industry || '',
          audience: activeProject.opts?.targetAudience || '',
          projectPath: activeProject.path
        })
        const script = extractScript(raw as string)
        if (script) {
          const today = new Date().toISOString().slice(0, 10)
          const safeName = sanitizeFileName(selected[i].title.slice(0, 20))
          const seq = String(i + 1).padStart(3, '0')
          const fileName = `${today}_plan_${seq}_${safeName}.md`
          const scriptPath = `${activeProject.path}/scripts/${fileName}`

          // Save full 8-section production plan (not just voiceover)
          const sections = parseFullScript(raw as string)
          const content = [
            `# ${selected[i].title}`,
            '',
            script,
            '',
            sections
              ? [
                  '---',
                  sections.style || '',
                  '---',
                  sections.storyboard || '',
                  '---',
                  sections.equipment || '',
                  '---',
                  sections.scene || '',
                  '---',
                  sections.postProduction || '',
                  '---',
                  sections.cover || '',
                  '---',
                  sections.rawJson || '',
                ].join('\n')
              : '---',
            ''
          ].join('\n')
          await window.api.writeFile(scriptPath, content)

          results.push({ topicIndex: i, script, fileName })

          // Update topic entry in plan
          selected[i].scriptFile = fileName
        }
      } catch {
        // Skip failed generation, continue with next
      }
    }

    setGeneratedScripts(results)
    await savePlan({
      selectedTopics: selected,
      scriptsGenerated: results.length,
      scriptsTotal: selected.length,
      status: results.length > 0 ? 'scripts_generated' : 'topics_selected'
    })
    setLoading(false)
    if (results.length > 0) setStep(5)
  }

  // ── Step 5: Schedule & finalize ──
  const handleFinalize = async () => {
    const selected = topicCandidates.filter((_, i) => selectedTopics.has(i))
    const scheduleData = selected
      .filter((t) => t.scriptFile)
      .map((t, i) => {
        const date = new Date()
        date.setDate(date.getDate() + i)
        return {
          date: date.toISOString().slice(0, 10),
          topicIndex: i,
          topicTitle: t.title,
          scriptFile: t.scriptFile || ''
        }
      })

    setSchedule(scheduleData)

    await savePlan({
      schedule: scheduleData,
      status: 'completed'
    })

    // Log activity
    if (activeProject) {
      await window.api.logActivity(activeProject.path, {
        type: 'plan_completed',
        timestamp: new Date().toISOString(),
        label: `✅ IP方案完成：${plan?.name || ''}`,
        detail: `生成 ${generatedScripts.length || selected.filter((t) => t.scriptFile).length} 条脚本`,
        planId: planId,
        navTarget: 'plan-editor'
      })
      await window.api.updateProjectState(activeProject.path, {
        totalPredicted: (activeProject.state.totalPredicted || 0) + (generatedScripts.length || selected.filter((t) => t.scriptFile).length)
      })
    }

    setSaved(true)
  }

  // ── UI helpers ──

  if (!activeProject || !plan) {
    return (
      <div className="flex items-center justify-center h-full text-ink-tertiary">
        <Loader2 size={24} className="animate-spin" />
      </div>
    )
  }

  const selectedTopicList = topicCandidates.filter((_, i) => selectedTopics.has(i))

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-rule-subtle">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          icon={<ArrowLeft size={18} />}
        />
        <h1 className="text-lg font-semibold text-ink-primary">{plan.name}</h1>
        {/* Step indicator */}
        <div className="flex items-center gap-1.5 ml-6">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <button
                onClick={() => i + 1 <= step && setStep((i + 1) as Step)}
                className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                  i + 1 === step
                    ? 'bg-brand-100 text-brand-600'
                    : i + 1 < step
                      ? 'text-success-text/60'
                      : 'text-ink-disabled'
                }`}
              >
                {i + 1 < step ? <CheckCircle2 size={10} className="inline mr-0.5" /> : null}
                {label}
              </button>
              {i < STEP_LABELS.length - 1 && (
                <ChevronRight size={10} className="text-ink-disabled" />
              )}
            </div>
          ))}
        </div>
        <div className="flex-1" />
        {saved && <span className="text-xs text-success-text">已保存</span>}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* ═══ Step 1: Persona ═══ */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Target size={36} className="text-brand-600/50 mx-auto mb-3" />
                <h2 className="text-xl font-semibold text-ink-primary mb-2">完善你的人设</h2>
                <p className="text-sm text-ink-tertiary">
                  逐题回答，让 AI 更了解你。越详细，生成的方案越贴合你。
                </p>
              </div>

              {/* Summary view: show all 4 questions, unfilled ones marked as "未填写" */}
              {personaEditMode ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-brand-50 border border-brand-200 mb-2">
                    <p className="text-sm text-brand-500/80">
                      💡 填写得越详细，AI 越能为你量身定制最适合的 IP 方案
                    </p>
                  </div>

                  {PERSONA_QUESTIONS.map((q, i) => (
                    <Card
                      key={q.key}
                      level="default"
                      className="rounded-xl p-4 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-ink-tertiary mb-1">
                            {q.label} — {q.question.slice(0, 20)}...
                          </p>
                          <p className="text-sm text-ink-secondary whitespace-pre-wrap">
                            {personaAnswers[i]?.trim() || '（未填写）'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPersonaSubStep(i)
                            setPersonaEditMode(false)
                          }}
                          icon={<PenLine size={14} />}
                          className="opacity-0 group-hover:opacity-100"
                        />
                      </div>
                    </Card>
                  ))}

                  {aiTraits.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {aiTraits.map((t, i) => (
                        <Badge
                          key={i}
                          className="rounded-full bg-brand-50 border-brand-200 text-brand-600"
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      variant="secondary"
                      onClick={() => { setPersonaEditMode(false); setPersonaSubStep(0) }}
                    >
                      重新填写
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSavePersona}
                      loading={loading}
                      icon={<ChevronRight size={16} />}
                    >
                      下一步：选题组盘
                    </Button>
                  </div>
                </div>
              ) : (
                /* Question-by-question flow */
                <div className="space-y-6">
                  {/* Progress dots */}
                  <div className="flex items-center justify-center gap-2 mb-6">
                    {PERSONA_QUESTIONS.map((q, i) => (
                      <button
                        key={q.key}
                        onClick={() => personaAnswers[i]?.trim() ? setPersonaSubStep(i) : null}
                        className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                          i === personaSubStep
                            ? 'bg-brand-600 text-white'
                            : personaAnswers[i]?.trim()
                              ? 'bg-brand-100 text-brand-600 border border-brand-200'
                              : 'bg-black/[0.04] text-ink-disabled border border-rule-subtle'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>

                  {/* Current question */}
                  <Card level="subtle" className="p-6">
                    <p className="text-sm text-ink-tertiary mb-1">
                      {PERSONA_QUESTIONS[personaSubStep].label}
                    </p>
                    <p className="text-base text-ink-primary font-medium mb-4">
                      {PERSONA_QUESTIONS[personaSubStep].question}
                    </p>
                    <textarea
                      value={personaAnswers[personaSubStep] || ''}
                      onChange={(e) => {
                        const next = [...personaAnswers]
                        next[personaSubStep] = e.target.value
                        setPersonaAnswers(next)
                      }}
                      placeholder={PERSONA_QUESTIONS[personaSubStep].placeholder}
                      rows={5}
                      className="w-full bg-black/[0.04] border border-rule rounded-lg p-4 text-sm text-ink-primary placeholder:text-ink-disabled resize-none focus:outline-none focus:border-brand-200"
                      autoFocus
                    />
                  </Card>

                  {/* Navigation */}
                  <div className="flex justify-between">
                    <Button
                      variant="secondary"
                      onClick={() => setPersonaSubStep((s) => Math.max(0, s - 1))}
                      disabled={personaSubStep === 0}
                      icon={<ChevronLeft size={16} />}
                    >
                      上一题
                    </Button>

                    {personaSubStep < PERSONA_QUESTIONS.length - 1 ? (
                      <Button
                        variant="secondary"
                        onClick={() => setPersonaSubStep((s) => s + 1)}
                        icon={<ChevronRight size={16} />}
                      >
                        下一题
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() => setPersonaEditMode(true)}
                        disabled={personaAnswers.filter((a) => a?.trim()).length < 1}
                        icon={<CheckCircle2 size={16} />}
                      >
                        查看汇总
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ Step 2: Topic selection ═══ */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Lightbulb size={36} className="text-brand-600/50 mx-auto mb-3" />
                <h2 className="text-xl font-semibold text-ink-primary mb-2">选题组盘</h2>
                <p className="text-sm text-ink-tertiary">
                  AI 会根据你的人设生成选题建议。勾选你想拍的选题，组成你的内容计划。
                </p>
              </div>

              {topicCandidates.length === 0 ? (
                <div className="text-center py-12">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleGenerateTopics}
                    loading={loading}
                    icon={<Sparkles size={16} />}
                  >
                    AI 生成选题建议
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {topicCandidates.map((topic, i) => {
                      const isSelected = selectedTopics.has(i)
                      const CategoryIcon = CATEGORY_ICONS[topic.category] || Lightbulb
                      const catStyle =
                        CATEGORY_COLORS[topic.category] ||
                        'text-ink-tertiary border-rule bg-black/[0.02]'
                      return (
                        <button
                          key={i}
                          onClick={() => toggleTopic(i)}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${
                            isSelected
                              ? 'border-brand-200 bg-brand-50'
                              : 'border-rule-subtle bg-black/[0.02] hover:border-rule'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'border-brand-500 bg-brand-500'
                                  : 'border-rule-strong'
                              }`}
                            >
                              {isSelected && <CheckCircle2 size={12} className="text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-ink-primary">
                                  {topic.title}
                                </span>
                                <Badge
                                  className={`text-[9px] px-1.5 py-0.5 rounded-full ${catStyle}`}
                                >
                                  <CategoryIcon size={9} />
                                  {topic.category}
                                </Badge>
                                <span className="text-[10px] text-ink-disabled">
                                  <Star
                                    size={10}
                                    className="inline mr-0.5"
                                    fill={topic.difficulty >= 3 ? 'currentColor' : 'none'}
                                  />
                                  {topic.difficulty}/5
                                </span>
                              </div>
                              <p className="text-xs text-ink-tertiary">{topic.angle}</p>
                              <p className="text-xs text-brand-600/60 italic mt-1">
                                "{topic.hook}"
                              </p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-rule-subtle">
                    <span className="text-xs text-ink-tertiary">
                      已选 {selectedTopics.size}/{topicCandidates.length} 个选题
                    </span>
                    <div className="flex gap-3">
                      <Button
                        variant="secondary"
                        onClick={handleGenerateTopics}
                        disabled={loading}
                        icon={<Sparkles size={14} />}
                      >
                        换一批
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleConfirmTopics}
                        disabled={selectedTopics.size === 0}
                        icon={<ChevronRight size={14} />}
                      >
                        确认选题 ({selectedTopics.size})
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══ Step 3: Strategy ═══ */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Brain size={36} className="text-brand-600/50 mx-auto mb-3" />
                <h2 className="text-xl font-semibold text-ink-primary mb-2">策略生成</h2>
                <p className="text-sm text-ink-tertiary">
                  AI 会根据你的人设和选题，生成系统化的内容策略
                </p>
              </div>

              {!strategy ? (
                <div className="text-center py-12">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleGenerateStrategy}
                    loading={loading}
                    icon={<Brain size={16} />}
                  >
                    AI 生成内容策略
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Content pillars */}
                  <Card level="subtle" className="p-5">
                    <h3 className="text-sm font-medium text-ink-secondary mb-3">🎯 内容支柱</h3>
                    <div className="space-y-2">
                      {strategy.contentPillars.map((p, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-3 rounded-lg bg-black/[0.02]"
                        >
                          <span className="text-brand-600 font-mono text-xs mt-0.5">#{i + 1}</span>
                          <span className="text-sm text-ink-tertiary">{p}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Cadence + Persona advice */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card level="subtle" className="p-4">
                      <h3 className="text-sm font-medium text-ink-secondary mb-2">📅 发布节奏</h3>
                      <p className="text-xs text-ink-tertiary leading-relaxed">
                        {strategy.publishCadence}
                      </p>
                    </Card>
                    <Card level="subtle" className="p-4">
                      <h3 className="text-sm font-medium text-ink-secondary mb-2">👤 人设建议</h3>
                      <p className="text-xs text-ink-tertiary leading-relaxed">
                        {strategy.personaAdvice}
                      </p>
                    </Card>
                  </div>

                  {/* Overall advice */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-brand-50 to-brand-50 border border-brand-200">
                    <p className="text-sm text-ink-tertiary leading-relaxed">
                      {strategy.overallAdvice}
                    </p>
                  </div>

                  {/* Risk warnings */}
                  {strategy.riskWarnings.length > 0 && (
                    <div className="p-4 rounded-xl bg-warning-surface border border-warning-border">
                      <h3 className="text-xs font-medium text-warning-text/80 mb-2">⚠️ 风险提示</h3>
                      <ul className="space-y-1">
                        {strategy.riskWarnings.map((w, i) => (
                          <li key={i} className="text-xs text-warning-text/60 flex gap-1.5">
                            <span>•</span>
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-rule-subtle">
                    <Button
                      variant="secondary"
                      onClick={handleGenerateStrategy}
                      disabled={loading}
                      icon={<Sparkles size={14} />}
                    >
                      重新生成
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => setStep(4)}
                      icon={<ChevronRight size={14} />}
                    >
                      下一步：生成脚本
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ Step 4: Generate scripts ═══ */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <FileText size={36} className="text-success-text/50 mx-auto mb-3" />
                <h2 className="text-xl font-semibold text-ink-primary mb-2">批量生成脚本</h2>
                <p className="text-sm text-ink-tertiary">
                  为每个选题逐一生成脚本，保存到 scripts/ 目录。生成速度取决于你的 AI 引擎。
                </p>
              </div>

              {generatedScripts.length === 0 && !loading ? (
                <div className="text-center py-12">
                  <p className="text-sm text-ink-tertiary mb-1">
                    将为 {selectedTopicList.length} 个选题生成脚本
                  </p>
                  <p className="text-xs text-ink-disabled mb-6">
                    每个脚本约需 20-60 秒，请耐心等待
                  </p>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleGenerateScripts}
                    icon={<Sparkles size={16} />}
                  >
                    开始批量生成
                  </Button>
                </div>
              ) : loading ? (
                <div className="text-center py-12">
                  <Loader2 size={32} className="animate-spin text-brand-600/50 mx-auto mb-4" />
                  <p className="text-sm text-ink-tertiary">
                    正在生成第 {scriptProgress.current}/{scriptProgress.total} 个脚本...
                  </p>
                  <div className="mt-4 h-2 bg-black/[0.04] rounded-full max-w-md mx-auto overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${(scriptProgress.current / scriptProgress.total) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-success-text">
                    <CheckCircle2 size={16} />
                    <span className="text-sm font-medium">
                      已生成 {generatedScripts.length} 个脚本
                    </span>
                  </div>

                  <div className="space-y-2">
                    {generatedScripts.map((g) => (
                      <Card
                        key={g.topicIndex}
                        level="subtle"
                        className="p-3 rounded-lg flex items-center gap-3"
                      >
                        <CheckCircle2 size={14} className="text-green-500/70 shrink-0" />
                        <span className="text-sm text-ink-tertiary truncate flex-1">
                          {selectedTopicList[g.topicIndex]?.title || `脚本 ${g.topicIndex + 1}`}
                        </span>
                        <span className="text-[10px] text-ink-disabled font-mono">
                          {g.fileName}
                        </span>
                      </Card>
                    ))}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-rule-subtle">
                    <Button
                      variant="secondary"
                      onClick={handleGenerateScripts}
                      icon={<Sparkles size={14} />}
                    >
                      重新生成
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => setStep(5)}
                      icon={<ChevronRight size={14} />}
                    >
                      下一步：排期定稿
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ Step 5: Schedule & finalize ═══ */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Calendar size={36} className="text-warning-text/50 mx-auto mb-3" />
                <h2 className="text-xl font-semibold text-ink-primary mb-2">排期定稿</h2>
                <p className="text-sm text-ink-tertiary">
                  为每条脚本分配发布日期，完成整个 IP 方案
                </p>
              </div>

              <div className="space-y-2">
                {selectedTopicList
                  .filter((t) => t.scriptFile)
                  .map((topic, i) => {
                    const date = new Date()
                    date.setDate(date.getDate() + i)
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          if (topic.scriptFile) {
                            onNavigateToScript?.(topic.scriptFile)
                          }
                        }}
                        className="w-full text-left p-4 rounded-xl bg-black/[0.02] border border-rule-subtle hover:border-brand-200 hover:bg-black/[0.04] flex items-center gap-4 transition-all group"
                      >
                        <div className="text-center shrink-0 w-16">
                          <p className="text-lg font-bold text-ink-tertiary">
                            {date.getDate()}
                          </p>
                          <p className="text-[10px] text-ink-tertiary">
                            {date.toLocaleDateString('zh-CN', { month: 'short', weekday: 'short' })}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-ink-secondary truncate group-hover:text-brand-500 transition-colors">{topic.title}</p>
                          <p className="text-[10px] text-ink-disabled font-mono mt-0.5">
                            {topic.scriptFile}
                          </p>
                        </div>
                        <ChevronRight size={14} className="text-ink-disabled group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    )
                  })}
              </div>

              {!schedule.length ? (
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleFinalize}
                    loading={loading}
                    icon={<CheckCircle2 size={16} />}
                  >
                    完成方案
                  </Button>
                </div>
              ) : (
                <div className="p-5 rounded-xl bg-success-surface border border-success-border text-center">
                  <CheckCircle2 size={32} className="text-success-text mx-auto mb-3" />
                  <h2 className="text-lg font-semibold text-ink-primary mb-2">方案已完成！</h2>
                  <p className="text-sm text-ink-tertiary mb-4">
                    {selectedTopicList.filter((t) => t.scriptFile).length} 条脚本已保存到
                    scripts/，可以返回工作台查看和编辑。
                  </p>
                  <Button
                    variant="primary"
                    onClick={onBack}
                  >
                    返回工作台
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-6 flex items-center gap-2 text-danger-text text-sm justify-center">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
