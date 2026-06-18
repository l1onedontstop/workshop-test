/**
 * Prediction Guard — 盲预测协议 + 模式检测
 *
 * Inspired by cheat-on-content:
 * 1. Blind prediction protocol — 预测一旦写入，不可修改
 * 2. Cold-start vs calibration mode — 自动检测
 * 3. Immutability check — harness 层强制校验
 */

import { ipcMain } from 'electron'
import { join } from 'path'
import { existsSync, readdirSync, readFileSync, readFileSync as readFile } from 'fs'
import { info, error as logError } from './logger'

// ── Mode detection ──

export function detectMode(projectPath: string): 'cold-start' | 'calibration' {
  const predDir = join(projectPath, 'predictions')
  if (!existsSync(predDir)) return 'cold-start'

  const files = readdirSync(predDir).filter(f => f.endsWith('.json'))
  let retroComplete = 0

  for (const f of files) {
    try {
      const data = JSON.parse(readFileSync(join(predDir, f), 'utf-8'))
      if (data.status === 'retro_completed') retroComplete++
    } catch {}
  }

  // 5+ completed retros → calibration mode
  return retroComplete >= 5 ? 'calibration' : 'cold-start'
}

// ── Immutability guard ──

export function isPredictionImmutable(predictionPath: string): boolean {
  if (!existsSync(predictionPath)) return false

  try {
    const data = JSON.parse(readFileSync(predictionPath, 'utf-8'))
    // Once status is "predicted" or "retro_completed", the prediction section is immutable
    return data.status === 'predicted' || data.status === 'retro_completed'
  } catch {
    return false
  }
}

export function validatePredictionWrite(predictionPath: string, newData: any): { valid: boolean; reason?: string } {
  if (!existsSync(predictionPath)) return { valid: true }

  try {
    const existing = JSON.parse(readFileSync(predictionPath, 'utf-8'))

    // If already locked, only allow updating retro fields
    if (existing.status === 'predicted' || existing.status === 'retro_completed') {
      // Check if prediction fields are being modified
      const immutableFields = ['scores', 'total', 'composite', 'bet', 'strengths', 'weaknesses', 'overall', 'predictedAt']
      for (const field of immutableFields) {
        if (JSON.stringify(newData[field]) !== JSON.stringify(existing[field])) {
          return {
            valid: false,
            reason: `预测已被锁定，不可修改"${field}"字段。只能在复盘时追加 actualData 和 retroResult。`
          }
        }
      }
    }

    return { valid: true }
  } catch {
    return { valid: true }
  }
}

// ── Cold-start prediction limits ──

export function getColdStartLimits(): { maxConfidence: string; features: string[]; warnings: string[] } {
  return {
    maxConfidence: '🟠 低',
    features: ['7维评分', '一句话bet', '简化锚点对比'],
    warnings: [
      '冷启动阶段预测精度有限',
      '前5条视频完播率通常偏低',
      '建议发布3条以上后查看校准进度'
    ]
  }
}

// ── IPC ──

export function registerPredictionGuardHandlers(): void {
  ipcMain.handle('prediction:detectMode', async (_e, projectPath: string) => {
    const mode = detectMode(projectPath)
    info('prediction-guard', `Mode: ${mode}`, { projectPath })
    return {
      mode,
      limits: mode === 'cold-start' ? getColdStartLimits() : null
    }
  })

  ipcMain.handle('prediction:validate', async (_e, predictionPath: string, newData: any) => {
    return validatePredictionWrite(predictionPath, newData)
  })

  ipcMain.handle('prediction:isLocked', async (_e, predictionPath: string) => {
    return isPredictionImmutable(predictionPath)
  })
}
