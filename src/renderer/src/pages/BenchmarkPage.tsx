import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import {
  ArrowLeft, Target, Plus, Loader2, Search, ExternalLink,
  ChevronRight, CheckCircle2, AlertCircle, TrendingUp,
  Lightbulb, Zap, BookOpen, Shield, Trash2, Eye, Sparkles
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

const PLATFORM_OPTIONS = ['抖音', 'B站', '小红书', '视频号', 'YouTube', '其他']

export default function BenchmarkPage({ onBack }: { onBack: () => void }) {
  const activeProject = useAppStore((s) => s.activeProject)
  const [accounts, setAccounts] = useState<AccountMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'list' | 'import' | 'analyze'>('list')
  const [selectedAccount, setSelectedAccount] = useState<AccountMeta | null>(null)
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
    return <div className="flex items-center justify-center h-full text-white/30">请先创建项目</div>
  }

  // ── Analyze view ──
  if (step === 'analyze' && selectedAccount) {
    const a = selectedAccount
    const ai = a.aiAnalysis
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-4 p-6 border-b border-white/5">
          <button onClick={() => setStep('list')} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-white">{a.name}</h2>
            <p className="text-xs text-white/30">{a.platform} · {new Date(a.importedAt).toLocaleDateString('zh-CN')}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {ai ? (
              <>
                <div className="p-5 rounded-xl bg-brand-500/5 border border-brand-500/10">
                  <h3 className="text-white font-medium mb-2">账号定位</h3>
                  <p className="text-white/60 text-sm">{ai.accountSummary}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <h4 className="text-xs text-white/40 mb-2 flex items-center gap-1.5">
                      <Target size={12} /> 内容支柱
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(ai.contentPillars || []).map((p, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-purple-500/10 border border-purple-500/20 text-purple-300">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <h4 className="text-xs text-white/40 mb-2 flex items-center gap-1.5">
                      <Zap size={12} /> 风格特征
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(ai.styleFeatures || []).map((s, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-yellow-500/10 border border-yellow-500/20 text-yellow-300">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Learnable hook patterns */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <h4 className="text-xs text-white/40 mb-3 flex items-center gap-1.5">
                    <Lightbulb size={12} /> 可借鉴的钩子模式
                  </h4>
                  <div className="space-y-2">
                    {(ai.learnableHookPatterns || ai.hookPatterns || []).map((h: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-white/60">
                        <ChevronRight size={14} className="text-brand-400 mt-0.5 shrink-0" />
                        {h}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended hook patterns */}
                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                  <h4 className="text-xs text-green-400/70 mb-3 flex items-center gap-1.5">
                    <Sparkles size={12} /> 推荐你尝试的钩子模式
                  </h4>
                  <div className="space-y-2">
                    {(ai.recommendedHookPatterns || []).map((h: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-white/60">
                        <ChevronRight size={14} className="text-green-400 mt-0.5 shrink-0" />
                        {h}
                      </div>
                    ))}
                  </div>
                  {(!ai.recommendedHookPatterns || ai.recommendedHookPatterns.length === 0) && (
                    <p className="text-xs text-white/30">基于该账号风格，AI 暂未生成推荐钩子。导入更多对标账号后推荐会更精准。</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                    <h4 className="text-xs text-green-400/70 mb-2 flex items-center gap-1.5">
                      <CheckCircle2 size={12} /> 可借鉴之处
                    </h4>
                    <ul className="space-y-1.5">
                      {(ai.learnablePoints || []).map((p, i) => (
                        <li key={i} className="text-xs text-white/50 flex items-start gap-1.5">
                          <span className="text-green-400 mt-0.5">•</span> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex-1 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                    <h4 className="text-xs text-red-400/70 mb-2 flex items-center gap-1.5">
                      <AlertCircle size={12} /> 注意风险
                    </h4>
                    <ul className="space-y-1.5">
                      {(ai.riskWarnings || []).map((w, i) => (
                        <li key={i} className="text-xs text-white/50 flex items-start gap-1.5">
                          <span className="text-red-400 mt-0.5">•</span> {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {ai.audienceInsight && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <h4 className="text-xs text-white/40 mb-2 flex items-center gap-1.5">
                      <Users size={12} /> 受众洞察
                    </h4>
                    <p className="text-sm text-white/60">{ai.audienceInsight}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-white/30">暂无 AI 分析数据</div>
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
        <div className="flex items-center gap-4 p-6 border-b border-white/5">
          <button onClick={() => { setStep('list'); setError('') }} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-lg font-semibold text-white">导入对标账号</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-lg mx-auto space-y-5">
            <div className="text-center mb-6">
              <Target size={36} className="text-yellow-400/50 mx-auto mb-3" />
              <p className="text-sm text-white/40">
                对标账号是评分校准的参照系。AI 会分析账号的内容 pattern，作为后续打分的锚点。
              </p>
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1.5 block">账号名称 *</label>
              <input
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder="输入对标账号名称"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/12 focus:outline-none focus:border-brand-500/30"
              />
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1.5 block">平台</label>
              <div className="flex gap-2 flex-wrap">
                {PLATFORM_OPTIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setImportPlatform(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      importPlatform === p
                        ? 'bg-brand-500/10 border-brand-500/30 text-brand-300'
                        : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/60'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1.5 block">账号链接</label>
              <input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/12 focus:outline-none focus:border-brand-500/30"
              />
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1.5 block">补充说明（可选）</label>
              <textarea
                value={importNotes}
                onChange={(e) => setImportNotes(e.target.value)}
                placeholder="你想从这个账号学什么？为什么选它？"
                rows={3}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/12 resize-none focus:outline-none focus:border-brand-500/30"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-2.5">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={!importName.trim() || loading}
              className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-30 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? 'AI 分析中...' : '开始分析'}
            </button>

            <p className="text-xs text-white/15 text-center">
              AI 会根据账号名和平台特征进行内容 pattern 分析
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── List view ──
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6 border-b border-white/5">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-white">对标账号</h2>
            <p className="text-xs text-white/30">
              {accounts.length > 0
                ? `${accounts.length} 个对标 · AI 分析作为打分锚点`
                : '还没有对标账号，导入一个吧'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setStep('import')}
          className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> 导入对标
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {accounts.length === 0 ? (
            <div className="text-center py-20">
              <Target size={48} className="text-white/10 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white/40 mb-2">还没有对标账号</h3>
              <p className="text-sm text-white/20 mb-6 max-w-md mx-auto">
                导入你欣赏的同领域账号，AI 会分析他们的内容 pattern，作为你后续预测打分的参照系
              </p>
              <button
                onClick={() => setStep('import')}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors inline-flex items-center gap-2"
              >
                <Plus size={16} /> 导入第一个对标账号
              </button>
            </div>
          ) : (
            <div>
            {/* Cross-account summary */}
            {crossSummary && crossSummary.commonPatterns && crossSummary.commonPatterns.length > 0 && (
              <div className="mb-6 p-5 rounded-xl bg-purple-500/5 border border-purple-500/10">
                <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-purple-400" />
                  跨账号总结（{crossSummary.accounts.length} 个对标）
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-white/25 mb-1.5">共性 pattern</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(crossSummary.commonPatterns || []).map((p: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-purple-500/10 border border-purple-500/20 text-purple-300">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  {crossSummary.recommendedBlend && (
                    <div>
                      <p className="text-[10px] text-white/25 mb-1">综合建议</p>
                      <p className="text-xs text-white/50">{crossSummary.recommendedBlend}</p>
                    </div>
                  )}
                  {crossSummary.whichToLearnMost && (
                    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                      <p className="text-[10px] text-white/25 mb-0.5">最值得优先学</p>
                      <p className="text-xs text-white/60">{crossSummary.whichToLearnMost}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-4">
              {accounts.map((a, i) => (
                <button
                  key={i}
                  onClick={() => handleAnalyze(a)}
                  className="text-left p-5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-brand-500/20 hover:bg-brand-500/[0.02] transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-medium">{a.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/30">
                          {a.platform}
                        </span>
                      </div>
                      {a.aiAnalysis?.accountSummary && (
                        <p className="text-sm text-white/40 line-clamp-2 mb-2">
                          {a.aiAnalysis.accountSummary}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-white/20">
                        <span>
                          {new Date(a.importedAt).toLocaleDateString('zh-CN')} 导入
                        </span>
                        {a.aiAnalysis?.styleFeatures && (
                          <span>{a.aiAnalysis.styleFeatures.length} 个风格特征</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      className="text-white/15 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1"
                    />
                  </div>
                </button>
              ))}
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Users({ size, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
