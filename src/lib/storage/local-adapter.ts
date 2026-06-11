import fs from 'fs/promises'
import path from 'path'
import { StorageAdapter } from './types'

export class LocalStorageAdapter implements StorageAdapter {
  private basePath: string

  constructor(basePath?: string) {
    this.basePath = basePath || process.env.STORAGE_LOCAL_PATH || './storage'
    this.ensureDirectoryExists()
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.basePath)
    } catch {
      await fs.mkdir(this.basePath, { recursive: true })
    }
  }

  private getFilePath(key: string): string {
    return path.join(this.basePath, key)
  }

  async upload(key: string, data: Buffer | string): Promise<string> {
    const filePath = this.getFilePath(key)
    const dirPath = path.dirname(filePath)

    await fs.mkdir(dirPath, { recursive: true })
    await fs.writeFile(filePath, data)

    return key
  }

  async download(key: string): Promise<Buffer> {
    const filePath = this.getFilePath(key)
    return fs.readFile(filePath)
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key)
    try {
      await fs.unlink(filePath)
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }

  async getUrl(key: string): Promise<string> {
    return `/api/files/${key}`
  }

  async exists(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key)
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }
}
