-- CreateTable
CREATE TABLE "incentives" (
    "id" SERIAL NOT NULL,
    "leadMemberId" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "points" DECIMAL(10,2) NOT NULL,
    "pointValue" DECIMAL(10,2) NOT NULL DEFAULT 0.50,
    "incentiveAmount" DECIMAL(18,2) NOT NULL,
    "remarks" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incentives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "incentives_leadMemberId_month_key" ON "incentives"("leadMemberId", "month");

-- AddForeignKey
ALTER TABLE "incentives" ADD CONSTRAINT "incentives_leadMemberId_fkey" FOREIGN KEY ("leadMemberId") REFERENCES "lead_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incentives" ADD CONSTRAINT "incentives_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
