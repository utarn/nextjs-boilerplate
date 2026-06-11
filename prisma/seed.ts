import { PrismaClient, WebUserRole } from '../src/generated/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // Create default admin user if configured
  if (process.env.ADMIN_EMAIL) {
    const existingAdmin = await prisma.webUser.findUnique({
      where: { email: process.env.ADMIN_EMAIL }
    })

    if (!existingAdmin) {
      const admin = await prisma.webUser.create({
        data: {
          email: process.env.ADMIN_EMAIL,
          displayName: process.env.ADMIN_DISPLAY_NAME || 'Admin User',
          role: WebUserRole.ADMIN,
        }
      })
      console.log(`✅ Created admin user: ${admin.email}`)
    } else {
      console.log(`ℹ️ Admin user already exists: ${existingAdmin.email}`)
    }
  }

  console.log('✅ Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
