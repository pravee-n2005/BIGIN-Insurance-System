/*
  Warnings:

  - You are about to drop the column `commissionPct` on the `policies` table. All the data in the column will be lost.
  - You are about to drop the column `creditedOn` on the `policies` table. All the data in the column will be lost.
  - You are about to drop the column `dateOfIssue` on the `policies` table. All the data in the column will be lost.
  - You are about to drop the column `insuranceType` on the `policies` table. All the data in the column will be lost.
  - You are about to drop the column `insurer` on the `policies` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceAmount` on the `policies` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `policies` table. All the data in the column will be lost.
  - You are about to drop the column `orgCommission` on the `policies` table. All the data in the column will be lost.
  - You are about to drop the column `paymentStatus` on the `policies` table. All the data in the column will be lost.
  - You are about to drop the column `policyType` on the `policies` table. All the data in the column will be lost.
  - You are about to drop the column `pospCommission` on the `policies` table. All the data in the column will be lost.
  - You are about to drop the column `renewalReminder` on the `policies` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `policies` table. All the data in the column will be lost.
  - You are about to drop the column `sumInsured` on the `policies` table. All the data in the column will be lost.
  - You are about to drop the column `tds` on the `policies` table. All the data in the column will be lost.
  - You are about to drop the column `teamManager` on the `policies` table. All the data in the column will be lost.
  - You are about to drop the column `termYears` on the `policies` table. All the data in the column will be lost.
  - Added the required column `commissionPercent` to the `policies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `finalReceivable` to the `policies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gstAmount` to the `policies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gstPercent` to the `policies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `insuranceCategory` to the `policies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `insurerName` to the `policies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `issueDate` to the `policies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentFrequency` to the `policies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tdsAmount` to the `policies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tdsPercent` to the `policies` table without a default value. This is not possible if the table is not empty.
  - Made the column `renewalDate` on table `policies` required. This step will fail if there are existing NULL values in that column.
  - Made the column `netPremium` on table `policies` required. This step will fail if there are existing NULL values in that column.
  - Made the column `commissionAmount` on table `policies` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "InsuranceCategory" AS ENUM ('LIFE', 'HEALTH', 'GENERAL');

-- CreateEnum
CREATE TYPE "PaymentFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "policies" DROP COLUMN "commissionPct",
DROP COLUMN "creditedOn",
DROP COLUMN "dateOfIssue",
DROP COLUMN "insuranceType",
DROP COLUMN "insurer",
DROP COLUMN "invoiceAmount",
DROP COLUMN "notes",
DROP COLUMN "orgCommission",
DROP COLUMN "paymentStatus",
DROP COLUMN "policyType",
DROP COLUMN "pospCommission",
DROP COLUMN "renewalReminder",
DROP COLUMN "source",
DROP COLUMN "sumInsured",
DROP COLUMN "tds",
DROP COLUMN "teamManager",
DROP COLUMN "termYears",
ADD COLUMN     "commissionPercent" DECIMAL(8,4) NOT NULL,
ADD COLUMN     "creditedDate" TIMESTAMP(3),
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "finalReceivable" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "gstAmount" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "gstPercent" DECIMAL(8,4) NOT NULL,
ADD COLUMN     "insuranceCategory" "InsuranceCategory" NOT NULL,
ADD COLUMN     "insurerName" TEXT NOT NULL,
ADD COLUMN     "issueDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "paymentFrequency" "PaymentFrequency" NOT NULL,
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "status" "PolicyStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "tdsAmount" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "tdsPercent" DECIMAL(8,4) NOT NULL,
ALTER COLUMN "renewalDate" SET NOT NULL,
ALTER COLUMN "netPremium" SET NOT NULL,
ALTER COLUMN "commissionAmount" SET NOT NULL;

-- DropEnum
DROP TYPE "InsuranceType";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "PolicyType";
