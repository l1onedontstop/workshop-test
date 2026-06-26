import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import {
  ArrowLeft, Target, Plus, Loader2, Search, ExternalLink,
  ChevronRight, CheckCircle2, AlertCircle, TrendingUp,
  Lightbulb, Zap, BookOpen, Shield, Trash2, Eye, Sparkles, Users,
  User, RefreshCw, Globe, BarChart3
} from 'lucide-react'

interface AccountMeta {
  name: string
  platform: string
  url: string
  importedAt: string
  videoCount: number
  contentTypes: string[]
  topTopics: string[]
  styleNotes: string
  aiAnalysis?: {
    accountSummary: string
    contentPillars: string[]
    styleFeatures: string[]
    learnableHookPatterns: string[]
    recommendedHookPatterns: string[]
    audienceInsight: string
    learnablePoints: string[]
    riskWarnings: string[]
  }
}

interface SelfAccountData {
  name: string
  platform: string
  url: string
  crawledAt: string
  followerCount?: number
  totalVideos?: number
  noAccount?: boolean
  setAt?: string
  videos: Array<{
    title: string
    url: string
    plays?: number
    likes?: number
    comments?: number
    shares?: number
    duration?: string
    publishedAt?: string
    tags?: string[]
  }>
  aiAnalysis?: {
    accountSummary: string
    contentPillars: string[]
    styleFeatures: string[]
    strengths: string[]
    weaknesses: string[]
    personaAdvice: {
      keepCurrent: string
      optimizeDirection: string
      transformOption: string
      recommended: 'keep' | 'optimize' | 'transform'
      reasoning: string
    }
    reusablePatterns: string[]
    audienceInference: string
    improvementPriorities: string[]
  }
}

const PLATFORM_OPTIONS = ['抖音', 'B站', '小红书', '视频号', 'YouTube', '其他']
const SELF_PLATFORM_OPTIONS = ['douyin', 'bilibili', 'xiaohongshu', 'shipinhao', 'other']

