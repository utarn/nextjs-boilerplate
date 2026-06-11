import { StorageAdapter } from './types'
import { LocalStorageAdapter } from './local-adapter'

let storageInstance: StorageAdapter | null = null

export function getStorageAdapter(): StorageAdapter {
  if (!storageInstance) {
    const storageType = process.env.STORAGE_TYPE || 'local'

    switch (storageType) {
      case 'local':
      default:
        storageInstance = new LocalStorageAdapter()
        break
    }
  }

  return storageInstance
}
