import { useState, useCallback, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'
import { extractJSON } from '../services/parseAIResponse'
import {
  Sparkles,
  RefreshCw,
  Save,
  ArrowLeft,
  Loader2,
  Lightbulb,
  Target,
  Zap,
  Heart,
  Layout,
  Mic,
  AlertCircle,
  CheckCircle2,
  Trash2,
  FileText,
  ChevronDown,
  X,
  Palette,
  Wrench,
  Camera,
  Scissors,
  Share2,
  Eye,
  Download,
  Volume2,
  Image,
  FileSpreadsheet
} from 'lucide-react'

interface RubricScores {
  hook: number
  rhythm: number
  sharpness: number
  utility: number
  emotion: number
  structure: number
  expression: number
}

interface ScoreResult {
  scores: RubricScores
  total: number
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  overall: string
}

const DIMENSIONS = [
  { key: 'hook', label: '开篇钩子', weight: '20%', icon: Target, desc: '前3秒能不能让人停下来' },
  { key: 'rhythm', label: '叙事节奏', weight: '15%', icon: Zap, desc: '信息密度和情绪起伏' },
  { key: 'sharpness', label: '观点锐度', weight: '15%', icon: Lightbulb, desc: '有没有让人"卧槽"的洞见' },
  { key: 'utility', label: '实用密度', weight: '15%', icon: CheckCircle2, desc: '观众能拿走什么' },
  { key: 'emotion', label: '情绪共鸣', weight: '15%', icon: Heart, desc: '会不会想转发/评论' },
  { key: 'structure', label: '结构完整', weight: '10%', icon: Layout, desc: '开头-展开-高潮-结尾' },
  { key: 'expression', label: '表达效果', weight: '10%', icon: Mic, desc: '口语化、画面感、适合口播' }
] as const

function parseScoreResult(raw: string): ScoreResult | null {
  const parsed = extractJSON<ScoreResult>(raw, 'scores')
  if (!parsed || !parsed.scores || typeof parsed.total !== 'number') return null
  return parsed
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[\/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, 50)
}

function buildScriptPath(projectPath: string, today: string, seq: string, safeTopic: string): string {
  return `${projectPath}/scripts/${today}_${seq}_${safeTopic}.md`
}

function buildPredictionPath(projectPath: string, today: string, seq: string, safeTopic: string): string {
  return `${projectPath}/predictions/${today}_${seq}_${safeTopic}.json`
}

function extractScript(raw: string): string {
  // Layer 1: Try --- separator (most common case)
  const sepIndex = raw.lastIndexOf('---')
  if (sepIndex > 0) {
    const scriptPart = raw.substring(0, sepIndex).trim()
    if (scriptPart.length > 20) return scriptPart
  }

  // Layer 2: Try JSON extraction (find script/content field)
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.script && typeof parsed.script === 'string' && parsed.script.length > 20) {
        return parsed.script.trim()
      }
      if (parsed.content && typeof parsed.content === 'string' && parsed.content.length > 20) {
        return parsed.content.trim()
      }
    }
  } catch {
    // JSON parse failed, continue to next layer
  }

  // Layer 3: Pure JSON response (score-only, no script)
  if (raw.trim().startsWith('{')) {
    return ''
  }

  // Layer 4: Raw text long enough → likely a pure script without separator
  if (raw.trim().length > 50) {
    return raw.trim()
  }

  return ''
}

// ── Script Section Parser ─────────────────────────────────

interface ScriptSections {
  voiceover: string
  style: string
  storyboard: string
  equipment: string
  scene: string
  postProduction: string
  cover: string
  rawJson: string
}

function parseFullScript(raw: string): ScriptSections | null {
  // Replace table header-separator rows (|---|...|) with placeholder
  // so they don't get mistaken for section dividers
  const safeLines: string[] = []
  let inTable = false
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    // Detect table separator row: starts with |, contains only |-: and spaces
    if (trimmed.startsWith('|') && /^\|[\-: |]+\|$/.test(trimmed)) {
      safeLines.push('<!TS>')
      inTable = true
      continue
    }
    // Exit table on non-table line
    if (inTable && !trimmed.startsWith('|')) {
      inTable = false
    }
    safeLines.push(line)
  }
  const safe = safeLines.join('\n')
  
  const parts = safe.split(/\r?\n---\r?\n/)
  if (parts.length < 3) return null
  
  return buildSections(parts.map(p => p.replace(/<!TS>/g, '')))
}function buildSections(parts: string[]): ScriptSections {
  const result: ScriptSections = {
    voiceover: parts[0].trim(),
    style: '',
    storyboard: '',
    equipment: '',
    scene: '',
    postProduction: '',
    cover: '',
    rawJson: ''
  }
  const keys = ['style', 'storyboard', 'equipment', 'scene', 'postProduction', 'cover'] as const
  for (let i = 1; i < parts.length - 1 && i <= keys.length; i++) {
    result[keys[i - 1]] = parts[i].trim()
  }
  result.rawJson = parts[parts.length - 1].trim()
  return result
}

