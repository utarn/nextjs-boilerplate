import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, hash, generateRandomToken } from '@/lib/encryption'

describe('encryption', () => {
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const plaintext = 'Hello, World!'
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'same input'
      const encrypted1 = encrypt(plaintext)
      const encrypted2 = encrypt(plaintext)

      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should handle empty strings', () => {
      const plaintext = ''
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should handle unicode characters', () => {
      const plaintext = 'สวัสดีครับ 🎉 こんにちは'
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })
  })

  describe('hash', () => {
    it('should produce consistent hashes', () => {
      const input = 'test-input'
      const hash1 = hash(input)
      const hash2 = hash(input)

      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different inputs', () => {
      expect(hash('input-a')).not.toBe(hash('input-b'))
    })
  })

  describe('generateRandomToken', () => {
    it('should generate a token of correct length', () => {
      const token = generateRandomToken(32)
      expect(token).toHaveLength(64) // hex encoding doubles the length
    })

    it('should generate unique tokens', () => {
      const token1 = generateRandomToken()
      const token2 = generateRandomToken()

      expect(token1).not.toBe(token2)
    })
  })
})
