import { StorageAdapter } from './types'
import { LocalStorageAdapter } from './local-adapter'

let storageInstance: StorageAdapter | null = null

/**
 * Get the configured storage adapter instance (singleton).
 * The adapter type is determined by the `STORAGE_TYPE` environment variable.
 * Currently supports: "local" (default).
 *
 * @example
 * ```ts
 * import { getStorageAdapter } from '@/lib/storage'
 *
 * // Upload a file attachment for a todo
 * const storage = getStorageAdapter()
 * const buffer = Buffer.from(await file.arrayBuffer())
 * const key = await storage.upload(`todos/${userId}/${Date.now()}_${file.name}`, buffer)
 * ```
 */
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
