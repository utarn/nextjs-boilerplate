-- AlterTable
ALTER TABLE "magic_link_tokens" ALTER COLUMN "usedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "web_users" ADD COLUMN     "colorMode" TEXT,
ADD COLUMN     "theme" TEXT;
