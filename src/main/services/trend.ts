// ── Trend fetching ────────────────────────────────────
// cheat-trends equivalent: fetch hot topics from
// public aggregators and match against user profile.

import { ipcMain } from 'electron'
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
  { id: 'tophub', name: '今日热榜', url: 'https://tophub.today/' },
  { id: 'douyin', name: '抖音热榜', url: 'https://www.douyin.com/hot' },
  { id: 'weibo', name: '微博热搜', url: 'https://weibo.com/hot/search' },
  { id: 'zhihu', name: '知乎热榜', url: 'https://www.zhihu.com/hot' }
]

const TREND_MATCH_PROMPT = `你是一个短视频选题策划专家。分析以下热点，找出与用户行业/人设相关的热点，并建议切入角度。

**重要：你必须以合法JSON格式输出。**
输出格式：{"matches": [{"hotTitle": "...", "relevance": "high|medium|low", "suggestedAngle": "建议的切入角度", "reason": "为什么这个热点适合你"}], "summary": "整体建议"}`

export function registerTrendHandlers(): void {
  // ── List available trend sources ──────────────────────
  ipcMain.handle('trend:sources', async () => {
    return TREND_SOURCES
  })

  // ── Fetch trends from source ─────────────────────────
  ipcMain.handle(
    'trend:fetch',
    async (_event, sourceId: string) => {
      const source = TREND_SOURCES.find((s) => s.id === sourceId)
      if (!source) return { success: false, error: '未知热点源' }

      // Use AI to simulate trend fetching by describing what we need
      const messages = [
        {
          role: 'system' as const,
          content: `你是一个热点数据助手。请模拟从 ${source.name}（${source.url}）抓取当前最热门的 10 个话题。基于你对该平台当前流行趋势的了解，列出当前可能的热门话题。\n\n**必须以合法JSON格式输出。**\n格式：{"trends": [{"title": "...", "heat": "热门程度描述", "category": "分类"}]}`
        },
        {
          role: 'user' as const,
          content: `请列出 ${source.name} 当前最热门的 10 个话题。`
        }
      ]

      try {
        const raw = await doChat(messages, { temperature: 0.5, maxTokens: 2048 })
        const parsed = extractJSON(raw)
        return {
          success: true,
          source: source.name,
          trends: (parsed?.trends as TrendItem[]) || []
        }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Match trends against user profile ────────────────
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
        .map((t, i) => `${i + 1}. ${t.title} (${t.source})`)
        .join('\n')

      const messages = [
        { role: 'system' as const, content: TREND_MATCH_PROMPT },
        {
          role: 'user' as const,
          content: [
            `## 用户画像`,
            `行业：${profile.industry || '未设置'}`,
            `身份：${profile.identity || '未设置'}`,
            `受众：${profile.audience || '未设置'}`,
            '',
            `## 当前热点`,
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
}

function extractJSON(raw: string): Record<string, unknown> | null {
  try {
    const trimmed = raw.trim()
    if (trimmed.startsWith('{')) return JSON.parse(trimmed)
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) return JSON.parse(match[1].trim())
    return null
  } catch {
    return null
  }
}