// ── Section Card Component ────────────────────────────────

function SectionCard({
  icon,
  title,
  color,
  fullWidth,
  children
}: {
  icon: React.ReactNode
  title: string
  color: 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'yellow' | 'cyan'
  fullWidth?: boolean
  children: React.ReactNode
}) {
  const colorMap: Record<string, string> = {
    purple: 'border-purple-500/20 bg-purple-500/[0.03]',
    blue: 'border-blue-500/20 bg-blue-500/[0.03]',
    green: 'border-green-500/20 bg-green-500/[0.03]',
    orange: 'border-orange-500/20 bg-orange-500/[0.03]',
    red: 'border-red-500/20 bg-red-500/[0.03]',
    yellow: 'border-yellow-500/20 bg-yellow-500/[0.03]',
    cyan: 'border-cyan-500/20 bg-cyan-500/[0.03]'
  }
  const textColorMap: Record<string, string> = {
    purple: 'text-purple-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
    cyan: 'text-cyan-400'
  }
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]} ${fullWidth ? 'col-span-2' : ''}`}>
      <div className={`flex items-center gap-2 mb-2 ${textColorMap[color]}`}>
        {icon}
        <span className="text-xs font-medium">{title}</span>
      </div>
      {children}
    </div>
  )
}

// ── Markdown Table → HTML ─────────────────────────────────

function renderMarkdownTable(md: string): string {
  const lines = md.trim().split('\n')
  let html = '<table class="w-full text-[11px] border-collapse">'
  let inHeader = true
  for (const line of lines) {
    if (!line.startsWith('|')) continue
    const cells = line.split('|').filter((c) => c.trim() !== '')
    if (cells.length === 0) continue
    if (line.includes('---')) {
      inHeader = false
      continue
    }
    const tag = inHeader ? 'th' : 'td'
    const cellClass = inHeader
      ? 'border border-white/10 px-2 py-1 text-white/60 font-medium bg-white/[0.02] whitespace-nowrap'
      : 'border border-white/5 px-2 py-1 text-white/40'
    html += '<tr>'
    for (const cell of cells) {
      html += '<' + tag + ' class="' + cellClass + '">' + cell.trim() + '</' + tag + '>'
    }
    html += '</tr>'
  }
  html += '</table>'
  return html
}

function translateAIError(err: unknown, context: string): string {
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()

  if (lower.includes('api key') || lower.includes('unauthorized') || lower.includes('401') || lower.includes('403')) {
    return `API Key 无效或未配置 — 请到设置页面检查密钥`
  }
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('econnrefused') || lower.includes('econnreset')) {
    return `AI 服务响应超时 — 请检查网络连接或切换其他 AI 引擎`
  }
  if (lower.includes('rate') || lower.includes('429') || lower.includes('quota')) {
    return `API 调用额度已用完或频率过高 — 请稍后重试或切换 AI 引擎`
  }
  if (lower.includes('network') || lower.includes('fetch failed') || lower.includes('dns') || lower.includes('enotfound')) {
    return `网络连接失败 — 请检查网络设置`
  }
  if (lower.includes('parse') || lower.includes('json') || lower.includes('unexpected')) {
    return `AI 返回格式异常 — 请重试或切换 AI 引擎`
  }

  return `${context}失败：${msg}`
}

export default function ScriptEditorPage({
  onBack,
  initialTopic,
  initialHook,
  initialScriptFile
}: {
  onBack: () => void
  initialTopic?: string
  initialHook?: string
  initialScriptFile?: string
}) {
  const activeProject = useAppStore((s) => s.activeProject)
  const refreshActiveProject = useAppStore((s) => s.refreshActiveProject)
  const [topic, setTopic] = useState(initialTopic || '')
  const [hook, setHook] = useState(initialHook || '')
  const [script, setScript] = useState('')
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [loading, setLoading] = useState<'generate' | 'score' | 'delete' | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [predictionLocked, setPredictionLocked] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)
  const [checklistItems, setChecklistItems] = useState([false, false, false])
  const [benchmarkAvailable, setBenchmarkAvailable] = useState(false)
  const [showScriptList, setShowScriptList] = useState(false)
  const [scriptList, setScriptList] = useState<Array<{ name: string; path: string }>>([])
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [predictionData, setPredictionData] = useState<Record<string, unknown> | null>(null)
  const [scriptSections, setScriptSections] = useState<ScriptSections | null>(null)
  const [showFullPlan, setShowFullPlan] = useState(false)
  const [currentScriptFile, setCurrentScriptFile] = useState<string | null>(null)
  const [coverResult, setCoverResult] = useState<any>(null)
  const [showCoverModal, setShowCoverModal] = useState(false)

  const loadScriptList = useCallback(async () => {
    if (!activeProject) return
    try {
      const list = await window.api.listScripts(activeProject.path)
      setScriptList(list as Array<{ name: string; path: string }>)
    } catch {
      // ignore
    }
  }, [activeProject])

  useEffect(() => {
    if (showScriptList) loadScriptList()
  }, [showScriptList, loadScriptList])

  // Load script from file when navigating from plan editor
  useEffect(() => {
    if (!initialScriptFile || !activeProject) return
    ;(async () => {
      try {
        const scriptPath = `${activeProject.path}/scripts/${initialScriptFile}`
        const content = await window.api.readFile(scriptPath) as string
        const topicMatch = content.match(/^# (.+)/m)
        if (topicMatch) setTopic(topicMatch[1])
        const sepIdx = content.indexOf('\n---\n')
        const body = sepIdx > 0
          ? content.substring(0, sepIdx).replace(/^# .*\n/, '').trim()
          : content.trim()
        setScript(body)
        setCurrentScriptFile(initialScriptFile)
      } catch { /* ignore */ }
    })()
  }, [initialScriptFile, activeProject])

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) return
    setLoading('generate')
    setError('')
    setScoreResult(null)
    setCurrentScriptFile(null) // New script, will create new file

    try {
      const raw = await window.api.writeScript(topic.trim(), {
        industry: activeProject?.opts?.industry || '',
        audience: activeProject?.opts?.targetAudience || '',
        projectPath: activeProject?.path || ''
      })
      const scriptText = extractScript(raw)
      const scores = parseScoreResult(raw)

      setScript(scriptText)
      if (scores) setScoreResult(scores)
      // Parse full production plan sections
      const sections = parseFullScript(raw)
      if (sections) setScriptSections(sections)
    } catch (err) {
      setError(translateAIError(err, 'AI 生成'))
    } finally {
      setLoading(null)
    }
  }, [topic, activeProject])

  const handleRescore = useCallback(async () => {
    if (!script.trim()) return
    setLoading('score')
    setError('')

    try {
      const raw = await window.api.scoreScript(script, {
        projectPath: activeProject?.path || ''
      })
      const scores = parseScoreResult(raw)
      if (scores) {
        setScoreResult(scores)
      } else {
        setError('无法解析评分结果，请重试或切换 AI 引擎')
      }
    } catch (err) {
      setError(translateAIError(err, '打分'))
    } finally {
      setLoading(null)
    }
  }, [script])

  const handleSave = useCallback(async () => {
    if (!script.trim() || !activeProject) return

    try {
      const now = new Date()
      const today = now.toISOString().slice(0, 10)
      const timestamp = now.toISOString()
      const safeTopic = sanitizeFileName(topic.slice(0, 20) || '脚本')

      // Reuse existing file name if editing; otherwise create new
      let fileName: string
      let scriptPath: string

      if (currentScriptFile) {
        fileName = currentScriptFile
        scriptPath = `${activeProject.path}/scripts/${fileName}`
      } else {
        const existingScripts = await window.api.listScripts(activeProject.path)
        const todayPrefix = `${today}_`
        let maxSeq = 0
        for (const s of existingScripts) {
          if (s.name.startsWith(todayPrefix)) {
            const match = s.name.match(new RegExp(`^${todayPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)_`))
            if (match) {
              const seq = parseInt(match[1], 10)
              if (seq > maxSeq) maxSeq = seq
            }
          }
        }
        const nextSeq = String(maxSeq + 1).padStart(3, '0')
        fileName = `${today}_${nextSeq}_${safeTopic}.md`
        scriptPath = buildScriptPath(activeProject.path, today, nextSeq, safeTopic)
        setCurrentScriptFile(fileName)
      }

      const content = [
        `# ${topic || '未命名脚本'}`,
        '',
        script,
        '',
        '---',
        '',
        scoreResult
          ? [
              '## 评分',
              '',
              ...DIMENSIONS.map(
                (d) =>
                  `- **${d.label}** (${d.weight}): ${scoreResult.scores[d.key as keyof RubricScores]}/10`
              ),
              '',
              `**总分: ${scoreResult.total.toFixed(1)}/10**`,
              '',
              `> ${scoreResult.overall}`,
              '',
              '### 优势',
              ...scoreResult.strengths.map((s) => `- ${s}`),
              '',
              '### 待改进',
              ...scoreResult.weaknesses.map((w) => `- ${w}`),
              '',
              '### 修改建议',
              ...scoreResult.suggestions.map((s) => `- ${s}`)
            ].join('\n')
          : ''
      ].join('\n')

      await window.api.writeFile(scriptPath, content)

      // Save immutable prediction log — 7 components
      if (scoreResult) {
        const predFileName = `${today}_${nextSeq}_${safeTopic}.json`
        const predPath = buildPredictionPath(activeProject.path, today, nextSeq, safeTopic)

        // Check for benchmark data for anchor comparison
        let benchmarkRef = '无对标数据'
        try {
          const benchmarks = await window.api.benchmarkList(activeProject.path) as Array<{ name: string }>
          if (benchmarks && benchmarks.length > 0) {
            benchmarkRef = `对标账号：${benchmarks.map(b => b.name).join('、')}`
            setBenchmarkAvailable(true)
          }
        } catch { /* no benchmarks */ }

        // Simple script hash
        const scriptHash = Array.from(script).reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffffffff, 0).toString(16)

        const prediction = {
          // 1. Header
          date: today,
          id: `${today}_${nextSeq}`,
          shortTitle: safeTopic,
          mode: 'cold-start' as const,
          confidence: '🟠 低' as const,

          // 2. Input snapshot
          inputSnapshot: {
            scriptHash,
            benchmarkRef,
            scriptLength: script.length
          },

          // 3. Prediction body
          scores: scoreResult.scores,
          total: scoreResult.total,
          composite: scoreResult.total,
          bet: `预测 composite ${scoreResult.total.toFixed(1)}/10 — ${scoreResult.overall}`,
          strengths: scoreResult.strengths,
          weaknesses: scoreResult.weaknesses,

          // 4. Reasoning factors
          reasoningFactors: {
            anchorComparison: benchmarkRef !== '无对标数据' ? '有对标数据可参照' : '无锚点对比（冷启动）',
            benchmarkSupport: benchmarkRef,
            uncertaintyNotes: '新号冷启动阶段，预测精度有限。随复盘数据积累，预测会越来越准。'
          },

          // 5. Anchor comparison
          anchorComparison: benchmarkRef !== '无对标数据'
            ? `与对标账号同类型视频对比：对标账号平均表现作为参照系`
            : '暂无对标数据，待导入对标账号后可启用锚点对比',

          // 6. Counterfactual
          counterfactual: `如果钩子更换为更强的情感冲突开头，预测 composite 可能提升 0.5-1.0 分。如果受众更窄（如纯技术人群），AB 维度可能下降。`,

          // 7. Key calibration assumptions
          calibrationAssumptions: [
            '假设 rubric v0 等权评分能反映实际表现',
            '假设冷启动用户的前 5 条视频完播率偏低但互动率正常',
            '假设抖音算法对新号首条有额外流量倾斜'
          ],

          // Legacy fields
          scriptFile: fileName,
          topic: topic || '未命名脚本',
          scriptContent: script,
          overall: scoreResult.overall,
          suggestions: scoreResult.suggestions,
          predictedAt: timestamp,
          status: 'predicted',
          publishedAt: null,
          publishUrl: null,
          actualData: null
        }
        await window.api.writeFile(predPath, JSON.stringify(prediction, null, 2))
        setPredictionData(prediction)
        setPredictionLocked(true)

        // Generate readable prediction report
        const dimLabels: Record<string, string> = {
          emotional_resonance: '情感冲击力',
          hook_potential: '开头抓人',
          quotable_lines: '金句密度',
          narrativity: '故事性',
          audience_breadth: '受众广度',
          social_resonance: '社会共振',
          satire_depth: '讽刺深度'
        }
        const scoreRows = Object.entries(scoreResult.scores)
          .map(([k, v]) => `| ${dimLabels[k] || k} | ${(v as number).toFixed(1)} |`)
          .join('\n')

        const reportContent = [
          `# 🔒 预测报告：${safeTopic}`,
          '',
          `> **日期**：${today} ｜ **模式**：冷启动 ｜ **可信度**：🟠 低`,
          '',
          '---',
          '',
          '## 📊 预测总览',
          '',
          `**Composite 总分：${scoreResult.total.toFixed(1)} / 10**`,
          '',
          '### 7 维评分',
          '',
          '| 维度 | 分数 |',
          '|------|------|',
          scoreRows,
          '',
          '---',
          '',
          '## 🎯 核心赌注',
          '',
          scoreResult.overall,
          '',
          '---',
          '',
          '## ✅ 优势',
          '',
          ...scoreResult.strengths.map((s: string) => `- ${s}`),
          '',
          '## ⚠️ 待改进',
          '',
          ...scoreResult.weaknesses.map((w: string) => `- ${w}`),
          '',
          '## 💡 修改建议',
          '',
          ...scoreResult.suggestions.map((s: string) => `- ${s}`),
          '',
          '---',
          '',
          '## 🔗 推理因素',
          '',
          `- **锚点对比**：${benchmarkRef}`,
          '- **不确定性**：新号冷启动阶段，预测精度有限。随复盘数据积累会越来越准',
          '',
          '## 🔄 反事实场景',
          '',
          '如果钩子更换为更强的情感冲突开头，预测 composite 可能提升 0.5-1.0 分。',
          '如果受众更窄（如纯技术人群），AB 维度可能下降。',
          '',
          '## ⚙️ 关键校准假设',
          '',
          '- 假设 rubric v0 等权评分能反映实际表现',
          '- 假设冷启动用户的前 5 条视频完播率偏低但互动率正常',
          '- 假设抖音算法对新号首条有额外流量倾斜',
          '',
          '---',
          '',
          '> ⚠️ 此报告在预测时锁定，不可修改。实际数据出来后请在复盘页面对比。'
        ].join('\n')

        const reportPath = predPath.replace('.json', '.report.md')
        await window.api.writeFile(reportPath, reportContent)
      }

      // Log activity
      await window.api.logActivity(activeProject.path, {
        type: 'script_saved',
        timestamp,
        label: `保存脚本：${safeTopic}`,
        detail: scoreResult ? `评分 ${scoreResult.total.toFixed(1)}/10` : '未评分',
        scriptFile: fileName,
        navTarget: 'script-editor'
      })

      // Update project state
      await window.api.updateProjectState(activeProject.path, {
        totalPredicted: (activeProject.state.totalPredicted || 0) + 1
      })

      // Refresh store
      await refreshActiveProject()

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(translateAIError(err, '保存'))
    }
  }, [script, topic, scoreResult, activeProject])

  const handleDelete = useCallback(async (scriptName: string) => {
    if (!activeProject) return
    setLoading('delete')
    setError('')
    try {
      await window.api.deleteScript(activeProject.path, scriptName)
      await loadScriptList()
      await refreshActiveProject()
      setDeleteConfirm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    } finally {
      setLoading(null)
    }
  }, [activeProject, loadScriptList, refreshActiveProject])

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'bg-green-500'
    if (score >= 6) return 'bg-yellow-500'
    if (score >= 4) return 'bg-orange-500'
    return 'bg-red-500'
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
        <h1 className="text-lg font-semibold text-white">创作工作台</h1>
        <div className="flex-1" />
        <div className="relative">
          <button
            onClick={() => setShowScriptList(!showScriptList)}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 text-sm transition-colors flex items-center gap-2"
          >
            <FileText size={15} />
            已有脚本
            <ChevronDown size={12} className={showScriptList ? 'rotate-180' : ''} />
          </button>
          {showScriptList && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <span className="text-xs text-white/40 font-medium">脚本列表</span>
                <button
                  onClick={() => setShowScriptList(false)}
                  className="text-white/20 hover:text-white/50"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {scriptList.length === 0 ? (
                  <p className="text-xs text-white/20 text-center py-6">暂无已保存的脚本</p>
                ) : (
                  scriptList.map((s) => (
                    <button
                      key={s.name}
                      onClick={async () => {
                        try {
                          const content = await window.api.readFile(s.path) as string
                          const topicMatch = content.match(/^# (.+)/m)
                          if (topicMatch) setTopic(topicMatch[1])
                          const sepIdx = content.indexOf('\n---\n')
                          const body = sepIdx > 0
                            ? content.substring(0, sepIdx).replace(/^# .*\n/, '').trim()
                            : content.trim()
                          setScript(body)
                          setCurrentScriptFile(s.name)
                          setShowScriptList(false)
                        } catch { /* ignore */ }
                      }}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] border-b border-white/[0.03] last:border-0 w-full text-left cursor-pointer"
                    >
                      <span className="text-xs text-white/50 truncate flex-1 mr-3">{s.name}</span>
                      {deleteConfirm === s.name ? (
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(s.name) }}
                            disabled={loading === 'delete'}
                            className="px-2 py-0.5 rounded text-[10px] bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30"
                          >
                            {loading === 'delete' ? '...' : '确认'}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null) }}
                            className="px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/10 text-white/40 hover:bg-white/10"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(s.name) }}
                          disabled={loading !== null}
                          className="p-1 rounded text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                          title="删除此脚本"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleRescore}
          disabled={!script.trim() || loading !== null}
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 text-sm transition-colors disabled:opacity-30 flex items-center gap-2"
        >
          <RefreshCw size={15} className={loading === 'score' ? 'animate-spin' : ''} />
          重新打分
        </button>
        <button
          onClick={() => {
            if (!predictionLocked && scoreResult) {
              setShowChecklist(true)
            } else {
              handleSave()
            }
          }}
          disabled={!script.trim() || loading !== null}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 flex items-center gap-2 ${
            predictionLocked
              ? 'bg-green-600/20 border border-green-500/30 text-green-400 cursor-not-allowed'
              : 'bg-brand-600 hover:bg-brand-500 text-white'
          }`}
        >
          {predictionLocked ? (
            <>
              <CheckCircle2 size={15} />
              🔒 已锁定
            </>
          ) : saved ? (
            <>
              <CheckCircle2 size={15} />
              已保存
            </>
          ) : (
            <>
              <Save size={15} />
              保存定稿
            </>
          )}
        </button>
        {/* Tool buttons */}
        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/10">
          <button onClick={async () => { try { const r = await window.api.exportChecklist({ script, topic, storyboard: [], style: {}, equipment: {} }); if (r.success) { await navigator.clipboard.writeText(r.markdown); alert('拍摄清单已复制到剪贴板！') } } catch {} }} disabled={!script.trim()} title="导出拍摄清单" className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-green-400 transition-colors disabled:opacity-20">
            <Download size={16} />
          </button>
          <button onClick={async () => { try { const r = await window.api.exportTeleprompter(script); if (r.success) { await navigator.clipboard.writeText(r.text); alert('提词器文本已复制！') } } catch {} }} disabled={!script.trim()} title="导出提词器" className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-blue-400 transition-colors disabled:opacity-20">
            <FileText size={16} />
          </button>
          <button onClick={async () => { try { const r = await window.api.ttsGenerate(script, {}); if (r.success) alert('TTS 语音已生成：' + r.filepath); else alert('TTS 失败：' + r.error) } catch(e: any) { alert('TTS 错误：' + e.message) } }} disabled={!script.trim()} title="文字转语音" className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-purple-400 transition-colors disabled:opacity-20">
            <Volume2 size={16} />
          </button>
          <button onClick={async () => { try { setLoading('generate'); const r = await window.api.coverGeneratePrompt({ script, topic, style: '' }); if (r.success) { setCoverResult(r); setShowCoverModal(true) } } catch {} finally { setLoading(null) } }} disabled={!script.trim() || loading !== null} title="AI 封面图" className={`p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-20 ${loading === 'generate' ? 'text-yellow-400 animate-pulse' : 'text-white/30 hover:text-yellow-400'}`}>
            <Image size={16} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Editor */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          {/* Topic input */}
          <div className="mb-4 space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  placeholder="输入你想拍的主题，例如：中小企业怎么用AI降本增效..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50"
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={!topic.trim() || loading !== null}
                className="px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-30 text-white text-sm font-medium transition-all flex items-center gap-2 shrink-0"
              >
                {loading === 'generate' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                AI 生成脚本
              </button>
            </div>
            {hook && (
              <div className="bg-brand-500/5 border border-brand-500/10 rounded-xl px-4 py-3">
                <p className="text-xs text-brand-300/60 mb-1">开场钩子（来自蓝图）</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-white/80 flex-1">「{hook}」</p>
                  <button
                    onClick={() => { setScript(prev => prev ? `【开场钩子】\n${hook}\n\n${prev}` : `【开场钩子】\n${hook}`) }}
                    className="text-xs px-2 py-1 rounded bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 transition-colors shrink-0"
                    title="将钩子插入脚本开头"
                  >
                    插入脚本
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Script editor */}
          <textarea
            value={script}
            onChange={(e) => {
              setScript(e.target.value)
              // Clear scores when user edits
              if (scoreResult) setScoreResult(null)
            }}
            placeholder={
              loading === 'generate'
                ? 'AI 正在生成脚本...'
                : '输入主题后点击"AI生成脚本"，或直接在这里写...'
            }
            className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 text-sm text-white/80 placeholder:text-white/15 resize-none focus:outline-none focus:border-brand-500/30 font-sans leading-relaxed"
          />

          {/* Error */}
          {error && (
            <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>

        {/* Full production plan (expandable) */}
        {scriptSections && (
          <div className="px-6 pb-3">
            <button
              onClick={() => setShowFullPlan(!showFullPlan)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/70 text-xs transition-colors mb-3"
            >
              <Eye size={14} />
              {showFullPlan ? '收起完整方案' : '查看完整方案（分镜·风格·工具·后期·封面）'}
              <ChevronDown size={12} className={`transition-transform ${showFullPlan ? 'rotate-180' : ''}`} />
            </button>

            {showFullPlan && (
              <div className="grid grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-2">
                {scriptSections.style && (
                  <SectionCard icon={<Palette size={14} />} title="风格定义" color="purple">
                    <div className="text-xs text-white/50 leading-relaxed whitespace-pre-wrap">{scriptSections.style}</div>
                  </SectionCard>
                )}

                {scriptSections.storyboard && (
                  <SectionCard icon={<Layout size={14} />} title="分镜脚本" color="blue" fullWidth>
                    <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: renderMarkdownTable(scriptSections.storyboard) }} />
                  </SectionCard>
                )}

                {scriptSections.equipment && (
                  <SectionCard icon={<Wrench size={14} />} title="拍摄工具" color="green">
                    <div className="text-xs text-white/50 leading-relaxed whitespace-pre-wrap">{scriptSections.equipment}</div>
                  </SectionCard>
                )}

                {scriptSections.scene && (
                  <SectionCard icon={<Camera size={14} />} title="场景与造型" color="orange">
                    <div className="text-xs text-white/50 leading-relaxed whitespace-pre-wrap">{scriptSections.scene}</div>
                  </SectionCard>
                )}

                {scriptSections.postProduction && (
                  <SectionCard icon={<Scissors size={14} />} title="后期制作" color="red">
                    <div className="text-xs text-white/50 leading-relaxed whitespace-pre-wrap">{scriptSections.postProduction}</div>
                  </SectionCard>
                )}

                {scriptSections.cover && (
                  <SectionCard icon={<Share2 size={14} />} title="封面与发布" color="yellow">
                    <div className="text-xs text-white/50 leading-relaxed whitespace-pre-wrap">{scriptSections.cover}</div>
                  </SectionCard>
                )}
              </div>
            )}
          </div>
        )}

        {/* Right: Score panel */}
        <div className="w-80 border-l border-white/5 p-6 overflow-y-auto shrink-0">
          <h3 className="text-sm font-medium text-white/60 mb-4 flex items-center gap-2">
            <Target size={14} />
            7 维评分
          </h3>

          {scoreResult ? (
            <div className="space-y-4">
              {/* Dimension scores */}
              {DIMENSIONS.map((dim) => {
                const score = scoreResult.scores[dim.key as keyof RubricScores]
                const Icon = dim.icon
                return (
                  <div key={dim.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Icon size={13} className="text-white/30" />
                        <span className="text-xs text-white/50">{dim.label}</span>
                        <span className="text-[10px] text-white/20">{dim.weight}</span>
                      </div>
                      <span className="text-xs font-mono font-medium text-white/80">
                        {score}/10
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getScoreColor(score)}`}
                        style={{ width: `${(score / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}

              {/* Total score */}
              <div className="pt-3 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">加权总分</span>
                  <span className="text-lg font-bold text-brand-400">
                    {scoreResult.total.toFixed(1)}
                    <span className="text-xs text-white/30 font-normal">/10</span>
                  </span>
                </div>
              </div>

              {/* Overall */}
              <p className="text-xs text-white/40 leading-relaxed italic">
                "{scoreResult.overall}"
              </p>

              {/* Strengths */}
              {scoreResult.strengths.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-green-400/80 mb-1.5">
                    👍 优势
                  </h4>
                  <ul className="space-y-1">
                    {scoreResult.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-white/40 flex gap-1.5">
                        <span className="text-green-500/50 shrink-0">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {scoreResult.weaknesses.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-yellow-400/80 mb-1.5">
                    👎 待改进
                  </h4>
                  <ul className="space-y-1">
                    {scoreResult.weaknesses.map((w, i) => (
                      <li key={i} className="text-xs text-white/40 flex gap-1.5">
                        <span className="text-yellow-500/50 shrink-0">•</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {scoreResult.suggestions.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-brand-400/80 mb-1.5">
                    💡 修改建议
                  </h4>
                  <ul className="space-y-1">
                    {scoreResult.suggestions.map((s, i) => (
                      <li key={i} className="text-xs text-white/40 flex gap-1.5">
                        <span className="text-brand-400/50 shrink-0">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-white/15 text-sm">
                {loading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 size={20} className="animate-spin text-brand-400/50" />
                    <span>AI 正在分析...</span>
                  </div>
                ) : (
                  <div>
                    <p>暂无评分</p>
                    <p className="text-xs mt-1">生成脚本或点击"重新打分"</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pre-flight checklist overlay */}
      {showChecklist && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
          <div className="bg-[#1a1a24] border border-white/10 rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">🔒 预测前检查清单</h3>
            <p className="text-sm text-white/40 mb-6">
              写完即锁定，不可修改。确认以下事项：
            </p>

            <div className="space-y-3 mb-6">
              {[
                '脚本已定稿，不会再改了',
                '对标账号已导入（建议但非必须）',
                '下面是盲预测——写完不可修改'
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const next = [...checklistItems]
                    next[i] = !next[i]
                    setChecklistItems(next)
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all text-sm flex items-center gap-3 ${
                    checklistItems[i]
                      ? 'bg-green-500/5 border-green-500/20 text-green-300'
                      : 'bg-white/[0.02] border-white/[0.06] text-white/50 hover:border-white/15'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    checklistItems[i]
                      ? 'bg-green-500 border-green-500'
                      : 'border-white/15'
                  }`}>
                    {checklistItems[i] && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  {item}
                </button>
              ))}
            </div>

            {/* Prediction preview */}
            {scoreResult && (
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] mb-4">
                <p className="text-xs text-white/30 mb-1">预测总览</p>
                <p className="text-sm text-white/70">
                  Composite: <span className="text-brand-400 font-bold">{scoreResult.total.toFixed(1)}/10</span>
                  {' · '}7 维评分
                  {' · '}Bet: {scoreResult.overall.slice(0, 40)}...
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowChecklist(false); setChecklistItems([false, false, false]) }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/50 text-sm transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setShowChecklist(false)
                  setChecklistItems([false, false, false])
                  handleSave()
                }}
                disabled={!checklistItems[0]}
                className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-30 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                确认并锁定预测
              </button>
            </div>
            <p className="text-xs text-white/15 text-center mt-3">
              至少确认第 1 项（脚本已定稿）才能继续
            </p>
          </div>
        </div>
      )}

      {/* Cover image modal */}
      {showCoverModal && coverResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
          <div className="bg-[#1a1a24] border border-white/10 rounded-2xl w-full max-w-lg mx-4 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">🎨 AI 封面图方案</h3>
              <button onClick={() => setShowCoverModal(false)} className="text-white/30 hover:text-white/60"><X size={18} /></button>
            </div>
            {coverResult.textOverlay && (
              <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 mb-4 text-center">
                <p className="text-xs text-yellow-400/60 mb-1">推荐封面大字</p>
                <p className="text-xl font-bold text-yellow-300">{coverResult.textOverlay}</p>
              </div>
            )}
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <p className="text-xs text-white/30 mb-1">英文 Prompt（Midjourney / DALL-E）</p>
                <p className="text-xs text-white/60 break-all leading-relaxed">{coverResult.mainPrompt}</p>
                <button onClick={() => { navigator.clipboard.writeText(coverResult.mainPrompt || ''); alert('已复制英文 Prompt') }} className="mt-2 text-xs px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white/60 transition-colors">📋 复制英文</button>
              </div>
              {coverResult.mainPromptCN && (
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-xs text-white/30 mb-1">中文 Prompt</p>
                  <p className="text-xs text-white/60">{coverResult.mainPromptCN}</p>
                  <button onClick={() => { navigator.clipboard.writeText(coverResult.mainPromptCN || ''); alert('已复制中文 Prompt') }} className="mt-2 text-xs px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white/60 transition-colors">📋 复制中文</button>
                </div>
              )}
            </div>
            {coverResult.designNotes?.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <p className="text-xs text-white/30 mb-1">设计要点</p>
                <ul className="text-xs text-white/50 space-y-0.5">
                  {coverResult.designNotes.map((n: string, i: number) => <li key={i}>• {n}</li>)}
                </ul>
              </div>
            )}
            <button onClick={() => setShowCoverModal(false)} className="w-full mt-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-colors">关闭</button>
          </div>
        </div>
      )}

      {/* Prediction locked indicator */}
      {predictionLocked && predictionData && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm shadow-lg backdrop-blur-sm flex items-center gap-3">
          <CheckCircle2 size={16} />
          <span>🔒 预测已锁定 · Composite: {(predictionData.total as number)?.toFixed(1)}/10</span>
          <button
            onClick={async () => {
              if (!activeProject) return
              const predFileName = (predictionData as Record<string, unknown>).scriptFile as string || ''
              const reportFileName = predFileName.replace('.md', '.json').replace('.json', '') + '.report.md'
              // Find the prediction file and its report
              const preds = await window.api.listPredictions(activeProject.path) as Array<{ name: string; path: string }>
              const reportPred = preds.find((p) => p.name.includes(reportFileName.replace('.report.md', '')))
              if (reportPred) {
                try {
                  const reportPath = reportPred.path.replace('.json', '.report.md')
                  const content = await window.api.readFile(reportPath) as string
                  setScript(content)
                  setTopic(`📋 预测报告`)
                } catch { /* report not found */ }
              }
            }}
            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors"
          >
            📋 查看报告
          </button>
          <button
            onClick={() => setPredictionLocked(false)}
            className="text-white/20 hover:text-white/40 text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
