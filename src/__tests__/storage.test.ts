import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { LocalStorageAdapter } from '@/lib/storage/local-adapter'

const TEST_DIR = path.join(os.tmpdir(), `storage-test-${Date.now()}`)
let storage: LocalStorageAdapter

describe('storage', () => {
  beforeAll(() => {
    storage = new LocalStorageAdapter(TEST_DIR)
  })

  afterAll(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true })
  })

  describe('LocalStorageAdapter', () => {
    const testKey = 'test-files/hello.txt'
    const testData = 'Hello, Storage!'

    beforeEach(async () => {
      // Clean up any leftover files from previous tests
      try {
        await storage.delete(testKey)
      } catch {
        // ignore
      }
    })

    describe('upload', () => {
      it('should write a file to disk and return the key', async () => {
        const result = await storage.upload(testKey, testData)

        expect(result).toBe(testKey)

        // Verify the file actually exists on disk
        const filePath = path.join(TEST_DIR, testKey)
        const content = await fs.readFile(filePath, 'utf-8')
        expect(content).toBe(testData)
      })

      it('should accept a Buffer as data', async () => {
        const bufferKey = 'test-files/buffer.bin'
        const bufferData = Buffer.from([0x00, 0x01, 0x02, 0x03])

        await storage.upload(bufferKey, bufferData)

        const filePath = path.join(TEST_DIR, bufferKey)
        const content = await fs.readFile(filePath)
        expect(Buffer.from(content)).toEqual(bufferData)

        await storage.delete(bufferKey)
      })
    })

    describe('download', () => {
      it('should read a file and return a Buffer', async () => {
        await storage.upload(testKey, testData)

        const result = await storage.download(testKey)

        expect(result).toBeInstanceOf(Buffer)
        expect(result.toString()).toBe(testData)
      })
    })

    describe('delete', () => {
      it('should remove a file from disk', async () => {
        await storage.upload(testKey, testData)

        await storage.delete(testKey)

        const filePath = path.join(TEST_DIR, testKey)
        await expect(fs.access(filePath)).rejects.toThrow()
      })

      it('should not throw when deleting a non-existent file', async () => {
        await expect(
          storage.delete('non-existent/file.txt'),
        ).resolves.toBeUndefined()
      })
    })

    describe('getUrl', () => {
      it('should return the correct URL pattern', async () => {
        const url = await storage.getUrl('some/file.pdf')

        expect(url).toBe('/api/files/some/file.pdf')
      })
    })

    describe('exists', () => {
      it('should return true when the file exists', async () => {
        await storage.upload(testKey, testData)

        const result = await storage.exists(testKey)

        expect(result).toBe(true)
      })

      it('should return false when the file does not exist', async () => {
        const result = await storage.exists('non-existent-file.txt')

        expect(result).toBe(false)
      })
    })
  })
})
