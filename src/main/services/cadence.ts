/**
 * Cadence Protocol — Buffer 节奏系统
 *
 * Inspired by cheat-on-content cadence-protocol.
 * Tracks "shot vs published" state with 4-color thresholds.
 * Provides SessionStart auto-report for user orientation.
 *
 * Buffer formula: buffer_days = shoots.length × target_publish_cadence_days
 * Colors: red(<1d) orange(1-2d) green(3-5d) blue(>5d)
 */

import { ipcMain } from 'electron'
import { join } from 'path'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { WORKSPACE_ROOT, ensureDir, readProjectState, writeProjectState } from './project'
import { info } from './logger'

// ── Buffer color thresholds (buffer_days = count × cadence_days) ──

const DEFAULT_CADENCE_DAYS = 3
const RED_THRESHOLD = 1       // buffer_days < 1  → red
const ORANGE_THRESHOLD = 2    // buffer_days 1-2 → orange
const GREEN_THRESHOLD = 5     // buffer_days 3-5 → green
// buffer_days > 5 → blue

function getProjectCadenceDays(projectPath: string): number {
  const state = readProjectState(projectPath)
  if (!state?.state?.targetPublishCadenceDays) return DEFAULT_CADENCE_DAYS
  const v = Number(state.state.targetPublishCadenceDays)
  return v > 0 ? v : DEFAULT_CADENCE_DAYS
}

export function getBufferColor(count: number, cadenceDays?: number): 'red' | 'orange' | 'green' | 'blue' {
  const days = count * (cadenceDays || DEFAULT_CADENCE_DAYS)
  if (days < RED_THRESHOLD) return 'red'
  if (days <= ORANGE_THRESHOLD) return 'orange'
  if (days <= GREEN_THRESHOLD) return 'green'
  return 'blue'
}

export function getBufferStatus(projectPath: string) {
  const state = readProjectState(projectPath)
  if (!state) return { count: 0, color: 'red' as const, bufferDays: 0, shoots: [], message: '未找到项目' }

  const shoots = state.state?.shoots || []
  const count = shoots.filter((s: any) => !s.published).length
  const cadenceDays = getProjectCadenceDays(projectPath)
  const bufferDays = count * cadenceDays
  const color = getBufferColor(count, cadenceDays)

  const messages: Record<string, string> = {
    red: `🔴 库存告急！buffer = ${bufferDays}天，今天必须拍`,
    orange: `🟠 库存偏低，buffer = ${bufferDays}天，建议拍摄 1-2 条`,
    green: `🟢 库存充足，buffer = ${bufferDays}天，节奏稳定`,
    blue: `🔵 库存积压！buffer = ${bufferDays}天，暂停拍摄，先发布+复盘`
  }

  return { count, color, bufferDays, shoots, message: messages[color], cadenceDays }
}

// ── Shoot (拍了但没发) ──

export function registerShoot(
  projectPath: string,
  videoId: string,
  scriptFile: string,
  metadata?: { predictionFile?: string; scriptsPath?: string; adHoc?: boolean }
) {
  const state = readProjectState(projectPath)
  if (!state) throw new Error('Project not found')
  if (!state.state.shoots) state.state.shoots = []

  state.state.shoots.push({
    id: videoId,
    scriptFile,
    shotAt: new Date().toISOString(),
    published: false,
    prediction_file: metadata?.predictionFile || null,
    scripts_path: metadata?.scriptsPath || null,
    script_consistency: null,
    script_diff_pct: null,
    v2_prediction_written: false,
    script_hash_at_shoot: null,
    ad_hoc: metadata?.adHoc || false
  })
  state.state.bufferCount = state.state.shoots.filter((s: any) => !s.published).length

  // Log activity
  if (!state.state.activities) state.state.activities = []
  state.state.activities.unshift({
    type: 'script_shot',
    timestamp: new Date().toISOString(),
    label: `📹 已拍摄：${scriptFile}`,
    scriptFile
  })
  if (state.state.activities.length > 50) state.state.activities = state.state.activities.slice(0, 50)

  writeProjectState(projectPath, state)
  return state
}

// ── Publish (已发，buffer -1) ──

