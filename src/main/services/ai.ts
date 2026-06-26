import { ipcMain } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import Store from './store'
import { detectMode } from './prediction-guard'
import {
  RUBRIC_SYSTEM_PROMPT,
  SCRIPT_WRITER_PROMPT,
  OPTIMIZE_SCRIPT_PROMPT,
  PUBLISH_PACK_PROMPT,
  RETRO_ANALYSIS_PROMPT,
  RUBRIC_EVOLUTION_PROMPT,
  TOPIC_INSPIRATION_PROMPT,
  PLAN_STRATEGY_PROMPT,
  SCRIPT_CHAT_PROMPT,
  PREDICT_SCRIPT_PROMPT,
  loadProjectWeights,
  buildRubricPrompt,
  buildScriptWriterPrompt
} from './rubric'

// ── Self-account insight loader ───────────────────────────
function getSelfInsight(projectPath: string): string {
  const selfPath = join(projectPath, 'samples', 'self', 'meta.json')
  if (!existsSync(selfPath)) return ''
  try {
    const self = JSON.parse(readFileSync(selfPath, 'utf-8'))
    if (!self.aiAnalysis) return ''
    const a = self.aiAnalysis
    const parts: string[] = []
    if (a.accountSummary) parts.push(`你当前账号定位：${a.accountSummary}`)
    if (a.contentPillars?.length) parts.push(`你的内容支柱：${a.contentPillars.join('、')}`)
    if (a.styleFeatures?.length) parts.push(`你的风格特征：${a.styleFeatures.join('、')}`)
    if (a.strengths?.length) parts.push(`你的强项：${a.strengths.join('；')}`)
    if (a.weaknesses?.length) parts.push(`你的弱项：${a.weaknesses.join('；')}`)
    if (a.reusablePatterns?.length) parts.push(`你可复用的模式：${a.reusablePatterns.join('；')}`)
    if (a.personaAdvice) {
      const recLabel = a.personaAdvice.recommended === 'keep' ? '继续现有风格' :
                       a.personaAdvice.recommended === 'optimize' ? '在现有基础上优化' : '转型新方向'
      parts.push(`人设建议：${recLabel} — ${a.personaAdvice.reasoning || ''}`)
      if (a.personaAdvice.recommended === 'keep') parts.push(`深化方向：${a.personaAdvice.keepCurrent || ''}`)
      if (a.personaAdvice.recommended === 'optimize') parts.push(`优化方向：${a.personaAdvice.optimizeDirection || ''}`)
      if (a.personaAdvice.recommended === 'transform') parts.push(`转型方向：${a.personaAdvice.transformOption || ''}`)
    }
    return parts.filter(Boolean).join('\n')
  } catch { return '' }
}

// ── Provider Registry ────────────────────────────────────

interface AIProvider {
  id: string
  label: string
  baseURL: string
  format: 'openai-compat' | 'anthropic'
  defaultModel: string
  models: string[]
}

const BUILTIN_PROVIDERS: AIProvider[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    format: 'openai-compat',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner']
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    format: 'openai-compat',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'o3-mini']
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    baseURL: 'https://api.anthropic.com/v1',
    format: 'anthropic',
    defaultModel: 'claude-sonnet-4-6',
    models: [
      'claude-opus-4-8',
      'claude-sonnet-4-6',
      'claude-haiku-4-5',
      'claude-3.5-sonnet'
    ]
  },
  {
    id: 'kimi',
    label: 'Kimi (月之暗面)',
    baseURL: 'https://api.moonshot.cn/v1',
    format: 'openai-compat',
    defaultModel: 'moonshot-v1-8k',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k']
  },
  {
    id: 'zhipu',
    label: '智谱 GLM',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    format: 'openai-compat',
    defaultModel: 'glm-4-flash',
    models: ['glm-4-flash', 'glm-4-plus', 'glm-4-air']
  },
  {
    id: 'qwen',
    label: '通义千问',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    format: 'openai-compat',
    defaultModel: 'qwen-turbo',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max']
  },
  {
    id: 'doubao',
    label: '豆包 (字节)',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    format: 'openai-compat',
    defaultModel: 'doubao-pro-32k',
    models: ['doubao-pro-32k', 'doubao-lite-32k']
  }
]

