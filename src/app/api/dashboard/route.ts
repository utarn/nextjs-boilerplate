import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getDashboardData } from '@/lib/dashboard'

export async function GET(request: NextRequest) {
  return withAuth(request, async (user) => {
    const data = await getDashboardData(user.userId, user.role)
    return NextResponse.json(data)
  })
}
