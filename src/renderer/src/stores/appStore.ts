import { create } from 'zustand'

interface ActivityEntry {
  type: 'script_saved' | 'script_published' | 'retro_completed' | 'rubric_evolved' | 'plan_created' | 'plan_completed'
  timestamp: string
  label: string
  detail?: string
  scriptFile?: string
  planId?: string
  predictionFile?: string
  navTarget?: 'script-editor' | 'retro' | 'plan-editor' | 'publish'
}

interface Project {
  id: string
  name: string
  path: string
  createdAt: string
  opts: Record<string, unknown>
  state: {
    phase: string
    totalPublished: number
    totalPredicted: number
    bufferCount: number
    activities: ActivityEntry[]
  }
}

// Provider key names stored in settings
const PROVIDER_IDS = [
  'deepseek',
  'openai',
  'anthropic',
  'kimi',
  'zhipu',
  'qwen',
  'doubao'
] as const

type ProviderId = (typeof PROVIDER_IDS)[number]

interface AppState {
  // Projects
  projects: Project[]
  activeProject: Project | null
  loadProjects: () => Promise<void>
  refreshActiveProject: () => Promise<void>
  setActiveProject: (id: string) => void

  // Navigation
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  // AI Settings
  aiProvider: string
  setAIProvider: (provider: string) => Promise<void>

  // Per-provider keys
  deepseekKey: string
  openaiKey: string
  anthropicKey: string
  kimiKey: string
  zhipuKey: string
  qwenKey: string
  doubaoKey: string

  setProviderKey: (provider: string, key: string) => Promise<void>
  getProviderKey: (provider: string) => string
  loadSettings: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  // ── Projects ──
  projects: [],
  activeProject: null,

  loadProjects: async (forceActiveLast?: boolean) => {
    try {
      const projects = await window.api.listProjects()
      const typedProjects = projects as unknown as Project[]
      set({ projects: typedProjects })
      if (forceActiveLast && typedProjects.length > 0) {
        // Set the last (most recently created) project as active
        set({ activeProject: typedProjects[typedProjects.length - 1] })
      } else if (!get().activeProject && typedProjects.length > 0) {
        set({ activeProject: typedProjects[0] })
      }
      // Refresh active project with latest data
      const currentId = get().activeProject?.id
      if (currentId) {
        const refreshed = typedProjects.find((p) => p.id === currentId)
        if (refreshed) set({ activeProject: refreshed })
      }
    } catch (err) {
      console.error('Failed to load projects:', err)
    }
  },

  refreshActiveProject: async () => {
    const active = get().activeProject
    if (!active) return
    try {
      const project = await window.api.getProject(active.id)
      if (project) set({ activeProject: project as unknown as Project })
    } catch (err) {
      console.error('Failed to refresh project:', err)
    }
  },

  setActiveProject: (id: string) => {
    const project = get().projects.find((p) => p.id === id) || null
    set({ activeProject: project })
  },

  // ── Navigation ──
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // ── AI Settings ──
  aiProvider: 'deepseek',

  // Per-provider keys
  deepseekKey: '',
  openaiKey: '',
  anthropicKey: '',
  kimiKey: '',
  zhipuKey: '',
  qwenKey: '',
  doubaoKey: '',

  setAIProvider: async (provider: string) => {
    await window.api.setSetting('aiProvider', provider)
    set({ aiProvider: provider })
  },

  setProviderKey: async (provider: string, key: string) => {
    await window.api.setSetting(`${provider}ApiKey`, key)
    // Update the matching state key
    const keyMap: Record<string, keyof AppState> = {
      deepseek: 'deepseekKey',
      openai: 'openaiKey',
      anthropic: 'anthropicKey',
      kimi: 'kimiKey',
      zhipu: 'zhipuKey',
      qwen: 'qwenKey',
      doubao: 'doubaoKey'
    }
    const stateKey = keyMap[provider]
    if (stateKey) {
      set({ [stateKey]: key } as Partial<AppState>)
    }
    await window.api.resetAIClient()
  },

  getProviderKey: (provider: string) => {
    const keyMap: Record<string, string> = {
      deepseek: get().deepseekKey,
      openai: get().openaiKey,
      anthropic: get().anthropicKey,
      kimi: get().kimiKey,
      zhipu: get().zhipuKey,
      qwen: get().qwenKey,
      doubao: get().doubaoKey
    }
    return keyMap[provider] || ''
  },

  loadSettings: async () => {
    try {
      const provider = await window.api.getSetting('aiProvider')
      // Load all provider keys in parallel
      const keys = await Promise.all(
        PROVIDER_IDS.map((id) => window.api.getSetting(`${id}ApiKey`))
      )
      set({
        aiProvider: (provider as string) || 'deepseek',
        deepseekKey: (keys[0] as string) || '',
        openaiKey: (keys[1] as string) || '',
        anthropicKey: (keys[2] as string) || '',
        kimiKey: (keys[3] as string) || '',
        zhipuKey: (keys[4] as string) || '',
        qwenKey: (keys[5] as string) || '',
        doubaoKey: (keys[6] as string) || ''
      })
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }
}))
