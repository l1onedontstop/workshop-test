import { ipcMain } from 'electron'
import { join, dirname } from 'path'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'fs'
import { info } from './logger'

const MAX_BACKUPS_PER_FILE = 20

function backupDir(projectPath: string): string { return join(projectPath, '.backup') }

export function createBackup(filePath: string): { success: boolean; backupPath?: string } {
  if (!existsSync(filePath)) return { success: false }
  try {
    const projectPath = dirname(filePath)
    const dir = backupDir(projectPath)
    mkdirSync(dir, { recursive: true })
    const filename = filePath.split(/[/\\]/).pop()!
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const dest = join(dir, `${filename}.${timestamp}.bak`)
    copyFileSync(filePath, dest)
    // Prune old backups
    try {
      const files = readdirSync(dir).filter(f => f.startsWith(`${filename}.`) && f.endsWith('.bak')).sort().reverse()
      for (const f of files.slice(MAX_BACKUPS_PER_FILE)) rmSync(join(dir, f))
    } catch { /* non-critical */ }
    return { success: true, backupPath: dest }
  } catch (err: any) {
    console.error(`[backup] Failed: ${err.message}`)
    return { success: false, error: err.message }
  }
}

export function safeWriteFile(filePath: string, content: string, encoding: BufferEncoding = 'utf-8'): void {
  if (existsSync(filePath)) createBackup(filePath)
  writeFileSync(filePath, content, encoding)
}

export function listBackups(projectPath: string, originalFilename: string): { name: string; path: string; timestamp: string }[] {
  const dir = backupDir(projectPath)
  if (!existsSync(dir)) return []
  const prefix = `${originalFilename}.`
  const suffix = '.bak'
  return readdirSync(dir)
    .filter(f => f.startsWith(prefix) && f.endsWith(suffix))
    .sort().reverse()
    .map(f => {
      const tsPart = f.slice(prefix.length, -suffix.length)
      const restored = tsPart.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, 'T$1:$2:$3.$4Z')
      return { name: f, path: join(dir, f), timestamp: restored }
    })
}

export function restoreBackup(projectPath: string, backupFileName: string, originalFilename: string): { success: boolean; error?: string } {
  const src = join(backupDir(projectPath), backupFileName)
  const dest = join(projectPath, originalFilename)
  if (!existsSync(src)) return { success: false, error: 'Backup not found' }
  try {
    if (existsSync(dest)) createBackup(dest)
    copyFileSync(src, dest)
    return { success: true }
  } catch (err: any) { return { success: false, error: err.message } }
}

export function registerBackupHandlers(): void {
  ipcMain.handle('backup:list', async (_e, projectPath: string, filename: string) => listBackups(projectPath, filename))
  ipcMain.handle('backup:restore', async (_e, projectPath: string, backupFileName: string, originalFilename: string) =>
    restoreBackup(projectPath, backupFileName, originalFilename))
}
