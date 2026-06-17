// ── Calibration pool & cross-model audit ──────────────
// cheat-bump equivalent: collect retro-completed samples,
// re-score with current rubric, compare across models.

import { ipcMain } from 'electron'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { doChat } from './ai'
import { loadProjectWeights, buildRubricPrompt, RUBRIC_SYSTEM_PROMPT } from './rubric'

interface CalibrationSample {
  predictionFile: string
  topic: string
  scriptContent: string
  predictedTotal: number
  predictedScores: Record<string, number>
  actualPlays: number
  actualLikes: number
  actualComments: number
  actualShares: number
  actualCompletionRate?: number
}

export function registerCalibrationHandlers(): void {
  // ── Collect calibration pool ──────────────────────────
  ipcMain.handle('calibration:pool', async (_event, projectPath: string) => {
    const predDir = join(projectPath, 'predictions')
    if (!existsSync(predDir)) return { samples: [], count: 0 }

    const files = readdirSync(predDir).filter((f) => f.endsWith('.json'))
    const samples: CalibrationSample[] = []

    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync(join(predDir, file), 'utf-8'))
        if (data.status === 'retro_completed' && data.actualData) {
          samples.push({
            predictionFile: file,
            topic: data.topic || '',
            scriptContent: data.scriptContent || '',
            predictedTotal: data.total || 0,
            predictedScores: data.scores || {},
            actualPlays: data.actualData.plays || 0,
            actualLikes: data.actualData.likes || 0,
            actualComments: data.actualData.comments || 0,
            actualShares: data.actualData.shares || 0,
            actualCompletionRate: data.actualData.completionRate
          })
        }
      } catch { /* skip unreadable */ }
    }

    return { samples, count: samples.length }
  })

  // ── Re-score all calibration samples ──────────────────
  ipcMain.handle(
    'calibration:rescore',
    async (
      _event,
      projectPath: string,
      samples: CalibrationSample[]
    ) => {
      const weights = loadProjectWeights(projectPath)
      const systemPrompt = buildRubricPrompt(weights)
      const results: Array<{
        predictionFile: string
        topic: string
        oldTotal: number
        newTotal: number
        newScores: Record<string, number>
        actualPlays: number
      }> = []

      for (const sample of samples) {
        try {
          const messages = [
            { role: 'system' as const, content: systemPrompt },
            {
              role: 'user' as const,
              content: `请对以下短视频脚本进行 7 维打分：\n\n${sample.scriptContent}`
            }
          ]
          const raw = await doChat(messages, { temperature: 0 })
          const parsed = extractScoreJSON(raw)
          if (parsed && parsed.scores) {
            results.push({
              predictionFile: sample.predictionFile,
              topic: sample.topic,
              oldTotal: sample.predictedTotal,
              newTotal: parsed.total || 0,
              newScores: parsed.scores,
              actualPlays: sample.actualPlays
            })
          }
        } catch { /* skip failed */ }
      }

      // Compare ranking: new scores vs actualPlays
      const newRanking = [...results].sort((a, b) => b.newTotal - a.newTotal)
      const actualRanking = [...results].sort((a, b) => b.actualPlays - a.actualPlays)

      let matchCount = 0
      for (let i = 0; i < Math.min(newRanking.length, actualRanking.length); i++) {
        if (newRanking[i].predictionFile === actualRanking[i].predictionFile) {
          matchCount++
        }
      }

      return {
        results,
        newRanking: newRanking.map((r) => r.predictionFile),
        actualRanking: actualRanking.map((r) => r.predictionFile),
        matchCount,
        totalCount: results.length,
        passed: results.length >= 4 ? matchCount >= (results.length * 0.8) : false
      }
    }
  )

  // ── Cross-model audit ─────────────────────────────────
  ipcMain.handle(
    'calibration:crossModelAudit',
    async (
      _event,
      projectPath: string,
      samples: CalibrationSample[],
      primaryModel: string,
      auditModel: string
    ) => {
      const weights = loadProjectWeights(projectPath)
      const systemPrompt = buildRubricPrompt(weights)
      const results: Array<{
        predictionFile: string
        topic: string
        primaryScore: number
        auditScore: number
        deviation: number
        isInconsistent: boolean
      }> = []

      for (const sample of samples) {
        try {
          const messages = [
            { role: 'system' as const, content: systemPrompt },
            {
              role: 'user' as const,
              content: `请对以下短视频脚本进行 7 维打分：\n\n${sample.scriptContent}`
            }
          ]

          // Primary model score
          const primaryRaw = await doChat(messages, {
            provider: primaryModel,
            temperature: 0
          })
          const primaryParsed = extractScoreJSON(primaryRaw)

          // Audit model score
          const auditRaw = await doChat(messages, {
            provider: auditModel,
            temperature: 0
          })
          const auditParsed = extractScoreJSON(auditRaw)

          if (primaryParsed?.total != null && auditParsed?.total != null) {
            const dev = Math.abs(primaryParsed.total - auditParsed.total)
            results.push({
              predictionFile: sample.predictionFile,
              topic: sample.topic,
              primaryScore: primaryParsed.total,
              auditScore: auditParsed.total,
              deviation: Math.round(dev * 100) / 100,
              isInconsistent: dev > 1.0
            })
          }
        } catch { /* skip */ }
      }

      const inconsistentCount = results.filter((r) => r.isInconsistent).length
      return {
        results,
        inconsistentCount,
        totalCount: results.length,
        passed: inconsistentCount === 0
      }
    }
  )
}

function extractScoreJSON(
  raw: string
): { scores: Record<string, number>; total: number } | null {
  try {
    const trimmed = raw.trim()
    if (trimmed.startsWith('{')) return JSON.parse(trimmed)
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) return JSON.parse(match[1].trim())
    const objMatch = trimmed.match(/\{[\s\S]*"scores"[\s\S]*\}/)
    if (objMatch) return JSON.parse(objMatch[0])
  } catch { /* fall through */ }
  return null
}
