-- AlterTable
ALTER TABLE "posp_incentive_entries" ADD COLUMN     "pospBillDate" TIMESTAMP(3),
ADD COLUMN     "pospBillFilePath" TEXT,
ADD COLUMN     "pospBillNo" TEXT;