export default function BenchmarkPage({ onBack }: { onBack: () => void }) {
  const activeProject = useAppStore((s) => s.activeProject)
  const [accounts, setAccounts] = useState<AccountMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'list' | 'import' | 'analyze' | 'selfCrawl' | 'selfAnalyze'>('list')
  const [tab, setTab] = useState<'benchmark' | 'self'>('benchmark')
  const [selectedAccount, setSelectedAccount] = useState<AccountMeta | null>(null)
  const [selfAccount, setSelfAccount] = useState<SelfAccountData | null>(null)
  const [selfLoading, setSelfLoading] = useState(false)
  const [selfError, setSelfError] = useState('')
  // Self crawl form
  const [selfPlatform, setSelfPlatform] = useState('douyin')
  const [selfUrl, setSelfUrl] = useState('')
  const [selfName, setSelfName] = useState('')
  const [selfManualData, setSelfManualData] = useState('')
  const [crossSummary, setCrossSummary] = useState<{
    accounts: Array<{ name: string; summary: string; pillars: string[] }>
    commonPatterns?: string[]
    differences?: Array<{ aspect: string; accounts: string; insight: string }>
    recommendedBlend?: string
    whichToLearnMost?: string
  } | null>(null)

  // Import form
  const [importName, setImportName] = useState('')
  const [importPlatform, setImportPlatform] = useState('抖音')
  const [importUrl, setImportUrl] = useState('')
  const [importNotes, setImportNotes] = useState('')

  const loadAccounts = useCallback(async () => {
    if (!activeProject) return
    const list = (await window.api.benchmarkList(activeProject.path)) as Array<{
      name: string; meta: AccountMeta | null
    }>
    setAccounts(list.filter((a) => a.meta).map((a) => a.meta!))

    // Load cross-account summary if 2+ accounts
    if (list.length >= 2) {
      try {
        const summary = await window.api.benchmarkCrossSummary(activeProject.path) as typeof crossSummary
        setCrossSummary(summary)
      } catch { /* ignore */ }
    } else {
      setCrossSummary(null)
    }
  }, [activeProject])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  // ── Self Account ──
  const loadSelfAccount = useCallback(async () => {
    if (!activeProject) return
    try {
      const data = await window.api.getSelfAccount(activeProject.path) as SelfAccountData | null
      if (data) setSelfAccount(data)
      else setSelfAccount(null)
    } catch { /* ignore */ }
  }, [activeProject])

  useEffect(() => {
    if (tab === 'self') loadSelfAccount()
  }, [tab, loadSelfAccount])

  const handleSelfCrawl = async () => {
    if (!activeProject) return
    setSelfLoading(true)
    setSelfError('')
    try {
      const result = await window.api.socialCrawl(activeProject.path, {
        platform: selfPlatform,
        url: selfUrl.trim(),
        accountName: selfName.trim() || '我的账号',
        manualData: selfManualData.trim() || undefined
      }) as { success: boolean; account?: SelfAccountData; error?: string }

      if (result.success && result.account) {
        setSelfAccount(result.account)
        await loadSelfAccount()
        setStep('selfAnalyze')
      } else {
        setSelfError((result as any)?.error || '爬取分析失败')
      }
    } catch (err) {
      setSelfError(err instanceof Error ? err.message : '爬取分析失败')
    } finally {
      setSelfLoading(false)
    }
  }

  const handleDeleteSelf = async () => {
    if (!activeProject) return
    await window.api.deleteSelfAccount(activeProject.path)
    setSelfAccount(null)
    setStep('list')
  }

  const handleSetNoSelfAccount = async () => {
    if (!activeProject) return
    await window.api.setNoSelfAccount(activeProject.path)
    await loadSelfAccount()
  }

  const handleImport = async () => {
    if (!importName.trim() || !activeProject) return
    setLoading(true)
    setError('')
    try {
      const result = (await window.api.benchmarkImport(activeProject.path, {
        name: importName.trim(),
        platform: importPlatform,
        url: importUrl.trim(),
        notes: importNotes.trim()
      })) as { success: boolean; account?: AccountMeta; error?: string }

      if (result.success && result.account) {
        await loadAccounts()
        setImportName(''); setImportUrl(''); setImportNotes('')
        setStep('list')
      } else {
        setError(result.error || '导入失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async (account: AccountMeta) => {
    if (!activeProject) return
    setSelectedAccount(account)
    setStep('analyze')
  }

  if (!activeProject) {
    return <div className="flex items-center justify-center h-full text-ink-tertiary">请先创建项目</div>
  }

  // ── Analyze view ──
  if (step === 'analyze' && selectedAccount) {
    const a = selectedAccount
    const ai = a.aiAnalysis
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-4 p-6 border-b border-rule-subtle">
          <button onClick={() => setStep('list')} className="p-1.5 rounded-lg hover:bg-black/[0.03] text-ink-tertiary">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-white">{a.name}</h2>
            <p className="text-xs text-ink-tertiary">{a.platform} · {new Date(a.importedAt).toLocaleDateString('zh-CN')}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {ai ? (
              <>
                <div className="p-5 rounded-xl bg-brand-50 border border-brand-200">
                  <h3 className="text-white font-medium mb-2">账号定位</h3>
                  <p className="text-ink-secondary text-sm">{ai.accountSummary}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-black/[0.02] border border-rule-subtle">
                    <h4 className="text-xs text-ink-tertiary mb-2 flex items-center gap-1.5">
                      <Target size={12} /> 内容支柱
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(ai.contentPillars || []).map((p, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-brand-50 border border-brand-200 text-brand-500">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-black/[0.02] border border-rule-subtle">
                    <h4 className="text-xs text-ink-tertiary mb-2 flex items-center gap-1.5">
                      <Zap size={12} /> 风格特征
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(ai.styleFeatures || []).map((s, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-warning-surface border border-warning-border text-warning-text">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Learnable hook patterns */}
                <div className="p-4 rounded-xl bg-black/[0.02] border border-rule-subtle">
                  <h4 className="text-xs text-ink-tertiary mb-3 flex items-center gap-1.5">
                    <Lightbulb size={12} /> 可借鉴的钩子模式
                  </h4>
                  <div className="space-y-2">
                    {(ai.learnableHookPatterns || ai.hookPatterns || []).map((h: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-ink-secondary">
                        <ChevronRight size={14} className="text-brand-600 mt-0.5 shrink-0" />
                        {h}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended hook patterns */}
                <div className="p-4 rounded-xl bg-success-surface border border-success-border">
                  <h4 className="text-xs text-success-text/70 mb-3 flex items-center gap-1.5">
                    <Sparkles size={12} /> 推荐你尝试的钩子模式
                  </h4>
                  <div className="space-y-2">
                    {(ai.recommendedHookPatterns || []).map((h: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-ink-secondary">
                        <ChevronRight size={14} className="text-success-text mt-0.5 shrink-0" />
                        {h}
                      </div>
                    ))}
                  </div>
                  {(!ai.recommendedHookPatterns || ai.recommendedHookPatterns.length === 0) && (
                    <p className="text-xs text-ink-tertiary">基于该账号风格，AI 暂未生成推荐钩子。导入更多对标账号后推荐会更精准。</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 p-4 rounded-xl bg-success-surface border border-success-border">
                    <h4 className="text-xs text-success-text/70 mb-2 flex items-center gap-1.5">
                      <CheckCircle2 size={12} /> 可借鉴之处
                    </h4>
                    <ul className="space-y-1.5">
                      {(ai.learnablePoints || []).map((p, i) => (
                        <li key={i} className="text-xs text-ink-tertiary flex items-start gap-1.5">
                          <span className="text-success-text mt-0.5">•</span> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex-1 p-4 rounded-xl bg-danger-surface border border-danger-border">
                    <h4 className="text-xs text-danger-text/70 mb-2 flex items-center gap-1.5">
                      <AlertCircle size={12} /> 注意风险
                    </h4>
                    <ul className="space-y-1.5">
                      {(ai.riskWarnings || []).map((w, i) => (
                        <li key={i} className="text-xs text-ink-tertiary flex items-start gap-1.5">
                          <span className="text-danger-text mt-0.5">•</span> {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {ai.audienceInsight && (
                  <div className="p-4 rounded-xl bg-black/[0.02] border border-rule-subtle">
                    <h4 className="text-xs text-ink-tertiary mb-2 flex items-center gap-1.5">
                      <Users size={12} /> 受众洞察
                    </h4>
                    <p className="text-sm text-ink-secondary">{ai.audienceInsight}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-ink-tertiary">暂无 AI 分析数据</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Import form ──
  if (step === 'import') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-4 p-6 border-b border-rule-subtle">
          <button onClick={() => { setStep('list'); setError('') }} className="p-1.5 rounded-lg hover:bg-black/[0.03] text-ink-tertiary">
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-lg font-semibold text-white">导入对标账号</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-lg mx-auto space-y-5">
            <div className="text-center mb-6">
              <Target size={36} className="text-warning-text/50 mx-auto mb-3" />
              <p className="text-sm text-ink-tertiary">
                对标账号是评分校准的参照系。AI 会分析账号的内容 pattern，作为后续打分的锚点。
              </p>
            </div>

            <div>
              <label className="text-xs text-ink-tertiary mb-1.5 block">账号名称 *</label>
              <input
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder="输入对标账号名称"
                className="w-full bg-black/[0.04] border border-rule rounded-xl px-4 py-3 text-sm text-white placeholder:text-ink-disabled focus:outline-none focus:border-brand-200"
              />
            </div>

            <div>
              <label className="text-xs text-ink-tertiary mb-1.5 block">平台</label>
              <div className="flex gap-2 flex-wrap">
                {PLATFORM_OPTIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setImportPlatform(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      importPlatform === p
                        ? 'bg-brand-50 border-brand-200 text-brand-500'
                        : 'bg-black/[0.02] border-rule text-ink-tertiary hover:text-ink-secondary'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-ink-tertiary mb-1.5 block">账号链接</label>
              <input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-black/[0.04] border border-rule rounded-xl px-4 py-3 text-sm text-white placeholder:text-ink-disabled focus:outline-none focus:border-brand-200"
              />
            </div>

            <div>
              <label className="text-xs text-ink-tertiary mb-1.5 block">补充说明（可选）</label>
              <textarea
                value={importNotes}
                onChange={(e) => setImportNotes(e.target.value)}
                placeholder="你想从这个账号学什么？为什么选它？"
                rows={3}
                className="w-full bg-black/[0.04] border border-rule rounded-xl px-4 py-3 text-sm text-white placeholder:text-ink-disabled resize-none focus:outline-none focus:border-brand-200"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-danger-text text-sm bg-danger-surface border border-danger-border rounded-lg px-4 py-2.5">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={!importName.trim() || loading}
              className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-30 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? 'AI 分析中...' : '开始分析'}
            </button>

            <p className="text-xs text-ink-disabled text-center">
              AI 会根据账号名和平台特征进行内容 pattern 分析
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Self Crawl Form ──
  if (step === 'selfCrawl') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-4 p-6 border-b border-rule-subtle">
          <button onClick={() => { setStep('list'); setSelfError('') }} className="p-1.5 rounded-lg hover:bg-black/[0.03] text-ink-tertiary">
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-lg font-semibold text-white">导入我的账号</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-lg mx-auto space-y-5">
            <div className="text-center mb-6">
              <User size={36} className="text-brand-600/50 mx-auto mb-3" />
              <p className="text-sm text-ink-tertiary">
                导入你自己的社交账号数据，AI会分析你的内容风格和人设，帮助你在现有基础上优化或转型。
              </p>
            </div>

            <div>
              <label className="text-xs text-ink-tertiary mb-1.5 block">你的账号名称</label>
              <input value={selfName} onChange={(e) => setSelfName(e.target.value)}
                placeholder="输入你的账号名称"
                className="w-full bg-black/[0.04] border border-rule rounded-xl px-4 py-3 text-sm text-white placeholder:text-ink-disabled focus:outline-none focus:border-brand-200" />
            </div>

            <div>
              <label className="text-xs text-ink-tertiary mb-1.5 block">平台</label>
              <div className="flex gap-2 flex-wrap">
                {SELF_PLATFORM_OPTIONS.map((p) => (
                  <button key={p} onClick={() => setSelfPlatform(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      selfPlatform === p ? 'bg-brand-50 border-brand-200 text-brand-500' : 'bg-black/[0.02] border-rule text-ink-tertiary hover:text-ink-secondary'
                    }`}>
                    {{ douyin: '抖音', bilibili: 'B站', xiaohongshu: '小红书', shipinhao: '视频号', other: '其他' }[p]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-ink-tertiary mb-1.5 block">主页链接</label>
              <input value={selfUrl} onChange={(e) => setSelfUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-black/[0.04] border border-rule rounded-xl px-4 py-3 text-sm text-white placeholder:text-ink-disabled focus:outline-none focus:border-brand-200" />
              <p className="text-[10px] text-ink-disabled mt-1">
                {selfPlatform === 'douyin' ? '粘贴你的抖音主页链接，系统将尝试自动爬取近期视频数据' :
                 selfPlatform === 'bilibili' ? '粘贴你的B站空间链接，系统将尝试自动爬取' :
                 '对该平台，建议在下方手动粘贴视频数据'}
              </p>
            </div>

            <div>
              <label className="text-xs text-ink-tertiary mb-1.5 block">手动数据输入（可选，格式：标题|链接|播放|点赞|评论|日期）</label>
              <textarea value={selfManualData} onChange={(e) => setSelfManualData(e.target.value)}
                placeholder={`我的创业故事|https://...|12000|523|78|2026-06-01\nAI如何改变我的公司|https://...|8500|312|45|2026-06-05`}
                rows={5}
                className="w-full bg-black/[0.04] border border-rule rounded-xl px-4 py-3 text-sm text-white placeholder:text-ink-disabled resize-none focus:outline-none focus:border-brand-200 font-mono" />
              <p className="text-[10px] text-ink-disabled mt-1">每行一条视频，用 | 分隔字段。也可留空，AI会根据账号名和平台做推断分析。</p>
            </div>

            {selfError && (
              <div className="flex items-center gap-2 text-danger-text text-sm bg-danger-surface border border-danger-border rounded-lg px-4 py-2.5">
                <AlertCircle size={14} /> {selfError}
              </div>
            )}

            <button onClick={handleSelfCrawl}
              disabled={selfLoading}
              className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-30 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
              {selfLoading ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
              {selfLoading ? 'AI 分析中...' : '开始爬取并分析'}
            </button>

            <p className="text-xs text-ink-disabled text-center">
              AI会分析你的账号定位、内容风格、强项弱项，并给出人设优化建议
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Self Account Analyze View ──
  if (step === 'selfAnalyze' && selfAccount?.aiAnalysis) {
    const a = selfAccount
    const ai = a.aiAnalysis
    const personaAdvice = ai.personaAdvice
    const recLabel = personaAdvice.recommended === 'keep' ? '继续现有方向' :
                     personaAdvice.recommended === 'optimize' ? '优化调整' : '转型'
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-4 p-6 border-b border-rule-subtle">
          <button onClick={() => { setStep('list'); setTab('self') }} className="p-1.5 rounded-lg hover:bg-black/[0.03] text-ink-tertiary">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-white">我的账号：{a.name}</h2>
            <p className="text-xs text-ink-tertiary">{PLATFORM_OPTIONS[SELF_PLATFORM_OPTIONS.indexOf(a.platform)] || a.platform} · {new Date(a.crawledAt).toLocaleDateString('zh-CN')} 分析</p>
          </div>
          <div className="flex-1" />
          <button onClick={handleDeleteSelf}
            className="px-3 py-1.5 rounded-lg bg-danger-surface border border-danger-border hover:bg-danger-surface text-danger-text/70 text-sm flex items-center gap-1.5">
            <Trash2 size={14} /> 清除数据
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Account summary */}
            <div className="p-5 rounded-xl bg-brand-50 border border-brand-200">
              <h3 className="text-white font-medium mb-2 flex items-center gap-2"><User size={14} className="text-brand-600" />账号定位</h3>
              <p className="text-ink-secondary text-sm">{ai.accountSummary}</p>
            </div>

            {/* Content pillars + Style */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-black/[0.02] border border-rule-subtle">
                <h4 className="text-xs text-ink-tertiary mb-2 flex items-center gap-1.5"><Target size={12} />内容支柱</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(ai.contentPillars || []).map((p, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-brand-50 border border-brand-200 text-brand-500">{p}</span>
                  ))}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-black/[0.02] border border-rule-subtle">
                <h4 className="text-xs text-ink-tertiary mb-2 flex items-center gap-1.5"><Zap size={12} />风格特征</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(ai.styleFeatures || []).map((s, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-warning-surface border border-warning-border text-warning-text">{s}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Strengths + Weaknesses */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-success-surface border border-success-border">
                <h4 className="text-xs text-success-text/70 mb-2 flex items-center gap-1.5"><CheckCircle2 size={12} />强项</h4>
                <ul className="space-y-1.5">
                  {(ai.strengths || []).map((s, i) => (
                    <li key={i} className="text-xs text-ink-tertiary flex items-start gap-1.5"><span className="text-success-text mt-0.5">•</span>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-xl bg-danger-surface border border-danger-border">
                <h4 className="text-xs text-danger-text/70 mb-2 flex items-center gap-1.5"><AlertCircle size={12} />弱项</h4>
                <ul className="space-y-1.5">
                  {(ai.weaknesses || []).map((w, i) => (
                    <li key={i} className="text-xs text-ink-tertiary flex items-start gap-1.5"><span className="text-danger-text mt-0.5">•</span>{w}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Persona advice — 3 paths */}
            <div className="p-5 rounded-xl border-2 border-brand-200 bg-brand-50">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles size={14} className="text-brand-600" />人设发展建议 · 推荐：{recLabel}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className={`p-3 rounded-lg border ${personaAdvice.recommended === 'keep' ? 'border-success-border bg-success-surface' : 'border-rule bg-black/[0.02]'}`}>
                  <h4 className="text-xs font-medium text-success-text mb-1">🟢 继续现有</h4>
                  <p className="text-[10px] text-ink-tertiary leading-relaxed">{personaAdvice.keepCurrent}</p>
                </div>
                <div className={`p-3 rounded-lg border ${personaAdvice.recommended === 'optimize' ? 'border-warning-border bg-warning-surface' : 'border-rule bg-black/[0.02]'}`}>
                  <h4 className="text-xs font-medium text-warning-text mb-1">🟡 优化调整</h4>
                  <p className="text-[10px] text-ink-tertiary leading-relaxed">{personaAdvice.optimizeDirection}</p>
                </div>
                <div className={`p-3 rounded-lg border ${personaAdvice.recommended === 'transform' ? 'border-danger-border bg-danger-surface' : 'border-rule bg-black/[0.02]'}`}>
                  <h4 className="text-xs font-medium text-danger-text mb-1">🔴 转型方向</h4>
                  <p className="text-[10px] text-ink-tertiary leading-relaxed">{personaAdvice.transformOption}</p>
                </div>
              </div>
              <p className="text-xs text-ink-tertiary mt-3"><strong>推荐理由：</strong>{personaAdvice.reasoning}</p>
            </div>

            {/* Reusable patterns */}
            <div className="p-4 rounded-xl bg-black/[0.02] border border-rule-subtle">
              <h4 className="text-xs text-ink-tertiary mb-3 flex items-center gap-1.5"><Lightbulb size={12} />可复用的内容模式</h4>
              <div className="space-y-2">
                {(ai.reusablePatterns || []).map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-ink-secondary">
                    <ChevronRight size={14} className="text-brand-600 mt-0.5 shrink-0" />{p}
                  </div>
                ))}
              </div>
            </div>

            {/* Audience inference */}
            {ai.audienceInference && (
              <div className="p-4 rounded-xl bg-black/[0.02] border border-rule-subtle">
                <h4 className="text-xs text-ink-tertiary mb-2 flex items-center gap-1.5"><Users size={12} />受众推断</h4>
                <p className="text-sm text-ink-secondary">{ai.audienceInference}</p>
              </div>
            )}

            {/* Improvement priorities */}
            <div className="p-4 rounded-xl bg-warning-surface border border-warning-border">
              <h4 className="text-xs text-warning-text/70 mb-3 flex items-center gap-1.5"><TrendingUp size={12} />最优先改进</h4>
              <div className="space-y-2">
                {(ai.improvementPriorities || []).map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-ink-secondary">
                    <span className="w-5 h-5 rounded-full bg-warning-border text-warning-text text-xs flex items-center justify-center shrink-0">{i + 1}</span>
                    {p}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent videos table */}
            {a.videos && a.videos.length > 0 && (
              <div className="p-4 rounded-xl bg-black/[0.02] border border-rule-subtle">
                <h4 className="text-xs text-ink-tertiary mb-3 flex items-center gap-1.5"><BarChart3 size={12} />爬取的视频数据（{a.videos.length}条）</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="text-ink-disabled border-b border-rule">
                        <th className="text-left py-1.5 px-2 font-medium">标题</th>
                        <th className="text-right py-1.5 px-2 font-medium">播放</th>
                        <th className="text-right py-1.5 px-2 font-medium">点赞</th>
                        <th className="text-right py-1.5 px-2 font-medium">评论</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.videos.slice(0, 20).map((v, i) => (
                        <tr key={i} className="border-b border-black/[0.02] text-ink-tertiary">
                          <td className="py-1.5 px-2 max-w-[300px] truncate">{v.title}</td>
                          <td className="text-right py-1.5 px-2">{v.plays?.toLocaleString() || '-'}</td>
                          <td className="text-right py-1.5 px-2">{v.likes?.toLocaleString() || '-'}</td>
                          <td className="text-right py-1.5 px-2">{v.comments?.toLocaleString() || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── List view ──
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6 border-b border-rule-subtle">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-black/[0.03] text-ink-tertiary">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {tab === 'benchmark' ? '对标账号' : '我的账号'}
            </h2>
            <p className="text-xs text-ink-tertiary">
              {tab === 'benchmark'
                ? (accounts.length > 0 ? `${accounts.length} 个对标 · AI 分析作为打分锚点` : '还没有对标账号，导入一个吧')
                : (selfAccount?.noAccount
                  ? '已标记为无个人账户'
                  : selfAccount
                    ? `${selfAccount.name} · ${selfAccount.aiAnalysis ? '已分析' : '待分析'}`
                    : '导入你的社交账号数据，AI帮你诊断优化')
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div className="flex bg-black/[0.04] rounded-lg p-0.5 mr-3">
            <button onClick={() => { setTab('benchmark'); setStep('list') }}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${tab === 'benchmark' ? 'bg-white/[0.08] text-white font-medium' : 'text-ink-tertiary'}`}>
              <Target size={13} className="inline mr-1" />对标
            </button>
            <button onClick={() => { setTab('self'); setStep('list') }}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${tab === 'self' ? 'bg-white/[0.08] text-white font-medium' : 'text-ink-tertiary'}`}>
              <User size={13} className="inline mr-1" />我的
            </button>
          </div>
          {tab === 'benchmark' ? (
            <button onClick={() => setStep('import')}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors flex items-center gap-2">
              <Plus size={16} /> 导入对标
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {selfAccount && !selfAccount.noAccount && (
                <button onClick={loadSelfAccount}
                  className="px-3 py-2 rounded-lg border border-rule hover:border-brand-200 text-ink-tertiary hover:text-ink-secondary text-sm transition-colors flex items-center gap-1.5">
                  <RefreshCw size={13} /> 刷新
                </button>
              )}
              <button onClick={() => setStep('selfCrawl')}
                className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors flex items-center gap-2">
                {selfAccount?.noAccount ? <Globe size={15} /> : selfAccount ? <RefreshCw size={15} /> : <Globe size={15} />}
                {selfAccount?.noAccount ? '导入我的账号' : selfAccount ? '更新数据' : '导入我的账号'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* ── Benchmark tab ── */}
          {tab === 'benchmark' && (
            accounts.length === 0 ? (
              <div className="text-center py-20">
                <Target size={48} className="text-ink-disabled mx-auto mb-4" />
                <h3 className="text-lg font-medium text-ink-tertiary mb-2">还没有对标账号</h3>
                <p className="text-sm text-ink-disabled mb-6 max-w-md mx-auto">
                  导入你欣赏的同领域账号，AI 会分析他们的内容 pattern，作为你后续预测打分的参照系
                </p>
                <button onClick={() => setStep('import')}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors inline-flex items-center gap-2">
                  <Plus size={16} /> 导入第一个对标账号
                </button>
              </div>
            ) : (
              <div>
              {crossSummary && crossSummary.commonPatterns && crossSummary.commonPatterns.length > 0 && (
                <div className="mb-6 p-5 rounded-xl bg-brand-50 border border-brand-200">
                  <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <Sparkles size={14} className="text-brand-600" />
                    跨账号总结（{crossSummary.accounts.length} 个对标）
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] text-ink-disabled mb-1.5">共性 pattern</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(crossSummary.commonPatterns || []).map((p: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-brand-50 border border-brand-200 text-brand-500">{p}</span>
                        ))}
                      </div>
                    </div>
                    {crossSummary.recommendedBlend && (
                      <div><p className="text-[10px] text-ink-disabled mb-1">综合建议</p><p className="text-xs text-ink-tertiary">{crossSummary.recommendedBlend}</p></div>
                    )}
                    {crossSummary.whichToLearnMost && (
                      <div className="p-3 rounded-lg bg-black/[0.03] border border-rule-subtle">
                        <p className="text-[10px] text-ink-disabled mb-0.5">最值得优先学</p><p className="text-xs text-ink-secondary">{crossSummary.whichToLearnMost}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="grid gap-4">
                {accounts.map((a, i) => (
                  <button key={i} onClick={() => handleAnalyze(a)}
                    className="text-left p-5 rounded-xl bg-black/[0.02] border border-rule-subtle hover:border-brand-200 hover:bg-brand-50 transition-all group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-white font-medium">{a.name}</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/[0.04] border border-rule text-ink-tertiary">{a.platform}</span>
                        </div>
                        {a.aiAnalysis?.accountSummary && (
                          <p className="text-sm text-ink-tertiary line-clamp-2 mb-2">{a.aiAnalysis.accountSummary}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-ink-disabled">
                          <span>{new Date(a.importedAt).toLocaleDateString('zh-CN')} 导入</span>
                          {a.aiAnalysis?.styleFeatures && <span>{a.aiAnalysis.styleFeatures.length} 个风格特征</span>}
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-ink-disabled group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
              </div>
            )
          )}

          {/* ── Self Account tab ── */}
          {tab === 'self' && (
            !selfAccount ? (
              <div className="text-center py-20">
                <User size={48} className="text-ink-disabled mx-auto mb-4" />
                <h3 className="text-lg font-medium text-ink-tertiary mb-2">还没有导入你的账号</h3>
                <p className="text-sm text-ink-disabled mb-6 max-w-md mx-auto">
                  导入你自己的社交账号数据，AI会分析你的内容风格和人设，帮助你在现有基础上继续运营或优化转型
                </p>
                <button onClick={() => setStep('selfCrawl')}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors inline-flex items-center gap-2">
                  <Globe size={16} /> 导入我的账号
                </button>
                <p className="mt-4">
                  <button
                    onClick={handleSetNoSelfAccount}
                    className="text-xs text-ink-disabled hover:text-ink-tertiary transition-colors underline underline-offset-2"
                  >
                    我没有个人账号
                  </button>
                </p>
              </div>
            ) : selfAccount.noAccount ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-surface border border-success-border mb-5">
                  <CheckCircle2 size={28} className="text-success-text" />
                </div>
                <h3 className="text-lg font-medium text-ink-secondary mb-2">已选择：暂无个人账户</h3>
                <p className="text-sm text-ink-disabled mb-6 max-w-md mx-auto">
                  对标分析将以对标账号为主要参照，不再需要个人账号数据。如需更改，可随时导入或更新。
                </p>
                <button
                  onClick={() => setStep('selfCrawl')}
                  className="px-4 py-2 rounded-lg border border-rule text-ink-tertiary hover:text-ink-secondary hover:border-brand-200 text-sm transition-colors inline-flex items-center gap-2"
                >
                  <RefreshCw size={14} /> 改为导入账号
                </button>
              </div>
            ) : selfAccount.aiAnalysis ? (
              <div>
                {/* Summary card */}
                <div className="mb-6 p-5 rounded-xl bg-brand-50 border border-brand-200">
                  <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <User size={14} className="text-brand-600" />{selfAccount.name}
                  </h3>
                  <p className="text-sm text-ink-secondary mb-3">{selfAccount.aiAnalysis.accountSummary}</p>
                  <div className="flex items-center gap-3 text-xs text-ink-disabled">
                    <span>{PLATFORM_OPTIONS[SELF_PLATFORM_OPTIONS.indexOf(selfAccount.platform)] || selfAccount.platform}</span>
                    <span>{selfAccount.videos?.length || 0} 条视频</span>
                    <span>{new Date(selfAccount.crawledAt).toLocaleDateString('zh-CN')} 分析</span>
                  </div>
                </div>

                {/* Quick insight cards */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="p-3 rounded-lg bg-black/[0.02] border border-rule-subtle text-center">
                    <p className="text-xs text-ink-disabled mb-1">内容支柱</p>
                    <p className="text-lg font-bold text-brand-600">{selfAccount.aiAnalysis.contentPillars?.length || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-black/[0.02] border border-rule-subtle text-center">
                    <p className="text-xs text-ink-disabled mb-1">风格特征</p>
                    <p className="text-lg font-bold text-warning-text">{selfAccount.aiAnalysis.styleFeatures?.length || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-black/[0.02] border border-rule-subtle text-center">
                    <p className="text-xs text-ink-disabled mb-1">人设建议</p>
                    <p className="text-sm font-medium text-ink-secondary">
                      {{ keep: '继续现有', optimize: '优化调整', transform: '转型' }[selfAccount.aiAnalysis.personaAdvice?.recommended] || '—'}
                    </p>
                  </div>
                </div>

                <button onClick={() => setStep('selfAnalyze')}
                  className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <Eye size={15} /> 查看完整分析报告
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <Loader2 size={32} className="animate-spin text-ink-disabled mx-auto mb-4" />
                <p className="text-ink-tertiary text-sm">数据已导入，但AI分析不可用</p>
                <button onClick={() => setStep('selfCrawl')} className="mt-4 px-4 py-2 rounded-lg border border-rule text-ink-tertiary text-sm">重新导入</button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

