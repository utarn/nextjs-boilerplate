/**
 * Helper script for E2E auth setup.
 * Creates a magic link token in the database and prints it to stdout.
 *
 * Usage: npx tsx src/e2e/create-magic-link.ts
 *
 * Environment variables required:
 *   DATABASE_URL  — PostgreSQL connection string
 *   ADMIN_EMAIL   — email address of the admin user
 *
 * Output: A JSON string containing { token: string, email: string }
 */
import { Pool } from 'pg'
import crypto from 'node:crypto'

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/client'

async function main(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    throw new Error('ADMIN_EMAIL environment variable is not set')
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  const token = crypto.randomBytes(32).toString('hex')

  await prisma.magicLinkToken.create({
    data: {
      email: adminEmail,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    },
  })

  console.log(JSON.stringify({ token, email: adminEmail }))

  await prisma.$disconnect()
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to create magic link token:', err)
    process.exit(1)
  })
