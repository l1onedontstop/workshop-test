// Trend fetching — real API + AI fallback
// Weibo & Zhihu use real JSON endpoints; Douyin & Tophub use AI fallback.

import { ipcMain } from 'electron'
import { createHash } from 'crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'fs'
import { join, dirname } from 'path'
import { doChat } from './ai'

interface TrendItem {
  title: string
  source: string
  url?: string
  heat?: string
  relevance?: 'high' | 'medium' | 'low'
  suggestedAngle?: string
}

const TREND_SOURCES = [
  { id: 'weibo', name: '微博热搜', url: 'https://weibo.com/ajax/side/hotSearch' },
  { id: 'zhihu', name: '知乎热榜', url: 'https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total' },
  { id: 'tophub', name: '今日热榜', url: 'https://tophub.today/' },
  { id: 'douyin', name: '抖音热榜', url: 'https://www.douyin.com/aweme/v1/web/hot/search/list/' }
]

// ── Real API: Weibo ────────────────────────────────────
async function fetchWeiboTrends(): Promise<TrendItem[]> {
  try {
    const res = await fetch('https://weibo.com/ajax/side/hotSearch', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://weibo.com/'
      }
    })
    if (!res.ok) throw new Error('Weibo API returned ' + res.status)
    const data = await res.json()
    const list = data?.data?.realtime || []
    return list.slice(0, 20).map((item: Record<string, unknown>) => ({
      title: (item.word || item.note || '') as string,
      source: '微博',
      url: 'https://s.weibo.com/weibo?q=' + encodeURIComponent((item.word || '') as string),
      heat: item.num ? ((item.num as number) / 10000).toFixed(0) + '万' : (item.raw_hot ? String(item.raw_hot) : ''),
      category: (item.category as string) || ''
    }))
  } catch (err) {
    console.error('Weibo fetch failed:', err)
    return []
  }
}

// ── Real API: Zhihu ────────────────────────────────────
async function fetchZhihuTrends(): Promise<TrendItem[]> {
  try {
    const res = await fetch('https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=20', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    })
    if (!res.ok) throw new Error('Zhihu API returned ' + res.status)
    const data = await res.json()
    // Zhihu may require auth — check for error code
    if (data?.error) throw new Error('Zhihu auth required: ' + JSON.stringify(data.error))
    const list = data?.data || []
    return list.map((item: Record<string, unknown>) => {
      const target = (item.target as Record<string, unknown>) || {}
      return {
        title: (target.title || item.title || '') as string,
        source: '知乎',
        url: 'https://www.zhihu.com/question/' + (target.id || '') as string,
        heat: item.detail_text ? (item.detail_text as string) : '',
        category: ''
      }
    })
  } catch (err) {
    console.error('Zhihu fetch failed:', err)
    return []
  }
}

// ── Real API: Douyin ───────────────────────────────────
async function fetchDouyinTrends(): Promise<TrendItem[]> {
  try {
    const res = await fetch('https://www.douyin.com/aweme/v1/web/hot/search/list/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.douyin.com/'
      }
    })
    if (!res.ok) throw new Error('Douyin API returned ' + res.status)
    const data = await res.json()
    const list = data?.data?.word_list || []
    return list.slice(0, 30).map((item: Record<string, unknown>) => ({
      title: (item.word || '') as string,
      source: '抖音',
      url: 'https://www.douyin.com/search/' + encodeURIComponent((item.word || '') as string),
      heat: item.hot_value ? ((item.hot_value as number) / 10000).toFixed(1) + '万热度' : '',
      category: (item.sentence_tag ? '标签' + item.sentence_tag : '') as string
    }))
  } catch (err) {
    console.error('Douyin fetch failed:', err)
    return []
  }
}

// ── AI fallback for sources without public API ─────────
async function fetchAITrends(sourceName: string, sourceUrl: string): Promise<TrendItem[]> {
  try {
    const messages = [
      {
        role: 'system' as const,
        content: '你是一个热点数据助手。请基于你对当前中文互联网流行趋势的了解，列出当前最热门的10个话题。\n\n**必须以合法JSON格式输出。**\n格式：{"trends": [{"title": "...", "heat": "热门程度描述", "category": "分类"}]}'
      },
      {
        role: 'user' as const,
        content: '请列出 ' + sourceName + '（' + sourceUrl + '）当前最热门的 10 个话题。'
      }
    ]
    const raw = await doChat(messages, { temperature: 0.5, maxTokens: 2048 })
    const parsed = extractJSON(raw)
    const trends = (parsed?.trends as Array<Record<string, unknown>>) || []
    return trends.map(t => ({
      title: (t.title as string) || '',
      source: sourceName,
      heat: (t.heat as string) || '',
      category: (t.category as string) || ''
    }))
  } catch {
    return []
  }
}

