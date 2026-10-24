-- CreateEnum
CREATE TYPE "ChurchStructureType" AS ENUM ('SEDE_ONLY', 'SEDE_AND_CONGREGATIONS');

-- CreateEnum
CREATE TYPE "PlanStructureType" AS ENUM ('SEDE_ONLY', 'SEDE_AND_CONGREGATIONS');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED', 'EXPIRED');

-- AlterTable
ALTER TABLE "churches" ADD COLUMN     "congregationMemberCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "memberCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "sedeMemberCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "structureType" "ChurchStructureType" NOT NULL DEFAULT 'SEDE_AND_CONGREGATIONS';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "structureType" "PlanStructureType" NOT NULL,
    "minMembers" INTEGER NOT NULL DEFAULT 0,
    "maxMembers" INTEGER,
    "price" DECIMAL(12,2) NOT NULL,
    "trialDays" INTEGER NOT NULL DEFAULT 14,
    "maxSedes" INTEGER,
    "maxCongregations" INTEGER,
    "features" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "canceledReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE INDEX "plans_structureType_active_idx" ON "plans"("structureType", "active");

-- CreateIndex
CREATE INDEX "plans_minMembers_maxMembers_idx" ON "plans"("minMembers", "maxMembers");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_churchId_key" ON "subscriptions"("churchId");

-- CreateIndex
CREATE INDEX "subscriptions_planId_idx" ON "subscriptions"("planId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
