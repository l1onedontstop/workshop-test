import { app } from 'electron'
import { join } from 'path'
import { homedir } from 'os'
import { existsSync, mkdirSync, writeFileSync, appendFileSync, statSync, renameSync, rmSync, readFileSync } from 'fs'

const LOG_DIR = join(homedir(), 'IP工坊', 'logs')
const LOG_FILE = join(LOG_DIR, 'app.log')
const MAX_LOG_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_BACKUPS = 3

let currentLevel = 0

const LEVELS: Record<string, number> = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 }

function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true })
}

function rotateIfNeeded(): void {
  if (!existsSync(LOG_FILE)) return
  try {
    if (statSync(LOG_FILE).size >= MAX_LOG_SIZE) {
      for (let i = MAX_BACKUPS; i >= 1; i--) {
        const oldPath = i === 1 ? LOG_FILE : `${LOG_FILE}.${i - 1}`
        const newPath = `${LOG_FILE}.${i}`
        if (existsSync(oldPath)) {
          if (i === MAX_BACKUPS && existsSync(newPath)) rmSync(newPath)
          renameSync(oldPath, newPath)
        }
      }
    }
  } catch { /* non-critical */ }
}

function log(level: string, tag: string, message: string, data?: unknown): void {
  const timestamp = new Date().toISOString()
  const line = data
    ? `[${timestamp}] [${level}] [${tag}] ${message} ${JSON.stringify(data)}`
    : `[${timestamp}] [${level}] [${tag}] ${message}`

  switch (level) {
    case 'ERROR': console.error(line); break
    case 'WARN': console.warn(line); break
    default: console.log(line)
  }

  try {
    ensureLogDir()
    rotateIfNeeded()
    appendFileSync(LOG_FILE, line + '\n', 'utf-8')
  } catch { /* non-critical */ }
}

export const debug = (tag: string, msg: string, data?: unknown) => log('DEBUG', tag, msg, data)
export const info = (tag: string, msg: string, data?: unknown) => log('INFO', tag, msg, data)
export const warn = (tag: string, msg: string, data?: unknown) => log('WARN', tag, msg, data)
export const error = (tag: string, msg: string, data?: unknown) => log('ERROR', tag, msg, data)

export function getLogPath(): string { return LOG_FILE }
