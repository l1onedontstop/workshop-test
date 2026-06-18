import { ipcMain } from 'electron'
import { info } from './logger'

function fmtSRT(s: number): string { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60), ms = Math.floor((s % 1) * 1000); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms).padStart(3, '0')}` }

export function registerSubtitleHandlers(): void {
  ipcMain.handle('subtitle:generate', async (_e, data: { script: string; storyboard?: any[]; totalDurationSec?: number }) => {
    const cues: any[] = []
    let t = 0; let idx = 1
    const charsPerSec = 4
    const paras = (data.script || '').replace(/\n\n+/g, '\n').trim().split('\n').filter(p => p.trim())
    for (const p of paras) {
      const sents = p.split(/[。！？\.\!\?]/).filter(s => s.trim())
      for (const s of sents) {
        const dur = Math.max(1.5, s.trim().length / charsPerSec)
        cues.push({ index: idx++, start: fmtSRT(t), end: fmtSRT(t + dur), text: s.trim() })
        t += dur
      }
      t += 0.3
    }
    const srt = cues.map(c => `${c.index}\n${c.start} --> ${c.end}\n${c.text}\n`).join('\n')
    info('subtitle', `Generated ${cues.length} cues`)
    return { success: true, srt, cueCount: cues.length, estimatedDuration: t }
  })
}
