import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { extractJSON } from '../services/parseAIResponse'
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Copy,
  CheckCircle2,
  FileText,
  ExternalLink,
  AlertCircle,
  Clock,
  Tag,
  Image,
  Send
} from 'lucide-react'

interface PublishPack {
  titles: string[]
  descriptions: { short: string; long: string }
  tags: string[]
  bestPublishTime: string
  coverTexts: string[]
}

interface ScriptEntry {
  name: string
  path: string
}

export default function PublishPage({ onBack }: { onBack: () => void }) {
  const activeProject = useAppStore((s) => s.activeProject)
  const refreshActiveProject = useAppStore((s) => s.refreshActiveProject)

  const [scripts, setScripts] = useState<ScriptEntry[]>([])
  const [selectedScript, setSelectedScript] = useState<ScriptEntry | null>(null)
  const [scriptContent, setScriptContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pack, setPack] = useState<PublishPack | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // Load scripts list
  useEffect(() => {
    if (!activeProject) return
    window.api.listScripts(activeProject.path).then((list) => {
      setScripts(list as unknown as ScriptEntry[])
    }).catch(() => {})
  }, [activeProject])

  // Load selected script
  const handleSelectScript = useCallback(async (entry: ScriptEntry) => {
    setSelectedScript(entry)
    setPack(null)
    setError('')
    try {
      const content = await window.api.readFile(entry.path)
      setScriptContent(content as string)
    } catch {
      setError('无法读取脚本文件')
    }
  }, [])

  // Generate publish pack
  const handleGenerate = useCallback(async () => {
    if (!scriptContent || !activeProject) return
    setLoading(true)
    setError('')
    setPack(null)

    try {
      // Extract just the script body (before the --- scoring section)
      const scriptBody = scriptContent.split('\n---\n')[0].replace(/^# .*\n/, '').trim()
      const raw = await window.api.generatePublishPack(scriptBody, {
        topic: selectedScript?.name?.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}_\d{3}_/, '') || '',
        industry: activeProject?.opts?.industry || '',
        audience: activeProject?.opts?.targetAudience || ''
      })
      const parsed = parsePublishPack(raw as string)
      if (!parsed) {
        setError('AI 返回格式异常，请重试')
      } else {
        setPack(parsed)
        // Log activity
        await window.api.logActivity(activeProject.path, {
          type: 'script_published',
          timestamp: new Date().toISOString(),
          label: `生成发布资料：${selectedScript?.name || '未知脚本'}`,
          detail: '已生成标题、简介、标签、封面文案',
          scriptFile: selectedScript?.name,
          navTarget: 'publish'
        })
        // Update state
        await window.api.updateProjectState(activeProject.path, {
          totalPublished: (activeProject.state.totalPublished || 0) + 1
        })
        await refreshActiveProject()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败')
    } finally {
      setLoading(null)
    }
  }, [scriptContent, activeProject, selectedScript, refreshActiveProject])

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 1500)
  }

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
        <h1 className="text-lg font-semibold text-white">发布助手</h1>
        <span className="text-xs text-white/20">一键生成发布资料包</span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Script selector */}
        <div className="w-72 border-r border-white/5 p-4 overflow-y-auto shrink-0">
          <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
            选择脚本
          </h3>
          {scripts.length === 0 ? (
            <div className="text-center py-8">
              <FileText size={24} className="text-white/10 mx-auto mb-2" />
              <p className="text-white/25 text-xs">还没有保存的脚本</p>
              <p className="text-white/15 text-xs mt-1">先去创作工作台写一条</p>
            </div>
          ) : (
            <div className="space-y-1">
              {scripts.map((s) => (
                <button
                  key={s.name}
                  onClick={() => handleSelectScript(s)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors ${
                    selectedScript?.name === s.name
                      ? 'bg-brand-500/15 text-brand-300 border border-brand-500/20'
                      : 'text-white/50 hover:bg-white/[0.03] hover:text-white/70 border border-transparent'
                  }`}
                >
                  <div className="truncate font-medium">{s.name}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Publish pack result */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedScript ? (
            <div className="flex flex-col items-center justify-center h-full text-white/20">
              <Send size={40} className="mb-3 opacity-30" />
              <p className="text-sm">从左侧选择一个脚本</p>
              <p className="text-xs mt-1 opacity-60">AI 将为你生成全套发布资料</p>
            </div>
          ) : !pack ? (
            <div className="flex flex-col items-center gap-4 mt-20">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] text-center max-w-md">
                <p className="text-white/60 text-sm mb-1">已选择：{selectedScript.name}</p>
                <p className="text-white/30 text-xs mb-4">
                  {scriptContent.slice(0, 100)}...
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-30 text-white text-sm font-medium transition-all flex items-center gap-2 mx-auto"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  生成发布资料包
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 max-w-2xl">
              {/* Titles */}
              <section>
                <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                  <ExternalLink size={14} className="text-green-400" />
                  备选标题（5个）
                </h3>
                <div className="space-y-2">
                  {pack.titles.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.02] border border-white/[0.04] group hover:border-green-500/20 transition-colors"
                    >
                      <span className="text-[10px] text-white/20 font-mono w-4 shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm text-white/80 flex-1">{t}</span>
                      <button
                        onClick={() => handleCopy(t, i)}
                        className="p-1.5 rounded-md hover:bg-white/5 text-white/20 hover:text-white/60 transition-colors shrink-0"
                      >
                        {copiedIndex === i ? (
                          <CheckCircle2 size={14} className="text-green-400" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Descriptions */}
              <section>
                <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                  <FileText size={14} className="text-blue-400" />
                  简介/文案
                </h3>
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/40">短文案（抖音/快手）</span>
                      <button
                        onClick={() => handleCopy(pack.descriptions.short, -1)}
                        className="p-1 rounded hover:bg-white/5 text-white/20 hover:text-white/60 transition-colors"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">
                      {pack.descriptions.short}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/40">长文案（视频号/B站/小红书）</span>
                      <button
                        onClick={() => handleCopy(pack.descriptions.long, -2)}
                        className="p-1 rounded hover:bg-white/5 text-white/20 hover:text-white/60 transition-colors"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">
                      {pack.descriptions.long}
                    </p>
                  </div>
                </div>
              </section>

              {/* Tags */}
              <section>
                <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                  <Tag size={14} className="text-yellow-400" />
                  高热话题标签
                </h3>
                <div className="flex flex-wrap gap-2">
                  {pack.tags.map((t, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-white/60"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => handleCopy(pack.tags.map((t) => `#${t}`).join(' '), -3)}
                  className="mt-3 flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 transition-colors"
                >
                  {copiedIndex === -3 ? (
                    <>
                      <CheckCircle2 size={12} className="text-green-400" /> 已复制
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> 一键复制所有标签
                    </>
                  )}
                </button>
              </section>

              {/* Best publish time */}
              <section>
                <h3 className="text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                  <Clock size={14} className="text-purple-400" />
                  最佳发布时间
                </h3>
                <p className="text-sm text-white/50 bg-white/[0.02] border border-white/[0.04] rounded-lg px-4 py-3">
                  {pack.bestPublishTime}
                </p>
              </section>

              {/* Cover texts */}
              <section>
                <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                  <Image size={14} className="text-pink-400" />
                  封面文案建议
                </h3>
                <div className="space-y-2">
                  {pack.coverTexts.map((ct, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                    >
                      <span className="text-[10px] text-white/20 font-mono w-4 shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm text-white/80 font-medium flex-1">{ct}</span>
                      <button
                        onClick={() => handleCopy(ct, i + 100)}
                        className="p-1.5 rounded-md hover:bg-white/5 text-white/20 hover:text-white/60 transition-colors shrink-0"
                      >
                        {copiedIndex === i + 100 ? (
                          <CheckCircle2 size={14} className="text-green-400" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function parsePublishPack(raw: string): PublishPack | null {
  const parsed = extractJSON<PublishPack>(raw, 'titles')
  if (!parsed || !parsed.titles || !parsed.descriptions || !parsed.tags) return null
  return parsed
}
