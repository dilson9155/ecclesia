-- AlterTable
ALTER TABLE "users" ADD COLUMN "sedeId" TEXT;

-- CreateIndex
CREATE INDEX "users_sedeId_idx" ON "users"("sedeId");

-- CreateIndex
CREATE INDEX "users_congregationId_idx" ON "users"("congregationId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "sedes"("id") ON DELETE SET NULL ON UPDATE CASCADE;