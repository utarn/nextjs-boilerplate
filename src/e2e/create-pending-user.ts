/**
 * Helper script for E2E admin tests.
 * Creates a PENDING user in the database and prints the result to stdout.
 *
 * Usage: npx tsx src/e2e/create-pending-user.ts
 *
 * Environment variables required:
 *   DATABASE_URL  — PostgreSQL connection string
 *
 * Output: A JSON string containing { id: string, email: string }
 */
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/client'

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  const email = `pending-${Date.now()}@test.com`

  const user = await prisma.webUser.create({
    data: {
      email,
      displayName: 'Pending User',
      role: 'USER',
      status: 'PENDING',
    },
  })

  console.log(JSON.stringify({ id: user.id, email: user.email }))

  await prisma.$disconnect()
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to create pending user:', err)
    process.exit(1)
  })
