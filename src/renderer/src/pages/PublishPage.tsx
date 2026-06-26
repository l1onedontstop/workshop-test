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
          label: '发布内容包已生成',
          detail: selectedScript?.name || '未知脚本',
          scriptFile: selectedScript?.name,
          navTarget: 'publish'
        })
        // Update cadence buffer via publish
        const videoId = selectedScript?.name?.replace('.md', '') || `publish_${Date.now()}`
        await window.api.cadencePublish(activeProject.path, videoId, { url: '', platform: '' })
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
      <div className="flex items-center justify-center h-full text-ink-tertiary">
        <p>请先创建项目</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-rule-subtle">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-black/[0.03] text-ink-tertiary hover:text-ink-secondary transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold text-white">发布助手</h1>
        <span className="text-xs text-ink-disabled">一键生成发布资料包</span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Script selector */}
        <div className="w-72 border-r border-rule-subtle p-4 overflow-y-auto shrink-0">
          <h3 className="text-xs font-medium text-ink-tertiary uppercase tracking-wider mb-3">
            选择脚本
          </h3>
          {scripts.length === 0 ? (
            <div className="text-center py-8">
              <FileText size={24} className="text-ink-disabled mx-auto mb-2" />
              <p className="text-ink-disabled text-xs">还没有保存的脚本</p>
              <p className="text-ink-disabled text-xs mt-1">先去创作工作台写一条</p>
            </div>
          ) : (
            <div className="space-y-1">
              {scripts.map((s) => (
                <button
                  key={s.name}
                  onClick={() => handleSelectScript(s)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors ${
                    selectedScript?.name === s.name
                      ? 'bg-brand-100 text-brand-500 border border-brand-200'
                      : 'text-ink-tertiary hover:bg-black/[0.03] hover:text-ink-secondary border border-transparent'
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
            <div className="flex flex-col items-center justify-center h-full text-ink-disabled">
              <Send size={40} className="mb-3 opacity-30" />
              <p className="text-sm">从左侧选择一个脚本</p>
              <p className="text-xs mt-1 opacity-60">AI 将为你生成全套发布资料</p>
            </div>
          ) : !pack ? (
            <div className="flex flex-col items-center gap-4 mt-20">
              <div className="p-4 rounded-2xl bg-black/[0.02] border border-rule-subtle text-center max-w-md">
                <p className="text-ink-secondary text-sm mb-1">已选择：{selectedScript.name}</p>
                <p className="text-ink-tertiary text-xs mb-4">
                  {scriptContent.slice(0, 100)}...
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-30 text-white text-sm font-medium transition-all flex items-center gap-2 mx-auto"
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
                <div className="flex items-center gap-2 text-danger-text text-sm">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 max-w-2xl">
              {/* Titles */}
              <section>
                <h3 className="text-sm font-medium text-ink-secondary mb-3 flex items-center gap-2">
                  <ExternalLink size={14} className="text-success-text" />
                  备选标题（5个）
                </h3>
                <div className="space-y-2">
                  {pack.titles.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-black/[0.02] border border-rule-subtle group hover:border-success-border transition-colors"
                    >
                      <span className="text-[10px] text-ink-disabled font-mono w-4 shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm text-ink-primary flex-1">{t}</span>
                      <button
                        onClick={() => handleCopy(t, i)}
                        className="p-1.5 rounded-md hover:bg-black/[0.03] text-ink-disabled hover:text-ink-secondary transition-colors shrink-0"
                      >
                        {copiedIndex === i ? (
                          <CheckCircle2 size={14} className="text-success-text" />
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
                <h3 className="text-sm font-medium text-ink-secondary mb-3 flex items-center gap-2">
                  <FileText size={14} className="text-info-text" />
                  简介/文案
                </h3>
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-black/[0.02] border border-rule-subtle">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-ink-tertiary">短文案（抖音/快手）</span>
                      <button
                        onClick={() => handleCopy(pack.descriptions.short, -1)}
                        className="p-1 rounded hover:bg-black/[0.03] text-ink-disabled hover:text-ink-secondary transition-colors"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                    <p className="text-sm text-ink-secondary leading-relaxed">
                      {pack.descriptions.short}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-black/[0.02] border border-rule-subtle">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-ink-tertiary">长文案（视频号/B站/小红书）</span>
                      <button
                        onClick={() => handleCopy(pack.descriptions.long, -2)}
                        className="p-1 rounded hover:bg-black/[0.03] text-ink-disabled hover:text-ink-secondary transition-colors"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                    <p className="text-sm text-ink-secondary leading-relaxed">
                      {pack.descriptions.long}
                    </p>
                  </div>
                </div>
              </section>

              {/* Tags */}
              <section>
                <h3 className="text-sm font-medium text-ink-secondary mb-3 flex items-center gap-2">
                  <Tag size={14} className="text-warning-text" />
                  高热话题标签
                </h3>
                <div className="flex flex-wrap gap-2">
                  {pack.tags.map((t, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full bg-black/[0.03] border border-rule text-xs text-ink-secondary"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => handleCopy(pack.tags.map((t) => `#${t}`).join(' '), -3)}
                  className="mt-3 flex items-center gap-1.5 text-xs text-ink-tertiary hover:text-ink-secondary transition-colors"
                >
                  {copiedIndex === -3 ? (
                    <>
                      <CheckCircle2 size={12} className="text-success-text" /> 已复制
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
                <h3 className="text-sm font-medium text-ink-secondary mb-2 flex items-center gap-2">
                  <Clock size={14} className="text-brand-600" />
                  最佳发布时间
                </h3>
                <p className="text-sm text-ink-tertiary bg-black/[0.02] border border-rule-subtle rounded-lg px-4 py-3">
                  {pack.bestPublishTime}
                </p>
              </section>

              {/* Cover texts */}
              <section>
                <h3 className="text-sm font-medium text-ink-secondary mb-3 flex items-center gap-2">
                  <Image size={14} className="text-brand-600" />
                  封面文案建议
                </h3>
                <div className="space-y-2">
                  {pack.coverTexts.map((ct, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-black/[0.02] border border-rule-subtle"
                    >
                      <span className="text-[10px] text-ink-disabled font-mono w-4 shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm text-ink-primary font-medium flex-1">{ct}</span>
                      <button
                        onClick={() => handleCopy(ct, i + 100)}
                        className="p-1.5 rounded-md hover:bg-black/[0.03] text-ink-disabled hover:text-ink-secondary transition-colors shrink-0"
                      >
                        {copiedIndex === i + 100 ? (
                          <CheckCircle2 size={14} className="text-success-text" />
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
