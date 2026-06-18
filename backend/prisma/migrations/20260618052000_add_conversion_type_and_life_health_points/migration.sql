-- AlterTable
ALTER TABLE "incentive_entries" ADD COLUMN     "conversionType" TEXT;

-- AlterTable
ALTER TABLE "incentive_settings" ADD COLUMN     "healthConversionPoints" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "lifeConversionPoints" DECIMAL(10,2) NOT NULL DEFAULT 0;
