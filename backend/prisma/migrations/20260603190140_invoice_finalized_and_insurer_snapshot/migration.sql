-- Add FINALIZED to InvoiceStatus enum (additive — ISSUED kept for backward compat)
ALTER TYPE "InvoiceStatus" ADD VALUE 'FINALIZED';

-- Add insurerName snapshot column to invoices (nullable — no existing rows, but nullable for safety)
ALTER TABLE "invoices" ADD COLUMN "insurerName" TEXT;
