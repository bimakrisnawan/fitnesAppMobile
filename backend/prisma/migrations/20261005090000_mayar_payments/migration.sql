-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MAYAR');

-- CreateEnum
CREATE TYPE "PaymentEventType" AS ENUM ('CREATED', 'PROVIDER_ERROR', 'WEBHOOK_RECEIVED', 'WEBHOOK_UNMATCHED', 'WEBHOOK_REJECTED', 'VERIFIED', 'SETTLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EquipmentSetting" AS ENUM ('GYM', 'HOME', 'NONE');

-- DropIndex
DROP INDEX "Payment_midtransTransactionId_key";

-- DropIndex
DROP INDEX "Subscription_userId_status_idx";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "lastNotification",
DROP COLUMN "midtransTransactionId",
DROP COLUMN "qrImageUrl",
DROP COLUMN "qrString",
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "paymentUrl" TEXT,
ADD COLUMN     "provider" "PaymentProvider" NOT NULL DEFAULT 'MAYAR',
ADD COLUMN     "providerInvoiceId" TEXT,
ADD COLUMN     "providerTransactionId" TEXT,
ADD COLUMN     "tier" "Tier" NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "specialization" "Specialization";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneEncrypted" TEXT;

-- AlterTable
ALTER TABLE "Workout" ADD COLUMN     "equipmentSetting" "EquipmentSetting" NOT NULL;

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" UUID NOT NULL,
    "paymentId" UUID,
    "type" "PaymentEventType" NOT NULL,
    "data" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentEvent_paymentId_createdAt_idx" ON "PaymentEvent"("paymentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerInvoiceId_key" ON "Payment"("providerInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerTransactionId_key" ON "Payment"("providerTransactionId");

-- CreateIndex
CREATE INDEX "Payment_status_expiresAt_idx" ON "Payment"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_tier_key" ON "Subscription"("userId", "tier");

-- CreateIndex
CREATE INDEX "Workout_equipmentSetting_idx" ON "Workout"("equipmentSetting");

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

