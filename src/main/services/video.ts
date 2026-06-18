import { ipcMain } from 'electron'
import { join, dirname } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { info, error as logError } from './logger'

const execFileAsync = promisify(execFile)

function getFFmpegPath(): string {
  const projRoot = join(dirname(dirname(dirname(import.meta.dirname))), 'ffmpeg.exe')
  if (existsSync(projRoot)) return projRoot
  return 'ffmpeg'
}

async function runFFmpeg(args: string[], timeoutMs = 120000) {
  try { const { stdout, stderr } = await execFileAsync(getFFmpegPath(), args, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }); return { success: true } } catch (err: any) { return { success: false, error: err.message } }
}

export function registerVideoHandlers(): void {
  ipcMain.handle('video:info', async () => {
    const fp = getFFmpegPath()
    try { const { stdout } = await execFileAsync(fp, ['-version'], { timeout: 5000 }); return { available: true, path: fp, version: stdout.split('\n')[0] } } catch { return { available: false } }
  })
  ipcMain.handle('video:compose', async (_e, data: { imagePath: string; audioPath: string; outputDir?: string; duration?: number }) => {
    if (!existsSync(data.imagePath)) return { success: false, error: 'Image not found' }
    if (!existsSync(data.audioPath)) return { success: false, error: 'Audio not found' }
    const outDir = data.outputDir || join(homedir(), 'IP工坊', 'videos')
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
    const outPath = join(outDir, `output-${Date.now()}.mp4`)
    return runFFmpeg(['-loop', '1', '-i', data.imagePath, '-i', data.audioPath, '-c:v', 'libx264', '-c:a', 'aac', '-pix_fmt', 'yuv420p', '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2', '-shortest', '-y', outPath])
  })
}
