/**
 * Pluggable storage adapter interface.
 * Implement this interface to add new storage backends (S3, GCS, etc.).
 *
 * @example
 * ```ts
 * // Upload and download a file
 * import { getStorageAdapter } from '@/lib/storage'
 *
 * const storage = getStorageAdapter()
 *
 * // Upload a user avatar
 * const key = await storage.upload(`users/${userId}/avatar.png`, buffer)
 *
 * // Check if file exists
 * const exists = await storage.exists(key)
 *
 * // Get public URL
 * const url = await storage.getUrl(key)
 *
 * // Download file contents
 * const data = await storage.download(key)
 *
 * // Delete a file
 * await storage.delete(key)
 * ```
 */
export interface StorageAdapter {
  /** Store data at the given key. Returns the storage key. */
  upload(key: string, data: Buffer | string, contentType?: string): Promise<string>
  /** Retrieve data for the given key. */
  download(key: string): Promise<Buffer>
  /** Delete data at the given key. */
  delete(key: string): Promise<void>
  /** Get a public URL for the given key. */
  getUrl(key: string): Promise<string>
  /** Check if data exists at the given key. */
  exists(key: string): Promise<boolean>
}

export interface UploadOptions {
  contentType?: string
  acl?: string
  metadata?: Record<string, string>
}
