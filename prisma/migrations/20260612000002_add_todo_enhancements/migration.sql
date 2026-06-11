-- Create TodoPriority enum
CREATE TYPE "TodoPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- Add priority column to todos table with default MEDIUM
ALTER TABLE "todos" ADD COLUMN "priority" "TodoPriority" NOT NULL DEFAULT 'MEDIUM';

-- Add completedAt timestamp to todos table
ALTER TABLE "todos" ADD COLUMN "completedAt" TIMESTAMP(3);

-- Add attachment columns to todos table
ALTER TABLE "todos" ADD COLUMN "attachmentPath" TEXT;
ALTER TABLE "todos" ADD COLUMN "attachmentName" TEXT;
ALTER TABLE "todos" ADD COLUMN "attachmentSize" BIGINT;

-- Add storage columns to web_users table
ALTER TABLE "web_users" ADD COLUMN "storageUsedBytes" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "web_users" ADD COLUMN "storageQuotaBytes" BIGINT NOT NULL DEFAULT -1;
