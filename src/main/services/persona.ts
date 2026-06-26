// ── Audience persona building ─────────────────────────
// cheat-persona equivalent: build audience profile
// from retro data and AI clustering.

import { ipcMain } from 'electron'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { doChat } from './ai'

// ── Self-account insight for persona enrichment ───────────
function getSelfInsightForPersona(projectPath: string): string {
  const selfPath = join(projectPath, 'samples', 'self', 'meta.json')
  if (!existsSync(selfPath)) return ''
  try {
    const self = JSON.parse(readFileSync(selfPath, 'utf-8'))
    if (!self.aiAnalysis) return ''
    const a = self.aiAnalysis
    return [
      a.audienceInference ? `自有账号受众推断：${a.audienceInference}` : '',
      a.accountSummary ? `自有账号定位：${a.accountSummary}` : '',
      a.styleFeatures?.length ? `自有账号风格：${a.styleFeatures.join('、')}` : '',
      a.strengths?.length ? `自有账号强项：${a.strengths.join('；')}` : ''
    ].filter(Boolean).join('\n')
  } catch { return '' }
}

const PERSONA_PROMPT = `你是一个受众画像分析师。根据用户提供的视频数据和观众反馈，构建详细的受众画像。

**重要：你必须以合法JSON格式输出，只输出纯JSON对象，不要使用markdown代码块包装。**

## 输出格式
{
  "coreAudience": {
    "age": "年龄段",
    "occupation": "典型职业",
    "interests": ["兴趣1", "兴趣2"],
    "painPoints": ["痛点1", "痛点2"],
    "whyFollow": "为什么关注这个账号"
  },
  "secondaryAudience": {
    "age": "年龄段",
    "occupation": "典型职业",
    "interests": ["兴趣1"],
    "whyFollow": "为什么关注"
  },
  "contentAdvice": {
    "whatWorks": ["什么内容效果好"],
    "whatAvoid": ["什么内容要避免"],
    "toneAdvice": "语气和风格建议"
  },
  "growthOpportunities": ["增长机会1", "增长机会2"],
  "summary": "一句话总结你的观众是谁"
}`

interface PersonaData {
  builtAt: string
  sampleCount: number
  coreAudience: Record<string, unknown>
  secondaryAudience: Record<string, unknown>
  contentAdvice: Record<string, unknown>
  growthOpportunities: string[]
  summary: string
}

export function registerPersonaHandlers(): void {
  // ── Build persona from retro data ────────────────────
  ipcMain.handle('persona:build', async (_event, projectPath: string) => {
    const predDir = join(projectPath, 'predictions')
    if (!existsSync(predDir)) {
      return { success: false, error: '还没有预测数据，先发布并复盘几条视频吧' }
    }

    const files = readdirSync(predDir).filter((f) => f.endsWith('.json'))
    const retroData: string[] = []

    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync(join(predDir, file), 'utf-8'))
        if (data.status === 'retro_completed') {
          retroData.push(
            [
              `## ${data.topic || '未知选题'}`,
              `播放：${data.actualData?.plays || '?'}`,
              `点赞：${data.actualData?.likes || '?'}`,
              `评论：${data.actualData?.comments || '?'}`,
              `分享：${data.actualData?.shares || '?'}`,
              data.retroResult?.overallAssessment
                ? `复盘结论：${data.retroResult.overallAssessment}`
                : '',
              data.retroResult?.keyLearnings?.length
                ? `关键发现：${data.retroResult.keyLearnings.join('；')}`
                : ''
            ]
              .filter(Boolean)
              .join('\n')
          )
        }
      } catch { /* skip */ }
    }

    if (retroData.length === 0) {
      return { success: false, error: '还没有已完成复盘的视频，先复盘一条吧' }
    }

    const selfInsight = getSelfInsightForPersona(projectPath)

    const messages = [
      { role: 'system' as const, content: PERSONA_PROMPT },
      {
        role: 'user' as const,
        content: [
          selfInsight ? `## 自有账号数据参考\n${selfInsight}\n` : '',
          `## 视频数据汇总（${retroData.length} 条已复盘）`,
          ...retroData,
          '',
          '请基于以上数据构建受众画像。'
        ].filter(Boolean).join('\n')
      }
    ]

    try {
      const raw = await doChat(messages, { temperature: 0.3, maxTokens: 3072 })
      const parsed = extractJSON(raw)
      if (parsed) {
        const persona: PersonaData = {
          builtAt: new Date().toISOString(),
          sampleCount: retroData.length,
          coreAudience: (parsed.coreAudience as Record<string, unknown>) || {},
          secondaryAudience: (parsed.secondaryAudience as Record<string, unknown>) || {},
          contentAdvice: (parsed.contentAdvice as Record<string, unknown>) || {},
          growthOpportunities: (parsed.growthOpportunities as string[]) || [],
          summary: (parsed.summary as string) || ''
        }
        writeFileSync(
          join(projectPath, 'audience.json'),
          JSON.stringify(persona, null, 2)
        )
        return { success: true, persona }
      }
      return { success: false, error: 'AI 返回格式异常' }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // ── Get current persona ──────────────────────────────
  ipcMain.handle('persona:get', async (_event, projectPath: string) => {
    const path = join(projectPath, 'audience.json')
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, 'utf-8'))
    }
    return null
  })

  // ── Clear persona ────────────────────────────────────
  ipcMain.handle('persona:clear', async (_event, projectPath: string) => {
    const path = join(projectPath, 'audience.json')
    if (existsSync(path)) {
      const { rmSync } = await import('fs')
      rmSync(path)
    }
    return { success: true }
  })
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
