import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

const DATA_DIR = join(app.getPath('userData'), 'data')

class Store {
  private path: string
  private data: Record<string, unknown>

  constructor() {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true })
    }
    this.path = join(DATA_DIR, 'settings.json')
    this.data = this.load()
  }

  private load(): Record<string, unknown> {
    try {
      if (existsSync(this.path)) {
        return JSON.parse(readFileSync(this.path, 'utf-8'))
      }
    } catch {
      // Corrupted file, start fresh
    }
    return {}
  }

  private save(): void {
    writeFileSync(this.path, JSON.stringify(this.data, null, 2), 'utf-8')
  }

  get(key: string, defaultValue: unknown = null): unknown {
    return key in this.data ? this.data[key] : defaultValue
  }

  set(key: string, value: unknown): void {
    this.data[key] = value
    this.save()
  }

  getAll(): Record<string, unknown> {
    return { ...this.data }
  }
}

export default Store
