import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import SectionCard from '../components/ui/SectionCard'
import BackButton from '../components/ui/BackButton'
import {
  Activity, Clock, Target, Database, BarChart3,
  AlertCircle, Loader2, RefreshCw, AlertTriangle,
  BookOpen
} from 'lucide-react'

// ── Types ───────────────────────────────────────────────────────────

interface BufferState {
  count: number
  color: string
  bufferDays: number
  message: string
  shoots: number
  cadenceDays: number
}

interface ProjectStats {
  name: string
  bufferCount: number
  color: string
  pendingRetros: number
  poolSize?: number
  calibrationSamples?: number
}

interface CadenceReport {
  projects: ProjectStats[]
  summary: string
  generatedAt: string
}

interface PoolEntry {
  id: string
  title: string
  status: string
}

// ── Helpers ──────────────────────────────────────────────────────────

function getConfidence(samples: number): { emoji: string; label: string } {
  if (samples >= 21) return { emoji: '\u{1F535}', label: '高 (±10%)' }
  if (samples >= 11) return { emoji: '\u{1F7E2}', label: '较高 (±15%)' }
  if (samples >= 6) return { emoji: '\u{1F7E2}', label: '中 (±25%)' }
  if (samples >= 3) return { emoji: '\u{1F7E1}', label: '偏低 (±40%)' }
  if (samples >= 1) return { emoji: '\u{1F7E0}', label: '低 (±50%)' }
  return { emoji: '\u{1F534}', label: '极低 (占星级别)' }
}

function getBufferVariant(color: string): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
    red: 'danger',
    orange: 'warning',
    green: 'success',
    blue: 'info',
  }
  return map[color] || 'default'
}

function getCalibrationColor(samples: number): 'red' | 'orange' | 'green' | 'blue' {
  if (samples >= 11) return 'green'
  if (samples >= 6) return 'blue'
  if (samples >= 3) return 'orange'
  return 'red'
}

function formatDate(iso: string): string {
  if (!iso) return 'N/A'
  try {
    return new Date(iso).toISOString().slice(0, 10)
  } catch { return iso }
}

function getTrendFreshness(lastRunAt: string | null): {
  label: string
  colorClass: string
} {
  if (!lastRunAt) {
    return { label: '从未抓取', colorClass: 'text-ink-disabled' }
  }
  const msPerDay = 86400000
  const days = (Date.now() - new Date(lastRunAt).getTime()) / msPerDay
  if (days < 1) {
    return { label: '今天已更新', colorClass: 'text-success-text' }
  }
  const n = Math.floor(days)
  if (n <= 7) {
    return { label: `${n}天前`, colorClass: 'text-ink-secondary' }
  }
  return { label: `${n}天前 — 建议刷新`, colorClass: 'text-warning-text' }
}

// ── Component ────────────────────────────────────────────────────────

