// ── Benchmark account import & analysis ──────────────────
// cheat-learn-from equivalent: import benchmark accounts,
// analyze their content patterns, store samples.

import { ipcMain } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'
import { doChat } from './ai'

interface BenchmarkAccount {
  name: string
  platform: string
  url: string
  importedAt: string
  videoCount: number
  avgPlays?: number
  contentTypes: string[]
  topTopics: string[]
  styleNotes: string
}

const BENCHMARK_ANALYSIS_PROMPT = `你是一个短视频内容分析师，专门拆解对标账号的内容策略。

## 你的任务
分析用户提供的对标账号信息，提取可复用的内容 pattern。只基于账号名和平台特征做合理推断，不要编造具体数据。

**重要：你必须以合法JSON格式输出，只输出纯JSON对象，不要使用markdown代码块包装。**

## 输出格式
{
  "accountSummary": "一句话总结这个账号的定位",
  "contentPillars": ["内容支柱1", "内容支柱2", ...],
  "styleFeatures": ["风格特征1", "风格特征2", ...],
  "learnableHookPatterns": ["这个账号实际在用的钩子模式1", "钩子模式2", ...],
  "recommendedHookPatterns": ["基于分析推荐你尝试的钩子模式1", "钩子模式2", ...],
  "audienceInsight": "目标受众特征判断",
  "learnablePoints": ["可借鉴点1", "可借鉴点2", ...],
  "riskWarnings": ["注意风险1", "注意风险2", ...]
}

## 重要原则
- learnableHookPatterns：基于账号名和平台特征推断该账号可能使用的钩子模式
- recommendedHookPatterns：基于该账号的风格，推荐给用户尝试的钩子模式（结合用户可能是新手的背景）
- 不要编造具体视频标题或播放量数据——你没有这些信息`

export function registerBenchmarkHandlers(): void {
  // ── Import benchmark account ──────────────────────────
  ipcMain.handle(
    'benchmark:import',
    async (
      _event,
      projectPath: string,
      accountInfo: { name: string; platform: string; url: string; notes?: string }
    ) => {
      const samplesDir = join(projectPath, 'samples', accountInfo.name)
      if (!existsSync(samplesDir)) {
        mkdirSync(samplesDir, { recursive: true })
      }

      // Store account meta
      const meta: BenchmarkAccount = {
        name: accountInfo.name,
        platform: accountInfo.platform,
        url: accountInfo.url,
        importedAt: new Date().toISOString(),
        videoCount: 0,
        contentTypes: [],
        topTopics: [],
        styleNotes: ''
      }

      // Use AI to analyze the account
      const messages = [
        { role: 'system' as const, content: BENCHMARK_ANALYSIS_PROMPT },
        {
          role: 'user' as const,
          content: [
            `## 对标账号信息`,
            `名称：${accountInfo.name}`,
            `平台：${accountInfo.platform}`,
            accountInfo.url ? `链接：${accountInfo.url}` : '',
            accountInfo.notes ? `用户备注：${accountInfo.notes}` : '',
            '',
            '请分析这个账号的内容策略和可借鉴之处。基于账号名和平台特征做合理推断，不要编造具体数据。'
          ].filter(Boolean).join('\n')
        }
      ]

      try {
        const raw = await doChat(messages, { temperature: 0.3, maxTokens: 2048 })
        const parsed = extractBenchmarkJSON(raw)
        if (parsed) {
          Object.assign(meta, {
            contentTypes: parsed.contentPillars || [],
            styleNotes: (parsed.styleFeatures || []).join('\n'),
            topTopics: parsed.learnablePoints || [],
            videoCount: 0
          })
        }

        // Write meta.json
        writeFileSync(
          join(samplesDir, 'meta.json'),
          JSON.stringify({ ...meta, aiAnalysis: parsed }, null, 2)
        )

        return { success: true, account: meta }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── List benchmark accounts ───────────────────────────
  ipcMain.handle('benchmark:list', async (_event, projectPath: string) => {
    const samplesDir = join(projectPath, 'samples')
    if (!existsSync(samplesDir)) return []

    const entries = readdirSync(samplesDir, { withFileTypes: true })
    const accounts: Array<{ name: string; meta: BenchmarkAccount | null }> = []

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const metaPath = join(samplesDir, entry.name, 'meta.json')
        const meta = existsSync(metaPath)
          ? JSON.parse(readFileSync(metaPath, 'utf-8'))
          : null
        accounts.push({ name: entry.name, meta })
      }
    }

    return accounts
  })

  // ── Analyze benchmark account deeply ──────────────────
  ipcMain.handle(
    'benchmark:analyze',
    async (_event, projectPath: string, accountName: string) => {
      const metaPath = join(projectPath, 'samples', accountName, 'meta.json')
      if (!existsSync(metaPath)) return null

      const meta = JSON.parse(readFileSync(metaPath, 'utf-8'))
      return meta
    }
  )

  // ── Cross-account summary ────────────────────────────
  ipcMain.handle(
    'benchmark:crossSummary',
    async (_event, projectPath: string) => {
      const samplesDir = join(projectPath, 'samples')
      if (!existsSync(samplesDir)) return null

      const entries = readdirSync(samplesDir, { withFileTypes: true })
      const accounts: Array<{ name: string; summary: string; pillars: string[] }> = []

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const metaPath = join(samplesDir, entry.name, 'meta.json')
          if (existsSync(metaPath)) {
            const meta = JSON.parse(readFileSync(metaPath, 'utf-8'))
            accounts.push({
              name: entry.name,
              summary: meta.aiAnalysis?.accountSummary || meta.accountSummary || '',
              pillars: meta.aiAnalysis?.contentPillars || meta.contentTypes || []
            })
          }
        }
      }

      if (accounts.length < 2) return { accounts, commonPatterns: [], advice: '导入 2 个以上对标账号后可查看跨账号总结' }

      const messages = [
        {
          role: 'system' as const,
          content: `你是一个内容策略顾问。分析多个对标账号，找出共性 pattern 和差异点。

**必须以合法JSON格式输出。**
输出格式：{"commonPatterns": ["多账号共性1", ...], "differences": [{"aspect": "维度", "accounts": "账号A vs 账号B", "insight": "洞察"}], "recommendedBlend": "综合建议", "whichToLearnMost": "最值得优先学哪个账号及原因"}`
        },
        {
          role: 'user' as const,
          content: accounts
            .map(
              (a) =>
                `## ${a.name}\n定位：${a.summary}\n内容支柱：${a.pillars.join('、')}`
            )
            .join('\n\n') +
            '\n\n请分析这些对标账号的共性 pattern、差异点，以及综合建议。'
        }
      ]

      try {
        const raw = await doChat(messages, { temperature: 0.3, maxTokens: 2048 })
        const parsed = extractBenchmarkJSON(raw)
        return { accounts, ...(parsed || {}) }
      } catch {
        return { accounts, commonPatterns: [], advice: '分析失败' }
      }
    }
  )
}

// ── JSON extraction helper ──────────────────────────────
function extractBenchmarkJSON(raw: string): Record<string, unknown> | null {
  try {
    const trimmed = raw.trim()
    if (trimmed.startsWith('{')) return JSON.parse(trimmed)
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) return JSON.parse(match[1].trim())
    const objMatch = trimmed.match(/\{[\s\S]*\}/)
    if (objMatch) return JSON.parse(objMatch[0])
  } catch { /* fall through */ }
  return null
}
