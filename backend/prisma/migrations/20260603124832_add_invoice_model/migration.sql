-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');

-- CreateTable
CREATE TABLE "invoices" (
    "id" SERIAL NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "insurerId" INTEGER NOT NULL,
    "billingMonth" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "lineItemText" TEXT NOT NULL,
    "policyCount" INTEGER NOT NULL,
    "taxableValue" DECIMAL(18,2) NOT NULL,
    "cgstRate" DECIMAL(5,2) NOT NULL,
    "cgstAmount" DECIMAL(18,2) NOT NULL,
    "sgstRate" DECIMAL(5,2) NOT NULL,
    "sgstAmount" DECIMAL(18,2) NOT NULL,
    "igstRate" DECIMAL(5,2) NOT NULL,
    "igstAmount" DECIMAL(18,2) NOT NULL,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "totalInWords" TEXT NOT NULL,
    "recipientHeader" TEXT NOT NULL,
    "recipientLegalName" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "recipientState" TEXT NOT NULL,
    "recipientStateCode" TEXT NOT NULL,
    "recipientGstin" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_insurerId_billingMonth_idx" ON "invoices"("insurerId", "billingMonth");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES "insurers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
