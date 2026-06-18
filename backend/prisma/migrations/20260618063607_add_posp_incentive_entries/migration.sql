-- CreateTable
CREATE TABLE "posp_incentive_entries" (
    "id" SERIAL NOT NULL,
    "pospMemberId" INTEGER NOT NULL,
    "policyId" INTEGER,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "policyType" TEXT,
    "premium" DECIMAL(18,2) NOT NULL,
    "commissionRate" DECIMAL(6,2) NOT NULL,
    "pospShare" DECIMAL(6,2) NOT NULL,
    "brokerage" DECIMAL(18,2) NOT NULL,
    "pospCommission" DECIMAL(18,2) NOT NULL,
    "orgCommission" DECIMAL(18,2) NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "invoiceReference" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "remarks" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "posp_incentive_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "posp_incentive_entries_pospMemberId_idx" ON "posp_incentive_entries"("pospMemberId");

-- CreateIndex
CREATE INDEX "posp_incentive_entries_entryDate_idx" ON "posp_incentive_entries"("entryDate");

-- AddForeignKey
ALTER TABLE "posp_incentive_entries" ADD CONSTRAINT "posp_incentive_entries_pospMemberId_fkey" FOREIGN KEY ("pospMemberId") REFERENCES "posp_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posp_incentive_entries" ADD CONSTRAINT "posp_incentive_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
