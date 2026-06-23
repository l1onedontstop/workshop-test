import { contextBridge, ipcRenderer } from 'electron'

// Expose protected APIs to the renderer process
contextBridge.exposeInMainWorld('api', {
  // ── Project ──
  createProject: (name: string, opts: Record<string, unknown>) =>
    ipcRenderer.invoke('project:create', name, opts),

  listProjects: () => ipcRenderer.invoke('project:list'),

  getProject: (id: string) => ipcRenderer.invoke('project:get', id),

  updateProjectState: (projectPath: string, updates: Record<string, unknown>) =>
    ipcRenderer.invoke('project:updateState', projectPath, updates),

  logActivity: (
    projectPath: string,
    entry: {
      type: string
      timestamp: string
      label: string
      detail?: string
      scriptFile?: string
    }
  ) => ipcRenderer.invoke('project:logActivity', projectPath, entry),

  listScripts: (projectPath: string) =>
    ipcRenderer.invoke('project:listScripts', projectPath),

  listPredictions: (projectPath: string) =>
    ipcRenderer.invoke('project:listPredictions', projectPath),

  evolveRubric: (projectPath: string, evolutionData: Record<string, unknown>) =>
    ipcRenderer.invoke('project:evolveRubric', projectPath, evolutionData),

  readRubric: (projectPath: string) =>
    ipcRenderer.invoke('project:readRubric', projectPath),

  deleteScript: (projectPath: string, scriptFileName: string) =>
    ipcRenderer.invoke('project:deleteScript', projectPath, scriptFileName),

  resetProject: (projectPath: string) =>
    ipcRenderer.invoke('project:resetProject', projectPath),

  deleteProject: (projectPath: string) =>
    ipcRenderer.invoke('project:delete', projectPath),

  // Plan management
  createPlan: (projectPath: string, name: string) =>
    ipcRenderer.invoke('project:createPlan', projectPath, name),

  listPlans: (projectPath: string) =>
    ipcRenderer.invoke('project:listPlans', projectPath),

  getPlan: (projectPath: string, planId: string) =>
    ipcRenderer.invoke('project:getPlan', projectPath, planId),

  updatePlan: (projectPath: string, planId: string, updates: Record<string, unknown>) =>
    ipcRenderer.invoke('project:updatePlan', projectPath, planId, updates),

  deletePlan: (projectPath: string, planId: string) =>
    ipcRenderer.invoke('project:deletePlan', projectPath, planId),

  // ── File operations ──
  readFile: (path: string) => ipcRenderer.invoke('file:read', path),

  writeFile: (path: string, content: string) =>
    ipcRenderer.invoke('file:write', path, content),

  listDir: (path: string) => ipcRenderer.invoke('file:list', path),

  fileExists: (path: string) => ipcRenderer.invoke('file:exists', path),

  // ── AI ──
  aiChat: (messages: Array<{ role: string; content: string }>, opts?: Record<string, unknown>) =>
    ipcRenderer.invoke('ai:chat', messages, opts || {}),

  scoreScript: (script: string, opts?: Record<string, unknown>) =>
    ipcRenderer.invoke('ai:scoreScript', script, opts || {}),

  writeScript: (topic: string, opts?: Record<string, unknown>) =>
    ipcRenderer.invoke('ai:writeScript', topic, opts || {}),

  optimizeScript: (data: { script: string; weaknesses: string[]; suggestions: string[]; topic?: string }, opts?: Record<string, unknown>) =>
    ipcRenderer.invoke('ai:optimizeScript', data, opts || {}),

  generateTopics: (opts?: Record<string, unknown>) =>
    ipcRenderer.invoke('ai:generateTopics', opts || {}),

  generatePublishPack: (script: string, opts?: Record<string, unknown>) =>
    ipcRenderer.invoke('ai:generatePublishPack', script, opts || {}),

  analyzeRetro: (data: Record<string, unknown>, opts?: Record<string, unknown>) =>
    ipcRenderer.invoke('ai:analyzeRetro', data, opts || {}),

  suggestRubricEvolution: (data: Record<string, unknown>, opts?: Record<string, unknown>) =>
    ipcRenderer.invoke('ai:suggestRubricEvolution', data, opts || {}),

  generatePlanStrategy: (
    data: {
      persona: string
      topics: Array<{ title: string; angle: string; category: string }>
      industry?: string
      audience?: string
    },
    opts?: Record<string, unknown>
  ) => ipcRenderer.invoke('ai:generatePlanStrategy', data, opts || {}),

  resetAIClient: () => ipcRenderer.invoke('ai:resetClient'),

  // ── Settings ──
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),

  setSetting: (key: string, value: unknown) =>
    ipcRenderer.invoke('settings:set', key, value),

  getAllSettings: () => ipcRenderer.invoke('settings:getAll'),

  // ── Benchmark ──
  benchmarkImport: (
    projectPath: string,
    accountInfo: { name: string; platform: string; url: string; notes?: string }
  ) => ipcRenderer.invoke('benchmark:import', projectPath, accountInfo),

  benchmarkList: (projectPath: string) =>
    ipcRenderer.invoke('benchmark:list', projectPath),

  benchmarkAnalyze: (projectPath: string, accountName: string) =>
    ipcRenderer.invoke('benchmark:analyze', projectPath, accountName),

  benchmarkCrossSummary: (projectPath: string) =>
    ipcRenderer.invoke('benchmark:crossSummary', projectPath),

  // ── Calibration ──
  calibrationPool: (projectPath: string) =>
    ipcRenderer.invoke('calibration:pool', projectPath),

  calibrationRescore: (projectPath: string, samples: unknown[]) =>
    ipcRenderer.invoke('calibration:rescore', projectPath, samples),

  calibrationCrossModelAudit: (
    projectPath: string,
    samples: unknown[],
    primaryModel: string,
    auditModel: string
  ) =>
    ipcRenderer.invoke(
      'calibration:crossModelAudit',
      projectPath,
      samples,
      primaryModel,
      auditModel
    ),

  // ── Pool ──
  poolList: (projectPath: string) =>
    ipcRenderer.invoke('pool:list', projectPath),

  poolAdd: (projectPath: string, topics: unknown[]) =>
    ipcRenderer.invoke('pool:add', projectPath, topics),

  poolUpdate: (projectPath: string, topicId: string, updates: unknown) =>
    ipcRenderer.invoke('pool:update', projectPath, topicId, updates),

  poolRecommend: (projectPath: string, opts?: unknown) =>
    ipcRenderer.invoke('pool:recommend', projectPath, opts),

  // ── Trend ──
  trendSources: () => ipcRenderer.invoke('trend:sources'),

  trendFetch: (sourceId: string) =>
    ipcRenderer.invoke('trend:fetch', sourceId),

  trendMatch: (
    projectPath: string,
    trends: unknown[],
    profile: { industry: string; identity: string; audience: string }
  ) => ipcRenderer.invoke('trend:match', projectPath, trends, profile),

  // ── Persona ──
  personaBuild: (projectPath: string) =>
    ipcRenderer.invoke('persona:build', projectPath),

  personaGet: (projectPath: string) =>
    ipcRenderer.invoke('persona:get', projectPath),

  personaClear: (projectPath: string) =>
    ipcRenderer.invoke('persona:clear', projectPath),

  // ── New APIs (v0.5+) ──
  searchProjects: (query: string) => ipcRenderer.invoke('project:search', query),
  archiveProject: (projectPath: string) => ipcRenderer.invoke('project:archive', projectPath),
  unarchiveProject: (projectPath: string) => ipcRenderer.invoke('project:unarchive', projectPath),
  setTags: (projectPath: string, tags: string[]) => ipcRenderer.invoke('project:setTags', projectPath, tags),
  getTags: (projectPath: string) => ipcRenderer.invoke('project:getTags', projectPath),
  batchStats: (projectPath: string) => ipcRenderer.invoke('project:batchStats', projectPath),

  backupList: (projectPath: string, filename: string) => ipcRenderer.invoke('backup:list', projectPath, filename),
  backupRestore: (projectPath: string, bf: string, of: string) => ipcRenderer.invoke('backup:restore', projectPath, bf, of),
  aiQueueStatus: () => ipcRenderer.invoke('ai:queueStatus'),
  aiQueueReset: () => ipcRenderer.invoke('ai:queueReset'),
  reportError: (data: unknown) => ipcRenderer.invoke('error:report', data),
  classifyError: (msg: string) => ipcRenderer.invoke('error:classify', msg),

  offlineScoreScript: (script: string) => ipcRenderer.invoke('offline:scoreScript', script),
  offlineTopicTemplates: () => ipcRenderer.invoke('offline:topicTemplates'),
  offlinePublishPack: (script: string) => ipcRenderer.invoke('offline:publishPackTemplate', script),
  offlineHealthCheck: () => ipcRenderer.invoke('offline:healthCheck'),

  dashboardOverview: () => ipcRenderer.invoke('dashboard:overview'),
  dashboardTrends: (projectPath: string) => ipcRenderer.invoke('dashboard:trends', projectPath),
  dashboardWeekly: () => ipcRenderer.invoke('dashboard:weekly'),

  templateList: () => ipcRenderer.invoke('template:list'),
  templateGet: (id: string) => ipcRenderer.invoke('template:get', id),
  templateApply: (projectPath: string, templateId: string) => ipcRenderer.invoke('template:apply', projectPath, templateId),

  onboardingStatus: () => ipcRenderer.invoke('onboarding:status'),
  onboardingComplete: (projectId: string) => ipcRenderer.invoke('onboarding:complete', projectId),
  onboardingSteps: () => ipcRenderer.invoke('onboarding:steps'),

  feedbackSubmit: (data: unknown) => ipcRenderer.invoke('feedback:submit', data),
  feedbackFAQ: (category?: string) => ipcRenderer.invoke('feedback:faq', category),
  feedbackReport: (data: unknown) => ipcRenderer.invoke('feedback:report', data),

  exportChecklist: (data: unknown) => ipcRenderer.invoke('export:checklist', data),
  exportTeleprompter: (script: string) => ipcRenderer.invoke('export:teleprompter', script),
  exportCSV: (predictions: unknown[]) => ipcRenderer.invoke('export:csv', predictions),

  ttsGenerate: (text: string, opts?: unknown) => ipcRenderer.invoke('tts:generate', text, opts || {}),
  ttsVoices: () => ipcRenderer.invoke('tts:voices'),
  coverTemplates: () => ipcRenderer.invoke('cover:templates'),
  coverGeneratePrompt: (data: unknown) => ipcRenderer.invoke('cover:generatePrompt', data),
  subtitleGenerate: (data: unknown) => ipcRenderer.invoke('subtitle:generate', data),
  videoInfo: () => ipcRenderer.invoke('video:info'),
  videoCompose: (data: unknown) => ipcRenderer.invoke('video:compose', data),
  // ── Cadence / Buffer ──
  cadenceBuffer: (projectPath: string) => ipcRenderer.invoke('cadence:buffer', projectPath),
  cadenceShoot: (projectPath: string, videoId: string, scriptFile: string) => ipcRenderer.invoke('cadence:shoot', projectPath, videoId, scriptFile),
  cadencePublish: (projectPath: string, videoId: string, publishData: unknown) => ipcRenderer.invoke('cadence:publish', projectPath, videoId, publishData),
  cadenceReport: () => ipcRenderer.invoke('cadence:report'),
  // ── Prediction Guard ──
  predictionDetectMode: (projectPath: string) => ipcRenderer.invoke('prediction:detectMode', projectPath),
  predictionValidate: (path: string, data: unknown) => ipcRenderer.invoke('prediction:validate', path, data),
  // ── IP Strategy ──
  ipStrategyGenerate: (answers: Record<string, string>) => ipcRenderer.invoke('ip-strategy:generate', answers),
  ipStrategyGet: (projectPath: string) => ipcRenderer.invoke('ip-strategy:get', projectPath),
  ipStrategySave: (projectPath: string, blueprint: unknown) => ipcRenderer.invoke('ip-strategy:save', projectPath, blueprint),
  ipStrategyRefine: (blueprint: unknown, feedback: string, answers?: Record<string, string>) => ipcRenderer.invoke('ip-strategy:refine', blueprint, feedback, answers || {}),

  // ── App version ──
  getVersion: () => ipcRenderer.invoke('app:getVersion')
})
