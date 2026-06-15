/**
 * Helper script for E2E admin tests.
 * Deletes a user from the database by ID.
 *
 * Usage: npx tsx src/e2e/delete-user.ts <userId>
 *
 * Environment variables required:
 *   DATABASE_URL  — PostgreSQL connection string
 */
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/client'

async function main(): Promise<void> {
  const userId = process.argv[2]
  if (!userId) {
    throw new Error('User ID is required as the first argument')
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  await prisma.webUser.delete({ where: { id: userId } })

  await prisma.$disconnect()
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to delete user:', err)
    process.exit(1)
  })