export function registerPublish(
  projectPath: string,
  videoId: string,
  publishData: { url?: string; platform?: string; predictionFile?: string }
) {
  const state = readProjectState(projectPath)
  if (!state) throw new Error('Project not found')

  const shoots = state.state.shoots || []
  const idx = shoots.findIndex((s: any) => s.id === videoId)
  if (idx >= 0) {
    shoots[idx].published = true
    shoots[idx].publishedAt = new Date().toISOString()
    if (publishData.url) shoots[idx].url = publishData.url
    if (publishData.platform) shoots[idx].platform = publishData.platform
  }

  state.state.totalPublished = (state.state.totalPublished || 0) + 1
  state.state.bufferCount = Math.max(0, shoots.filter((s: any) => !s.published).length)

  // Track pending retros
  if (publishData.predictionFile) {
    if (!state.state.pending_retros) state.state.pending_retros = []
    if (!state.state.pending_retros.includes(publishData.predictionFile)) {
      state.state.pending_retros.push(publishData.predictionFile)
    }
  }

  state.state.activities.unshift({
    type: 'script_published',
    timestamp: new Date().toISOString(),
    label: `🚀 已发布：${videoId}`,
    detail: publishData.url || ''
  })
  if (state.state.activities.length > 50) state.state.activities = state.state.activities.slice(0, 50)

  writeProjectState(projectPath, state)
  return state
}

// ── SessionStart report ──

export function generateSessionReport() {
  ensureDir(WORKSPACE_ROOT)
  const dirs = readdirSync(WORKSPACE_ROOT, { withFileTypes: true })
  const reports: any[] = []

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue
    const projectPath = join(WORKSPACE_ROOT, dir.name)
    const state = readProjectState(projectPath)
    if (!state) continue

    const buffer = getBufferStatus(projectPath)

    // Check due retros
    let dueRetros = 0
    let pendingRetrosCount = (state.state?.pending_retros || []).length
    const predDir = join(projectPath, 'predictions')
    if (existsSync(predDir)) {
      const files = readdirSync(predDir).filter(f => f.endsWith('.json'))
      for (const f of files) {
        try {
          const data = JSON.parse(readFileSync(join(predDir, f), 'utf-8'))
          if (data.status === 'retro_completed') continue
          if (data.status === 'predicted' && data.publishedAt) {
            const publishedDate = new Date(data.publishedAt)
            const daysSincePublish = (Date.now() - publishedDate.getTime()) / 86400000
            if (daysSincePublish >= 3) dueRetros++
          }
        } catch {}
      }
    }

    // Derive confidence from calibration samples
    const calibrationSamples = state.state?.calibrationSamples || 0
    let confidence = '🟠 极低'
    if (calibrationSamples >= 21) confidence = '🔵 高 (±10%)'
    else if (calibrationSamples >= 11) confidence = '🟢 较高 (±15%)'
    else if (calibrationSamples >= 6) confidence = '🟢 中 (±25%)'
    else if (calibrationSamples >= 3) confidence = '🟡 偏低 (±40%)'
    else if (calibrationSamples >= 1) confidence = '🟠 低 (±50%)'

    reports.push({
      projectName: state.name,
      projectPath,
      phase: state.state?.phase || 'onboarding',
      buffer: {
        count: buffer.count,
        color: buffer.color,
        bufferDays: buffer.bufferDays,
        cadenceDays: buffer.cadenceDays,
        message: buffer.message
      },
      stats: {
        totalPredicted: state.state?.totalPredicted || 0,
        totalPublished: state.state?.totalPublished || 0,
        dueRetros,
        pendingRetros: pendingRetrosCount,
        calibrationSamples,
        confidence
      },
      mode: calibrationSamples >= 5 ? 'calibration' : 'cold-start'
    })
  }

  const redCount = reports.filter(r => r.buffer.color === 'red').length
  const orangeCount = reports.filter(r => r.buffer.color === 'orange').length
  const blueCount = reports.filter(r => r.buffer.color === 'blue').length
  const retroCount = reports.filter(r => r.stats.dueRetros > 0).length

  const summaryParts: string[] = []
  if (reports.length === 0) {
    summaryParts.push('暂无项目，去创建一个吧')
  } else {
    summaryParts.push(`${reports.length} 个项目`)
    if (redCount > 0) summaryParts.push(`${redCount} 个库存告急`)
    if (orangeCount > 0) summaryParts.push(`${orangeCount} 个库存偏低`)
    if (blueCount > 0) summaryParts.push(`${blueCount} 个库存积压`)
    if (retroCount > 0) summaryParts.push(`${retroCount} 个待复盘`)
  }

  return {
    projects: reports,
    summary: summaryParts.join(' · '),
    generatedAt: new Date().toISOString()
  }
}

// ── IPC ──

export function registerCadenceHandlers(): void {
  ipcMain.handle('cadence:buffer', async (_e, projectPath: string) => getBufferStatus(projectPath))
  ipcMain.handle('cadence:shoot', async (_e, projectPath: string, videoId: string, scriptFile: string, metadata?: any) => {
    info('cadence', `Shot registered: ${scriptFile}`)
    return registerShoot(projectPath, videoId, scriptFile, metadata)
  })
  ipcMain.handle('cadence:publish', async (_e, projectPath: string, videoId: string, publishData: any) => {
    info('cadence', `Published: ${videoId}`)
    return registerPublish(projectPath, videoId, publishData)
  })
  ipcMain.handle('cadence:report', async () => generateSessionReport())
}
