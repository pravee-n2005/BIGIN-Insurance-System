-- AlterTable
ALTER TABLE "policies" ADD COLUMN     "invoiceRaised" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "invoiceRaisedAt" TIMESTAMP(3);
