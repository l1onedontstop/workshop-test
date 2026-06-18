import { app, ipcMain } from 'electron'
import { error as logError, warn, info } from './logger'

export function classifyAIError(errMsg: string): unknown {
  const msg = errMsg
  if (msg.includes('API Key') || msg.includes('请先')) return { type: 'missing_key', userMessage: '尚未配置 API Key', canRetry: false }
  if (msg.includes('401') || msg.includes('Unauthorized')) return { type: 'invalid_key', userMessage: 'API Key 无效', canRetry: false }
  if (msg.includes('429') || msg.includes('rate')) return { type: 'rate_limited', userMessage: '请求频率过高', canRetry: true }
  if (msg.includes('timed out') || msg.includes('ECONNREFUSED')) return { type: 'network_error', userMessage: '网络连接失败', canRetry: true }
  if (msg.includes('500') || msg.includes('502') || msg.includes('503')) return { type: 'server_error', userMessage: 'AI 服务暂时不可用', canRetry: true }
  return { type: 'unknown', userMessage: '请求失败', canRetry: true }
}

export function registerErrorHandlers(): void {
  process.on('uncaughtException', (err) => { logError('main', 'Uncaught exception', { message: err.message, stack: err.stack }) })
  process.on('unhandledRejection', (reason: any) => { logError('main', 'Unhandled rejection', { message: reason?.message || String(reason) }) })
  app.on('render-process-gone', (_e, _wc, details) => { logError('main', 'Render process gone', details) })
  app.on('child-process-gone', (_e, details) => { warn('main', 'Child process gone', details) })
  info('main', 'Error handlers registered')
}

export function registerErrorIPC(): void {
  ipcMain.handle('error:report', async (_e, errorData: any) => { logError('renderer', errorData.message || 'Unknown', errorData); return { logged: true } })
  ipcMain.handle('error:classify', async (_e, errorMessage: string) => classifyAIError(errorMessage))
}
