import { Target, Wand2, X, FileText, Sparkles, Undo2, CheckCircle2, AlertCircle, Lightbulb } from 'lucide-react'
import Button from './ui/Button'
import Badge from './ui/Badge'
import Card from './ui/Card'

interface ScoreResult {
  scores: {
    hook: number
    rhythm: number
    sharpness: number
    utility: number
    emotion: number
    structure: number
    expression: number
  }
  total: number
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  overall: string
}

interface OptimizeDiffViewProps {
  script: string
  optimizedScript: string
  scoreResult: ScoreResult | null
  optimizeIteration: number
  optimizeScores: number[]
  optimizing: boolean
  onAccept: () => void
  onContinue: () => void
  onDiscard: () => void
}

// ── Section Card Component ──

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
    purple: 'border-brand-200 bg-brand-50',
    blue: 'border-info-border bg-info-surface',
    green: 'border-success-border bg-success-surface',
    orange: 'border-warning-border bg-warning-surface',
    red: 'border-danger-border bg-danger-surface',
    yellow: 'border-warning-border bg-warning-surface',
    cyan: 'border-info-border bg-info-surface'
  }
  const textColorMap: Record<string, string> = {
    purple: 'text-brand-600',
    blue: 'text-info-text',
    green: 'text-success-text',
    orange: 'text-warning-text',
    red: 'text-danger-text',
    yellow: 'text-warning-text',
    cyan: 'text-info-text'
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

export default function OptimizeDiffView({
  script,
  optimizedScript,
  scoreResult,
  optimizeIteration,
  optimizeScores,
  optimizing,
  onAccept,
  onContinue,
  onDiscard
}: OptimizeDiffViewProps) {
  return (
    <div className="border-t-2 border-brand-200">
      {/* Header */}
      <div className="px-6 py-3 bg-gradient-to-r from-brand-50 to-transparent border-b border-brand-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
            <Wand2 size={16} className="text-brand-600" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-ink-primary">AI 优化结果</span>
            <Badge className="text-[10px] bg-brand-100 text-brand-600 border-brand-200 rounded-full px-2">
              第 {optimizeIteration} 轮
            </Badge>
            {optimizeScores.length > 0 && (
              <span className="text-[10px] text-ink-disabled font-mono">
                {optimizeScores.map((s, i) => (
                  <span key={i}>
                    {i > 0 && <span className="text-brand-400"> → </span>}
                    <span className={i === optimizeScores.length - 1 ? 'text-brand-600 font-semibold' : ''}>{s.toFixed(1)}</span>
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDiscard}
          icon={<X size={16} />}
          title="收起对比视图"
        />
      </div>

      {/* Side-by-side card layout */}
      <div className="p-4 max-h-[520px] overflow-y-auto">
        {/* Optimization focus bar */}
        {scoreResult && (scoreResult.weaknesses.length > 0 || scoreResult.suggestions.length > 0) && (
          <SectionCard icon={<Target size={14} />} title="优化方向（基于最近一次评分）" color="orange" fullWidth>
            <div className="space-y-1.5">
              {scoreResult.weaknesses.slice(0, 3).map((w, i) => (
                <p key={i} className="text-xs text-ink-secondary flex items-start gap-1.5 leading-relaxed">
                  <AlertCircle size={11} className="text-warning-text mt-0.5 shrink-0" />
                  <span>{w}</span>
                </p>
              ))}
              {scoreResult.suggestions.slice(0, 2).map((s, i) => (
                <p key={`s-${i}`} className="text-xs text-ink-secondary flex items-start gap-1.5 leading-relaxed">
                  <Lightbulb size={11} className="text-brand-500 mt-0.5 shrink-0" />
                  <span>{s}</span>
                </p>
              ))}
              {optimizeIteration > 1 && (
                <p className="text-[10px] text-ink-disabled italic mt-1">
                  ⚠ 已优化 {optimizeIteration} 轮，建议接受后重新评分以获取新的优化方向
                </p>
              )}
            </div>
          </SectionCard>
        )}

        {/* Change summary bar */}
        <div className="flex items-center justify-center gap-4 px-4 py-2 mb-3 bg-black/[0.02] rounded-lg border border-rule-subtle text-[10px] text-ink-disabled">
          <span>字数：{script.length} → <span className="text-brand-600 font-medium">{optimizedScript.length}</span></span>
          <span className="text-rule">|</span>
          <span>段落：{script.split('\n\n').filter(Boolean).length} → <span className="text-brand-600 font-medium">{optimizedScript.split('\n\n').filter(Boolean).length}</span></span>
          <span className="text-rule">|</span>
          <span className="text-brand-600">
            <Wand2 size={10} className="inline mr-0.5" />
            {optimizedScript.length > script.length ? '扩充' : optimizedScript.length < script.length ? '精简' : '保持长度'}
            {Math.abs(optimizedScript.length - script.length) > 0 ? ` ${Math.abs(optimizedScript.length - script.length)}字` : ''}
          </span>
        </div>

        {/* Side-by-side: Original (left) | Optimized (right) */}
        <div className="grid grid-cols-2 gap-3">
          <SectionCard icon={<FileText size={15} />} title="原始脚本" color="orange" fullWidth>
            <div className="text-sm text-ink-secondary leading-7 whitespace-pre-wrap font-sans max-h-[380px] overflow-y-auto">
              {script}
            </div>
          </SectionCard>
          <SectionCard icon={<Sparkles size={15} />} title="AI 优化版" color="green" fullWidth>
            <div className="text-sm text-ink-primary leading-7 whitespace-pre-wrap font-sans max-h-[380px] overflow-y-auto">
              {optimizedScript}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-6 py-3 border-t border-rule flex items-center justify-between bg-black/[0.01]">
        <Button
          variant="ghost"
          size="md"
          onClick={onDiscard}
          icon={<Undo2 size={15} />}
          className="text-ink-tertiary hover:text-danger-text"
        >
          放弃，保留原文
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={onContinue}
            disabled={optimizing}
            loading={optimizing}
            icon={optimizing ? undefined : <Wand2 size={15} />}
          >
            {optimizing ? '优化中...' : '继续优化'}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onAccept}
            icon={<CheckCircle2 size={15} />}
            title="接受优化版本并自动重新评分"
          >
            接受并重新打分
          </Button>
        </div>
      </div>
    </div>
  )
}
