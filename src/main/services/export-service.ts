import { ipcMain } from 'electron'
import { info } from './logger'

export function buildChecklistMarkdown(data: any): string {
  const { script = '', storyboard = [], style = {}, equipment = {}, topic = '未命名' } = data
  const lines = [`# 拍摄清单：${topic}`, '', `> 导出时间：${new Date().toLocaleString('zh-CN')}`, '', '---', '', '## 口播文案', '', script, '', '---', '', '## 分镜时间线', '', '| 镜号 | 时间 | 时长 | 类型 | 内容 | 画面 | 运镜 |', '|------|------|------|------|------|------|------|']
  if (storyboard.length > 0) { for (const s of storyboard) lines.push(`| ${s.scene || '-'} | ${s.time || '-'} | ${s.duration || '-'}s | ${s.type || '-'} | ${(s.content || '-').slice(0, 30)} | ${s.visual || '-'} | ${s.camera || '-'} |`) } else { lines.push('| - | - | - | 暂无分镜 | - | - | - |') }
  lines.push('', '---', '', '## 风格', '')
  if (style.vibe) lines.push(`- 氛围：${style.vibe}`); if (style.colorTone) lines.push(`- 色调：${style.colorTone}`); if (style.lighting) lines.push(`- 灯光：${style.lighting}`)
  lines.push('', '---', '', '## 器材清单', '')
  if (equipment.camera) lines.push(`- [ ] 拍摄：${equipment.camera}`); if (equipment.audio) lines.push(`- [ ] 收音：${equipment.audio}`); if (equipment.lighting) lines.push(`- [ ] 灯光：${equipment.lighting}`)
  if (equipment.props?.length > 0 && equipment.props[0] !== '无需') { lines.push('', '### 道具'); for (const p of equipment.props) lines.push(`- [ ] ${p}`) }
  lines.push('', '---', '', '## 开拍前检查', '- [ ] 电量充足 - [ ] 存储够 - [ ] 灯光OK - [ ] 背景整洁 - [ ] 脚本熟读3遍', '', '*IP工坊自动生成*')
  return lines.join('\n')
}

export function buildTeleprompterText(script: string): string {
  const sents = script.split(/[。！？\.\!\?\n]/).map(s => s.trim()).filter(s => s.length > 0)
  return ['# 提词器脚本', `> 共 ${sents.length} 句 · 字号 48pt`, '', ...sents.map((s, i) => `${i + 1}. ${s}`), '', '*手机横屏放镜头下，提词器 App 滚动播放*'].join('\n')
}

export function buildCSVExport(predictions: any[]): string {
  return ['日期,选题,预测分,播放,点赞,评论,分享', ...predictions.map(p => {
    return [((p.retroCompletedAt || p.createdAt || '').slice(0, 10)), (p.topic || '').replace(/,/g, '，'), p.total || 0, p.actualData?.plays || 0, p.actualData?.likes || 0, p.actualData?.comments || 0, p.actualData?.shares || 0].join(',')
  })].join('\n')
}

export function registerExportHandlers(): void {
  ipcMain.handle('export:checklist', async (_e, data: any) => { info('export', 'Checklist'); return { success: true, markdown: buildChecklistMarkdown(data) } })
  ipcMain.handle('export:teleprompter', async (_e, script: string) => { info('export', 'Teleprompter'); return { success: true, text: buildTeleprompterText(script) } })
  ipcMain.handle('export:csv', async (_e, predictions: any[]) => { info('export', 'CSV'); return { success: true, csv: buildCSVExport(predictions) } })
}