export default function StatusPage({ onBack }: { onBack: () => void }) {
  const activeProject = useAppStore((s) => s.activeProject)

  const [buffer, setBuffer] = useState<BufferState | null>(null)
  const [report, setReport] = useState<CadenceReport | null>(null)
  const [poolSize, setPoolSize] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    if (!activeProject) return
    setError('')
    setLoading(true)
    try {
      const [buf, rep] = await Promise.all([
        window.api.cadenceBuffer(activeProject.path),
        window.api.cadenceReport(),
      ])
      setBuffer(buf)
      setReport(rep)
      try {
        const pool: PoolEntry[] = await window.api.poolList(activeProject.path)
        setPoolSize(pool.length)
      } catch {
        setPoolSize(null)
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : '加载节奏状态失败')
    } finally {
      setLoading(false)
    }
  }, [activeProject])

  useEffect(() => {
    if (activeProject) {
      loadData()
    } else {
      setLoading(false)
    }
  }, [activeProject, loadData])

  // ── Guard: no active project ──────────────────────────────────────

  if (!activeProject) {
    return (
      <div className="flex items-center justify-center h-full text-ink-tertiary">
        <div className="text-center space-y-3">
          <AlertCircle size={32} className="mx-auto text-ink-disabled" />
          <p className="text-sm">请先创建或打开一个项目</p>
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm rounded-lg border border-rule bg-app-surface hover:bg-app-elevated transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  // ── Loading state ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-ink-disabled" size={32} />
      </div>
    )
  }

  // ── Error state ───────────────────────────────────────────────────

  if (error) {
    return (
      <div className="h-full flex flex-col p-6 overflow-y-auto">
        <div className="flex items-center gap-4 mb-8">
          <BackButton onClick={onBack} />
          <h1 className="text-xl font-bold text-white">节奏状态</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
          <AlertTriangle size={32} className="text-danger-text/60" />
          <div>
            <p className="text-ink-secondary text-sm mb-1">加载失败</p>
            <p className="text-ink-tertiary text-xs max-w-md">{error}</p>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 text-sm rounded-lg border border-rule bg-app-surface hover:bg-app-elevated transition-colors flex items-center gap-2"
          >
            <RefreshCw size={14} />
            重试
          </button>
        </div>
      </div>
    )
  }

  // ── Derived values ────────────────────────────────────────────────

  const bufferVariant = buffer ? getBufferVariant(buffer.color) : 'default'
  const currentProjectStats = report?.projects?.find(
    (p) => p.name === activeProject.name
  )
  const pendingRetros = currentProjectStats?.pendingRetros ?? 0
  const calibrationSamples = currentProjectStats?.calibrationSamples ?? 0
  const confidence = getConfidence(calibrationSamples)
  const calColor = getCalibrationColor(calibrationSamples)
  const totalPool = poolSize ?? currentProjectStats?.poolSize ?? 0
  const lastTrendsRunAt = (currentProjectStats as any)?.lastTrendsRunAt ?? null
  const trendFreshness = getTrendFreshness(lastTrendsRunAt)

  // ── Health summary ────────────────────────────────────────────────

  const healthLines: { label: string; colorClass?: string; key: string }[] = []
  if (buffer) {
    healthLines.push({ label: `Buffer: ${buffer.message}`, key: 'buffer' })
  }
  if (pendingRetros > 0) {
    healthLines.push({ label: `Retro债务: ${pendingRetros}条`, key: 'retro' })
  }
  if (calibrationSamples > 0) {
    healthLines.push({ label: `校准: ${calibrationSamples}/5 → ${calibrationSamples >= 5 ? '校准完成' : '校准模式'}`, key: 'calib' })
  } else {
    healthLines.push({ label: '校准: 尚未开始', key: 'calib' })
  }
  if (report?.generatedAt) {
    healthLines.push({ label: `上次报告: ${formatDate(report.generatedAt)}`, key: 'report' })
  }
  healthLines.push({ label: `热点新鲜度: ${trendFreshness.label}`, colorClass: trendFreshness.colorClass, key: 'trends' })

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <BackButton onClick={onBack} />
        <h1 className="text-xl font-bold text-white">节奏状态</h1>
        {report?.generatedAt && (
          <span className="text-xs text-ink-disabled ml-2">
            {formatDate(report.generatedAt)}
          </span>
        )}
        <button
          onClick={loadData}
          className="ml-auto p-2 rounded-lg hover:bg-black/[0.04] transition-colors"
          title="刷新"
        >
          <RefreshCw size={14} className="text-ink-tertiary" />
        </button>
      </div>

      {/* Grid: 2x2 cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Buffer Status */}
        <SectionCard
          icon={<Database size={14} />}
          title="Buffer 状态"
          color={buffer?.color === 'red' ? 'red' : buffer?.color === 'orange' ? 'orange' : buffer?.color === 'blue' ? 'blue' : 'green'}
        >
          {buffer ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={bufferVariant}>
                  {buffer.message}
                </Badge>
              </div>
              <p className="text-xs text-ink-secondary">
                buffer = {buffer.bufferDays}天 | 队列 {buffer.shoots} 条 | 节奏 {buffer.cadenceDays}天/条
              </p>
              {buffer.bufferDays <= 0 && (
                <p className="text-xs text-danger-text font-medium">今天必须拍</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-ink-disabled">N/A</p>
          )}
        </SectionCard>

        {/* Pending Retros */}
        <SectionCard
          icon={<Clock size={14} />}
          title="待复盘"
          color={pendingRetros > 3 ? 'red' : pendingRetros > 0 ? 'orange' : 'green'}
        >
          {pendingRetros > 0 ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold">{pendingRetros} 条到期</p>
              {report?.projects?.some((p) => p.pendingRetros > 0) && (
                <p className="text-xs text-ink-secondary">
                  {report.projects
                    .filter((p) => p.pendingRetros > 0)
                    .map((p) => `${p.name} (${p.pendingRetros})`)
                    .join(' / ')}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-ink-disabled">暂无待复盘</p>
          )}
        </SectionCard>

        {/* Calibration Pool */}
        <SectionCard
          icon={<Target size={14} />}
          title="校准池"
          color={calColor}
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold">{calibrationSamples} 样本</p>
            <p className="text-xs text-ink-secondary">
              {confidence.emoji} {confidence.label}
            </p>
            {calibrationSamples < 5 && (
              <p className="text-xs text-warning-text">
                需 {5 - calibrationSamples} 条完成校准
              </p>
            )}
          </div>
        </SectionCard>

        {/* Topic Pool */}
        <SectionCard
          icon={<BookOpen size={14} />}
          title="选题池"
          color={totalPool >= 10 ? 'green' : totalPool >= 5 ? 'blue' : 'yellow'}
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold">{totalPool} 条候选</p>
            {totalPool < 5 && (
              <p className="text-xs text-warning-text">建议补充选题</p>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Project Overview */}
      <Card level="default" className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={14} className="text-ink-disabled" />
          <h2 className="text-xs font-medium text-ink-secondary">全项目概览</h2>
        </div>
        {report?.projects && report.projects.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {report.projects.map((proj, i) => {
              const v = getBufferVariant(proj.color || 'green')
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-rule bg-app-surface text-sm"
                >
                  <span className="font-medium text-ink-primary">{proj.name}</span>
                  <Badge variant={v}>
                    {proj.bufferCount}条
                  </Badge>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-ink-disabled">暂无项目数据</p>
        )}
      </Card>

      {/* Health Summary */}
      <Card level="default" className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={14} className="text-ink-disabled" />
          <h2 className="text-xs font-medium text-ink-secondary">健康度</h2>
        </div>
        <div className="space-y-1.5">
          {healthLines.length > 0 ? (
            healthLines.map((line) => (
              <p key={line.key} className={`text-sm ${line.colorClass || 'text-ink-primary'}`}>
                {line.label}
              </p>
            ))
          ) : (
            <p className="text-sm text-ink-disabled">暂无数据</p>
          )}
        </div>
      </Card>
    </div>
  )
}
