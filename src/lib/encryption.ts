import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16
const KEY_LENGTH = 32

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || 'fallback-secret-key-1234567890abcdef'

function getKey(): Buffer {
  const key = crypto.scryptSync(ENCRYPTION_SECRET, 'salt', KEY_LENGTH)
  return key
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = getKey()
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decrypt(ciphertext: string): string {
  const buffer = Buffer.from(ciphertext, 'base64')

  const iv = buffer.subarray(0, IV_LENGTH)
  const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH)

  const key = getKey()
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}

export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex')
}

export function generateRandomToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex')
}