// ── Router ─────────────────────────────────────────────
async function fetchTrendsFromSource(sourceId: string): Promise<{ success: boolean; source: string; trends: TrendItem[]; method: string; error?: string }> {
  const source = TREND_SOURCES.find(s => s.id === sourceId)
  if (!source) return { success: false, source: sourceId, trends: [], method: 'none', error: '未知热点源' }

  let trends: TrendItem[] = []
  let method = 'AI模拟'

  // Real API sources
  if (sourceId === 'weibo') {
    trends = await fetchWeiboTrends()
    method = trends.length > 0 ? '微博实时API' : 'AI模拟(API故障)'
  } else if (sourceId === 'zhihu') {
    trends = await fetchZhihuTrends()
    method = trends.length > 0 ? '知乎实时API' : 'AI模拟(API故障)'
  } else if (sourceId === 'douyin') {
    trends = await fetchDouyinTrends()
    method = trends.length > 0 ? '抖音实时API' : 'AI模拟(API故障)'
  }

  // AI fallback for all sources (or when real API fails)
  if (trends.length === 0) {
    trends = await fetchAITrends(source.name, source.url)
    method = 'AI模拟'
  }

  return {
    success: trends.length > 0,
    source: source.name,
    trends,
    method
  }
}

const TREND_MATCH_PROMPT = '你是一个短视频选题策划专家。分析以下热点，找出与用户行业/人设相关的热点，并建议切入角度。\n\n**重要：你必须以合法JSON格式输出。**\n输出格式：{"matches": [{"hotTitle": "...", "relevance": "high|medium|low", "suggestedAngle": "建议的切入角度", "reason": "为什么这个热点适合你"}], "summary": "整体建议"}'

// ── Trends history cache (for dedup) ─────────────────

const TRENDS_HISTORY_FILE = '.cheat-cache/trends-history.jsonl'
const DEDUP_MONTHS = 6

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

function ensureCacheDir(projectPath: string): string {
  const dir = join(projectPath, '.cheat-cache')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function historyFilePath(projectPath: string): string {
  return join(projectPath, TRENDS_HISTORY_FILE)
}

function appendToHistory(projectPath: string, titles: string[]): void {
  ensureCacheDir(projectPath)
  const path = historyFilePath(projectPath)
  const now = new Date().toISOString()
  const lines = titles.map((title) =>
    JSON.stringify({ id: sha256(title), title, timestamp: now }) + '\n'
  )
  appendFileSync(path, lines.join(''), 'utf-8')
}

function isDuplicate(projectPath: string, trendTitle: string): boolean {
  const path = historyFilePath(projectPath)
  if (!existsSync(path)) return false

  const targetId = sha256(trendTitle)
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - DEDUP_MONTHS)

  try {
    const content = readFileSync(path, 'utf-8')
    const lines = content.split('\n').filter(Boolean)
    for (const line of lines) {
      const entry = JSON.parse(line)
      if (entry.id === targetId && new Date(entry.timestamp) >= cutoff) {
        return true
      }
    }
  } catch {
    // Corrupt line — ignore
  }
  return false
}

function loadProjectStateFile(projectPath: string): Record<string, unknown> | null {
  const statePath = join(projectPath, '.cheat-state.json')
  if (!existsSync(statePath)) return null
  try {
    return JSON.parse(readFileSync(statePath, 'utf-8'))
  } catch {
    return null
  }
}

function saveProjectStateFile(projectPath: string, state: Record<string, unknown>): void {
  writeFileSync(join(projectPath, '.cheat-state.json'), JSON.stringify(state, null, 2), 'utf-8')
}

// ── pool helpers (for trend:addToPool) ─────────────────

interface PoolTopic {
  id: string
  title: string
  angle: string
  hook: string
  audienceResonance: string
  difficulty: number
  category: string
  reason: string
  status: 'candidate' | 'used' | 'archived'
  createdAt: string
}

