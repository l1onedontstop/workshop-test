import { ipcMain } from 'electron'
import { extractJSON } from './json-parser'
import { info } from './logger'

const COVER_TEMPLATES = [
  { id: 'bold-question', name: '大字反问', description: '黑底白字，冲击力强', example: '你的餐厅\n还在亏钱？' },
  { id: 'data-bomb', name: '数据炸弹', description: '核心数据占满画面', example: '90%\n的老板\n在犯这个错误' },
  { id: 'face-express', name: '人物表情', description: '人物大头照+标题', example: '赚不到钱的原因' },
  { id: 'before-after', name: '前后对比', description: '左右分屏对比', example: '改名前 vs 改名后' },
  { id: 'tool-list', name: '清单展示', description: '平铺展示方法步骤', example: '降本增效\n3个工具就够' }
]

// We need to import doChat here, but that would create a circular dependency with ai.ts
// Instead, we register the handler directly

const COVER_PROMPT = '你是一个短视频封面设计专家。根据脚本设计高点击率封面。输出JSON：{"mainPrompt":"AI绘图提示词(英文)","mainPromptCN":"中文提示词","textOverlay":"封面大字(6-10字)","textPosition":"居中/顶部","textColor":"白色","bgDescription":"背景描述","style":"极简/摄影/3D","altPrompts":[],"designNotes":[]}'

export function registerCoverHandlers(): void {
  ipcMain.handle('cover:templates', async () => COVER_TEMPLATES)
  ipcMain.handle('cover:generatePrompt', async (_e, data: any) => {
    info('cover', `Generating for: ${data.topic || 'unknown'}`)
    const { doChat } = await import('./ai')
    try {
      const raw = await doChat([{ role: 'system', content: COVER_PROMPT }, { role: 'user', content: `主题：${data.topic || ''}\n脚本摘要：${(data.script || '').slice(0, 300)}` }], { temperature: 0.9, maxTokens: 2048 })
      const parsed = extractJSON(raw, { label: 'cover' }) || {}
      return { success: true, ...parsed }
    } catch {
      return { success: true, mainPrompt: `Business video thumbnail, "${data.topic || 'topic'}", bold white text on dark bg, 9:16`, mainPromptCN: `商业封面，"${data.topic || ''}"`, textOverlay: (data.topic || '').slice(0, 10), textPosition: '居中', textColor: '白色', bgDescription: '深色渐变', style: '极简', _offline: true }
    }
  })
}
