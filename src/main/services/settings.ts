import { ipcMain } from 'electron'
import Store from './store'

const store = new Store()

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', async (_event, key: string) => {
    return store.get(key)
  })

  ipcMain.handle('settings:set', async (_event, key: string, value: unknown) => {
    store.set(key, value)
    return true
  })

  ipcMain.handle('settings:getAll', async () => {
    return store.getAll()
  })
}
