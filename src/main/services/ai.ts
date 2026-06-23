import { ipcMain } from 'electron'
import Store from './store'
import {
  RUBRIC_SYSTEM_PROMPT,
  SCRIPT_WRITER_PROMPT,
  OPTIMIZE_SCRIPT_PROMPT,
  PUBLISH_PACK_PROMPT,
  RETRO_ANALYSIS_PROMPT,
  RUBRIC_EVOLUTION_PROMPT,
  TOPIC_INSPIRATION_PROMPT,
  PLAN_STRATEGY_PROMPT,
  loadProjectWeights,
  buildRubricPrompt,
  buildScriptWriterPrompt
} from './rubric'

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

      const userPrompt = userContext
        ? `背景：${userContext}\n\n请根据以下主题写一篇短视频脚本：${topic}`
        : `请根据以下主题写一篇短视频脚本：${topic}`

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
}
