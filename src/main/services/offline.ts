import { ipcMain } from 'electron'
import { join } from 'path'
import { homedir } from 'os'
import { existsSync, mkdirSync } from 'fs'
import { info } from './logger'

const OFFLINE_CACHE_DIR = join(homedir(), 'IP工坊', 'cache')

function ensureCacheDir(): void { if (!existsSync(OFFLINE_CACHE_DIR)) mkdirSync(OFFLINE_CACHE_DIR, { recursive: true }) }

function heuristicScore(script: string) {
  const paragraphs = script.split(/\n\n+/).filter(p => p.trim().length > 10)
  const sentences = script.split(/[。！？\.\!\?]/).filter(s => s.trim().length > 0)
  const avgSL = sentences.length > 0 ? sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length : 0
  const hasStrongHook = (sentences[0] || '').length < 30 && (sentences[0] || '').length > 5
  const hasData = /\d+[万亿千百%倍]/.test(script)
  const lastP = paragraphs[paragraphs.length - 1] || ''
  const hasCTA = /关注|点赞|收藏|转发|评论/.test(lastP)
  const scores = {
    hook: hasStrongHook ? 6 : 3, rhythm: Math.min(8, Math.max(3, paragraphs.length > 3 ? 7 : paragraphs.length > 1 ? 5 : 3)),
    sharpness: hasData ? 6 : 4, utility: hasData ? 6 : 3,
    emotion: Math.min(7, Math.max(3, sentences.length > 5 ? 5 : 3)),
    structure: hasCTA ? 7 : 4, expression: avgSL > 10 && avgSL < 40 ? 6 : 4
  }
  const total = scores.hook * 0.2 + scores.rhythm * 0.15 + scores.sharpness * 0.15 + scores.utility * 0.15 + scores.emotion * 0.15 + scores.structure * 0.1 + scores.expression * 0.1
  return { scores, total: Math.round(total * 100) / 100, strengths: [hasStrongHook ? '开篇有钩子' : null, hasData ? '包含数据案例' : null, hasCTA ? '结尾有 CTA' : null].filter(Boolean), weaknesses: [!hasStrongHook ? '缺少钩子' : null, !hasData ? '建议加数据' : null].filter(Boolean), overall: hasStrongHook && hasData && hasCTA ? '结构完整' : '基本要素欠缺', _offline: true }
}

const TOPIC_TEMPLATES = [
  { title: '我创业第一年犯的3个错误', angle: '经验分享', category: '经验分享', difficulty: 2 },
  { title: '为什么大多数老板不懂AI', angle: '观点输出', category: '观点输出', difficulty: 3 },
  { title: '降本增效最简单的一招', angle: '方法干货', category: '经验分享', difficulty: 2 },
  { title: 'AI时代最危险的3种老板思维', angle: '观点输出', category: '观点输出', difficulty: 3 }
]

export function registerOfflineHandlers(): void {
  ipcMain.handle('offline:scoreScript', async (_e, script: string) => { info('offline', 'Heuristic scoring', { len: script.length }); return heuristicScore(script) })
  ipcMain.handle('offline:topicTemplates', async () => TOPIC_TEMPLATES)
  ipcMain.handle('offline:publishPackTemplate', async (_e, script: string) => {
    const fl = script.split('\n')[0]?.slice(0, 30) || '新视频'
    return { titles: [fl, `干货：${fl}`, `99%的人不知道：${fl}`], descriptions: { short: script.slice(0, 70) + '...', long: script.slice(0, 180) + '...' }, tags: ['创业', '管理', '干货', '商业思维'], bestPublishTime: '工作日 19:00-21:00', coverTexts: [fl, '纯干货', '老板必看'], coverStyle: { colorScheme: '深色背景+白色大字', layout: '人物居中偏左', subtitleStyle: '粗体黄字' }, visualHooks: ['前三秒叠加大字标题'], _offline: true }
  })
  ipcMain.handle('offline:healthCheck', async () => { try { const c = new AbortController(); setTimeout(() => c.abort(), 5000); const r = await fetch('https://api.deepseek.com/v1/models', { signal: c.signal }); return { online: true, status: r.status } } catch { return { online: false } } })
}
