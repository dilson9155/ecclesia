-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('PENDENTE', 'PAGA', 'VENCIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "NoticeLevel" AS ENUM ('INFO', 'ALERTA', 'URGENTE');

-- CreateTable
CREATE TABLE "church_charges" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "planId" TEXT,
    "description" TEXT NOT NULL,
    "referenceMonth" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'PENDENTE',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "church_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_notices" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "level" "NoticeLevel" NOT NULL DEFAULT 'INFO',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "church_charges_churchId_referenceMonth_idx" ON "church_charges"("churchId", "referenceMonth");

-- CreateIndex
CREATE INDEX "church_charges_status_dueDate_idx" ON "church_charges"("status", "dueDate");

-- CreateIndex
CREATE INDEX "platform_notices_active_publishedAt_idx" ON "platform_notices"("active", "publishedAt");

-- AddForeignKey
ALTER TABLE "church_charges" ADD CONSTRAINT "church_charges_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_charges" ADD CONSTRAINT "church_charges_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
