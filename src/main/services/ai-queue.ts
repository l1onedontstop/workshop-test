import { ipcMain } from 'electron'

const MAX_CONCURRENT = 2
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000
const REQUEST_TIMEOUT_MS = 60_000

let activeCount = 0
let pendingQueue: Task[] = []
let totalRequests = 0
let totalFailures = 0
let totalRetries = 0

interface Task {
  fn: () => Promise<any>
  label: string
  maxRetries: number
  timeout: number
  resolve: (v: any) => void
  reject: (e: Error) => void
  attempt: number
}

export function enqueue(fn: () => Promise<any>, opts: { label?: string; maxRetries?: number; timeout?: number } = {}): Promise<any> {
  const { label = 'ai-request', maxRetries = MAX_RETRIES, timeout = REQUEST_TIMEOUT_MS } = opts
  return new Promise((resolve, reject) => {
    pendingQueue.push({ fn, label, maxRetries, timeout, resolve, reject, attempt: 0 })
    totalRequests++
    drain()
  })
}

function drain(): void {
  while (activeCount < MAX_CONCURRENT && pendingQueue.length > 0) { activeCount++; execute(pendingQueue.shift()!) }
}

async function execute(task: Task): Promise<void> {
  try {
    const result = await Promise.race([task.fn(), new Promise((_, r) => setTimeout(() => r(new Error('Timeout')), task.timeout))])
    activeCount--; task.resolve(result); drain()
  } catch (err: any) {
    task.attempt++
    if (task.attempt <= task.maxRetries) {
      totalRetries++
      console.warn(`[ai-queue] Retry ${task.attempt}/${task.maxRetries} for "${task.label}" after ${BASE_DELAY_MS * Math.pow(2, task.attempt - 1)}ms: ${err.message}`)
      setTimeout(() => { pendingQueue.unshift(task); activeCount--; drain() }, BASE_DELAY_MS * Math.pow(2, task.attempt - 1))
    } else {
      totalFailures++
      console.error(`[ai-queue] All ${task.maxRetries} retries failed for "${task.label}": ${err.message}`)
      activeCount--; task.reject(err); drain()
    }
  }
}

export function getQueueStatus() { return { activeCount, pendingCount: pendingQueue.length, totalRequests, totalFailures, totalRetries, maxConcurrent: MAX_CONCURRENT } }

export function registerQueueHandlers(): void {
  ipcMain.handle('ai:queueStatus', async () => getQueueStatus())
  ipcMain.handle('ai:queueReset', async () => { totalRequests = 0; totalFailures = 0; totalRetries = 0; return getQueueStatus() })
}
