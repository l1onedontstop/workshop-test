import { ipcMain } from 'electron'
import { join } from 'path'
import { join } from 'path'
import { homedir } from 'os'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { info } from './logger'

const WORKSPACE_ROOT = join(homedir(), 'IP工坊', 'projects')

function collectAllPredictions() {
  if (!existsSync(WORKSPACE_ROOT)) return []
  const dirs = readdirSync(WORKSPACE_ROOT, { withFileTypes: true })
  const all: any[] = []
  for (const d of dirs) {
    if (!d.isDirectory()) continue
    const predDir = join(WORKSPACE_ROOT, d.name, 'predictions')
    if (!existsSync(predDir)) continue
    for (const f of readdirSync(predDir).filter(f => f.endsWith('.json'))) {
      try { const data = JSON.parse(readFileSync(join(predDir, f), 'utf-8')); data._project = d.name; all.push(data) } catch {}
    }
  }
  return all
}

export function registerDashboardHandlers(): void {
  ipcMain.handle('dashboard:overview', async () => {
    info('dashboard', 'Generating overview')
    const ps = collectAllPredictions()
    const pub = ps.filter(p => p.status === 'retro_completed')
    const pred = ps.filter(p => p.status === 'scored' || p.status === 'retro_completed')
    const totalPlays = pub.reduce((s, p) => s + (p.actualData?.plays || 0), 0)
    const totalLikes = pub.reduce((s, p) => s + (p.actualData?.likes || 0), 0)
    const totalComments = pub.reduce((s, p) => s + (p.actualData?.comments || 0), 0)
    const avgScore = pred.length > 0 ? pred.reduce((s, p) => s + (p.total || 0), 0) / pred.length : 0
    return { totalProjects: 0, totalScripts: pred.length, totalPublished: pub.length, totalPlays, totalLikes, totalComments, avgPredictedScore: Math.round(avgScore * 100) / 100, engagementRate: totalPlays > 0 ? Math.round((totalLikes + totalComments) / totalPlays * 10000) / 100 : 0, generatedAt: new Date().toISOString() }
  })

  ipcMain.handle('dashboard:trends', async (_e, projectPath: string) => {
    const predDir = join(projectPath, 'predictions')
    if (!existsSync(predDir)) return { trends: [], message: '暂无数据' }
    const files = readdirSync(predDir).filter(f => f.endsWith('.json')).sort().reverse()
    const trends = files.map(f => {
      try { const d = JSON.parse(readFileSync(join(predDir, f), 'utf-8')); if (d.status === 'retro_completed' && d.actualData) return { topic: d.topic || '未知', predictedScore: d.total || 0, actualPlays: d.actualData.plays || 0, actualLikes: d.actualData.likes || 0, actualComments: d.actualData.comments || 0 } } catch {}
      return null
    }).filter(Boolean)
    return { trends, best: trends.length > 0 ? trends.reduce((b, t) => t!.actualPlays > b!.actualPlays ? t : b) : null }
  })

  ipcMain.handle('dashboard:weekly', async () => {
    const ov = await ipcMain['_events']?.['dashboard:overview']?.() || {}
    return { weekStart: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), overview: ov, recommendations: ov.totalPublished < 3 ? ['建议提高发布频率，目标每周 2-3 条'] : ['各项数据表现良好！'], generatedAt: new Date().toISOString() }
  })
}
