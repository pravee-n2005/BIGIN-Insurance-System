-- CreateEnum
CREATE TYPE "StatementStatus" AS ENUM ('DRAFT', 'FINALIZED', 'INVOICED', 'CANCELLED');

-- CreateTable
CREATE TABLE "insurer_statements" (
    "id" SERIAL NOT NULL,
    "insurerId" INTEGER NOT NULL,
    "statementRefNo" TEXT NOT NULL,
    "statementDate" TIMESTAMP(3) NOT NULL,
    "creditDate" TIMESTAMP(3),
    "businessMonth" TEXT NOT NULL,
    "remarks" TEXT,
    "statementFileUrl" TEXT,
    "totalTaxableValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cgstRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "cgstAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sgstRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "sgstAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "igstRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "igstAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "invoiceValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "StatementStatus" NOT NULL DEFAULT 'DRAFT',
    "invoiceId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurer_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statement_policies" (
    "id" SERIAL NOT NULL,
    "statementId" INTEGER NOT NULL,
    "policyId" INTEGER NOT NULL,
    "taxableValue" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "statement_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "insurer_statements_invoiceId_key" ON "insurer_statements"("invoiceId");

-- CreateIndex
CREATE INDEX "insurer_statements_insurerId_statementDate_idx" ON "insurer_statements"("insurerId", "statementDate");

-- CreateIndex
CREATE INDEX "insurer_statements_status_idx" ON "insurer_statements"("status");

-- CreateIndex
CREATE UNIQUE INDEX "insurer_statements_insurerId_statementRefNo_key" ON "insurer_statements"("insurerId", "statementRefNo");

-- CreateIndex
CREATE INDEX "statement_policies_policyId_idx" ON "statement_policies"("policyId");

-- CreateIndex
CREATE UNIQUE INDEX "statement_policies_statementId_policyId_key" ON "statement_policies"("statementId", "policyId");

-- AddForeignKey
ALTER TABLE "insurer_statements" ADD CONSTRAINT "insurer_statements_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES "insurers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurer_statements" ADD CONSTRAINT "insurer_statements_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurer_statements" ADD CONSTRAINT "insurer_statements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statement_policies" ADD CONSTRAINT "statement_policies_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "insurer_statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statement_policies" ADD CONSTRAINT "statement_policies_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
