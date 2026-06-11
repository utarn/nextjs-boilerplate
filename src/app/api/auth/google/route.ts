import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthUrl } from '@/lib/google-oauth'

export async function GET(request: NextRequest) {
  try {
    const authUrl = getGoogleAuthUrl(request)
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Google auth error:', error)
    return NextResponse.json({ error: 'Failed to initialize Google auth' }, { status: 500 })
  }
}
