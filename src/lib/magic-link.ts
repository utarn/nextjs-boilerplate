import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendMagicLinkEmail } from '@/lib/email'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAGIC_LINK_EXPIRY_MINUTES = 15

// ---------------------------------------------------------------------------
// Email validation
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

// ---------------------------------------------------------------------------
// generateMagicLink
// ---------------------------------------------------------------------------

/**
 * Generate a crypto-random magic-link token, persist it in the database with a
 * 15-minute expiry, and send the magic-link email. Returns the generated token.
 */
export async function generateMagicLink(email: string, baseUrl: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000)

  await prisma.magicLinkToken.create({
    data: { email, token, expiresAt },
  })

  const magicLinkUrl = new URL('/api/auth/verify', baseUrl)
  magicLinkUrl.searchParams.set('token', token)

  await sendMagicLinkEmail(email, magicLinkUrl.toString())

  return token
}

// ---------------------------------------------------------------------------
// verifyMagicLink
// ---------------------------------------------------------------------------

/**
 * Result of a magic-link token verification.
 */
export type VerifyResult =
  | { ok: true; email: string }
  | { ok: false; error: 'invalid_token' | 'token_used' | 'token_expired' }

/**
 * Look up a magic-link token, check expiry and usage, mark it as used, and
 * return the associated email. Returns a discriminated union so the caller
 * can redirect with the correct error query parameter.
 */
export async function verifyMagicLink(token: string): Promise<VerifyResult> {
  const magicLink = await prisma.magicLinkToken.findUnique({
    where: { token },
  })

  if (!magicLink) return { ok: false, error: 'invalid_token' }

  if (magicLink.usedAt) return { ok: false, error: 'token_used' }

  if (magicLink.expiresAt < new Date()) {
    return { ok: false, error: 'token_expired' }
  }

  // Mark the token as used (single-use)
  await prisma.magicLinkToken.update({
    where: { id: magicLink.id },
    data: { usedAt: new Date() },
  })

  return { ok: true, email: magicLink.email }
}
