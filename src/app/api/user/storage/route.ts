import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getStorageUsage } from '@/lib/quota'

const WARN_THRESHOLD_BYTES = BigInt(100) * BigInt(1024) * BigInt(1024) // 104857600 = 100 MB

export async function GET(request: NextRequest) {
  return withAuth(request, async (user) => {
    const { usedBytes, quotaBytes } = await getStorageUsage(user.userId)

    const isNearLimit = quotaBytes !== BigInt(-1) && (quotaBytes - usedBytes) < WARN_THRESHOLD_BYTES

    return NextResponse.json({
      usedBytes: usedBytes.toString(),
      quotaBytes: quotaBytes.toString(),
      isNearLimit,
    })
  })
}
