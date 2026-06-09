-- AlterTable
ALTER TABLE "insurer_statements" ADD COLUMN     "amountCredited" DECIMAL(18,2),
ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "bankReference" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "isGstExempt" BOOLEAN NOT NULL DEFAULT false;
