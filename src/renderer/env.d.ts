/// <reference types="vite/client" />

interface Window {
  api: {
    // Project management
    createProject: (name: string, opts: Record<string, unknown>) => Promise<unknown>
    listProjects: () => Promise<unknown[]>
    getProject: (id: string) => Promise<unknown | null>
    updateProjectState: (projectPath: string, updates: Record<string, unknown>) => Promise<unknown>
    logActivity: (
      projectPath: string,
      entry: {
        type: string
        timestamp: string
        label: string
        detail?: string
        scriptFile?: string
      }
    ) => Promise<unknown>
    listScripts: (projectPath: string) => Promise<Array<{ name: string; path: string }>>
    listPredictions: (projectPath: string) => Promise<Array<{ name: string; path: string }>>
    evolveRubric: (projectPath: string, evolutionData: Record<string, unknown>) => Promise<unknown>
    readRubric: (projectPath: string) => Promise<string>
    deleteScript: (projectPath: string, scriptFileName: string) => Promise<unknown>
    resetProject: (projectPath: string) => Promise<unknown>
    deleteProject: (projectPath: string) => Promise<unknown>

    // Plan management
    createPlan: (projectPath: string, name: string) => Promise<unknown>
    listPlans: (projectPath: string) => Promise<unknown[]>
    getPlan: (projectPath: string, planId: string) => Promise<unknown | null>
    updatePlan: (projectPath: string, planId: string, updates: Record<string, unknown>) => Promise<unknown>
    deletePlan: (projectPath: string, planId: string) => Promise<unknown>

    // File operations
    readFile: (path: string) => Promise<string>
    writeFile: (path: string, content: string) => Promise<void>
    listDir: (path: string) => Promise<unknown[]>
    fileExists: (path: string) => Promise<boolean>

    // AI operations
    aiChat: (
      messages: Array<{ role: string; content: string }>,
      opts?: Record<string, unknown>
    ) => Promise<string>

    scoreScript: (script: string, opts?: Record<string, unknown>) => Promise<string>
    writeScript: (topic: string, opts?: Record<string, unknown>) => Promise<string>
    generateTopics: (opts?: Record<string, unknown>) => Promise<string>
    generatePublishPack: (script: string, opts?: Record<string, unknown>) => Promise<string>
    analyzeRetro: (data: Record<string, unknown>, opts?: Record<string, unknown>) => Promise<string>
    suggestRubricEvolution: (data: Record<string, unknown>, opts?: Record<string, unknown>) => Promise<string>
    generatePlanStrategy: (
      data: {
        persona: string
        topics: Array<{ title: string; angle: string; category: string }>
        industry?: string
        audience?: string
      },
      opts?: Record<string, unknown>
    ) => Promise<string>

    resetAIClient: () => Promise<void>

    // Persona
    personaBuild: (projectPath: string) => Promise<unknown>
    personaGet: (projectPath: string) => Promise<unknown | null>
    personaClear: (projectPath: string) => Promise<unknown>

    // Settings
    getSetting: (key: string) => Promise<unknown>
    setSetting: (key: string, value: unknown) => Promise<boolean>
    getAllSettings: () => Promise<Record<string, unknown>>

    // Benchmark
    benchmarkImport: (
      projectPath: string,
      accountInfo: { name: string; platform: string; url: string; notes?: string }
    ) => Promise<unknown>
    benchmarkList: (projectPath: string) => Promise<unknown[]>
    benchmarkAnalyze: (projectPath: string, accountName: string) => Promise<unknown>
    benchmarkCrossSummary: (projectPath: string) => Promise<unknown>

    // Calibration
    calibrationPool: (projectPath: string) => Promise<unknown>
    calibrationRescore: (projectPath: string, samples: unknown[]) => Promise<unknown>
    calibrationCrossModelAudit: (
      projectPath: string,
      samples: unknown[],
      primaryModel: string,
      auditModel: string
    ) => Promise<unknown>

    // Pool
    poolList: (projectPath: string) => Promise<unknown[]>
    poolAdd: (projectPath: string, topics: unknown[]) => Promise<unknown>
    poolUpdate: (projectPath: string, topicId: string, updates: unknown) => Promise<unknown>
    poolRecommend: (projectPath: string, opts?: unknown) => Promise<unknown>

    // Trend
    trendSources: () => Promise<unknown[]>
    trendFetch: (sourceId: string) => Promise<unknown>
    trendMatch: (
      projectPath: string,
      trends: unknown[],
      profile: { industry: string; identity: string; audience: string }
    ) => Promise<unknown>

    // Search / Archive / Tags
    searchProjects: (query: string) => Promise<unknown[]>
    archiveProject: (projectPath: string) => Promise<unknown>
    unarchiveProject: (projectPath: string) => Promise<unknown>
    setTags: (projectPath: string, tags: string[]) => Promise<unknown>
    getTags: (projectPath: string) => Promise<string[]>
    batchStats: (projectPath: string) => Promise<unknown>

    // Backup
    backupList: (projectPath: string, filename: string) => Promise<unknown>
    backupRestore: (projectPath: string, backupFile: string, outputFile: string) => Promise<unknown>

    // Queue
    aiQueueStatus: () => Promise<unknown>
    aiQueueReset: () => Promise<unknown>

    // Error reporting
    reportError: (data: unknown) => Promise<unknown>
    classifyError: (msg: string) => Promise<unknown>

    // Offline
    offlineScoreScript: (script: string) => Promise<unknown>
    offlineTopicTemplates: () => Promise<unknown>
    offlinePublishPack: (script: string) => Promise<unknown>
    offlineHealthCheck: () => Promise<unknown>

    // Dashboard
    dashboardOverview: () => Promise<unknown>
    dashboardTrends: (projectPath: string) => Promise<unknown>
    dashboardWeekly: () => Promise<unknown>

    // Template
    templateList: () => Promise<unknown[]>
    templateGet: (id: string) => Promise<unknown>
    templateApply: (projectPath: string, templateId: string) => Promise<unknown>

    // Onboarding
    onboardingStatus: () => Promise<unknown>
    onboardingComplete: (projectId: string) => Promise<unknown>
    onboardingSteps: () => Promise<unknown>

    // Feedback
    feedbackSubmit: (data: unknown) => Promise<unknown>
    feedbackFAQ: (category?: string) => Promise<unknown>
    feedbackReport: (data: unknown) => Promise<unknown>

    // Export
    exportChecklist: (data: unknown) => Promise<unknown>
    exportTeleprompter: (script: string) => Promise<unknown>
    exportCSV: (predictions: unknown[]) => Promise<unknown>

    // TTS
    ttsGenerate: (text: string, opts?: unknown) => Promise<unknown>
    ttsVoices: () => Promise<unknown>

    // Cover
    coverTemplates: () => Promise<unknown>
    coverGeneratePrompt: (data: unknown) => Promise<unknown>

    // Subtitle
    subtitleGenerate: (data: unknown) => Promise<unknown>

    // Video
    videoInfo: () => Promise<unknown>
    videoCompose: (data: unknown) => Promise<unknown>

    // Cadence / Buffer
    cadenceBuffer: (projectPath: string) => Promise<unknown>
    cadenceShoot: (projectPath: string, videoId: string, scriptFile: string) => Promise<unknown>
    cadencePublish: (projectPath: string, videoId: string, publishData: unknown) => Promise<unknown>
    cadenceReport: () => Promise<unknown>

    // Prediction Guard
    predictionDetectMode: (projectPath: string) => Promise<unknown>
    predictionValidate: (path: string, data: unknown) => Promise<unknown>

    // IP Strategy Blueprint
    ipStrategyGenerate: (answers: Record<string, string>) => Promise<unknown>
    ipStrategyGet: (projectPath: string) => Promise<unknown>
    ipStrategySave: (projectPath: string, blueprint: unknown) => Promise<unknown>
    ipStrategyRefine: (blueprint: unknown, feedback: string, answers?: Record<string, string>) => Promise<unknown>

    // App version
    getVersion: () => Promise<string>
  }
}
