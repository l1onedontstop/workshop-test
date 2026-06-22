import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import {
  ArrowLeft, Target, Plus, Loader2, Search, ExternalLink,
  ChevronRight, CheckCircle2, AlertCircle, TrendingUp,
  Lightbulb, Zap, BookOpen, Shield, Trash2, Eye, Sparkles, Users
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

  // ── List view ──
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6 border-b border-rule-subtle">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-black/[0.03] text-ink-tertiary">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-white">对标账号</h2>
            <p className="text-xs text-ink-tertiary">
              {accounts.length > 0
                ? `${accounts.length} 个对标 · AI 分析作为打分锚点`
                : '还没有对标账号，导入一个吧'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setStep('import')}
          className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> 导入对标
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {accounts.length === 0 ? (
            <div className="text-center py-20">
              <Target size={48} className="text-ink-disabled mx-auto mb-4" />
              <h3 className="text-lg font-medium text-ink-tertiary mb-2">还没有对标账号</h3>
              <p className="text-sm text-ink-disabled mb-6 max-w-md mx-auto">
                导入你欣赏的同领域账号，AI 会分析他们的内容 pattern，作为你后续预测打分的参照系
              </p>
              <button
                onClick={() => setStep('import')}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors inline-flex items-center gap-2"
              >
                <Plus size={16} /> 导入第一个对标账号
              </button>
            </div>
          ) : (
            <div>
            {/* Cross-account summary */}
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
                        <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-brand-50 border border-brand-200 text-brand-500">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  {crossSummary.recommendedBlend && (
                    <div>
                      <p className="text-[10px] text-ink-disabled mb-1">综合建议</p>
                      <p className="text-xs text-ink-tertiary">{crossSummary.recommendedBlend}</p>
                    </div>
                  )}
                  {crossSummary.whichToLearnMost && (
                    <div className="p-3 rounded-lg bg-black/[0.03] border border-rule-subtle">
                      <p className="text-[10px] text-ink-disabled mb-0.5">最值得优先学</p>
                      <p className="text-xs text-ink-secondary">{crossSummary.whichToLearnMost}</p>
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
                  className="text-left p-5 rounded-xl bg-black/[0.02] border border-rule-subtle hover:border-brand-200 hover:bg-brand-50 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-medium">{a.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/[0.04] border border-rule text-ink-tertiary">
                          {a.platform}
                        </span>
                      </div>
                      {a.aiAnalysis?.accountSummary && (
                        <p className="text-sm text-ink-tertiary line-clamp-2 mb-2">
                          {a.aiAnalysis.accountSummary}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-ink-disabled">
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
                      className="text-ink-disabled group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-1"
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

