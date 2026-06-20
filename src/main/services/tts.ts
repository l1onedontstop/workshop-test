import { ipcMain } from 'electron'
import { join } from 'path'
import { homedir } from 'os'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { info, error as logError } from './logger'

const VOICES = [
  { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓 (女·标准)', gender: 'female' },
  { id: 'zh-CN-YunxiNeural', name: '云希 (男·标准)', gender: 'male' },
  { id: 'zh-CN-XiaoyiNeural', name: '晓伊 (女·活泼)', gender: 'female' },
  { id: 'zh-CN-YunjianNeural', name: '云健 (男·沉稳)', gender: 'male' }
]

const EDGE_TTS_URL = 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud'

async function callEdgeTTS(text: string, voiceId: string): Promise<Buffer> {
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN"><voice name="${voiceId}"><prosody rate="1.0" pitch="+0Hz">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</prosody></voice></speak>`
  const boundary = `Boundary${Date.now()}`
  const body = `--${boundary}\r\nContent-Type: application/ssml+xml\r\nX-RequestId: ${Date.now()}\r\nContent-Type: application/ssml+xml\r\n\r\n${ssml}\r\n--${boundary}--`
  const res = await fetch(`${EDGE_TTS_URL}?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4`, { method: 'POST', headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'User-Agent': 'Mozilla/5.0' }, body })
  if (!res.ok) throw new Error(`Edge TTS error ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

export function registerTTSHandlers(): void {
  ipcMain.handle('tts:generate', async (_e, text: string, opts: any = {}) => {
    const voiceId = opts.voice || 'zh-CN-XiaoxiaoNeural'
    const outputDir = opts.outputDir || join(homedir(), 'SparkForge', 'audio')
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true })
    const cleanText = text.replace(/[#*`\-\[\]]/g, '').replace(/\n\n+/g, '。').replace(/\n/g, ' ').trim()
    info('tts', `Generating: ${cleanText.length} chars`)
    try {
      const buffer = await callEdgeTTS(cleanText, voiceId)
      const fp = join(outputDir, `tts-${Date.now()}.mp3`)
      writeFileSync(fp, buffer)
      return { success: true, filepath: fp, size: buffer.length, voice: voiceId }
    } catch (err: any) { logError('tts', 'Failed', { error: err.message }); return { success: false, error: err.message } }
  })
  ipcMain.handle('tts:voices', async () => VOICES)
}
