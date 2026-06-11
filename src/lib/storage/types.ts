export interface StorageAdapter {
  upload(key: string, data: Buffer | string, contentType?: string): Promise<string>
  download(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
  getUrl(key: string): Promise<string>
  exists(key: string): Promise<boolean>
}

export interface UploadOptions {
  contentType?: string
  acl?: string
  metadata?: Record<string, string>
}
