'use client'

import { HardDrive } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface StorageUsageCardProps {
  usedBytes: string
  quotaBytes: string
}

function formatMB(mb: number): string {
  if (mb >= 1024) {
    const gb = mb / 1024
    return gb >= 10 ? `${Math.round(gb)} GB` : `${gb.toFixed(1)} GB`
  }
  return `${Math.round(mb)} MB`
}

function getStorageBarColor(pct: number): string {
  if (pct > 90) return 'bg-red-500'
  if (pct > 70) return 'bg-yellow-500'
  return 'bg-green-500'
}

export function StorageUsageCard({ usedBytes: usedBytesStr, quotaBytes: quotaBytesStr }: StorageUsageCardProps) {
  const usedBytes = BigInt(usedBytesStr)
  const quotaBytes = BigInt(quotaBytesStr)

  const isUnlimited = quotaBytes === BigInt(-1)
  const usedMB = Number(usedBytes / BigInt(1048576))
  const quotaMB = isUnlimited ? -1 : Number(quotaBytes / BigInt(1048576))

  const usedLabel = formatMB(usedMB)
  const quotaLabel = isUnlimited ? 'Unlimited' : formatMB(quotaMB)
  const remainingMB = isUnlimited ? Infinity : Math.max(quotaMB - usedMB, 0)
  const remainingLabel = isUnlimited ? 'Unlimited' : formatMB(remainingMB)
  const pct = isUnlimited ? 0 : Math.min((usedMB / quotaMB) * 100, 100)

  return (
    <Card>
      <CardContent className="py-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <HardDrive className="size-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Storage Usage</h3>
        </div>

        {isUnlimited ? (
          /* Unlimited: show usage count only, no progress bar */
          <div>
            <p className="text-sm text-muted-foreground">Storage Unlimited</p>
            <p className="mt-1 text-sm font-medium text-foreground">Used: {usedLabel}</p>
          </div>
        ) : (
          /* Limited: show usage, quota, remaining, progress bar */
          <div>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Used</p>
                <p className="mt-0.5 text-sm font-semibold text-foreground tabular-nums">{usedLabel}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quota</p>
                <p className="mt-0.5 text-sm font-semibold text-foreground tabular-nums">{quotaLabel}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Remaining</p>
                <p className="mt-0.5 text-sm font-semibold text-foreground tabular-nums">{remainingLabel}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getStorageBarColor(pct)}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums text-right">
              {Math.round(pct)}%
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
