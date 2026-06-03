-- AlterEnum
ALTER TYPE "LeadType" ADD VALUE 'LEAD_EXECUTIVE';

-- CreateTable
CREATE TABLE "insurer_invoice_profiles" (
    "id" SERIAL NOT NULL,
    "insurerId" INTEGER NOT NULL,
    "recipientHeader" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "billingAddress" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "gstin" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurer_invoice_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "insurer_invoice_profiles_insurerId_key" ON "insurer_invoice_profiles"("insurerId");

-- AddForeignKey
ALTER TABLE "insurer_invoice_profiles" ADD CONSTRAINT "insurer_invoice_profiles_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES "insurers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
