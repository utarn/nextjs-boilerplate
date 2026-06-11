import { NextRequest, NextResponse } from 'next/server'
import { generateMagicLink } from '@/lib/magic-link'
import { appUrl } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    await generateMagicLink(email, appUrl('/', request).toString())

    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Magic link error:', error)
    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true })
  }
}
