-- Remove TWO_YEAR, THREE_YEAR, FOUR_YEAR, FIVE_YEAR from PaymentFrequency enum.
-- PostgreSQL cannot drop enum values directly; must recreate the type.
-- Confirmed: no policies use these values before applying.

CREATE TYPE "PaymentFrequency_new" AS ENUM ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY');

ALTER TABLE "policies"
  ALTER COLUMN "paymentFrequency" TYPE "PaymentFrequency_new"
  USING "paymentFrequency"::text::"PaymentFrequency_new";

DROP TYPE "PaymentFrequency";

ALTER TYPE "PaymentFrequency_new" RENAME TO "PaymentFrequency";