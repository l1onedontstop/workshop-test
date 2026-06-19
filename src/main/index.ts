import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerProjectHandlers } from './services/project'
import { registerFileHandlers } from './services/files'
import { registerAIHandlers } from './services/ai'
import { registerSettingsHandlers } from './services/settings'
import { registerBenchmarkHandlers } from './services/benchmark'
import { registerCalibrationHandlers } from './services/calibration'
import { registerPoolHandlers } from './services/pool'
import { registerTrendHandlers } from './services/trend'
import { registerPersonaHandlers } from './services/persona'
import { registerQueueHandlers } from './services/ai-queue'
import { registerBackupHandlers } from './services/backup'
import { registerErrorHandlers, registerErrorIPC } from './services/error-handler'
import { registerOfflineHandlers } from './services/offline'
import { registerDashboardHandlers } from './services/dashboard'
import { registerTemplateHandlers } from './services/template'
import { registerOnboardingHandlers } from './services/onboarding'
import { registerFeedbackHandlers } from './services/feedback'
import { registerExportHandlers } from './services/export-service'
import { registerTTSHandlers } from './services/tts'
import { registerCoverHandlers } from './services/cover-image'
import { registerSubtitleHandlers } from './services/subtitle'
import { registerVideoHandlers } from './services/video'
import { registerCadenceHandlers, generateSessionReport } from './services/cadence'
import { registerPredictionGuardHandlers } from './services/prediction-guard'
import { registerIPStrategyHandlers } from './services/ip-strategy'
import { info as logInfo } from './services/logger'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    ...(process.platform === 'darwin'
      ? {
          titleBarStyle: 'hiddenInset',
          trafficLightPosition: { x: 16, y: 16 }
        }
      : {}),
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR in dev
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Register IPC handlers
function registerHandlers(): void {
  registerProjectHandlers()
  registerFileHandlers()
  registerAIHandlers()
  registerSettingsHandlers()
  registerBenchmarkHandlers()
  registerCalibrationHandlers()
  registerPoolHandlers()
  registerTrendHandlers()
  registerPersonaHandlers()
  registerQueueHandlers()
  registerBackupHandlers()
  registerErrorIPC()
  registerOfflineHandlers()
  registerDashboardHandlers()
  registerTemplateHandlers()
  registerOnboardingHandlers()
  registerFeedbackHandlers()
  registerExportHandlers()
  registerTTSHandlers()
  registerCoverHandlers()
  registerSubtitleHandlers()
  registerVideoHandlers()
  registerCadenceHandlers()
  registerPredictionGuardHandlers()
  registerIPStrategyHandlers()
  // SessionStart cadence report
  const report = generateSessionReport()
  logInfo('main', 'SessionStart', { summary: report.summary })
}

app.whenReady().then(() => {
  registerErrorHandlers()
  logInfo('main', 'IP工坊 starting', { version: app.getVersion() })
  electronApp.setAppUserModelId('com.ipstudio.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  mainWindow = null
})
