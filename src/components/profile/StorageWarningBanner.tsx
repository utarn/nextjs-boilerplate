'use client'

import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface StorageWarningBannerProps {
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

export function StorageWarningBanner({ usedBytes: usedBytesStr, quotaBytes: quotaBytesStr }: StorageWarningBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  const usedBytes = BigInt(usedBytesStr)
  const quotaBytes = BigInt(quotaBytesStr)

  const isUnlimited = quotaBytes === BigInt(-1)
  const usedMB = Number(usedBytes / BigInt(1048576))
  const quotaMB = isUnlimited ? -1 : Number(quotaBytes / BigInt(1048576))

  const remainingMB = isUnlimited ? Infinity : Math.max(quotaMB - usedMB, 0)
  const isNearLimit = !isUnlimited && remainingMB < 100

  // Don't render if dismissed, unlimited, or not near limit
  if (dismissed || !isNearLimit) {
    return null
  }

  const remainingLabel = formatMB(remainingMB)
  const quotaLabel = formatMB(quotaMB)

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-200"
      role="alert"
    >
      <AlertTriangle className="size-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Storage Almost Full</p>
        <p className="mt-1 text-sm">
          You have {remainingLabel} of {quotaLabel} remaining. Free up space by deleting
          unused file attachments.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-md p-1 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
