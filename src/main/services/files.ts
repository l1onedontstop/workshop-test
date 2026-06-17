import { ipcMain } from 'electron'
import { readFile, writeFile, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

export function registerFileHandlers(): void {
  ipcMain.handle('file:read', async (_event, path: string) => {
    if (!existsSync(path)) {
      throw new Error(`File not found: ${path}`)
    }
    return readFile(path, 'utf-8')
  })

  ipcMain.handle('file:write', async (_event, path: string, content: string) => {
    return writeFile(path, content, 'utf-8')
  })

  ipcMain.handle('file:list', async (_event, path: string) => {
    if (!existsSync(path)) {
      return []
    }
    const entries = await readdir(path, { withFileTypes: true })
    return entries.map((e) => ({
      name: e.name,
      isDirectory: e.isDirectory()
    }))
  })

  ipcMain.handle('file:exists', async (_event, path: string) => {
    return existsSync(path)
  })
}
