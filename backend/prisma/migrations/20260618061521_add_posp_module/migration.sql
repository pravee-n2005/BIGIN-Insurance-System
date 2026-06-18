-- CreateTable
CREATE TABLE "posp_members" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "mobile" TEXT,
    "email" TEXT,
    "joiningDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "remarks" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posp_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posp_commission_overrides" (
    "id" SERIAL NOT NULL,
    "pospMemberId" INTEGER NOT NULL,
    "policyId" INTEGER NOT NULL,
    "commissionRate" DECIMAL(8,4) NOT NULL,
    "brokerageAmount" DECIMAL(18,2) NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posp_commission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "posp_members_code_key" ON "posp_members"("code");

-- CreateIndex
CREATE UNIQUE INDEX "posp_commission_overrides_pospMemberId_policyId_key" ON "posp_commission_overrides"("pospMemberId", "policyId");

-- AddForeignKey
ALTER TABLE "posp_members" ADD CONSTRAINT "posp_members_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posp_commission_overrides" ADD CONSTRAINT "posp_commission_overrides_pospMemberId_fkey" FOREIGN KEY ("pospMemberId") REFERENCES "posp_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posp_commission_overrides" ADD CONSTRAINT "posp_commission_overrides_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
