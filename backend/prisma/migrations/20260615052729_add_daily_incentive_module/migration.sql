-- CreateTable
CREATE TABLE "incentive_settings" (
    "id" SERIAL NOT NULL,
    "touchBasePoints" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "interestedPoints" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "followUpPoints" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "conversionPoints" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amountPerPoint" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incentive_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incentive_entries" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "touchBase" INTEGER NOT NULL DEFAULT 0,
    "interested" INTEGER NOT NULL DEFAULT 0,
    "followUp" INTEGER NOT NULL DEFAULT 0,
    "conversion" INTEGER NOT NULL DEFAULT 0,
    "calculatedPoints" DECIMAL(10,2) NOT NULL,
    "calculatedAmount" DECIMAL(18,2) NOT NULL,
    "remarks" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incentive_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incentive_entries_employeeId_date_idx" ON "incentive_entries"("employeeId", "date");

-- CreateIndex
CREATE INDEX "incentive_entries_date_idx" ON "incentive_entries"("date");

-- AddForeignKey
ALTER TABLE "incentive_entries" ADD CONSTRAINT "incentive_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "lead_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incentive_entries" ADD CONSTRAINT "incentive_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
