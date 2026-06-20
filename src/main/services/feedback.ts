import { ipcMain, app } from 'electron'
import { join } from 'path'
import { homedir } from 'os'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { info, error as logError } from './logger'

const FEEDBACK_DIR = join(homedir(), 'SparkForge', 'feedback')
function ensureDir(): void { if (!existsSync(FEEDBACK_DIR)) mkdirSync(FEEDBACK_DIR, { recursive: true }) }

const FAQ = [
  { q: '如何获取 AI API Key？', a: '推荐 DeepSeek（platform.deepseek.com），注册后创建 API Key，¥1/百万tokens，新用户赠 500 万 tokens。', category: '配置' },
  { q: '为什么 AI 返回乱码？', a: '通常是 API Key 配置有误或网络问题。检查设置中 Key 是否正确，或切换其他 AI 提供商。', category: '故障' },
  { q: '如何提高脚本评分？', a: '关注 3 个维度：1) 开篇钩子前3秒制造好奇 2) 至少一个卧槽级洞见 3) 给观众具体可用的方法或数据。', category: '使用' },
  { q: '可以离线使用吗？', a: '当前支持离线启发式评分和模板化选题。AI 生成脚本需要网络。', category: '功能' },
  { q: '数据存储在哪里？', a: '所有项目数据在 ~/SparkForge/projects/ 下，备份数据在 .backup/ 子目录中。', category: '数据' },
  { q: '脚本写好怎么发布？', a: '使用导出功能获取拍摄清单和分镜表。目前需手动拍摄发布。', category: '使用' }
]

export function registerFeedbackHandlers(): void {
  ipcMain.handle('feedback:submit', async (_e, data: any) => {
    ensureDir()
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const fb = { type: data.type || 'general', message: data.message || '', email: data.email || '', appVersion: app.getVersion(), os: process.platform, timestamp: new Date().toISOString() }
    writeFileSync(join(FEEDBACK_DIR, `feedback-${ts}.json`), JSON.stringify(fb, null, 2))
    info('feedback', 'Submitted', { type: fb.type })
    return { success: true, message: '感谢反馈！' }
  })
  ipcMain.handle('feedback:faq', async (_e, category?: string) => category ? FAQ.filter(f => f.category === category) : FAQ)
  ipcMain.handle('feedback:report', async (_e, errorData: any) => {
    ensureDir()
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const rpt = { error: errorData.message || 'Unknown', stack: errorData.stack || '', context: errorData.context || '', appVersion: app.getVersion(), os: process.platform, timestamp: new Date().toISOString() }
    writeFileSync(join(FEEDBACK_DIR, `error-${ts}.json`), JSON.stringify(rpt, null, 2))
    logError('feedback', 'Error auto-reported', { error: rpt.error })
    return { success: true, message: '错误已自动上报' }
  })
}