function getProvider(id: string): AIProvider | undefined {
  return BUILTIN_PROVIDERS.find((p) => p.id === id)
}

// ── Message Types ─────────────────────────────────────────

interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface AIOptions {
  provider?: string
  model?: string
  maxTokens?: number
  temperature?: number
}

// ── OpenAI-compatible chat ────────────────────────────────

async function chatOpenAICompat(
  provider: AIProvider,
  messages: AIMessage[],
  opts: AIOptions
): Promise<string> {
  const store = new Store()
  const apiKey = store.get(`${provider.id}ApiKey`, '') as string
  if (!apiKey) throw new Error(`请先在设置中配置 ${provider.label} API Key`)

  // Map messages to OpenAI format (system is a top-level field for most compat APIs)
  const body: Record<string, unknown> = {
    model: opts.model || provider.defaultModel,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: opts.maxTokens || 4096,
    temperature: opts.temperature ?? 0.7,
    stream: false
  }

  const res = await fetch(`${provider.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`${provider.label} API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

// ── Anthropic-native chat ─────────────────────────────────

async function chatAnthropicNative(
  provider: AIProvider,
  messages: AIMessage[],
  opts: AIOptions
): Promise<string> {
  const store = new Store()
  const apiKey = store.get(`${provider.id}ApiKey`, '') as string
  if (!apiKey) throw new Error(`请先在设置中配置 Anthropic API Key`)

  const systemMsg = messages.find((m) => m.role === 'system')
  const chatMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  const body: Record<string, unknown> = {
    model: opts.model || provider.defaultModel,
    max_tokens: opts.maxTokens || 4096,
    temperature: opts.temperature ?? 0.7,
    messages: chatMessages
  }
  if (systemMsg) body.system = systemMsg.content

  const res = await fetch(`${provider.baseURL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return (
    data.content
      ?.filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('\n') || ''
  )
}

// ── Router ───────────────────────────────────────────────

export async function doChat(
  messages: AIMessage[],
  opts: AIOptions = {}
): Promise<string> {
  const store = new Store()
  const providerId = opts.provider || (store.get('aiProvider', 'deepseek') as string)
  const provider = getProvider(providerId)

  if (!provider) {
    throw new Error(`未知的 AI 提供商: ${providerId}`)
  }

  if (provider.format === 'anthropic') {
    return chatAnthropicNative(provider, messages, opts)
  }
  return chatOpenAICompat(provider, messages, opts)
}

export function registerAIHandlers(): void {
  // Generic chat
  ipcMain.handle(
    'ai:chat',
    async (_event, messages: AIMessage[], opts: AIOptions = {}) => {
      return doChat(messages, opts)
    }
  )

  // ── Score a script ────────────────────────────────────
  ipcMain.handle(
    'ai:scoreScript',
    async (_event, script: string, opts: AIOptions & { projectPath?: string } = {}) => {
      let systemPrompt = RUBRIC_SYSTEM_PROMPT
      if (opts.projectPath) {
        const weights = loadProjectWeights(opts.projectPath)
        systemPrompt = buildRubricPrompt(weights)
      }
      const messages: AIMessage[] = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `请对以下短视频脚本进行 7 维打分：\n\n${script}`
        }
      ]
      const result = await doChat(messages, { ...opts, temperature: 0 })
      return result
    }
  )

  // ── Write script from topic ───────────────────────────
  ipcMain.handle(
    'ai:writeScript',
    async (
      _event,
      topic: string,
      opts: AIOptions & { industry?: string; audience?: string; projectPath?: string } = {}
    ) => {
      let systemPrompt = SCRIPT_WRITER_PROMPT
      if (opts.projectPath) {
        const weights = loadProjectWeights(opts.projectPath)
        systemPrompt = buildScriptWriterPrompt(weights)
      }
      const userContext = [
        opts.industry && `行业：${opts.industry}`,
        opts.audience && `目标受众：${opts.audience}`
      ]
        .filter(Boolean)
        .join('，')

      // Inject self-account analysis for style matching
      let selfInsight = ''
      if (opts.projectPath) {
        selfInsight = getSelfInsight(opts.projectPath)
      }

      let userPrompt = userContext
        ? `背景：${userContext}\n\n请根据以下主题写一篇短视频脚本：${topic}`
        : `请根据以下主题写一篇短视频脚本：${topic}`

      if (selfInsight) {
        userPrompt = `## 你的账号现有数据（请匹配风格）\n${selfInsight}\n\n---\n\n${userPrompt}`
      }

      const messages: AIMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
      const result = await doChat(messages, {
        ...opts,
        maxTokens: opts.maxTokens || 4096,
        temperature: opts.temperature ?? 0.8
      })
      return result
    }
  )

  // ── Optimize a script based on scoring feedback ────────
  ipcMain.handle(
    'ai:optimizeScript',
    async (
      _event,
      data: {
        script: string
        weaknesses: string[]
        suggestions: string[]
        topic?: string
      },
      opts: AIOptions = {}
    ) => {
      const feedback = [
        data.topic && `主题：${data.topic}`,
        data.weaknesses.length > 0 && `评分弱项：\n${data.weaknesses.map(w => `- ${w}`).join('\n')}`,
        data.suggestions.length > 0 && `修改建议：\n${data.suggestions.map(s => `- ${s}`).join('\n')}`
      ].filter(Boolean).join('\n\n')

      const messages: AIMessage[] = [
        { role: 'system', content: OPTIMIZE_SCRIPT_PROMPT },
        {
          role: 'user',
          content: feedback
            ? `## 反馈意见\n${feedback}\n\n## 原始脚本\n${data.script}\n\n请根据以上反馈优化这篇口播文案。`
            : `## 原始脚本\n${data.script}\n\n请优化这篇口播文案。`
        }
      ]
      return doChat(messages, {
        ...opts,
        maxTokens: opts.maxTokens || 4096,
        temperature: opts.temperature ?? 0.8
      })
    }
  )

  // List available providers
  ipcMain.handle('ai:listProviders', async () => {
    return BUILTIN_PROVIDERS.map((p) => ({
      id: p.id,
      label: p.label,
      defaultModel: p.defaultModel,
      models: p.models
    }))
  })

  // Get current active provider
  ipcMain.handle('ai:getActiveProvider', async () => {
    const store = new Store()
    const providerId = store.get('aiProvider', 'deepseek') as string
    return getProvider(providerId) || BUILTIN_PROVIDERS[0]
  })

  // No persistent client — stateless via fetch
  ipcMain.handle('ai:resetClient', () => {})

  // ── Generate publish pack ──────────────────────────────
  ipcMain.handle(
    'ai:generatePublishPack',
    async (
      _event,
      script: string,
      opts: AIOptions & { topic?: string; industry?: string; audience?: string } = {}
    ) => {
      const context = [
        opts.topic && `主题：${opts.topic}`,
        opts.industry && `行业：${opts.industry}`,
        opts.audience && `目标受众：${opts.audience}`
      ]
        .filter(Boolean)
        .join('，')

      const messages: AIMessage[] = [
        { role: 'system', content: PUBLISH_PACK_PROMPT },
        {
          role: 'user',
          content: context
            ? `背景信息：${context}\n\n请为以下脚本生成发布资料包：\n\n${script}`
            : `请为以下脚本生成发布资料包：\n\n${script}`
        }
      ]
      return doChat(messages, { ...opts, temperature: 0.8, maxTokens: 2048 })
    }
  )

  // ── Analyze retro data ─────────────────────────────────
  ipcMain.handle(
    'ai:analyzeRetro',
    async (
      _event,
      data: {
        script: string
        predictedScores: Record<string, number>
        predictedTotal: number
        actualData: { plays: number; likes: number; comments: number; shares: number; completionRate?: number }
      },
      opts: AIOptions = {}
    ) => {
      const payload = [
        '## 脚本内容',
        data.script,
        '',
        '## 预测评分',
        ...Object.entries(data.predictedScores).map(([k, v]) => `- ${k}: ${v}/10`),
        `总分: ${data.predictedTotal}/10`,
        '',
        '## 实际表现数据',
        `播放量: ${data.actualData.plays}`,
        `点赞: ${data.actualData.likes}`,
        `评论: ${data.actualData.comments}`,
        `分享: ${data.actualData.shares}`,
        data.actualData.completionRate != null
          ? `完播率: ${(data.actualData.completionRate * 100).toFixed(1)}%`
          : ''
      ]
        .filter(Boolean)
        .join('\n')

      const messages: AIMessage[] = [
        { role: 'system', content: RETRO_ANALYSIS_PROMPT },
        { role: 'user', content: payload }
      ]
      return doChat(messages, { ...opts, temperature: 0, maxTokens: 2048 })
    }
  )

  // ── Suggest rubric evolution ───────────────────────────
  ipcMain.handle(
    'ai:suggestRubricEvolution',
    async (
      _event,
      data: {
        currentRubric: string
        retroResults: Array<Record<string, unknown>>
      },
      opts: AIOptions = {}
    ) => {
      const retroSummary = data.retroResults
        .map((r, i) => {
          const da = r.deviationAnalysis as Array<Record<string, unknown>>
          return [
            `### 视频 ${i + 1}`,
            ...(da
              ? da.map(
                  (d) =>
                    `- ${d.dimension}: 预测${d.predictedScore}分 → 数据暗示${d.impliedByData}分 (偏差${d.deviation}) — ${d.explanation}`
                )
              : [])
          ].join('\n')
        })
        .join('\n\n')

      const messages: AIMessage[] = [
        { role: 'system', content: RUBRIC_EVOLUTION_PROMPT },
        {
          role: 'user',
          content: [
            '## 当前评分规则',
            data.currentRubric,
            '',
            '## 复盘数据汇总',
            retroSummary
          ].join('\n')
        }
      ]
      return doChat(messages, { ...opts, temperature: 0, maxTokens: 2048 })
    }
  )

  // ── Generate plan strategy ─────────────────────────────
  ipcMain.handle(
    'ai:generatePlanStrategy',
    async (
      _event,
      data: {
        persona: string
        topics: Array<{ title: string; angle: string; category: string }>
        industry?: string
        audience?: string
      },
      opts: AIOptions = {}
    ) => {
      const topicList = data.topics
        .map((t, i) => `${i + 1}. [${t.category}] ${t.title} — ${t.angle}`)
        .join('\n')

      const messages: AIMessage[] = [
        { role: 'system', content: PLAN_STRATEGY_PROMPT },
        {
          role: 'user',
          content: [
            `## 人设信息\n${data.persona || '（未提供）'}`,
            '',
            data.industry ? `## 行业\n${data.industry}` : '',
            data.audience ? `## 目标受众\n${data.audience}` : '',
            '',
            `## 已选选题（${data.topics.length} 个）\n${topicList}`,
            '',
            '请为以上选题组合生成内容策略。'
          ]
            .filter(Boolean)
            .join('\n')
        }
      ]
      return doChat(messages, { ...opts, temperature: 0.8, maxTokens: 2048 })
    }
  )

  // ── Conversational script chat ─────────────────────────
  ipcMain.handle(
    'ai:chatScript',
    async (
      _event,
      data: {
        messages: Array<{ role: string; content: string }>
        projectPath?: string
      },
      opts: AIOptions = {}
    ) => {
      const messages: AIMessage[] = [
        { role: 'system', content: SCRIPT_CHAT_PROMPT },
        ...data.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      ]
      return doChat(messages, {
        ...opts,
        maxTokens: opts.maxTokens || 4096,
        temperature: opts.temperature ?? 0.8
      })
    }
  )

  // ── Generate topic inspirations ────────────────────────
  ipcMain.handle(
    'ai:generateTopics',
    async (
      _event,
      opts: AIOptions & {
        industry?: string
        audience?: string
        experience?: string
        identity?: string
        retroInsights?: string
      } = {}
    ) => {
      const context = [
        opts.industry && `细分行业：${opts.industry}`,
        opts.identity && `个人身份定位：${opts.identity}`,
        opts.experience && `近期在做的事：${opts.experience}`,
        opts.audience && `目标受众：${opts.audience}`
      ]
        .filter(Boolean)
        .join('\n')

      const retroSection = opts.retroInsights
        ? `\n\n## 往期数据参考\n以下是以往表现较好的内容方向和关键收获，选题时优先参考：\n${opts.retroInsights}`
        : ''

      const messages: AIMessage[] = [
        { role: 'system', content: TOPIC_INSPIRATION_PROMPT },
        {
          role: 'user',
          content: context
            ? `## 用户背景\n${context}${retroSection}\n\n请生成 8 个选题建议。`
            : `请生成 8 个选题建议。${retroSection}`
        }
      ]
      return doChat(messages, { ...opts, temperature: 0.9, maxTokens: 3072 })
    }
  )

  // ── Blind prediction ──────────────────────────────────
  ipcMain.handle(
    'ai:predictScript',
    async (
      _event,
      data: {
        script: string
        scores: Record<string, number>
        total: number
        strengths: string[]
        weaknesses: string[]
        projectPath?: string
        mode?: 'cold-start' | 'calibration'
        benchmarkRef?: string
        historicalAnchors?: Array<{ name: string; composite: number; actualPlays: number }>
      },
      opts: AIOptions = {}
    ) => {
      const mode = data.mode || (
        data.projectPath ? detectMode(data.projectPath) : 'cold-start'
      )

      const modeNote = mode === 'cold-start'
        ? '\n\n## 模式提示\n当前为冷启动模式（校准样本 < 5）。你的预测应该：\n1. 概率分布更平（不要过度集中在某个 bucket）\n2. Confidence 标注为"🟠 低"\n3. 中枢给范围而不是单点，明确告诉用户前5条预测精度有限'
        : '\n\n## 模式提示\n当前为校准模式（校准样本 >= 5）。你的预测应该：\n1. 概率分布可以有明确的中枢倾向\n2. Confidence 标注为"🟡 偏低"到"🟢 中等"\n3. 锚点对比给出具体倍数预期'

      const messages: AIMessage[] = [
        { role: 'system', content: PREDICT_SCRIPT_PROMPT },
        {
          role: 'user',
          content: [
            '## 脚本内容',
            data.script,
            '',
            '## 7维评分',
            ...Object.entries(data.scores).map(([k, v]) => {
              const dimLabel: Record<string, string> = {
                hook: '开头抓人', rhythm: '节奏控制', sharpness: '观点锐度',
                utility: '实用价值', emotion: '情感冲击力', structure: '结构完整',
                expression: '表达力'
              }
              return `- ${dimLabel[k] || k}: ${v}/10`
            }),
            `总分: ${data.total.toFixed(1)}/10`,
            '',
            '## 优势',
            ...data.strengths.map(s => `- ${s}`),
            '',
            '## 待改进',
            ...data.weaknesses.map(w => `- ${w}`),
            data.benchmarkRef ? `\n## 对标账号\n${data.benchmarkRef}` : '',
            data.historicalAnchors && data.historicalAnchors.length > 0
              ? `\n## 历史锚点（用于锚点对比）\n${data.historicalAnchors.map(a =>
                  `- ${a.name}: composite ${a.composite}/10, 实际播放 ${a.actualPlays}`
                ).join('\n')}`
              : '',
            modeNote
          ].filter(Boolean).join('\n')
        }
      ]
      return doChat(messages, { ...opts, temperature: 0.3, maxTokens: 3072 })
    }
  )
}
