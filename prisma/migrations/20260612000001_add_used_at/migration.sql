-- Add usedAt column to magic_link_tokens for single-use token tracking
ALTER TABLE "magic_link_tokens" ADD COLUMN "usedAt" TIMESTAMPTZ;