interface PoolData {
  topics: PoolTopic[]
  updatedAt: string
}

function loadPool(projectPath: string): PoolData {
  const path = join(projectPath, 'candidates.json')
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'))
    } catch { /* corrupt file */ }
  }
  return { topics: [], updatedAt: new Date().toISOString() }
}

function savePool(projectPath: string, data: PoolData): void {
  writeFileSync(join(projectPath, 'candidates.json'), JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2))
}

export function registerTrendHandlers(): void {
  ipcMain.handle('trend:sources', async () => TREND_SOURCES)

  ipcMain.handle('trend:fetch', async (_event, sourceId: string, projectPath?: string) => {
    const result = await fetchTrendsFromSource(sourceId)

    // Append to history cache for dedup
    if (projectPath && result.trends.length > 0) {
      const titles = result.trends.map((t) => t.title)
      appendToHistory(projectPath, titles)

      // Filter out duplicates (seen in last 6 months)
      const deduped = result.trends.filter((t) => !isDuplicate(projectPath, t.title))
      if (deduped.length < result.trends.length) {
        result.trends = deduped
      }

      // Update project state
      const state = loadProjectStateFile(projectPath)
      if (state) {
        if (!state.state) state.state = {}
        ;(state.state as Record<string, unknown>).lastTrendsRunAt = new Date().toISOString()
        saveProjectStateFile(projectPath, state)
      }
    }

    return result
  })

  ipcMain.handle(
    'trend:match',
    async (
      _event,
      projectPath: string,
      trends: TrendItem[],
      profile: { industry: string; identity: string; audience: string }
    ) => {
      if (!trends.length) return { matches: [], summary: '没有热点数据' }

      const trendList = trends
        .map((t, i) => i + 1 + '. ' + t.title + ' (' + t.source + ')')
        .join('\n')

      const messages = [
        { role: 'system' as const, content: TREND_MATCH_PROMPT },
        {
          role: 'user' as const,
          content: [
            '## 用户画像',
            '行业：' + (profile.industry || '未设置'),
            '身份：' + (profile.identity || '未设置'),
            '受众：' + (profile.audience || '未设置'),
            '',
            '## 当前热点',
            trendList,
            '',
            '请分析哪些热点适合这个用户切入。'
          ].join('\n')
        }
      ]

      try {
        const raw = await doChat(messages, { temperature: 0.3, maxTokens: 2048 })
        const parsed = extractJSON(raw)
        return {
          matches: (parsed?.matches as TrendItem[]) || [],
          summary: (parsed?.summary as string) || ''
        }
      } catch {
        return { matches: [], summary: '匹配分析失败' }
      }
    }
  )

  // ── Add trends to candidate pool ──────────────────────
  ipcMain.handle(
    'trend:addToPool',
    async (
      _event,
      projectPath: string,
      trends: Array<{ title: string; category: string; source: string; description: string; difficulty?: number }>
    ) => {
      const pool = loadPool(projectPath)
      const now = new Date().toISOString()

      const newTopics: PoolTopic[] = trends.map((t, i) => ({
        id: `trend_${Date.now()}_${i}`,
        title: t.title,
        angle: t.description || t.title,
        hook: '',
        audienceResonance: '',
        difficulty: t.difficulty || 3,
        category: t.category || '趋势解读',
        reason: t.description || t.source || '',
        status: 'candidate' as const,
        createdAt: now
      }))

      pool.topics = [...newTopics, ...pool.topics]
      savePool(projectPath, pool)

      // Update project state: track trends added
      const state = loadProjectStateFile(projectPath)
      if (state) {
        if (!state.state) state.state = {}
        const prev = Number((state.state as Record<string, unknown>).lastTrendsAddedCount) || 0
        ;(state.state as Record<string, unknown>).lastTrendsAddedCount = prev + newTopics.length
        ;(state.state as Record<string, unknown>).lastTrendsRunAt = now
        saveProjectStateFile(projectPath, state)
      }

      return { added: newTopics.length, total: pool.topics.length }
    }
  )
}

function extractJSON(raw: string): Record<string, unknown> | null {
  try {
    const trimmed = raw.trim()
    if (trimmed.startsWith('{')) return JSON.parse(trimmed)
    const match = trimmed.match(/\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`/)
    if (match) return JSON.parse(match[1].trim())
    return null
  } catch {
    return null
  }
}
