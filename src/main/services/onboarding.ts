import { ipcMain } from 'electron'
import { join } from 'path'
import { homedir } from 'os'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'

const ONBOARDING_DIR = join(homedir(), 'IP工坊', 'config')
const ONBOARDING_FILE = join(ONBOARDING_DIR, 'onboarding.json')

function load(): any {
  if (!existsSync(ONBOARDING_DIR)) mkdirSync(ONBOARDING_DIR, { recursive: true })
  try { if (existsSync(ONBOARDING_FILE)) return JSON.parse(readFileSync(ONBOARDING_FILE, 'utf-8')) } catch {}
  return { firstRun: true, completedProjects: {} }
}
function save(s: any): void { if (!existsSync(ONBOARDING_DIR)) mkdirSync(ONBOARDING_DIR, { recursive: true }); writeFileSync(ONBOARDING_FILE, JSON.stringify(s, null, 2)) }

export const ONBOARDING_STEPS = [
  { id: 'create_project', title: '创建你的第一个项目', description: '给个人IP起个名字，选行业', requiredAction: 'project:create' },
  { id: 'fill_persona', title: '完善你的人设', description: '你是谁？目标受众是谁？', requiredAction: 'plan:update' },
  { id: 'first_script', title: '生成第一条脚本', description: '选选题，AI 写脚本+分镜', requiredAction: 'ai:writeScript' }
]

export function registerOnboardingHandlers(): void {
  ipcMain.handle('onboarding:status', async () => load())
  ipcMain.handle('onboarding:complete', async (_e, projectId: string) => { const s = load(); s.firstRun = false; s.completedProjects[projectId] = { completedAt: new Date().toISOString(), stepsCompleted: ONBOARDING_STEPS.map(st => st.id) }; save(s); return { success: true } })
  ipcMain.handle('onboarding:reset', async () => { save({ firstRun: true, completedProjects: {} }); return { success: true } })
  ipcMain.handle('onboarding:steps', async () => ONBOARDING_STEPS)
}
