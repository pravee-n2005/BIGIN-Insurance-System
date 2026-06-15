-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentFrequency" ADD VALUE 'TWO_YEAR';
ALTER TYPE "PaymentFrequency" ADD VALUE 'THREE_YEAR';

-- AlterTable
ALTER TABLE "policies" ADD COLUMN     "nextDueDate" TIMESTAMP(3);

-- Backfill: nextDueDate starts equal to the existing renewalDate for all
-- historical policies (Phase 3a).
UPDATE "policies" SET "nextDueDate" = "renewalDate";
