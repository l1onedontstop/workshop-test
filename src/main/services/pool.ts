// ── Topic pool CRUD ───────────────────────────────────
// cheat-recommend equivalent: manage candidate topics
// with status tracking and AI-powered ranking.

import { ipcMain } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { doChat } from './ai'

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
  usedIn?: string
  performance?: { plays: number; likes: number }
}

interface PoolData {
  topics: PoolTopic[]
  updatedAt: string
}

const POOL_FILE = 'candidates.json'

function loadPool(projectPath: string): PoolData {
  const path = join(projectPath, POOL_FILE)
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'))
    } catch { /* corrupt file */ }
  }
  return { topics: [], updatedAt: new Date().toISOString() }
}

function savePool(projectPath: string, data: PoolData): void {
  writeFileSync(join(projectPath, POOL_FILE), JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2))
}

export function registerPoolHandlers(): void {
  // ── List all topics ──────────────────────────────────
  ipcMain.handle('pool:list', async (_event, projectPath: string) => {
    return loadPool(projectPath)
  })

  // ── Add topics to pool ───────────────────────────────
  ipcMain.handle(
    'pool:add',
    async (
      _event,
      projectPath: string,
      topics: Array<{
        title: string
        angle: string
        hook?: string
        audienceResonance?: string
        difficulty?: number
        category: string
        reason?: string
      }>
    ) => {
      const pool = loadPool(projectPath)
      const now = new Date().toISOString()

      const newTopics: PoolTopic[] = topics.map((t, i) => ({
        id: `${Date.now()}_${i}`,
        title: t.title,
        angle: t.angle,
        hook: t.hook || '',
        audienceResonance: t.audienceResonance || '',
        difficulty: t.difficulty || 3,
        category: t.category,
        reason: t.reason || '',
        status: 'candidate' as const,
        createdAt: now
      }))

      pool.topics = [...newTopics, ...pool.topics]
      savePool(projectPath, pool)

      return { added: newTopics.length, total: pool.topics.length }
    }
  )

  // ── Update topic status ──────────────────────────────
  ipcMain.handle(
    'pool:update',
    async (
      _event,
      projectPath: string,
      topicId: string,
      updates: Partial<PoolTopic>
    ) => {
      const pool = loadPool(projectPath)
      const idx = pool.topics.findIndex((t) => t.id === topicId)
      if (idx >= 0) {
        pool.topics[idx] = { ...pool.topics[idx], ...updates }
        savePool(projectPath, pool)
        return { success: true }
      }
      return { success: false, error: 'Topic not found' }
    }
  )

  // ── AI-powered topic recommendation ──────────────────
  ipcMain.handle(
    'pool:recommend',
    async (
      _event,
      projectPath: string,
      opts?: { bufferStatus?: string; count?: number }
    ) => {
      const pool = loadPool(projectPath)
      const candidates = pool.topics.filter((t) => t.status === 'candidate')

      if (candidates.length === 0) {
        return { recommendations: [], strategy: '选题池为空，请先添加选题' }
      }

      const bufferHint =
        opts?.bufferStatus === 'red'
          ? '库存告急，优先推荐低难度、可快速出片的选题'
          : opts?.bufferStatus === 'yellow'
            ? '库存偏低，推荐 1 个稳妥选题 + 1 个实验性选题'
            : '库存充足，可以大胆尝试实验性选题'

      const topicList = candidates
        .map(
          (t, i) =>
            `${i + 1}. 【${t.category}】${t.title} | 角度：${t.angle} | 难度：${t.difficulty}/5 | 原因：${t.reason}`
        )
        .join('\n')

      const messages = [
        {
          role: 'system' as const,
          content: `你是一个短视频选题策划专家。根据用户的选题池和当前内容库存状态，推荐最合适的选题顺序。\n\n**重要：你必须以合法JSON格式输出。**\n输出格式：{"ranked": [{"index": 0, "title": "...", "reason": "...", "strategy": "stable|experimental"}], "overallAdvice": "..."}`
        },
        {
          role: 'user' as const,
          content: `## 选题池\n${topicList}\n\n## 库存状态\n${bufferHint}\n\n## 要求\n推荐 ${opts?.count || 5} 个选题，采用"1稳+1实验"交替策略。`
        }
      ]

      try {
        const raw = await doChat(messages, { temperature: 0.3, maxTokens: 2048 })
        const parsed = extractJSON(raw)
        return {
          recommendations: parsed?.ranked || [],
          strategy: parsed?.overallAdvice || bufferHint
        }
      } catch {
        // Fallback: return candidates sorted by difficulty (stable first)
        const sorted = [...candidates]
          .sort((a, b) => a.difficulty - b.difficulty)
          .slice(0, opts?.count || 5)
        return {
          recommendations: sorted.map((t, i) => ({
            index: i,
            title: t.title,
            reason: t.reason,
            strategy: 'stable'
          })),
          strategy: 'AI 推荐失败，已按难度升序排列（稳妥优先）'
        }
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
