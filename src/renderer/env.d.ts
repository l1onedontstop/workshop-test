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

    // Settings
    getSetting: (key: string) => Promise<unknown>
    setSetting: (key: string, value: unknown) => Promise<boolean>
    getAllSettings: () => Promise<Record<string, unknown>>
  }
}
