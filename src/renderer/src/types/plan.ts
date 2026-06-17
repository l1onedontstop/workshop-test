// ── ContentPlan data model ─────────────────────────────────
//
// 方案 = 人设 + 选题组 + 策略 + 批量脚本 + 排期
// 存储：plans/<uuid>.json
// 脚本独立存储在 scripts/ 下，plan 通过 scriptFile 引用

export interface TopicEntry {
  title: string
  angle: string
  hook: string
  audienceResonance: string
  difficulty: number
  category: string
  reason: string
  /** Selected in the plan (from topic candidates) */
  selected?: boolean
  /** Script file generated for this topic, relative to scripts/ */
  scriptFile?: string
  /** Scheduled publish date */
  scheduledDate?: string
}

export interface ContentStrategy {
  contentPillars: string[]
  publishCadence: string
  personaAdvice: string
  riskWarnings: string[]
  overallAdvice: string
}

export interface ContentPlan {
  id: string
  name: string
  projectPath: string
  createdAt: string
  updatedAt: string

  /** Phase 1: Persona */
  persona: {
    rawNotes: string
    aiTraits?: string[]
  }

  /** Phase 2: Topic selection */
  selectedTopics: TopicEntry[]

  /** Phase 3: Strategy */
  strategy?: ContentStrategy

  /** Phase 4: Script generation progress */
  scriptsGenerated: number
  scriptsTotal: number

  /** Phase 5: Schedule */
  schedule?: Array<{
    date: string
    topicTitle: string
    scriptFile?: string
  }>

  /** Plan status */
  status: 'draft' | 'topics_selected' | 'strategy_ready' | 'scripts_generated' | 'scheduled' | 'completed'
}
