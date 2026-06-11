import { appUrl } from '@/lib/auth'
import { NextRequest } from 'next/server'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

interface GoogleTokens {
  access_token: string
  expires_in: number
  scope: string
  token_type: string
  id_token: string
}

interface GoogleUserInfo {
  sub: string
  email: string
  email_verified: boolean
  name: string
  given_name: string
  family_name: string
  picture: string
  locale: string
}

export function getGoogleAuthUrl(request: NextRequest): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: appUrl('/api/auth/google/callback', request).toString(),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  })

  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string, request: NextRequest): Promise<GoogleTokens> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: appUrl('/api/auth/google/callback', request).toString(),
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to exchange code: ${await response.text()}`)
  }

  return response.json()
}

export async function getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${await response.text()}`)
  }

  return response.json()
}
