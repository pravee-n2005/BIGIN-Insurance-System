-- CreateEnum
CREATE TYPE "InvoiceCancellationReason" AS ENUM ('DUPLICATE_INVOICE', 'INCORRECT_TAXABLE_VALUE', 'WRONG_INSURER_SELECTED', 'GST_CALCULATION_ERROR', 'REPLACED_BY_NEW_INVOICE', 'TEST_DUMMY_INVOICE', 'CLIENT_REQUEST', 'PAYMENT_REVERSED', 'OTHER');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "cancellationReason" "InvoiceCancellationReason",
ADD COLUMN     "cancellationReasonOther" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledById" INTEGER;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
