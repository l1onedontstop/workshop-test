import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import { join, basename } from 'path'
import { homedir } from 'os'
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'fs'

const WORKSPACE_ROOT = join(homedir(), 'IP工坊', 'projects')

function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true })
  }
}

function projectPath(name: string): string {
  return join(WORKSPACE_ROOT, name)
}

// ── Internal helpers ──────────────────────────────────────

interface ProjectState {
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

function readProjectState(projectPath: string): ProjectState | null {
  const statePath = join(projectPath, 'state.json')
  if (!existsSync(statePath)) return null
  try {
    return JSON.parse(readFileSync(statePath, 'utf-8'))
  } catch {
    return null
  }
}

function writeProjectState(projectPath: string, state: ProjectState): void {
  writeFileSync(join(projectPath, 'state.json'), JSON.stringify(state, null, 2), 'utf-8')
}

export function registerProjectHandlers(): void {
  // Create a new project
  ipcMain.handle('project:create', async (_event, name: string, opts: Record<string, unknown>) => {
    const id = randomUUID()
    const path = projectPath(name)

    ensureDir(path)
    ensureDir(join(path, 'scripts'))
    ensureDir(join(path, 'predictions'))
    ensureDir(join(path, 'videos'))

    const project: ProjectState = {
      id,
      name,
      path,
      createdAt: new Date().toISOString(),
      opts,
      state: {
        phase: 'onboarding',
        totalPublished: 0,
        totalPredicted: 0,
        bufferCount: 0,
        activities: []
      }
    }

    writeFileSync(join(path, 'state.json'), JSON.stringify(project, null, 2), 'utf-8')

    // Initialize rubric file if it doesn't exist
    const rubricPath = join(path, 'rubric.md')
    if (!existsSync(rubricPath)) {
      writeFileSync(rubricPath, generateInitialRubric(), 'utf-8')
    }

    return project
  })

  // List all projects
  ipcMain.handle('project:list', async () => {
    ensureDir(WORKSPACE_ROOT)
    const dirs = readdirSync(WORKSPACE_ROOT, { withFileTypes: true })
    const projects = []

    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const statePath = join(WORKSPACE_ROOT, dir.name, 'state.json')
        if (existsSync(statePath)) {
          try {
            const state = JSON.parse(readFileSync(statePath, 'utf-8'))
            // Ensure activities array exists for older projects
            if (!state.state.activities) {
              state.state.activities = []
            }
            projects.push(state)
          } catch {
            // Skip invalid projects
          }
        }
      }
    }

    return projects
  })

  // Get a single project
  ipcMain.handle('project:get', async (_event, id: string) => {
    const projects = await listProjectsInternal()
    return projects.find((p) => (p as ProjectState).id === id) || null
  })

  // ── Update project state ──────────────────────────────────
  ipcMain.handle('project:updateState', async (_event, projectPath: string, updates: Record<string, unknown>) => {
    const state = readProjectState(projectPath)
    if (!state) throw new Error(`Project not found at ${projectPath}`)
    Object.assign(state.state, updates)
    writeProjectState(projectPath, state)
    return state
  })

  // ── Log activity ──────────────────────────────────────────
  ipcMain.handle('project:logActivity', async (_event, projectPath: string, entry: ActivityEntry) => {
    const state = readProjectState(projectPath)
    if (!state) throw new Error(`Project not found at ${projectPath}`)
    if (!state.state.activities) state.state.activities = []
    // Prepend so newest is first
    state.state.activities.unshift(entry)
    // Keep max 50 entries
    if (state.state.activities.length > 50) {
      state.state.activities = state.state.activities.slice(0, 50)
    }
    writeProjectState(projectPath, state)
    return state
  })

  // ── List scripts in project ───────────────────────────────
  ipcMain.handle('project:listScripts', async (_event, projectPath: string) => {
    const scriptsDir = join(projectPath, 'scripts')
    ensureDir(scriptsDir)
    const entries = readdirSync(scriptsDir, { withFileTypes: true })
    return entries
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => ({
        name: e.name,
        path: join(scriptsDir, e.name)
      }))
      .sort((a, b) => b.name.localeCompare(a.name)) // newest first by date prefix
  })

  // ── List predictions in project ───────────────────────────
  ipcMain.handle('project:listPredictions', async (_event, projectPath: string) => {
    const predDir = join(projectPath, 'predictions')
    ensureDir(predDir)
    const entries = readdirSync(predDir, { withFileTypes: true })
    return entries
      .filter((e) => e.isFile() && e.name.endsWith('.json'))
      .map((e) => ({
        name: e.name,
        path: join(predDir, e.name)
      }))
      .sort((a, b) => b.name.localeCompare(a.name))
  })

  // ── Evolve rubric ─────────────────────────────────────────
  ipcMain.handle('project:evolveRubric', async (_event, projectPath: string, evolutionData: Record<string, unknown>) => {
    const rubricPath = join(projectPath, 'rubric.md')
    const currentRubric = existsSync(rubricPath) ? readFileSync(rubricPath, 'utf-8') : generateInitialRubric()

    // Parse current version
    const versionMatch = currentRubric.match(/当前版本：v(\d+)/)
    const currentVersion = versionMatch ? parseInt(versionMatch[1]) : 1
    const newVersion = currentVersion + 1

    // Build evolution record entry
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const weightChanges = evolutionData.weightChanges as Array<Record<string, unknown>> || []
    const rationale = evolutionData.rationale as string || ''
    const warnings = evolutionData.warnings as string[] || []

    const evoEntry = [
      '',
      `### v${newVersion} (${now})`,
      '',
      `**调整理由**：${rationale}`,
      '',
      '**权重变化**：',
      ...weightChanges.map((wc) =>
        `- ${wc.dimension}: ${((wc.oldWeight as number) * 100).toFixed(0)}% → ${((wc.newWeight as number) * 100).toFixed(0)}% — ${wc.reason}`
      ),
      '',
      warnings.length > 0 ? '**风险提示**：' : '',
      ...warnings.map((w) => `- ⚠️ ${w}`),
      ''
    ].join('\n')

    // Update version tag
    let updated = currentRubric.replace(
      /当前版本：v\d+/,
      `当前版本：v${newVersion}`
    )

    // Append evolution entry
    updated += evoEntry

    writeFileSync(rubricPath, updated, 'utf-8')

    return {
      version: `v${newVersion}`,
      rubricPath,
      updated
    }
  })

  // ── Read rubric file ──────────────────────────────────────
  ipcMain.handle('project:readRubric', async (_event, projectPath: string) => {
    const rubricPath = join(projectPath, 'rubric.md')
    if (!existsSync(rubricPath)) return ''
    return readFileSync(rubricPath, 'utf-8')
  })

  // ── Delete a single script + its prediction ──────────────
  ipcMain.handle('project:deleteScript', async (_event, projectPath: string, scriptFileName: string) => {
    const scriptPath = join(projectPath, 'scripts', scriptFileName)
    if (existsSync(scriptPath)) {
      rmSync(scriptPath)
    }

    // Try to delete matching prediction file
    const predBaseName = scriptFileName.replace(/\.md$/, '.json')
    const predPath = join(projectPath, 'predictions', predBaseName)
    if (existsSync(predPath)) {
      rmSync(predPath)
    }

    // Update project state counters
    const state = readProjectState(projectPath)
    if (state) {
      if (state.state.totalPredicted > 0) {
        state.state.totalPredicted = Math.max(0, state.state.totalPredicted - 1)
      }
      state.state.activities.unshift({
        type: 'script_saved',
        timestamp: new Date().toISOString(),
        label: `删除脚本：${scriptFileName}`,
        scriptFile: scriptFileName
      })
      if (state.state.activities.length > 50) {
        state.state.activities = state.state.activities.slice(0, 50)
      }
      writeProjectState(projectPath, state)
    }

    return { success: true, deleted: scriptFileName }
  })

  // ── Reset project: clear scripts + predictions ───────────
  ipcMain.handle('project:resetProject', async (_event, projectPath: string) => {
    const scriptsDir = join(projectPath, 'scripts')
    const predDir = join(projectPath, 'predictions')

    // Clear scripts directory
    if (existsSync(scriptsDir)) {
      const scriptFiles = readdirSync(scriptsDir)
      for (const f of scriptFiles) {
        rmSync(join(scriptsDir, f))
      }
    }
    ensureDir(scriptsDir)

    // Clear predictions directory
    if (existsSync(predDir)) {
      const predFiles = readdirSync(predDir)
      for (const f of predFiles) {
        rmSync(join(predDir, f))
      }
    }
    ensureDir(predDir)

    // Reset counters in state
    const state = readProjectState(projectPath)
    if (state) {
      state.state.totalPredicted = 0
      state.state.totalPublished = 0
      state.state.bufferCount = 0
      state.state.activities.unshift({
        type: 'script_saved',
        timestamp: new Date().toISOString(),
        label: '🔄 项目数据已重置',
        detail: '已清空所有脚本和预测数据'
      })
      if (state.state.activities.length > 50) {
        state.state.activities = state.state.activities.slice(0, 50)
      }
      writeProjectState(projectPath, state)
    }

    return { success: true }
  })

  // ═══════════════════════════════════════════════════════════
  // ── Content Plans ─────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle('project:createPlan', async (_event, projectPath: string, name: string) => {
    const plansDir = join(projectPath, 'plans')
    ensureDir(plansDir)

    const id = randomUUID()
    const plan = {
      id,
      name,
      projectPath,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      persona: { rawNotes: '', aiTraits: [] },
      selectedTopics: [],
      scriptsGenerated: 0,
      scriptsTotal: 0,
      status: 'draft'
    }

    writeFileSync(join(plansDir, `${id}.json`), JSON.stringify(plan, null, 2), 'utf-8')
    return plan
  })

  ipcMain.handle('project:listPlans', async (_event, projectPath: string) => {
    const plansDir = join(projectPath, 'plans')
    ensureDir(plansDir)
    const entries = readdirSync(plansDir, { withFileTypes: true })
    return entries
      .filter((e) => e.isFile() && e.name.endsWith('.json'))
      .map((e) => {
        try {
          return JSON.parse(readFileSync(join(plansDir, e.name), 'utf-8'))
        } catch {
          return null
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  })

  ipcMain.handle('project:getPlan', async (_event, projectPath: string, planId: string) => {
    const planPath = join(projectPath, 'plans', `${planId}.json`)
    if (!existsSync(planPath)) return null
    try {
      return JSON.parse(readFileSync(planPath, 'utf-8'))
    } catch {
      return null
    }
  })

  ipcMain.handle('project:updatePlan', async (_event, projectPath: string, planId: string, updates: Record<string, unknown>) => {
    const planPath = join(projectPath, 'plans', `${planId}.json`)
    if (!existsSync(planPath)) throw new Error(`Plan ${planId} not found`)
    const current = JSON.parse(readFileSync(planPath, 'utf-8'))
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() }
    writeFileSync(planPath, JSON.stringify(updated, null, 2), 'utf-8')
    return updated
  })

  ipcMain.handle('project:deletePlan', async (_event, projectPath: string, planId: string) => {
    const planPath = join(projectPath, 'plans', `${planId}.json`)
    if (existsSync(planPath)) {
      rmSync(planPath)
    }
    return { success: true, deleted: planId }
  })
}

async function listProjectsInternal(): Promise<Record<string, unknown>[]> {
  ensureDir(WORKSPACE_ROOT)
  const dirs = readdirSync(WORKSPACE_ROOT, { withFileTypes: true })
  const projects: Record<string, unknown>[] = []

  for (const dir of dirs) {
    if (dir.isDirectory()) {
      const statePath = join(WORKSPACE_ROOT, dir.name, 'state.json')
      if (existsSync(statePath)) {
        try {
          projects.push(JSON.parse(readFileSync(statePath, 'utf-8')))
        } catch {
          // Skip
        }
      }
    }
  }

  return projects
}

function generateInitialRubric(): string {
  return `# 评分规则 (Rubric)

> 这份规则是你个人IP的"质量标准"。它会在每次复盘后自动进化，变得越来越贴合你的受众。
>
> 当前版本：v1 (初始版)

## 7个评分维度

| 维度 | 权重 | 说明 |
|------|------|------|
| 1. 开篇钩子 | 20% | 前3秒能不能让人停下来 |
| 2. 叙事节奏 | 15% | 信息密度和情绪起伏的控制 |
| 3. 观点锐度 | 15% | 有没有让人"卧槽"的洞见 |
| 4. 实用密度 | 15% | 观众能拿走的东西有多少 |
| 5. 情绪共鸣 | 15% | 观众会不会想转发/评论 |
| 6. 结构完整 | 10% | 开头-展开-高潮-结尾是否完整 |
| 7. 表达效果 | 10% | 语言、语气、画面配合度 |

## 评分方法

每个维度 1-10 分，加权求和得总分。总分范围 1-10。

\`\`\`
总分 = Σ(维度i得分 × 权重i)
\`\`\`

## 进化记录

_（初始版本，暂无进化记录）_
`
}
