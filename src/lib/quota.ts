import { prisma } from '@/lib/prisma'

interface QuotaCheckResult {
  allowed: boolean
  used: number
  limit: number
  remaining: number
}

const DEFAULT_QUOTA = {
  MAX_FILES_PER_USER: parseInt(process.env.DEFAULT_MAX_FILES_PER_USER || '1000'),
  MAX_STORAGE_MB_PER_USER: parseInt(process.env.DEFAULT_MAX_STORAGE_MB_PER_USER || '1000'),
  MAX_TODOS_PER_USER: parseInt(process.env.DEFAULT_MAX_TODOS_PER_USER || '1000'),
}

export async function checkUserQuota(userId: string, quotaType: 'files' | 'storage' | 'todos'): Promise<QuotaCheckResult> {
  const limit = getQuotaLimit(quotaType)
  const used = await getQuotaUsage(userId, quotaType)
  const remaining = Math.max(0, limit - used)

  return {
    allowed: used < limit,
    used,
    limit,
    remaining,
  }
}

function getQuotaLimit(quotaType: 'files' | 'storage' | 'todos'): number {
  switch (quotaType) {
    case 'files':
      return DEFAULT_QUOTA.MAX_FILES_PER_USER
    case 'storage':
      return DEFAULT_QUOTA.MAX_STORAGE_MB_PER_USER
    case 'todos':
      return DEFAULT_QUOTA.MAX_TODOS_PER_USER
  }
}

async function getQuotaUsage(userId: string, quotaType: 'files' | 'storage' | 'todos'): Promise<number> {
  switch (quotaType) {
    case 'todos':
      return prisma.todo.count({
        where: { userId },
      })
    case 'files':
      // Implement when file storage is added
      return 0
    case 'storage':
      // Implement when file storage is added
      return 0
  }
}

export async function enforceUserQuota(userId: string, quotaType: 'files' | 'storage' | 'todos'): Promise<void> {
  const check = await checkUserQuota(userId, quotaType)

  if (!check.allowed) {
    throw new Error(`Quota exceeded: ${quotaType} limit of ${check.limit} reached`)
  }
}
