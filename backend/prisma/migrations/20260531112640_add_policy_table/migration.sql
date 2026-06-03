-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OWNER');

-- CreateEnum
CREATE TYPE "InsuranceType" AS ENUM ('LIFE', 'HEALTH', 'MOTOR', 'PROPERTY_COMMERCIAL', 'PROPERTY_RESIDENTIAL', 'BUSINESS', 'ACCIDENT_CARE', 'TRAVEL', 'SHOP_INSURANCE', 'WORKMAN');

-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('FRESH', 'Q_RENEW', 'H_RENEW', 'PORTABILITY', 'LOADING');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PENDING', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" SERIAL NOT NULL,
    "insurer" TEXT NOT NULL,
    "insuranceType" "InsuranceType" NOT NULL,
    "productName" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "policyNumber" TEXT NOT NULL,
    "policyType" "PolicyType" NOT NULL DEFAULT 'FRESH',
    "dateOfIssue" TIMESTAMP(3) NOT NULL,
    "renewalDate" TIMESTAMP(3),
    "renewalReminder" TIMESTAMP(3),
    "sumInsured" DECIMAL(18,2),
    "termYears" INTEGER,
    "grossPremium" DECIMAL(18,2) NOT NULL,
    "netPremium" DECIMAL(18,2),
    "commissionPct" DECIMAL(8,4),
    "commissionAmount" DECIMAL(18,2),
    "pospCommission" DECIMAL(18,2),
    "orgCommission" DECIMAL(18,2),
    "tds" DECIMAL(18,2),
    "leadSource" TEXT NOT NULL,
    "teamManager" TEXT,
    "source" TEXT,
    "paymentMode" TEXT,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "invoiceAmount" DECIMAL(18,2),
    "creditedOn" TIMESTAMP(3),
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "notes" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "policies_policyNumber_key" ON "policies"("policyNumber");

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
