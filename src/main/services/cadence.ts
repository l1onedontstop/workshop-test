/**
 * Cadence Protocol — Buffer 节奏系统
 *
 * Inspired by cheat-on-content cadence-protocol.
 * Tracks "shot vs published" state with color thresholds.
 * Provides SessionStart auto-report for user orientation.
 */

import { ipcMain } from 'electron'
import { join } from 'path'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { WORKSPACE_ROOT, ensureDir, readProjectState, writeProjectState } from './project'
import { info } from './logger'

// ── Buffer color thresholds ──
// Based on target publish cadence (default: 3 days)

const TARGET_CADENCE_DAYS = 3
const RED_THRESHOLD = 0    // 0 in buffer = emergency
const YELLOW_THRESHOLD = 1  // 1 in buffer = warning
const GREEN_THRESHOLD = 2   // 2+ in buffer = healthy

export function getBufferColor(count: number): 'red' | 'yellow' | 'green' {
  if (count <= RED_THRESHOLD) return 'red'
  if (count <= YELLOW_THRESHOLD) return 'yellow'
  return 'green'
}

export function getBufferStatus(projectPath: string) {
  const state = readProjectState(projectPath)
  if (!state) return { count: 0, color: 'red' as const, shoots: [], message: '未找到项目' }

  const shoots = state.state?.shoots || []
  const count = shoots.length
  const color = getBufferColor(count)

  const messages: Record<string, string> = {
    red: '🔴 库存告急！没有已拍待发的视频，建议立即拍摄一条',
    yellow: '🟡 库存偏低，建议拍摄新视频补充 buffer',
    green: '🟢 库存充足，可以专注于选题和优化'
  }

  return { count, color, shoots, message: messages[color] }
}

// ── Shoot (拍了但没发) ──

export function registerShoot(projectPath: string, videoId: string, scriptFile: string) {
  const state = readProjectState(projectPath)
  if (!state) throw new Error('Project not found')
  if (!state.state.shoots) state.state.shoots = []

  state.state.shoots.push({
    id: videoId,
    scriptFile,
    shotAt: new Date().toISOString(),
    published: false
  })
  state.state.bufferCount = state.state.shoots.length

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

export function registerPublish(projectPath: string, videoId: string, publishData: { url?: string; platform?: string }) {
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
    const predDir = join(projectPath, 'predictions')
    let dueRetros = 0
    if (existsSync(predDir)) {
      const files = readdirSync(predDir).filter(f => f.endsWith('.json'))
      for (const f of files) {
        try {
          const data = JSON.parse(readFileSync(join(predDir, f), 'utf-8'))
          if (data.status === 'retro_completed') continue
          if (data.status === 'published' && data.publishedAt) {
            const publishedDate = new Date(data.publishedAt)
            const daysSincePublish = (Date.now() - publishedDate.getTime()) / 86400000
            if (daysSincePublish >= 3) dueRetros++
          }
        } catch {}
      }
    }

    reports.push({
      projectName: state.name,
      projectPath,
      phase: state.state?.phase || 'onboarding',
      buffer: {
        count: buffer.count,
        color: buffer.color,
        message: buffer.message
      },
      stats: {
        totalPredicted: state.state?.totalPredicted || 0,
        totalPublished: state.state?.totalPublished || 0,
        dueRetros
      },
      mode: (state.state?.totalPredicted || 0) >= 5 ? 'calibration' : 'cold-start'
    })
  }

  return {
    projects: reports,
    summary: reports.length > 0
      ? `${reports.length} 个项目 · ${reports.filter(r => r.buffer.color === 'red').length} 个库存告急 · ${reports.filter(r => r.stats.dueRetros > 0).length} 个待复盘`
      : '暂无项目，去创建一个吧',
    generatedAt: new Date().toISOString()
  }
}

// ── IPC ──

export function registerCadenceHandlers(): void {
  ipcMain.handle('cadence:buffer', async (_e, projectPath: string) => getBufferStatus(projectPath))
  ipcMain.handle('cadence:shoot', async (_e, projectPath: string, videoId: string, scriptFile: string) => {
    info('cadence', `Shot registered: ${scriptFile}`)
    return registerShoot(projectPath, videoId, scriptFile)
  })
  ipcMain.handle('cadence:publish', async (_e, projectPath: string, videoId: string, publishData: any) => {
    info('cadence', `Published: ${videoId}`)
    return registerPublish(projectPath, videoId, publishData)
  })
  ipcMain.handle('cadence:report', async () => generateSessionReport())
}
